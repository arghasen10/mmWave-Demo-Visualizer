/*******************************************************************************
 * Copyright (c) 2017-18 Texas Instruments and others All rights reserved. This
 * program and the accompanying materials are made available under the terms of
 * the Eclipse Public License v1.0 which accompanies this distribution, and is
 * available at http://www.eclipse.org/legal/epl-v10.html
 * 
 * Contributors: Gingrich, Paul - Initial API and implementation
 ******************************************************************************/
var gc = gc || {};
gc.databind = gc.databind || {};

(function() // closure for private static methods and data.
{
    /**
     * Abstract class that provides default implementation of IBindFactory for a polling data model.  This class
     * provides a "$refresh_interval" binding can be used to control the polling interval any bindings that are created.
     * Alternatively, each binding could have it's own polling interval as needed.  The $refresh_interval is available
     * to app developers so that they could allow end users to control the polling interval.  The refresh interval represents 
     * a delay between polling cycles, and does not reflect real time constraints.  This way if refresh interval is too short
     * it doesn't backlog polling operations, instead it simply polls as fast as possible.
     *
     * @constructor
     * @extends gc.databind.AbstractBindFactory
     * @param {string} name - uniquely identifiable name for this bind factory.
    */
    gc.databind.AbstractPollingDataModel = function(name)
    {
        gc.databind.AbstractBindFactory.call(this, name);
    };
    
    gc.databind.AbstractPollingDataModel.prototype = new gc.databind.AbstractBindFactory();

    gc.databind.AbstractPollingDataModel.prototype.init = function()
    {
        gc.databind.AbstractBindFactory.prototype.init.call(this);
        
        this._modelBindings.$refresh_interval = new gc.databind.RefreshIntervalBindValue();
        this.createStorageProvider();
    };

    /**
     * Creates a new scripting instance.
     * 
     * @private
     */
    gc.databind.AbstractPollingDataModel.prototype.newScriptInstance = function() {
        /* 
         * The default implementation has a buffer length of 24+2048 bytes use for 
         * communcation between the UI thread and the worker thread.
         */
        return new gc.databind.Scripting(24 /*header*/ + 2048 /*payload*/, this._scriptHandler.bind(this));
    };

    /**
     * The script handler, subclass can override this implementation.
     * 
     * @param {Object} event the callback event object
     * @private
     */
    gc.databind.AbstractPollingDataModel.prototype._scriptHandler = function(event) {
        var self   = this;
        var detail = event.data;

        /* handle common messages */
        switch (detail.cmd) {
            case 'read':                       
                return self.readValue(detail.name).then(function(value) {
                    var binding = self.getBinding(detail.name);
                    binding.updateValue(value);
                    return value;
                });

            case 'write':
                return self.writeValue(detail.name, detail.value).then(function() {
                    return self.readValue(detail.name);  
                }).then(function(value) {
                    var binding = self.getBinding(detail.name);
                    binding.updateValue(value);
                });
            
            case 'invoke': 
                if (self._codec != null && self._codec.getInterfaces != null) {
                    var _name = detail.name;
                    var _inf  = detail.inf;
                    var _args = detail.args;

                    var infs = self._codec.getInterfaces();
                    for (var i in infs) {
                        if (_inf === i && infs.hasOwnProperty(i)) {
                            var inf = infs[i];
                            return inf[_name].apply(inf, _args);
                        }
                    }
                    return Q.reject('Unknown API: ' + _name);
                
                } else {
                    return Q.reject('Codec is required to implement the getInterfaces API.');
                }
        }

        return Q.reject('Unsupported cmd or event: ' + detail.cmd || detail.event);
    };

}());
