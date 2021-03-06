var gc = gc || {};
gc.databind = gc.databind || {};
gc.databind.Scripting = (function() {

var RuntimeScriptURL = window.URL.createObjectURL(new Blob([
`/****************************************************
* Synchronization Logic
***************************************************/
var box = this;
var Runtime = (function() {
    var buffer   = null;
    var lock     = null;
    var _timeout = 10000;
    var _command = null;
    
    box.onmessage = function(event) {
        var detail = event.data;
        switch (detail.cmd) {
            case 'init':
                lock   = new Int32Array(detail.lock);
                buffer = new Uint8Array(detail.buffer);
                break;

            case 'main':
                try {
                    main(); 
                } catch (err) {
                    box.postMessage({event: 'Console', detail: {message: err.toString(), type: 'error'}});
                }
                box.postMessage({event: 'MainCompleted'});
                break;

            case 'eval':
                try {
                    var result = eval(detail.expression);
                    box.postMessage({event: 'EvalCompleted', detail: {result: result}});
                } catch (err) {
                    box.postMessage({event: 'EvalFailed', detail: {error: err.toString()}});
                    box.postMessage({event: 'Console', detail: {message: err.toString(), type: 'error'}});
                }
                
                break;
        }
    };

    function reset() {
        Atomics.store(lock, 0, 0);
        buffer.fill(0);
    };

    function getResult() {
        if (Atomics.wait(lock, 0, 0, _timeout) != 'ok') {
            console.error('Script timeout while waiting for result!');
        }

        if (Atomics.load(lock, 0) != 0) {
            throw new Error('Error executing ' + JSON.stringify(_command));
        }

        return buffer;
    };

    function Runtime(timeout) {
        if (timeout) {
            _timeout = timeout;
        }
    }

    Runtime.prototype.execute = function(command) {
        _command = command;

        reset();
        box.postMessage(command);
        return getResult();
    };   

    return Runtime;
})();`
]));

var APIScriptURL = window.URL.createObjectURL(new Blob([
`/****************************************************
* Common Scripting API
***************************************************/
var Runtime = new Runtime();
function read(name) {
    var result = Runtime.execute({
        cmd: 'read',
        name: name
    })[0];
    box.postMessage({event: 'Console', detail: {message: 'read(' + name + ') => ' + result}});
    return result;
}
    
function write(name, value) {
    var result = Runtime.execute({
        cmd: 'write',
        name: name,
        value: value
    })[0];
    box.postMessage({event: 'Console', detail: {message: 'write(' + name + ', ' +  value + ') => ' + result}});
    return result;
}
    
function invoke(inf, name, args) {
    var result = Runtime.execute({
        cmd: 'invoke',
        inf: inf,
        name: name,
        args: args
    });
    box.postMessage({event: 'Console', detail: {message: 'invoke(' + inf + ', ' + name + ', [' + args + ']) => ' + result}});
    return result;
};
`
]));

/**************************************************************************************************
 *
 * Scripting Class
 * 
 * Example - handles button click to call the sayHello function
 * 
 *  document.querySelector("#my_btn").addEventListener("click", function() {
 *       var script = registerModel.getModel().newScriptInstance();
 *       gc.fileCache.readTextFile('app/scripts/myscript.js').then(function(text) {
 *           script.load(text);
 *           return script.eval("sayHello('patrick')");
 *       }).then(function(result) {
 *           console.log(result);
 *       }).fail(function(error) {
 *           console.error(error);
 *       }).finally(function() {
 *           script.stop();
 *       });
 *   });
 * 
 **************************************************************************************************/
function Scripting(bufferLength, callback) {
    /* detect SharedArrayBuffer support */
    if (typeof SharedArrayBuffer === 'undefined') {
        throw new Error('SharedArrayBuffer');
    }

    this.lock           = new SharedArrayBuffer(4);
    this.lockArray      = new Int32Array(this.lock);
    this.userscriptURL  = null;   
    this.worker         = null;
    this.messageHdlr    = callback;
    this.buffer         = new SharedArrayBuffer(bufferLength);
    this.bufferArray    = new Uint8Array(this.buffer);
    this.evalQueue      = [];
    this.events         = new gc.databind.internal.Events();
}

Scripting.prototype.load = function(script) {
    var self = this;

    /* clean up existing user script object and terminate existing worker */
    if (self.userscriptURL) window.URL.revokeObjectURL(self.userscriptURL);
    if (self.worker) self.worker.terminate();

    /* create user script object url */
    self.userscriptURL = window.URL.createObjectURL(new Blob([
        'importScripts("' + RuntimeScriptURL + '")\n' +
        'importScripts("' + APIScriptURL + '")\n\n' +
        script
    ]));

    /* create a worker */
    self.worker = new Worker(self.userscriptURL);

    /* add worker message listener */
    self.worker.onmessage = function(event) {
        if (event.data.cmd) {
            self.messageHdlr(event).then(function(data) {
                /* array data type */
                if (Array.isArray(data)) {
                    self.bufferArray.set(data);
                
                /* boolean data type */
                } else if (typeof data == 'boolean') {
                    self.bufferArray.set([data ? 1 : 0]);
                
                /* number data type */
                } else if (typeof data == 'number') {
                    self.bufferArray.set([data]);
                
                }

                Atomics.store(self.lockArray, 0, 0);

            }).fail(function(err) {
                Atomics.store(self.lockArray, 0, -1);

            }).finally(function() {
                Atomics.wake(self.lockArray, 0);
            });
        } else if (event.data.event) {
            if (event.data.event === 'EvalCompleted' || event.data.event === 'EvalFailed') {
                var deferred = self.evalQueue.shift().deferred;
                event.data.event === 'EvalCompleted' ? deferred.resolve(event.data.detail.result) : deferred.reject(event.data.detail.error);
                if (self.evalQueue.length >= 1) {
                    self.worker.postMessage({
                        cmd: 'eval',
                        expression: self.evalQueue[0].expression
                    });
                }
                return;
            }

            self.fireEvent(event.data.event, event.data.detail);
        }
    };

    /* initialize the worker */
    self.worker.postMessage({
        cmd:    'init',
        buffer: self.buffer,
        lock:   self.lock
    });

    return this;
};

Scripting.prototype.main = function() {
    if (this.worker == null) return;

    this.worker.postMessage({
        cmd: 'main'
    });
};

Scripting.prototype.stop = function() {
    if (this.worker == null) return;
    
    this.evalQueue = [];
    this.worker.terminate();
    this.fireEvent('Terminated');
}

Scripting.prototype.eval = function(expression) {
    if (this.worker == null) {
        this.load(''); // create an empty script
    }

    var deferred = Q.defer();
    this.evalQueue.push({deferred: deferred, expression: expression});

    if (this.evalQueue.length == 1) {
        this.worker.postMessage({
            cmd: 'eval',
            expression: expression
        });
    }

    return deferred.promise;
};

Scripting.prototype.addEventListener = function(event, handler) {
    this.events.addListener(event, handler);
};

Scripting.prototype.removeEventListener = function(event,handler) {
    this.events.removeListener(event, handler);
};

Scripting.prototype.fireEvent = function(event, detail) {
    this.events.fireEvent(event, detail);
};

return Scripting;
})();

