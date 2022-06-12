/*****************************************************************
 * Copyright (c) 2015 Texas Instruments and others
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

(function() 
{
    var StorageProvider = function(modelBindings) 
    {
        this._bindings = modelBindings;
    };
    
    StorageProvider.prototype.readData = function()
    {
        var data = {};
        for(var bindName in this._bindings)
        {
            if (this._bindings.hasOwnProperty(bindName))
            {
                var bind = this._bindings[bindName];
                if (!bind.isReadOnly() && bind.excludeFromStorageProviderData === undefined)
                {
                    data[bindName] = this._bindings[bindName].getValue();
                }
            }
        }
        return data;
    };
    
    StorageProvider.prototype.writeData = function(data)
    {
        for(var bindName in data)
        {
            if (data.hasOwnProperty(bindName))
            {
                var bind = this._bindings[bindName];
                if (bind)
                {
                    bind.setValue(data[bindName]);
                }
            }
        }
    };
    
    var TARGET_CONNECTED_BINDNAME = '$target_connected';
    
	/**
	 * Abstract class that provides default implementation of IBindFactory.  This class
	 * implements the getName() method for IBindFactory.
	 *
	 * @constructor
	 * @implements gc.databind.IBindFactory
	 * @param {string} name - uniquely identifiable name for this bind factory.
    */
	gc.databind.AbstractBindFactory = function(name) 
	{
        if ( name !== undefined )
        {
            this._id = name;
        }
	};
	
	gc.databind.AbstractBindFactory.prototype = new gc.databind.IBindFactory();

    /**
     * Method to initialize internal private data structures.  This method must be called once, by
     * final concrete class to initialize all abstract base classes.  This is necessary because the
     * abstract base class constructors are called multiple times, and some initialization needs to
     * be performed only once.  Derived implementations should override this method, and their own
     * one time initialization steps, and call the base classes init() function too.
     *
     */
    gc.databind.AbstractBindFactory.prototype.init = function()
    {
        this._modelBindings = {};
        this._modelBindings[TARGET_CONNECTED_BINDNAME] = new gc.databind.VariableBindValue(false, true);
        this._modelQualifiers = new gc.databind.internal.QualifierFactoryMap();
    };
    
    /**
     * Method to create a storage provider for this Model.  This method should be called from the 
     * overridden init() method of the derived Model.  Do this if you wish menu item File/Save Settings
     * should store the bindings in this model when the user requests it.  In general, Math and prop 
     * bindings do not need to be stored, because their value is not read from a target and therefore
     * represent calculated values that do not change.
     */
    gc.databind.AbstractBindFactory.prototype.createStorageProvider = function()
    {
        var modelBindings = this._modelBindings;

        var name = this.getName();
        gc.File = gc.File || {};
        gc.File.ready = gc.File.ready || Q.Promise(function(resolve) { gc.File.fireReady = resolve; });
        gc.File.ready.then(function() 
        {
            // register data provider to load and store data from the factory provided when called upon.
            gc.File.addDataProvider(name, new StorageProvider(modelBindings));
        });
    };
    
	gc.databind.AbstractBindFactory.prototype.getName = function()
	{
		return this._id;
	};
	
	/**
	 * Helper method for finding and/or creating bindings on this model.  This method does not go through the binding registry
	 * to find the binding, and does not apply qualifiers.  If the binding does not already exist it will be created.
	 * To parse bindings, including qualifiers, use gc.databind.registry.getBinding() api instead, but be sure to prepend the model name to the binding name.
	 * to ensure this model is used to create the binding. 
	 * 
	 * @param {String} name - uniquely identifying the bindable object within the model.  
	 * @return {gc.databind.IBind} - the existing or newly created bindable object, or null if this name is not supported by this model.
	 */
	gc.databind.AbstractBindFactory.prototype.getBinding = function(name)
	{
        // ensure aliased bindings like "uart.temp" and "target_dev.temp" return the same instance of the model's binding.
        // We do this by storing model bindings in the model factory so we can lookup aliased bindings.
        var bind = this._modelBindings[name];
        if (!bind)
        {
            bind = this.createNewBind(name);
            this._modelBindings[name] = bind;
        }
		return bind;
	};
	
	gc.databind.AbstractBindFactory.prototype.parseModelBinding = function(name)
	{
	    return this._modelQualifiers.parseQualifiers(name, this.getBinding, this);
	};
	
    gc.databind.AbstractBindFactory.prototype.getAllBindings = function()
    {
        return this._modelBindings;
    };
    
    /**
     * Method to set the connected or disconnected state of the model.  This method
     * is called by the transport when a connecting is established or broken.  The connected
     * state is available as a binding, "$target_connected", to app developers if they
     * need to show the connected state of a transport.   
     * This method must be called once from the concrete class instance's constructor.  
     *
     * @param {boolean} newState - true if to set state to connected, otherwise new state is disconnected.
     */
    gc.databind.AbstractBindFactory.prototype.setConnectedState = function(newState)
    {
        this._modelBindings[TARGET_CONNECTED_BINDNAME].updateValue(newState);
        
        if (newState && this._connectDeferred)
        {
            this._connectDeferred.resolve();
            this._connectDeferred = null;
        }
    };
    
    /**
     * Query method to determine if the model is connected or disconnected from a target.
     *
     * @return {boolean} - true if the model is connected to a target, otherwise false.
     */
    gc.databind.AbstractBindFactory.prototype.isConnected = function()
    {
        return this._modelBindings[TARGET_CONNECTED_BINDNAME].getValue();
    };
    
    /**
     * Method to register model specific qualifiers.  Qualifiers are registered by name with a factory method
     * for creating the qualifier on demand.  To use a qualifier on a binding, append '.$' plus the name of the 
     * qualifier with an optional numeric agrument; for example, "mybind.$q7" would apply the "q" value qualifier with 7 fractional bits.   
     * All qualifiers can have an optional single value numeric argument.  This means that the qualifier name cannot end with numeric characters;
     * otherwise, they will be parsed as an argument instead of the qualifier name.  All models have the default "q", "hex", "dec", etc..., number
     * formatting qualifiers already registered.  Use this method to register additional, model specific qualifiers.  
     *   
     * 
     * @param {string} name - the name of the qualifier, without the '.$' prefix.
     * @param {gc.databind.AbstractBindFactory~qualifierFactoryMethod} factory - the factory method to create the qualifier on a specific binding.
     */
    gc.databind.AbstractBindFactory.prototype.addQualifier = function(name, factory)
    {
        this._modelQualifiers.add(name, factory);
    };
    
    /**
     * Factory method used by addQualifier.
     * 
     * @param {gc.databind.IBindValue} bind - the binding to apply the qualifier to.
     * @param {number} [param] - optional numeric argument for the qualifier.  If an argument is required, 
     * but it is undefined, an appropriate default (like zero) should be applied.  
     * @callback gc.databind.AbstractBindFactory~qualifierFactoryMethod
     */
    
    /**
     * Helper method to get a promise that is resolved when the model is connected to a target.  
     * Derived classes should use this to delay accessing the target until the model is connected.
     *
     * @return {promise} - a promise that is either already resolved, or will resolve the next time
     * the model is connected to a target through a transport.
     */
    gc.databind.AbstractBindFactory.prototype.whenConnected = function()
    {
        this._connectDeferred = this._connectDeferred || Q.defer();
        return this._connectDeferred.promise;
    };
    
    var ModelBindProvider = function(model)
    {
        this._model = model;
        this._bindings = {};
        this._expressionParser = new gc.databind.internal.expressionParser.ExpressionParser(this);
    };
    
    ModelBindProvider.prototype = new gc.databind.IBindProvider();
    
    var stripSpacesMatchString = /^\s+|\s*([^A-Za-z0-9$_ ']+|'[^']*')\s*|\s+$/g;
    
    ModelBindProvider.prototype.getBinding = function(name, hint)
    {
        if (hint === undefined)
        {
            name = name.replace(stripSpacesMatchString, "$1");
        }

        var bind = this._bindings[name]; // lookup an existing binding for the same expression
        if (bind === undefined) // if not created yet, use expressionParser to create a new binding.
        {
            // pass hint to expressionParser so skip operators already tested for in sub-expressions.
            bind = this._expressionParser.parse(name, hint) || null;
            if (bind !== null)
            {
                bind.setName(name);
            }
            this._bindings[name] = bind;
        }
        return bind;
    };

    ModelBindProvider.prototype.getModel = function(name)
    {
        if (name)
        {
            return gc.databind.registry.getModel(name);
        }
        return this._model;
    };
    
    ModelBindProvider.prototype.dispose = function()
    {
        for ( var name in this._bindings)
        {
            if (this._bindings.hasOwnProperty(name))
            {
                var bind = this._bindings[name];
                if (bind.dispose !== undefined)
                {
                    bind.dispose();
                }
            }
        }
        this._bindings = {};
    };
    
    /**
     * Helper method to parse a binding expression using this model as the default for all binding URI's.
     * The resulting bind expression will not be store in the global registry, but rather in a private one.
     * Therefore, you must use this API to retrieve existing model specific bind expressions. 
     *
     * @return {gc.databind.IBind} - the existing or newly created bindable object, or null if this name is not supported by this model.
     */
    gc.databind.AbstractBindFactory.prototype.parseModelSpecificBindExpression = function(expression)
    {
        this._bindProvider = this._bindProvider || new ModelBindProvider(this);
        var result = this._bindProvider.getBinding(expression);
        return result;
    };
    
    /**
     * Helper method clear all private model specific bind expressions that have been created.  Use this to clear bindings
     * created with the parseModelSpecificBindExpression() helper method.
     */
    gc.databind.AbstractBindFactory.prototype.clearAllModelSpecificBindExpressions = function()
    {
        if (this._bindProvider)
        {
            this._bindProvider = undefined;
        }
    };
    
    /**
     * Method called when a transport is disconnected from the target.  The default implementation is to iterate through 
     * all the bindings and call onDisconnected() on each binding if it supports such a method.  The purpose is for those 
     * bindings to clear any critical errors that might have incurred.
     */
    gc.databind.AbstractBindFactory.prototype.onDisconnected = function()
    {
        var bindings = this.getAllBindings();
        for(var bindName in bindings)
        {
            if (bindings.hasOwnProperty(bindName))
            {
                var bind = bindings[bindName];
                if (bind.onDisconnected)
                {
                    bind.onDisconnected();
                }
            }
        }
    };
    
}());
