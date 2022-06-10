/*
 * Copyright (c) 2017, Texas Instruments Incorporated
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions
 * are met:
 *
 * *  Redistributions of source code must retain the above copyright
 *    notice, this list of conditions and the following disclaimer.
 *
 * *  Redistributions in binary form must reproduce the above copyright
 *    notice, this list of conditions and the following disclaimer in the
 *    documentation and/or other materials provided with the distribution.
 *
 * *  Neither the name of Texas Instruments Incorporated nor the names of
 *    its contributors may be used to endorse or promote products derived
 *    from this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
 * AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO,
 * THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR
 * PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR
 * CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL,
 * EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO,
 * PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS;
 * OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY,
 * WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR
 * OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE,
 * EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */


// On send command button press this function will issue cmds from the plots tab to "advanced commands" tab
function onSendCmdsPlotsTab() {
    var dynamicInput = new mmWaveInput();
    templateObj.$.ti_widget_label_dynamic_status_message.visible = false;
    templateObj.$.ti_widget_label_status_message.visible = false;
    var receiveCmds = templateObj.$.ti_widget_textbox_dyn.value;
    var cmds = receiveCmds.split(/\r?\n/);

    // This method is used to filter empty lines from array
    function removeEmptyLine(line) {
        return line != "";
    }
    var cmd = cmds.filter(removeEmptyLine);
    var txt1 = "Allowed Commands are: ";
    var list_of_realtime_cmds = {
        "xWR16xx": [
            "cfarCfg",
            "peakGrouping",
            "multiObjBeamForming",
            "extendedMaxVelocity",
            "clutterRemoval",
            "compRangeBiasAndRxChanPhase",
            "nearFieldCfg"
        ],
        "xWR14xx": [
            "cfarCfg",
            "peakGrouping",
            "multiObjBeamForming",
            "clutterRemoval",
            "compRangeBiasAndRxChanPhase"
        ]
    }
    var tempCmd = [];
    cmd = cmd.map(function(cmd) {
        return cmd.replace(/ {1,}/g," ");
    });

//Here it filters list of all cfarCfg commands.For example 16xx will have range, doppler it will return both cfar commands
    var cfarCmds = cmd.filter(function(cfrcmd) {
        if (cfrcmd.indexOf("cfarCfg") > -1) {
            return cfrcmd;
        }
    });

    if (ConfigData !== undefined){
        for(var i = 0; i < cmd.length && !errorflag; i++) {
            var cmdlist = list_of_realtime_cmds[ConfigData.platform];
            var invalidCmd = true;
            var errorflag = false;
            for (var j = 0; j < cmdlist.length; j++){
                if(cmd[i].indexOf(cmdlist[j]) > -1){
                    tempCmd.push(cmd[i]);
                    //Passing 'Params' to execute validations
                    invalidCmd = false;
                    var tempParams = validationsCfg.validateCfg(tempCmd, ConfigData.platform, ConfigData.sdkVersionUint16, Params, true);
                    for (var k = 0; k < ConfigData.cmdLines.length; k++) {

                        if (ConfigData.cmdLines[k].indexOf(cmdlist[j]) > -1) {

                            if (ConfigData.cmdLines[k].indexOf("cfarCfg") > -1) {
                                //To update the latest cfarCfg values(range,doppler) in ConfigData.lines
                                cfarCmds.map(function(cfrCommand){
                                   if(ConfigData.cmdLines[k].substring(0,12) == cfrCommand.substring(0,12)) {
                                       ConfigData.cmdLines[k] = cfrCommand;
                                   }
                                   
                                });
                            } else {
                                ConfigData.cmdLines[k] = cmd[i];
                            }
                        }
                    }
                    break;
                }
            }
            if(invalidCmd){
                templateObj.$.ti_widget_label_dynamic_status_message.visible = true;
                templateObj.$.ti_widget_label_dynamic_status_message.fontColor = "#ff0000";
                templateObj.$.ti_widget_label_dynamic_status_message.label = txt1 + cmdlist.join('\n');
                errorflag = true;
            }
        }
        if(tempParams){
            dynamicCMDSender(tempCmd);
        }
    }
}

function dynamicCMDSender (cmds){
    var dynamicInput = new mmWaveInput();
    cmd_sender_listener.setCfg(cmds, true, false, function (error) {
        if (error) {
            templateObj.$.ti_widget_label_dynamic_status_message.visible = true;
            templateObj.$.ti_widget_label_dynamic_status_message.fontColor = "#ff0000";
            templateObj.$.ti_widget_label_dynamic_status_message.label = "Invalid usage of the CLI command";
        } 
        else {
            var RangeLinearVal = '';
            var DooplerLinearVal = '';
            // Update the real-time tuning based on the commands passed in Advanced Commands text area
            realTimeDynamicControls(cmds, ConfigData.platform, dynamicInput);
        }
    });
}

//Issuing dynamic commands cfar,doppler, peakgrouping,clutter removal for real time tuning in plots tab.
function realTimeTuning(inputChange, val) {
    var dynamicInput = new mmWaveInput();
    templateObj.$.ti_widget_label_dynamic_status_message.visible = false;
    Input = {
        platform: Params.platform,
        Num_Virt_Ant: ConfigData.Num_Virt_Ant,
        sdkVersionUint16: ConfigData.sdkVersionUint16
    }
    //P = {
    //   lines: []
    // }
    var cmd;
    switch (inputChange) {
        case "cfar-range":
            Input.Range_Sensitivity = val;
            Input.Doppler_Sensitivity = null;
            var dbval = dynamicInput.convertSensitivitydBToLinear(val, ConfigData.platform, ConfigData.Num_Virt_Ant);
            var linearVal =[];
            ConfigData.cmdLines.forEach(function (item, index) {
                if (item.indexOf("cfarCfg") > -1) {
                    var lastIndex = item.lastIndexOf(" ");
                    linearVal.push(item.substr(0, lastIndex));
                }
            });
            cmd = linearVal[0] +" "+ dbval;
            break;
        case "cfar-doppler":
            Input.Range_Sensitivity = null;
            Input.Doppler_FFT_size = Params.dataPath[0].numDopplerBins;
            Input.Doppler_Sensitivity = val;
            var dbval = dynamicInput.convertSensitivitydBToLinear(val, ConfigData.platform, ConfigData.Num_Virt_Ant);
            var linearVal =[];
            ConfigData.cmdLines.forEach(function (item, index) {
                if (item.indexOf("cfarCfg") > -1) {
                    var lastIndex = item.lastIndexOf(" ");
                    linearVal.push(item.substr(0, lastIndex));
                }
            });
            cmd = linearVal[1] +" "+ dbval;
            break;
        case "clutter-removal":
            var P = {
                lines: []
            }
            P.clutterRemoval = {};
            dynamicInput.generate_clutterCfg(Input, P);
            cmd = P.lines[0];
            break;
        case "peak-grouping":
            Input.Range_FFT_size = Params.dataPath[0].numRangeBins;
            var peakVals = [];
            ConfigData.cmdLines.forEach(function (item, index) {
                if (item.indexOf("peakGrouping") > -1) {
                    var trimmedItem = item.replace(/ {1,}/g," ");
                    peakVals = trimmedItem.split(" ");
                    if(ConfigData.platform == "xWR16xx"){
                        peakVals[3] = templateObj.$.ti_widget_checkbox_grouppeak_rangedir.checked ? "1" : "0";
                        peakVals[4] = templateObj.$.ti_widget_checkbox_grouppeak_dopplerdir.checked ? "1" : "0";
                    } else if (ConfigData.platform == "xWR14xx"){
                        peakVals[2] = templateObj.$.ti_widget_checkbox_grouppeak_rangedir.checked ? "1" : "0";
                        peakVals[3] = templateObj.$.ti_widget_checkbox_grouppeak_dopplerdir.checked ? "1" : "0";
                    }
                }
            });
            cmd = peakVals.join(' ');
            break;
    }

    /* if(inputChange === 'cfar-doppler'){
         var cmd = P.lines[1];
     } else {
         var cmd = P.lines[0];
     }*/

    cmd_sender_listener.setCfg([cmd], true, false, function (error) {
        if (error) {
            templateObj.$.ti_widget_label_dynamic_status_message.visible = true;
            templateObj.$.ti_widget_label_dynamic_status_message.fontColor = "#ff0000";
            templateObj.$.ti_widget_label_dynamic_status_message.label = "Error: Incorrect "+inputChange+" value  reported by target.";
            templateObj.$.ti_widget_label_status_message.visible = true;
        }
    });
}
