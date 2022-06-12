/*****************************************************************
 * Copyright (c) 2016 Texas Instruments and others
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v1.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v10.html
 *
 * Contributors:
 *  Paul Gingrich - Initial API and implementation
 *****************************************************************/
var gc = gc || {};
gc.databind = gc.databind || {};
gc.databind.internal = gc.databind.internal || {};

(function() 
{
    var Sequencer = function(name) 
    {
        this._name = name;
        this._deferred = Q.defer();
        this._scheduler = this._deferred.promise;
        this._events = {};
     };
    
    Sequencer.prototype.start = function()
    {
        this._deferred.resolve();
    };
    
    var doStart = function(name)
    {
        if (name)
        {
            var event = this._events[name];
            if (!event)
            {
                name = name + '.$after';
                event = this._events[name];
            }
            if (event)
            {
                window.setTimeout(function()
                {
                    this._events[name] = undefined;

                    console.log('starting event ' + name);

                    event.start();
                }.bind(this), 1);
                event.thenDo(doStart.bind(this, name + '.$after'));
                return event._scheduler;
            }
        }
    };
    
    Sequencer.prototype.when = function(eventName)
    {
        this.schedule(eventName);
        return this._events[eventName];
    };
    
    Sequencer.prototype.after = function(eventName)
    {
        return this.when(eventName + '.$after');
    };
    
    Sequencer.prototype.thenDo = function(action)
    {
        if (action instanceof String || typeof action === 'string')
        {
            this.schedule(action);
        }
        else
        {
            this._scheduler = this._scheduler.finally(action);
        }
        return this;
    };
    
    Sequencer.prototype.schedule = function(eventName, action)
    {
        var event = this._events[eventName];
        if (!event)
        {
            this.thenDo(doStart.bind(this, eventName));
            event = new Sequencer(eventName);
            if (action)
            {
                event.thenDo(action);
            }
            this._events[eventName] = event;
        }
        return this;
    };
    
    var DISCONNECTED = 'disconnected';
    var CONNECTED = 'connected';
    var CONNECTING = 'connecting';
    var DISCONNECTING = 'disconnecting';
    
    var ITargetConnection = function()
    {
    };
    
    ITargetConnection.prototype.doConnect = function() {};
    ITargetConnection.prototype.doDisconnect = function() {};
    ITargetConnection.prototype.shouldAutoConnect = function() {};
    
    var AbstractTargetConnection = function()
    {
        this.status = DISCONNECTED;
    };
    
    AbstractTargetConnection.prototype = new ITargetConnection();
    
    AbstractTargetConnection.prototype.canConnect = function()
    {
        return this.status === DISCONNECTED || this.status === DISCONNECTING;
    };
    
    AbstractTargetConnection.prototype.shouldAutoConnect = function() 
    {
        return this.status === CONNECTING || this.status === CONNECTED;
    };
    
    var resetOnEventHandlers = function()
    {
        this.onDisconnected = AbstractTargetConnection.prototype.onDisconnected;
        this.onConnected = AbstractTargetConnection.prototype.onConnected;
    };
    
    var completed = Q();

    AbstractTargetConnection.prototype.connect = function(selectedDevice, preventClientAgentInstallCallback) 
    {
        if (this.canConnect())
        {
            this.status = CONNECTING;
            this._progressData = {};
            var self = this;
            return self.doConnect(selectedDevice, preventClientAgentInstallCallback).then(function() 
            {
                if (self.status === CONNECTING)
                {
                    self.status = CONNECTED;
                }
                if (self.setConnectedState)
                {
                    self.onConnected = self.setConnectedState.bind(self, true);
                    self.onDisconnected = self.setConnectedState.bind(self, false);
                }
                else
                {
                    resetOnEventHandlers.call(self);
                }
            }).fail(function(msg) 
            {
                resetOnEventHandlers.call(self);
                self.disconnect();
                throw msg;
            });
        }
        return completed;
    };
    
    AbstractTargetConnection.prototype.disconnect = function() 
    {
        if (!this.canConnect())
        {
            this.status = DISCONNECTING;
            this.onDisconnected(); // force the current operation i.e., connect() to terminate, so the disconnect can proceed.
            gc.connectionManager.setConnectedState(this.id, false);
            
            var self = this;
            return this.doDisconnect().finally(function() 
            {
                if (self.status === DISCONNECTING)
                {
                    self.status = DISCONNECTED;
                }
                resetOnEventHandlers.call(self);
            });
        }
        return completed;
    };
    
    var noop = function() {};
    
    AbstractTargetConnection.prototype.onConnected = noop;
    AbstractTargetConnection.prototype.onDisconnected = noop;
    
    AbstractTargetConnection.prototype.doConnect = function(selectedDevice, preventClientAgentInstallCallback)
    {
        return Q.promise(function(resolve, reject) 
        {
            this.onDisconnected = reject;
            this.onConnected = resolve;
            
            this.startConnecting(selectedDevice, preventClientAgentInstallCallback);
        }.bind(this));
    };
    
    AbstractTargetConnection.prototype.doDisconnect = function()
    {
        return Q.promise(function(resolve, reject) 
        {
            this.onDisconnected = resolve;
            this.onConnected = noop;
            
            this.startDisconnecting();
        }.bind(this));
    };
    
    AbstractTargetConnection.prototype.startConnecting = function()
    {
        this.onConnected();
    };
    
    AbstractTargetConnection.prototype.startDisconnecting = function()
    {
        this.onDisconnected();
    };
    
    var backplaneConnectionCount = 0;
    AbstractTargetConnection.prototype.startBackplane = function(deviceInfo, preventClientAgentInstallCallback)
    {
        var appBackplane = gc.services['ti-core-backplane'];
        var designerBackplane = window.parent.gc && window.parent.gc.services && window.parent.gc.services['ti-core-backplane'];
        if (designerBackplane && designerBackplane !== appBackplane)
        {
            designerBackplane._inDesigner = true;
            gc.services['ti-core-backplane'] = designerBackplane;
        }
        if (designerBackplane && this.backplane && this.backplane !== designerBackplane)
        {
            this.backplane = designerBackplane;
        }

        gc.connectionManager.sequencer.schedule('backplaneReady').schedule('downloadProgram').schedule('targetReady');

        if (backplaneConnectionCount === 0)
        {
            gc.connectionManager.sequencer.when('backplaneReady').thenDo(function() 
            {
                var id = this.id;
                var backplane = gc.services['ti-core-backplane'];
                gc.connectionManager.setProgressMessage(id, 'Connecting to TI Cloud Agent...');
                return backplane.connect(deviceInfo, preventClientAgentInstallCallback).then(function() 
                {
                    if (backplane.isConnectedToCloudAgent) 
                    {
                        gc.connectionManager.setProgressMessage(id, 'Connected to TI Cloud Agent.');
                    }
                    return backplane;
                });
            }.bind(this));
        }
        backplaneConnectionCount++;
    };
    
    AbstractTargetConnection.prototype.stopBackplane = function()
    {
        backplaneConnectionCount--;
        if (backplaneConnectionCount === 0)
        {
            gc.services['ti-core-backplane'].disconnect();
        }
    };
    
    AbstractTargetConnection.prototype.waitForEvent = function(target, eventName, passPropertyName, passPropertyValue, failPropertyName, failPropertyValue)
    {
        return Q.promise(function(resolve, reject) 
        {
            console.log('waitForEvent started for ' + eventName);
            
            // if we are not trying to connect, then abort this operation too.
            if (!this.shouldAutoConnect())
            {
                console.log('waitForEvent cancelled for ' + eventName);
                reject();
                return;
            }
         
            var listener;
            
            // chain the disconnected handler to quit the waitForEvent promise if the user disconnects in the middle of it.
            var disconnectedHandler = this.onDisconnected;
            this.onDisconnected = function() 
            {
                target.removeEventListener(eventName, listener);
                this.onDisconnected = disconnectedHandler;
                console.log('waitForEvent aborted for ' + eventName);
                reject();
                disconnectedHandler();
            }.bind(this);
            
            listener = function() 
            {
                if (!passPropertyName || target[passPropertyName] === passPropertyValue)
                {
                    target.removeEventListener(eventName, listener);
                    console.log('waitForEvent resolved for ' + eventName);
                    this.onDisconnected = disconnectedHandler;
                    resolve();
                }
                if (failPropertyName && target[failPropertyName] === failPropertyValue)
                {
                    target.removeEventListener(eventName, listener);
                    this.onDisconnected = disconnectedHandler;
                    console.log('waitForEvent failed for ' + eventName);
                    reject();
                }
            }.bind(this);
            target.addEventListener(eventName, listener);
            if (passPropertyName)
            {
                listener();
            }
        }.bind(this));
    };
    
    var connections = {};
    var iconClickedEventListener;
    
    var doComputeConnectedState = function()
    {
        var result = true;
        for(var id in connections)
        {
            if (connections.hasOwnProperty(id))
            {
                var connection = connections[id];
                if (connection && connection._progressData && connection._progressData.connectedState !== undefined)
                {
                    result = result && connection._progressData.connectedState;
                }
            }
        }
        return result;
    };
    
    var doComputeConnectionMessage = function()
    {
        var result = '';
        for(var id in connections)
        {
            if (connections.hasOwnProperty(id))
            {
                var connection = connections[id];
                if (connection && connection._progressData && connection._progressData.connectionMessage)
                {
                    if (result.length > 0) 
                    {
                        result += ', ';
                    }
                    result += connection._progressData.connectionMessage;
                }
            }
        }
        if (result.length === 0)
        {
            var backplane = gc.services['ti-core-backplane'];
            if (backplane)
            {
                result = backplane.statusString1;
            }
        }
        return result;
    };
    
    var doUpdateStatusBar = function()
    {
        var statusBar = gc && gc.services && gc.services['ti-widget-statusbar'];
        
        if (statusBar)
        {
            var status = gc.connectionManager.status;
            var progressData = gc.connectionManager._progressData;
            
            var backplane = gc.services['ti-core-backplane'];
            
            if (!backplane)
            {
                // setup click handler to connect or disconnect based on current state. 
                if (iconClickedEventListener)
                {
                    statusBar.removeEventListener("iconclicked", iconClickedEventListener);
                }                    
                if (status === DISCONNECTED || status === DISCONNECTING)
                {
                    iconClickedEventListener = gc.connectionManager.connect.bind(gc.connectionManager);
                    statusBar.addEventListener("iconclicked", iconClickedEventListener);
                    statusBar.setIconName('ti-core-icons:nolink');
                }
                else
                {
                    iconClickedEventListener = gc.connectionManager.disconnect.bind(gc.connectionManager);
                    statusBar.addEventListener("iconclicked", iconClickedEventListener);
                    statusBar.setIconName('ti-core-icons:link');
                }
            }
            
            if (status === CONNECTED)
            {
                var isConnected = doComputeConnectedState();
                statusBar.statusString2 = isConnected ? "Hardware Connected." : (progressData.lastProgressMessage || "Hardware not Connected.");
                statusBar.tooltip1 = statusBar.tooltip2 = statusBar.statusString1 = doComputeConnectionMessage();
                
                if (backplane)
                {
                    if (isConnected)
                    {
                        backplane.restoreIcon();
                        backplane.tooltipIconImage = "Click to Disconnect.";
                    }
                    else if (isConnected === false) 
                    {
                        backplane.setIcon('ti-core-icons:link-off');
                        backplane.tooltipIconImage = "Click to Connect to Hardware.";

                    }
                }
                else 
                {
                    statusBar.setIconName(isConnected ? 'ti-core-icons:link' : 'ti-core-icons:link-off');
                    statusBar.tooltipIconImage = (isConnected ? 'Click to Disconnect.' : 'Click to Connect to Hardware.');
                }
            }
            else if (status === CONNECTING)
            {
                if (backplane){
                    backplane.tooltipIconImage = "Connecting...";
                } else {
                    statusBar.tooltipIconImage = "Connecting...";
                }             
                statusBar.statusString1 = doComputeConnectionMessage();
                if (progressData.lastErrorMessage)
                {
                    statusBar.statusString2 = progressData.lastErrorMessage;
                    statusBar.tooltip2 = progressData.lastErrorTooltip || "";
                    
                    if (progressData.lastErrorToast && statusBar.showToastMessage)
                    {
                        statusBar.showToastMessage(progressData.lastErrorMessage, progressData.lastErrorToast);
                        progressData.lastErrorToast = undefined;
                    }
                }
                else if (progressData.lastProgressMessage !== statusBar.statusString1)
                {
                    statusBar.statusString2 = progressData.lastProgressMessage || ""; 
                    statusBar.tooltip2 = progressData.lastProgressTooltip || ""; 
                }
                else
                {
                    statusBar.statusString2 = ""; 
                    statusBar.tooltip2 = ""; 
                }
            }
            else
            {
                statusBar.tooltip1 = statusBar.statusString1 = "";
                if (progressData && progressData.lastErrorMessage)
                {
                    statusBar.statusString2 = progressData.lastErrorMessage;
                    statusBar.tooltip2 = progressData.lastErrorTooltip || "";
                }
                else 
                {
                    statusBar.statusString2 = "Hardware not Connected.";
                    statusBar.tooltip2 = "";
                }
                
                if (backplane)
                {
                    statusBar.setIconName('ti-core-icons:nolink');
                    backplane.tooltipIconImage = "Click to Connect to Hardware.";
                } else {
                    statusBar.tooltipIconImage = "Click to Connect to Hardware.";
                }
            }
        }
    };
    
    var doSetConnectionMessage = function(transport, message, tooltip)
    {
        transport._progressData = transport._progressData || {};  
        if (transport._progressData.connectionMessage !== message) 
        {
            transport._progressData.connectionMessage = message;
            transport._progressData.connectionTooltip = tooltip;
            if (message) 
            {
                transport.addConsoleMessage('connecting to ' + message, 'debug');
            }
            else
            {
                doUpdateStatusBar();
            }
        }
    };
    
    var skipHardwareNotConnectedMessage = false;
    
    var doSetConnectedState = function(transport, connected, errorMsg) 
    {
        if (transport)
        {
            transport._progressData = transport._progressData || {};
            if (transport._progressData.connectedState !== connected)
            {
                var displayProgress = connected || (transport._progressData.connectedState !== undefined && !skipHardwareNotConnectedMessage);
                transport._progressData.connectedState = connected;
                if (displayProgress)
                {
                    transport.addConsoleProgress(connected ? 'Hardware Connected.' : 'Hardware Not Connected.');
                }
                else
                {
                    doUpdateStatusBar();
                }
                
                // update $target_connected bindings in child modules to the transport
                var models = window.TICoreTransportBaseBehavior.getModels.call(transport);

                for(var i = 0; i < models.length; i++ )
                {
                    models[i].setConnectedState(connected);
                }
                
                // put models into disconnected state when transports lose their connection.
                if (!connected && transport.status === CONNECTED && errorMsg)
                {
                    transport.disconnect(errorMsg);
                }
            }
        }
    };
    
    var ConnectionManager = function() 
    {
        AbstractTargetConnection.call(this);
    };
    
    ConnectionManager.prototype = new AbstractTargetConnection();
    
    var events = {};
    
    ConnectionManager.prototype.addEventListener = function(event, handler)
    {
        events[event] = events[event] || [];
        events[event].push(handler);
    };
    
    ConnectionManager.prototype.removeEventListener = function(event, handler)
    {
        var listeners = events[event] || [];
        for(var i = listeners.length; i-- > 0; )
        {
            if (listeners[i] === handler)
            {
                listeners.splice(i, 1);
            }
        }
    };
    
    var fireEvent = function(event, detail)
    {
        var listeners = events[event] || [];
        for(var i = listeners.length; i-- > 0; )
        {
            var listener = listeners[i];
            try 
            {
                listener.call(listener, { detail: detail }, detail);
            }
            catch(e)
            {
                console.error(e);
            }
        }
    };
    
    /*                                                 Each TargetConnection                     
     *     ConnectionMangager |   CONNECTED      CONNECTING    DISCONNECTED   DISCONNECTING
     *         ------------------------------------------------------------------------------    
     *          CONNECTED     |   CONNECTED      CONNECTING    DISCONNECTED   DISCONNECTING
     *          CONNECTING    |   CONNECTING     CONNECTING    DISCONNECTED   DISCONNECTING
     *          DISCONNECTED  |  DISCONNECTED   DISCONNNECTED  DISCONNECTED   DISCONNECTING
     *          DISCONNECTING |  DISCONNECTING  DISCONNECTING  DISCONNECTING  DISCONNECTING
     */
    var computeStatus = function()
    {
        var result = CONNECTED;
        for(var id in connections)
        {
            if (connections.hasOwnProperty(id))
            {
                var connection = connections[id];
                if (connection)
                {
                    if (result !== DISCONNECTING && connection.status !== CONNECTED)
                    {
                        if (result !== DISCONNECTED || connection.status !== CONNECTING)
                        {
                            result = connection.status;
                        }
                    }
                }
            }
        }
        this.status = result;
        fireEvent('status-changed');
        return result;
    };
    
    var createOperation = function(command) 
    {
        var cmd = command.toLowerCase(); 
        ConnectionManager.prototype['do' + command] = function(param1, param2) 
        {
            fireEvent('status-changed');
            var progressData = this._progressData || {};
            doUpdateStatusBar();
            
            var promises = [];
            for(var id in connections)
            {
                if (connections.hasOwnProperty(id))
                {
                    var connection = connections[id];
                    if (connection)
                    {
                        promises.push(connection[cmd](param1, param2));
                    }
                }
            }
            return Q.allSettled(promises).then(computeStatus.bind(this)).then(function(status) 
            {
                doUpdateStatusBar();
                if (status !== CONNECTED)
                {
                    throw "One or more transports failed to connect without error";
                }
            });
        };
    };
    
    createOperation('Connect');
    createOperation('Disconnect');
    
    ConnectionManager.prototype.register = function(id, connector)
    {
        if (id)
        {
            connections[id] = connector;
        }
    };

    ConnectionManager.prototype.unregister = function(id) 
    {
        if (id)
        {
            this.register(id, null);
        }
    };
    
    var sequencer = Q();
    
    ConnectionManager.prototype.thenDo = function(doNext)
    {
        return this.sequencer.thenDo(doNext);
    };
    
    var scheduledEvents = {};
    ConnectionManager.prototype.schedule = function(eventName, action)
    {
        return this.sequencer.schedule(eventName, action);
    };
    
    ConnectionManager.prototype.shouldAutoConnect = function(transport)
    {
        if (transport)
        {
            var connector = connections[transport];
            return connector && connector.shouldAutoConnect();
        }
        return backplaneConnectionCount > 0;
    };
    
    ConnectionManager.prototype.disableAutoConnect = false;
    ConnectionManager.prototype.autoConnect = function()
    {
        this.schedule('autoconnect', function() 
        {
            return gc.fileCache.readJsonFile('project.json').then(function(manifest) 
            {
                var deviceInfo;
                // Node webkit specific code for auto-connect
                if (manifest.device_name) 
                {
                    deviceInfo = 
                    {
                        boardName: manifest.board_name,
                        deviceName: manifest.device_name,
                        fileName: manifest.target_out_filename,
                        fileFolderName: manifest.target_out_foldername
                    };
                }
                gc.connectionManager.disableAutoConnect = manifest.disableAutoConnect;
                if (!manifest.disableAutoConnect) 
                {
                    gc.connectionManager.connect(deviceInfo);
                }
                else
                {
                    gc.connectionManager.startBackplane(deviceInfo);
                }
            });
        });
    };
    
    ConnectionManager.prototype.saveSettingsToProjectDatabase = function(projectName)
    {
        var properties = {};
        var promises = [];
        for(var id in connections)
        {
            if (connections.hasOwnProperty(id))
            {
                var connection = connections[id];
                if (connection)
                {
                    var promise = connection.saveSettingsToProjectDatabase(properties, projectName);
                    if (promise)
                    {
                        promises.push(promise);
                    }
                }
            }
        }
        
        var result = promises.length > 0 ? Q.all(promises) : Q();
        result.then(function() 
        {
            var projectPath = projectName ? gc.designer.workspace.folderName + '/' + projectName +'/' : "";
            return gc.fileCache.writeJsonFile(projectPath + 'targetsymbols.json', properties);
        });
        return result;
    };
    
    ConnectionManager.prototype.sequencer = new Sequencer('main');
    ConnectionManager.prototype.sequencer.start();
    
    ConnectionManager.prototype.reconnectBackplane = function()
    {
        var that = this;
        if (this.shouldAutoConnect())
        {
            var backplane = gc.services['ti-core-backplane'];
            
            skipHardwareNotConnectedMessage = true;
            
            backplane.disconnect();
            return this.waitForEvent(backplane, 'connectionStatusChanged', 'isConnectedToCloudAgent', false).then(function() 
            {
                window.setTimeout(function()
                {
                    skipHardwareNotConnectedMessage = false;
                    if (that.shouldAutoConnect())
                    {
                        backplane.connect();
                    }
                }, 2500);
            }).fail(function() {
                skipHardwareNotConnectedMessage = false;
            });
        }
    };
    
    ConnectionManager.prototype.addConsoleMessage = function(message, type, id, tooltip, toast)
    {
        this._progressData = this._progressData || {};
        var transport = connections[id];
        if (type === 'error' || toast)
        {
            this._progressData.lastErrorMessage = message;
            this._progressData.lastErrorTooltip = tooltip;
            this._progressData.lastErrorToast = toast;
        }
        else if (type === 'info')
        {
            this._progressData.lastProgressMessage = message;
            this._progressData.lastProgressTooltip = tooltip;
        }
        if (message)
        {
            fireEvent('console-output', { message: message, type: type || 'data', id: id, tooltip: tooltip, showToast: toast } );
            if (type && (type === 'info' || type === 'error'))
            {
                doUpdateStatusBar();
            }
        }
    };
    
    ConnectionManager.prototype.setConnectionMessage = function(transportId, message, tooltip)
    {
        var transport = connections[transportId];
        if (transport) 
        {
            doSetConnectionMessage(transport, message, tooltip);
        }
    };
    
    ConnectionManager.prototype.setProgressMessage = function(transportId, message, tooltip, toast) 
    {
        var transport = connections[transportId];
        if (transport) 
        {
            if (toast)
            {
                transport.addConsoleError(message, tooltip, toast);
            }
            else
            {
                transport.addConsoleProgress(message, tooltip);
            }
        }
    };
    
    ConnectionManager.prototype.setErrorMessage = function(transportId, message, tooltip, toast)
    {
        var transport = connections[transportId];
        if (transport)
        {
            transport.addConsoleError(message, tooltip, toast);
        }
    };
    
    ConnectionManager.prototype.setConnectedState = function(transportId, connected, errorMsg) 
    {
        var transport = connections[transportId];
        if (transport) 
        {
            doSetConnectedState(transport, connected, errorMsg);
        }
    };
    
    ConnectionManager.prototype.onDisconnectedFor = function(transportId)
    {
        var transport = connections[transportId];
        if (transport) 
        {
            transport.onDisconnected();
        }
    };
    
    ConnectionManager.prototype.onConnectedFor = function(transportId)
    {
        var transport = connections[transportId];
        if (transport) 
        {
            transport.onConnected();
        }
    };
    
    ConnectionManager.prototype.getDefaultCcxmlFile = function(transportId, name)
    {
        var transport = connections[transportId];
        if (transport) 
        {
            return transport._ccxmlText && transport._ccxmlText[name.toLowerCase()];
        }
    };
    
    ConnectionManager.prototype.getModels = function(transportId) 
    {
        var transport = connections[transportId];
        if (transport && transport.getModels) 
        {
            return transport.getModels();
        }
        return [];
    };
    
    gc.connectionManager = new ConnectionManager();
    gc.databind.internal.AbstractTargetConnection = AbstractTargetConnection;
    
    gc.connectionManager.thenDo(function() 
    {
        if (!gc.designer)
        {
            return Q.promise(function(resolve) 
            {
                var origOnLoadHandler = window.onload;  
                var timeoutHdlr = window.setTimeout(function()
                {
                    timeoutHdlr = null;
                    resolve();
                    console.error('window.onload() never called.');
                },3000);
                window.onload = function() 
                {
                    if (origOnLoadHandler) {
                        origOnLoadHandler();
                    }
                    if (timeoutHdlr) {
                        window.clearTimeout(timeoutHdlr);
                        timeoutHdlr = null;
                    }
                    resolve();
                };
            }).fail(function(error) 
            { 
                console.error(error); 
            });
        }
    }).thenDo('onLoad');
    
    gc.connectionManagerReady = gc.connectionManagerReady || Q.Promise(function(resolve) { gc.connectionManagerFireReady = resolve; return gc.connectionManager;});
    gc.connectionManagerFireReady(gc.connectionManager);

}());
