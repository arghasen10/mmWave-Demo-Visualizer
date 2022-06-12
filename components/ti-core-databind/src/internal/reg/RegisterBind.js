/*****************************************************************
 * Copyright (c) 2017 Texas Instruments and others
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
gc.databind.internal.reg = gc.databind.internal.reg || {};

(function() 
{
    gc.databind.internal.reg.RegisterBind = function(uri, model, refreshIntervalProvider, symbolData) 
    {
        gc.databind.AbstractAsyncBindValue.call(this, 'number');
        
        var that = this;
        
        that.uri = uri;
        that.parentModel = model;
        
        that._onFailure = function(errMsg)
        {
            if (that.parentModel.isConnected())
            {
                that.reportErrorStatus(errMsg);
            }
            var callback = that._callback;
            that._callback = undefined;
            callback(that.fCachedValue);  // don't record a new value, keep the same value as before. 
        };
        
        that._onSuccess = function(result)
        {
            // clear errors on succesfull read
            that.reportCriticalError(null);
            
            return result;
        };
        
        // add refresh listener and create dispose() method to remove listener when done.
        refreshIntervalProvider.addRefreshListener(that);
        that.dispose = function()
        {
            refreshIntervalProvider.removeRefreshListener(that);
        };
        
        this.updateRegisterInfo(symbolData);
        
    }; 
    
    gc.databind.internal.reg.RegisterBind.prototype = new gc.databind.AbstractAsyncBindValue('number');

    gc.databind.internal.reg.RegisterBind.prototype.writeValue = function(callback)
    {
        this._callback = callback;
        this.parentModel.writeValue(this.uri, this.fCachedValue).then(callback).fail(this._onFailure);
    };
    
    gc.databind.internal.reg.RegisterBind.prototype.readValue = function(callback)
    {
        this._callback = callback;
        this.parentModel.readValue(this.uri).then(this._onSuccess).then(callback).fail(this._onFailure); 
    };
    
    gc.databind.internal.reg.RegisterBind.prototype.reportErrorStatus = function(errorMessage)
    {
        var status = null;
        if (errorMessage && errorMessage.length > 0)
        {
            status = gc.databind.AbstractStatus.createErrorStatus(errorMessage, 'target');
        }
        this.reportCriticalError(status);
    };
    
    gc.databind.internal.reg.RegisterBind.prototype.updateRegisterInfo = function(symbolData)
    {
        if (symbolData)
        {
            var defaultValue = gc.utils.string2value(symbolData.value || symbolData['default']);
            if (defaultValue !== undefined)  // restore default for the new device, before reading the actual value.
            {
                this.updateValue(defaultValue, undefined, true);
                this.setStale(false);
            }
            // support for qualifiers in register symbol data
            if (!this._readable)              // remove existing qualifiers
            {
                this._readable = true;
            }
            if (!this._writable)
            {
                this._writable = true;
            }
            if (!this._volatile)
            {
                this._volatile = true;
            }
            
            var type = symbolData.type;
            if (type)
            {
                // add any new qualifiers
                if (type === 'R')
                {
                    type = 'readonly';
                }
                else if (type === 'W')
                {
                    type = 'writeonly';
                }
                this.addQualifier(type);
            }
            
            // clear errors on successful read
            this.reportCriticalError(null);
        }
    };
    
    var typeParser = /\s*(unsigned\s|signed\s)?\s*(int|q(\d+))\s*/i;
    
    var onChangedListener = function()
    {
        var value = (this.parentBind.getValue() & this._mask) >>> this._shift;
        
        if (this._maxValue && (value >= this._maxValue))
        {
            // convert to signed
            value = value - (this._maxValue << 1);
        }
        if (this._q && !isNaN(value))
        {
            value = value / (Math.pow(2, this._q));
        }
        
        this.updateValue(value, undefined, true); 
    };
    
    var onStatusListener = function(status)
    {
        if (!this.fCachedStatus) 
        {
            // relay parent binding status (null or error), unless we are reporting our own error message.
            this.setStatus(status);
        }
    };
    
    gc.databind.internal.reg.FieldBind = function(name, registerBind, symbolData) 
    {
        gc.databind.AbstractBindValue.call(this);

        this.parentBind = registerBind;
        this.uri = name;
        
        var parentChangedListener = new gc.databind.IChangedListener();
        parentChangedListener.onValueChanged = onChangedListener.bind(this);
        parentChangedListener.onStatusChanged = onStatusListener.bind(this);
        registerBind.addChangedListener(parentChangedListener);
        registerBind.addStatusListener(parentChangedListener);
        
        this.dispose = function()
        {
            registerBind.removeChangedListener(parentChangedListener);
            registerBind.removeStatusListener(parentChangedListener);
        };
        
        this.updateRegisterInfo(symbolData);
    };
    
    gc.databind.internal.reg.FieldBind.prototype = new gc.databind.AbstractBindValue('number');
    
    gc.databind.internal.reg.FieldBind.prototype.excludeFromStorageProviderData = true;

    gc.databind.internal.reg.FieldBind.prototype.updateRegisterInfo = function(symbolData)
    {
        try 
        {
            // setup default mask and shift for when no symbol data is available.
            this._mask = 1;
            this._shift = 0;  
            
            if (symbolData)
            {
                var type = symbolData.type;
                var startBit = gc.utils.string2value(symbolData.start);
                var stopBit = gc.utils.string2value(symbolData.stop);
                
                startBit = startBit || 0;
                stopBit = stopBit || startBit;
                var bitWidth = stopBit - startBit + 1;
                this._mask = (1 << (startBit + bitWidth)) - (1 << startBit);
                this._shift = startBit; 
                
                if (type)
                {
                    var match = typeParser.exec(type);
                    if (match && match.index === 0)
                    {
                        var isUnsigned = match[1] && match[1].toLowerCase() === 'unsigned'; 
                        if (!isUnsigned)
                        {
                            this._maxValue = 1 << (bitWidth - 1);
                        }
                        var q = match[3] && +match[3];
                        if (!q || isNaN(q) || q < 0)
                        {
                            throw "invalide type declaration for field: " + name;
                        }
                        else if (q > 0)
                        {
                            this._q = q;
                        }
                    }
                    else
                    {
                        throw "invalide type declaration for field: " + name;
                    }
                }
        
                // initialize value based on default register value.
                onChangedListener.call(this);
                
                this.fCachedStatus = undefined;
                this.setStatus(this.parentBind.getStatus());  // clear any errors,
            }
            else
            {
                throw 'Bit field "' + this.uri + '" is not recognized for this device.';
            }
        }
        catch(e)
        {
            this.fCachedStatus = gc.databind.AbstractStatus.createErrorStatus(e);
            this.setStatus(this.fCachedStatus);
        }
    };
    
    gc.databind.internal.reg.FieldBind.prototype.onValueChanged = function(oldValue, newValue, progress)
    {
        newValue = +newValue;
        if (this._q && !isNaN(newValue))
        {
            newValue = Math.round(newValue * Math.pow(2, this._q));
        }
        
        newValue = (newValue << this._shift) & this._mask;
        oldValue = this.parentBind.getValue() & ~this._mask;
        this.parentBind.setValue(newValue | oldValue); 
    };
    
    gc.databind.internal.reg.FieldBind.prototype.onFirstDataReceivedListenerAdded = function() 
    {
        this.parentBind.addStreamingListener(this);
    };

    /**
     * Method called when the last streaming listener is removed from the list.
     * Derived classes can override this method to be notified for this event.
     */
    gc.databind.internal.reg.FieldBind.prototype.onLastDataReceivedListenerRemoved = function()
    {
        this.parentBind.removeStreamingListener(this);
    };
    
    gc.databind.internal.reg.FieldBind.prototype.onDataReceived = function()
    {
        this.notifyDataReceivedListeners(this.fCachedValue);
    };
    
    gc.databind.internal.reg.FieldBind.prototype.isStale = function()
    {
        return this.parentBind.isStale();
    };
    
    gc.databind.internal.reg.FieldBind.prototype.addStaleListener = function(listener)
    {
        this.parentBind.addStaleListener(listener);
    };
    
    gc.databind.internal.reg.FieldBind.prototype.removeStaleListener = function(listener)
    {
        this.parentBind.removeStaleListener(listener);
    };
    
}());


