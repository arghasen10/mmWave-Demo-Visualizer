/*
OCF_PACKET Structure: {
    uint16_t     signature;     // Packet signature (must be PACKET_SIGNATURE value)
    uint16_t     type;          // Type of packet
    uint32_t     status;        // Status code returned by command function
    uint32_t     transfer_len;  // Total number of bytes in the transfer
    uint16_t     packet_num;    // Sequential packet number
    uint16_t     payload_len;   // Number of bytes in the payload
    uint16_t     if_type_unit;  // Interface type and unit
    uint16_t     command;       // Command code
    uint32_t     param[8];      // eight 32-bit parameters
    byte[0-2048] payload;       // payload 0 to 2048 bytes
}
*/

(function() {
    const IS_CONNECTED_REQUEST_TIMEOUT = 500;  /* time out value to wait for controller to isConnected request */
    const CONNECT_REQUEST_TIMEOUT      = 1500; /* time out value to wait for controller to isConnected request */

    const NO_RESPONSE_MESSAGE          = 'Controller is not responding.';

    /*********************************************************************************************************************
     * 
     * AEVMCodec
     * 
     * API
     *      getInterfaces - Returns the interface instances.
     * 
     * User Perference Bindings
     *      aevm.$sendPacketInterval - Controls the interval between each packet that is send to the controller.
     * 
     *********************************************************************************************************************/
    var AEVMCodec = function()  {
        this._packetParser    = new RegisterPacketParser();
        this._ocfIF           = {};
        this._SEQSendQ        = [];
        this._SEQSendQIntHldr = null;
    }
    AEVMCodec.prototype = new gc.databind.IPacketCodec();
    AEVMCodec.prototype._sendPacketInterval = 100; // default send packet interval

    function _toHexString(byteArray) {
        return Array.from(byteArray, function(byte) {
            return ('0' + (byte & 0xFF).toString(16).toUpperCase()).slice(-2);
        }).join(' ')
    }

    AEVMCodec.prototype._processSEQ = function() {
        if (this._SEQSendQIntHldr == null) {
            this._SEQSendQIntHldr = setTimeout(function() {
                this._SEQSendQIntHldr = null;

                var _rawData = this._SEQSendQ.shift();   
                if (_rawData) { 
                    this.encoder(_rawData);
                    this._processSEQ();
                } 
                
            }.bind(this), AEVMCodec.prototype._sendPacketInterval);
        }
    };

    AEVMCodec.prototype._sendPacket = function(packet) {
        var rawData = this._packetParser.encode(packet);
        this._SEQSendQ.push(rawData);
        this._processSEQ();
    };

    AEVMCodec.prototype._consoleRawPacketMessageCallback = function(label, data) {
        return label + _toHexString(data);
    };

    AEVMCodec.prototype.initSymbolsForDevice = function(config, registerModel) {
        gc.console.log('AEVMCodec', 'initSymbolsForDevice');

        /* initialize aevm preference bindings */
        registerModel.addUserPreference('aevm.$sendPacketInterval', AEVMCodec.prototype._sendPacketInterval);
        registerModel.getBinding('aevm.$sendPacketInterval').addChangedListener({onValueChanged: function(oldValue, newValue) {
            AEVMCodec.prototype._sendPacketInterval = Number(newValue);
        }});

        /* intialize interface symbols */
        var interfaces = config.interfaceList;
        if (interfaces) {
            for (var i = 0; i < interfaces.length; ++i) {
                var interface = interfaces[i];
                try {
                    switch (interface.name) {
                        case 'system':
                            OCFSystem.prototype.initSymbolsForDevice(interface, registerModel);
                            break;
                        case 'i2c': 
                            OCFI2C.prototype.initSymbolsForDevice(interface, registerModel);
                            break;
                        case 'gpio':
                            OCFGPIO.prototype.initSymbolsForDevice(interface, registerModel);
                            break;
                        case 'spi':
                            OCFSPI.prototype.initSymbolsForDevice(interface, registerModel);
                            break;
                        case 'uart':
                            OCFUart.prototype.initSymbolsForDevice(interface, registerModel);
                            break;
                    }
                } catch (e) {
                    gc.console.error('AEVMCodec', e.toString());
                }
            }
        }
    };

    /** 
     * Returns the interface instances. Application can use the interface instance directly to interact with
     * the firmware by invoking the provided public API.
     */
    AEVMCodec.prototype.getInterfaces = function() {
        return this._ocfIF;
    },

    AEVMCodec.prototype.connect = function(settings) {
        gc.console.log('AEVMCodec', 'connect');
        var self = this;
       
        return Q.Promise(function(resolve, reject) {
            /* reject response if getInfo not returning within CONNECT_REQUEST_TIMEOUT */
            var timeoutHdlr = setTimeout(function() {
                reject(NO_RESPONSE_MESSAGE);
            }, CONNECT_REQUEST_TIMEOUT);

            /* intialize the system interface first */
            self._ocfIF.system = new OCFSystem(self._packetParser, self._sendPacket.bind(self));
            self._ocfIF.system.init().then(function() {
                var ifPromises = [];

                /* now initalize the dependent interfaces */
                for (var i = 0; settings != null && i < settings.length; ++i) {
                    var setting    = settings[i];
                    var interfaces = setting.interfaceList;

                    for (var j = 0; j < interfaces.length; ++j) {
                        var interface = interfaces[j];
                        switch (interface.name) {
                            case 'i2c':
                            self._comm = setting._comm = self._ocfIF.i2c = new OCFI2C(self._packetParser, self._sendPacket.bind(self));
                                ifPromises.push(self._ocfIF.i2c.init(interface));
                                break;
            
                            case 'gpio':
                                self._ocfIF.gpio = new OCFGPIO(self._packetParser, self._sendPacket.bind(self));
                                ifPromises.push(self._ocfIF.gpio.init(interface));
                                break;
            
                            case 'spi':
                                self._comm = setting._comm = self._ocfIF.spi = new OCFSPI(self._packetParser, self._sendPacket.bind(self));
                                ifPromises.push(self._ocfIF.spi.init(interface));
                                break;
            
                            case 'uart':
                                self._ocfIF.uart = new OCFUart(self._packetParser, self._sendPacket.bind(self));
                                ifPromises.push(self._ocfIF.uart.init(interface));
                                break;
                        }
                    }
                }
                return Q.all(ifPromises);
            
            }).then(function() {
                gc.console.log('AEVMCodec', 'System connected');
                clearTimeout(timeoutHdlr);
                resolve();

            }).fail(reject);
        });
    };

    AEVMCodec.prototype.disconnect = function(callback) {
        gc.console.log('AEVMCodec', 'disconnect');
        this.reset();
    };

    AEVMCodec.prototype.readValue = function(registerInfo) {
        var _comm = registerInfo.comm || (registerInfo.parentGroup && registerInfo.parentGroup.parentDevice.parentConfiguration._comm) || this._comm;

        if (_comm != null) {
            return _comm.read(registerInfo);
        } else {
            return Q.reject('Cannot read value, undefined ' + device.interface + ' OCF interface.');
        }
    };

    AEVMCodec.prototype.writeValue = function(registerInfo, value) {
        var _comm = registerInfo.comm || (registerInfo.parentGroup && registerInfo.parentGroup.parentDevice.parentConfiguration._comm) || this._comm;

        if (_comm != null) {
            return _comm.write(registerInfo, value);
        } else {
            return Q.reject('Cannot write value, undefined ' + device.interface + ' OCF interface.');
        }
    };

    AEVMCodec.prototype.encode = function(target, rawData) {
        gc.console.log('AEVMCodec', this._consoleRawPacketMessageCallback, 'AEVMCodec.encode: ', rawData);

        target(rawData);
    };

    AEVMCodec.prototype.decode = function(target, rawData) {
        gc.console.log('AEVMCodec', this._consoleRawPacketMessageCallback, 'AEVMCodec.decode: ', rawData);

        var handled = false;
        var parser = this._packetParser;
        var packet = parser.decode(rawData);
        var interfaceType = parser.getPacketInterface(packet);
        try {
            switch (interfaceType) {
                case 0x00: // system
                    if (typeof this._ocfIF.system != 'undefined') { return this._ocfIF.system.handlePacket(packet); }

                case 0x01: // memory
                    break;

                case 0x02: // port
                    break;

                case 0x03: // i2c
                    if (typeof this._ocfIF.i2c != 'undefined') { return this._ocfIF.i2c.handlePacket(packet); }

                case 0x04: // gpio
                    if (typeof this._ocfIF.gpio != 'undefined') { return this._ocfIF.gpio.handlePacket(packet); }

                case 0x05: // spi
                    if (typeof this._ocfIF.spi != 'undefined') { return this._ocfIF.spi.handlePacket(packet); }

                case 0x06: // uart
                    if (typeof this._ocfIF.uart != 'undefined') { return this._ocfIF.uart.handlePacket(packet); }
            }

        } catch (err) {
            gc.console.error('AEVMCodec', err);
            return false;
        }

        // pass along to the next target
        return target(rawData);
    };

    AEVMCodec.prototype.reset = function() {
        this._SEQSendQ = [];

        for (var property in this._ocfIF) {
            if (this._ocfIF.hasOwnProperty(property)) {
                this._ocfIF[property].reset();
            }
        }
    };

    AEVMCodec.prototype.isConnected = function() {
        gc.console.log('AEVMCodec', 'isConnected');

        var self = this;
        return Q.Promise(function(resolve, reject) {
            /* reject response if getInfo not returning within IS_CONNECTED_REQUEST_TIMEOUT */
            var timeoutHdlr = setTimeout(function() {
                reject(NO_RESPONSE_MESSAGE);
            }, IS_CONNECTED_REQUEST_TIMEOUT);

            self._ocfIF.system.getInfo().then(function(info) {
                clearTimeout(timeoutHdlr);
                resolve();
            });
        })

    }

    /*********************************************************************************************************************
     * 
     * AEVMCodec_FrameDecoder
     * 
     *********************************************************************************************************************/    
    var AEVMCodec_FrameDecoder = function() {
        this._packetParser = new RegisterPacketParser(); 
    };
    AEVMCodec_FrameDecoder.prototype = new gc.databind.AbstractFrameDecoder(null, AEVMCodec_FrameDecoder.getPacketLength);

    AEVMCodec_FrameDecoder.prototype.getPacketLength = function(buffer, offset) {
        gc.console.log('AEVMCodec', function() { return 'AEVMCodec_FrameDecoder.getPacketLength:' + _toHexString(buffer) });
        return this._packetParser.getFramePacketLength(buffer, offset);
    };

    // register AEVMCodec packet codec with optional frame decoder (for use with USB transport, that is not HID).
    gc.databind.registerCustomCodec('aevm', AEVMCodec, null, AEVMCodec_FrameDecoder);
}());
