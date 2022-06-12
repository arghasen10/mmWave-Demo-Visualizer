/*****************************************************************
 * Copyright (c) 2018 Texas Instruments and others
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

/**
 * Interface for reading and writing values from a target by encoding and decoding 
 * packets over a transport.  This interface is generally used by polling models to
 * perform periodic read and write operations, instead of pushing data as it changes.
 * 
 * @interface
 * @extends gc.databind.IPacketCodec
 */
gc.databind.IPollingPacketCodec = function()
{
};

gc.databind.IPollingPacketCodec.prototype = new gc.databind.IPacketCodec();

/**
 * Start a read operation to read a value from the target.
 *    
 * @param entity {Object} - model specific info identifying which value to read from the target.
 * @return {Promise} - A promise that is resolved with the value read from the target.
 */
gc.databind.IPollingPacketCodec.prototype.readValue = function(entity)
{
};

/**
 * Start a write operation to write a value to the target.
 *    
 * @param {object} entity - model specific info identifying which value to write to the target.
 * @param {Object} value - The value to write to the target
 * @returns {Promise} - A promise when the writeValue operation has completed. 
 */
gc.databind.IPollingPacketCodec.prototype.writeValue = function(entity, value)
{
};

/**
 * Connect method that is called when the transport is connected.  This method provides
 * a means for performing protocol handshaking with the target before reading or writing values.
 *    
 * @param {object} settings - model specific info containing settings for parameterizing the codec.
 * @returns {Promise} - A promise when the connection has been completed. 
 */
gc.databind.IPollingPacketCodec.prototype.connect = function(settings)
{
};

/**
 * Disconnect method that is called when the transport disconnects.  This method provides
 * a means of performing clean up when the target disconnects.     
 *    
 */
gc.databind.IPollingPacketCodec.prototype.disconnect = function()
{
};

/**
 * Implmentation of encode() method that passed data through to the next codec.
 * For a polling packet codec, the readValue and writeValue methods send packets
 * by calling this.encoder(packet).  The encoder function will already be bound to
 * the next codec in the chain, but it calls the encode method on this codec first.
 * So, an implementation of encode() is required to pass the packet to the target codec.     
 *    
 */
gc.databind.IPollingPacketCodec.prototype.encode = function(target, data)
{
    target(data); 
};
