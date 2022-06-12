/*************************************************************************************************************
 * (Abstract) OCF Base Interface module.
 *************************************************************************************************************/
(function() {
    /**
     * OCF base interface constructor.
     * 
     * @param {RegisterPacketParser} packetParser the register packet parser
     * @param {Function} sendPacket the send packet callback function
     */
    function OCFBase(packetParser, sendPacket) {
        this.packetParser = packetParser;
        this.sendPacket = sendPacket;
    }

    OCFBase.prototype._analytics_info = {};

    /**
     * OCF base prototype initialize the symbols for device
     * This is a class method, run once per launch of application. This is not an instance method.
     *
     * @param {*} settings the necessary settings/info to initialize this interface prototype
     * @param {RegisterModel} registerModel the model being used for this interface
     */
    OCFBase.prototype.initSymbolsForDevice = function(settings, registerModel) {
        settings._registerModel  = registerModel;

        try {
            //var localhost = window.location.hostname == 'localhost' || window.location.hostname == '127.0.0.1'
            var pathname = window.location.pathname.replace(/(^\/)|(\/$)/g, '');
            var desktop = gc.desktop && gc.desktop.isDesktop();
            var x = 'gallery/view/';
            if (desktop === false && pathname && pathname.indexOf(x) === 0) {
                OCFBase.prototype._analytics_info.action = 'gc_app_aevm_usb2any';
                x = pathname.slice(x.length).split('/');
                OCFBase.prototype._analytics_info.data = {
                    view_url: window.location.href,
                    app_owner: x[0],
                    app_name: x[1],
                    app_ver: x.length >= 3 ? x[3] : '1.0.0'
                }
            }
        } catch (e) {
        };

        // Use registerModel to addPseudoRegister (see gpio), or addUserPreference
        // The pseudoRegister's registerInfo must be {comm: undefined, uri: 'aevm.'+settings.name+'.'+config.name, ...}
        // The comm property is used by AEVM to call read/write. The comm field should be undefined
        // at this point because this is a class method.
        // When addPseudoRegister, should consider to use qualifier for readonly, writeonly, or interrupt when necessary.

        // An instance of interface module's init should update the comm property to point to the instance itself,
        // because that is the only point the instance is already created. Note the sequence of interface modules
        // for this method and init method is the same, so it implicitly matches the correct instance.
        // Use registerModel.getBinding(registerInfo.uri) to updateValue or setValue
        // To get notifying of data on the other end of binding, consider one of these:
        // registerModel.getBinding(registerInfo.uri).addChangedListener({onValueChanged: function(oldValue, newValue) {
        // }});
        // registerModel.getBinding(registerInfo.uri).addStreamingListener({onDataReceived: function(data) {
        // }});

        // client.js: to get notifying of data on the other end of binding, consdier one of these,
        // e.g. the pseudoRegister's uri is 'aevm.gpio.PK7', and the id of register model is regtemp,
        // gc.databind.createTrigger(function() { }, 'regtemp.aevm.gpio.PK7');
        // gc.databind.registry.getBinding('regtemp.aevm.gpio.PK7').addChangedListener();
        // gc.databind.registry.getBinding('regtemp.aevm.gpio.PK7').addStreamingListener();
    };

    /**
     * Initialize the interface.
     * 
     * @param {*} info the necessary information to initialize this interface
     * @returns a promise
     */
    OCFBase.prototype.init = function(info) {
        return Promise.reject('');
    };

    /**
     * Reset the interface.
     * 
     * @returns a promise
     */
    OCFBase.prototype.reset = function() {
        return Promise.reject('');
    };

    /**
     * Handles the incoming packet.
     *
     * @param {*} packet the incoming packet
     * @returns true if handled, otherwise false
     */
    OCFBase.prototype.handlePacket = function(packet) {
        return false;
    };

    /**
     * A macro function to read register
     * @param {*} regInfo the register info
     * @return a promise
     */
    OCFBase.prototype.read = function(regInfo) {
        return Promise.reject('');
    };

    /**
     * A macro function to write register
     * @param {*} regInfo the register info
     * @param {*} data the data to write
     * @returns a promise
     */
    OCFBase.prototype.write = function(regInfo, data) {
        return Promise.reject('');
    };

    OCFBase.prototype._send_analytics = function(data) {
        if (!OCFBase.prototype._analytics_info.action) return;
        var req = new XMLHttpRequest();
        req.open('POST', '/analytics');
        req.setRequestHeader("Content-Type", "application/json");
        // add viewurl, appname, action here
        var x = {
            action: OCFBase.prototype._analytics_info.action,
            data: Object.assign({}, OCFBase.prototype._analytics_info.data, data)
        }
        req.send(JSON.stringify(x));
    };

    /**********************************************************************************
     * Helper methods to convert between byte array and javascript number
     *********************************************************************************/
    OCFBase.prototype.uint32_leb4 = function(val) {
        return [val & 0xff, (val >> 8) & 0xff, (val >> 16) & 0xff, (val >> 24) & 0xff];
    };

    OCFBase.prototype.leb4_uint32 = function(val) {
        return (val[3]&0xff)<<24 | (val[2]&0xff)<<16 | (val[1]&0xff)<<8 | (val[0]&0xff);
    };

    OCFBase.prototype.uint16_leb2 = function(val) {
        return [val & 0xff, (val >> 8) & 0xff];
    };

    OCFBase.prototype.leb2_uint16 = function(val) {
        return (val[1]&0xff)<<8 | (val[0]&0xff);
    };

    OCFBase.prototype.uint16_leb4 = function(val) {
        return [val & 0xff, (val >> 8) & 0xff, 0x0, 0x0];
    };

    OCFBase.prototype.leb4_uint16 = function(val) {
        return leb2_uint16(val); // must ignore val[3] and val[2]
    };

    OCFBase.prototype.value_to_bytes = function(value, bit_size, endian, in_place_buf) {
        var buf = in_place_buf || [];
        if (bit_size <= 8) {
            buf.push(value);
        } else {
            var bs=(((bit_size-1)>>3)<<3);
            if (endian == 'big') {
                for (var b=bs; b>=0; b-=8) { buf.push( (val >> b) & 0xff ); }
            } else { // (endian == 'little')
                for (var b=0; b<=bs; b+=8) { buf.push( (val >> b) & 0xff ); }
            }
        }
        return buf;
    };

    /* Exports the OCFBase object */
    window.OCFBase = OCFBase;
})();
