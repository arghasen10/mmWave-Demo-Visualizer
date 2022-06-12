(function() {
    function OCFSPI(packetParser, sendPacket) {
        OCFBaseEx.apply(this, arguments);
        this.handlers = [
            reply_SPI_Enable,
            reply_SPI_Config,
            reply_SPI_WriteAndRead,
            reply_SPI_CaptureSample
        ];
    };
    OCFSPI.prototype = Object.create(OCFBaseEx.prototype);
    OCFSPI.prototype.constructor = OCFSPI;
    window.OCFSPI = OCFSPI;

    OCFSPI.prototype.initSymbolsForDevice = function(settings, registerModel) {
        OCFBaseEx.prototype.initSymbolsForDevice.apply(this, arguments);
    };

    OCFSPI.prototype.read = function(regInfo) {
        var cs_gpio = regInfo.cs_gpio;
        var num_bytes = parseInt(regInfo.num_bytes);
        var dummy = [];
        for (var idx=0; idx<num_bytes; idx++)  dummy.push(0);
        gc.console.debug('OCFSPI', 'read regInfo cs_gpio ' + cs_gpio + ' num_bytes ' + num_bytes);
        return this.SPI_WriteAndRead(this.unit, cs_gpio, dummy, num_bytes);
    };

    OCFSPI.prototype.write = function(regInfo, data) {
        var cs_gpio = regInfo.cs_gpio;
        gc.console.debug('OCFSPI', 'write regInfo cs_gpio ' + cs_gpio + ' data ' + data);
        return this.SPI_WriteAndRead(this.unit, cs_gpio, data, data.length);
    };

    OCFSPI.prototype.ensureConfigured = function(config_seq) {
        var self = this;
        return Q.Promise(function(resolve, reject) {
            var promises = [];
            var seq_len = config_seq ? config_seq.length : 0;
            for (var i=0; i<seq_len; i++) {
                var config = config_seq[i];
                switch (config.command) {
                    case 'enable':
                        promises.push(self.SPI_Enable(config.unit || self.unit, config.enable));
                        break;

                    case 'config':
                        promises.push(self.SPI_Config(config.unit || self.unit, config.bitrate, config.protocol, config.datawidth, config.cs_mode, config.cs_change));
                        break;
                }
            }
            return Q.all(promises).then(resolve).fail(reject);
        }.bind(this));
    };
    
    // Reference ocf_common.h
    //#define SPI_Interface       0x05
    //typedef enum
    //{
    //    ocCmd_SPI_Enable = 0x00,
    //    ocCmd_SPI_Config,
    //    ocCmd_SPI_WriteAndRead,
    //    ocCmd_SPI_CaptureSample,
    //} SPI_CMD;
    var SPI_Interface = 0x05;
    var ocCmd_SPI_Enable = 0x00;
    var ocCmd_SPI_Config = 0x01;
    var ocCmd_SPI_WriteAndRead = 0x02;
    var ocCmd_SPI_CaptureSample = 0x03;
    
    OCFSPI.prototype.SPI_Enable = function(unit, enable) {
        //uint32_t unit, bool enable
        var params = [this.uint32_leb4(unit), this.uint32_leb4(enable ? 1 : 0)];
        return this.h2c_command(SPI_Interface, unit, ocCmd_SPI_Enable, params);
    };
    var reply_SPI_Enable = function(self, qdef, unit, status, replypkt) {
        if (status == 0) {
            var enable = self.leb4_uint32(replypkt.params[1]) == 1;
            self.unit_state[unit].current = enable ? 1 : 0;
            qdef && qdef.resolve(enable);
        } else {
            qdef && qdef.reject(self.status_msg(status, replypkt.payload ? self.bytes_ascii(replypkt.payload) : 'Failed in Enable/Disable'));
        }
    };
    OCFSPI.prototype.SPI_Config = function(unit, bitrate, protocol, datawidth, cs_mode, cs_change) {
        //uint32_t unit, uint32_t bit_rate, uint32_t protocol (spi mode), uint32_t datawidth, uint32_t cs_mode, uint32_t cs_change
        // bitrate: in units of 1kHz; max rate is 60000 kHz
        // protocol: see ssi.h
        //  #define SSI_FRF_MOTO_MODE_0  0x00000000 // Moto fmt, polarity 0, phase 0
        //  #define SSI_FRF_MOTO_MODE_1  0x00000002 // Moto fmt, polarity 0, phase 1
        //  #define SSI_FRF_MOTO_MODE_2  0x00000001 // Moto fmt, polarity 1, phase 0
        //  #define SSI_FRF_MOTO_MODE_3  0x00000003 // Moto fmt, polarity 1, phase 1
        //  #define SSI_FRF_TI           0x00000010 // TI frame format
        //  #define SSI_FRF_NMW          0x00000020 // National microwire frame format
        //  #define SSI_ADV_MODE_BI_READ   0x00000140
        //  #define SSI_ADV_MODE_BI_WRITE  0x00000040
        // datawidth: word width between 4 and 16 bits
        // cs_mode: SPI active mode: 1 active high; 0 active low
        // cs_change: cs_mode change between SPI word. 0: no change; 1: change
        var params = [this.uint32_leb4(unit), this.uint32_leb4(bitrate), this.uint32_leb4(protocol),
                      this.uint32_leb4(datawidth), this.uint32_leb4(cs_mode), this.uint32_leb4(cs_change)];
        return this.h2c_command(SPI_Interface, unit, ocCmd_SPI_Config, params);
    };
    var reply_SPI_Config = function(self, qdef, unit, status, replypkt) {
        if (status == 0) {
            self.unit_state[unit].current = 2;
            qdef && qdef.resolve(true);
        } else {
            qdef && qdef.reject(self.status_msg(status, replypkt.payload ? self.bytes_ascii(replypkt.payload) : 'Failed in Config'));
        }
    };
    OCFSPI.prototype.SPI_WriteAndRead = function(unit, cs_gpio, pWriteBuffer, num_bytes) {
        //uint8_t unit, uint32_t cs_gpio, uint16_t num_bytes,
        //cs_gpio: the gpio pin to be used as the chip select. value is 1<<n, where n=[0..15]
        //pWriteBuffer is uint8_t*, contains data to write
        //num_bytes is number of bytes to write and to read. By SPI design, both write and read bounds have the same number of bytes.
        var params = [this.uint32_leb4(unit), this.uint32_leb4(cs_gpio), this.uint16_leb4(pWriteBuffer && pWriteBuffer.length || num_bytes)];
        return this.h2c_command(SPI_Interface, unit, ocCmd_SPI_WriteAndRead, params, pWriteBuffer);
    };
    var reply_SPI_WriteAndRead = function(self, qdef, unit, status, replypkt) {
        if (!qdef) return;
        if (status == 0) {
            qdef.resolve(replypkt.payload);
        } else {
            qdef.reject(self.status_msg(status, replypkt.payload ? self.bytes_ascii(replypkt.payload) : 'Failed in WriteAndRead'));
        }
    };
    OCFSPI.prototype.SPI_CaptureSample = function(unit, bytes_to_write, sample_size, payload) {
        //uint8_t unit, uint16_t bytes_to_write, unit32_t sample_size
        // bytes_to_write: each_frame_bytes, one_sample_output_bytes * channels
        // sample_size: number of samples to capture for a channel
        // so, total_output_bytes = sample_size * each_frame_bytes
        var params = [this.uint32_leb4(unit), this.uint32_leb4(bytes_to_write), this.uint16_leb4(sample_size)];
        return this.h2c_command(SPI_Interface, unit, ocCmd_SPI_CaptureSample, params, payload);
    };
    var reply_SPI_CaptureSample = function(self, qdef, unit, status, replypkt) {
        if (!qdef) return;
        if (status >= 0 && status <= 2) { // SPI_interface.c, and ocf_common.h; 1: capature in progress, 2: capture sample done
             qdef.resolve(replypkt.payload ? replypkt.payload : true);
        } else {
            qdef.reject(self.status_msg(status, replypkt.payload ? self.bytes_ascii(replypkt.payload) : 'Failed in CaptureSample'));
        }
    };

})();

