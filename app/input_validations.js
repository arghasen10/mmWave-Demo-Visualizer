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

(function () {
	function validations() {
		if (!(this instanceof validations))
			return new validations();

		//this.init();
	}
	function parseCfg(lines, platform, sdkVersionUint16) {
		var P = {
			channelCfg: {}, dataPath: [], profileCfg: [], frameCfg: {}, guiMonitor: [], extendedMaxVelocity: [],
			dfeDataOutputMode: {}, advFrameCfg: {}, subFrameCfg: [], chirpCfg: [], subFrameInfo: [],
			log2linScale: [], platform: platform, cmdReceivedFlag: {}, numDetectedObj: [],
			dspFftScaleComp2D_lin: [], dspFftScaleComp2D_log: [],
			dspFftScaleComp1D_lin: [], dspFftScaleComp1D_log: [], dspFftScaleCompAll_lin: [], dspFftScaleCompAll_log: [],
			interFrameProcessingTime: [], transmitOutputTime: [], interFrameProcessingMargin: [],
			interChirpProcessingMargin: [], activeFrameCPULoad: [], interFrameCPULoad: [], compRxChanCfg: {}, measureRxChanCfg: {},
			bpmCfg: [], nearFieldCfg: []
		};

		dataFrameQueue = [];

		/*initialize variables*/
		for (var i = 0; i < maxNumSubframes; i++) {
			/*data path*/
			P.dataPath[i] = {
				numTxAzimAnt: 0,
				numTxElevAnt: 0,
				numRxAnt: 0,
				azimuthResolution: 0,
				numChirpsPerFrame: 0,
				numDopplerBins: 0,
				numRangeBins: 0,
				rangeResolutionMeters: 0,
				rangeMeters: 0,
				velocityMps: 0,
				dopplerResolutionMps: 0
			};

			/*log2lin*/
			P.log2linScale[i] = 0;

			/*max vel*/
			P.extendedMaxVelocity[i] = {
				enable: 0
			};

			/*gui monitor*/
			P.guiMonitor[i] = {
				subFrameIdx: 0,
				detectedObjects: 0,
				logMagRange: 0,
				noiseProfile: 0,
				rangeAzimuthHeatMap: 0,
				rangeDopplerHeatMap: 0,
				statsInfo: 0
			};

		}

		P.dfeDataOutputMode.mode = 0;
		P.configErrorFlag = 0;
		profileCfgCounter = 0;
		chirpCfgCounter = 0;

		var tp = validateCfg(lines, platform, sdkVersionUint16, P, false);
		P = tp;

		//check if all necessary CLI commands were received
		if(P) {
			if ((sdkVersionUint16 >= 0x0101) && (verifyCmdReceived(P, platform, sdkVersionUint16, false) == -1)) {
				P.configErrorFlag = 1;
				return;
			}
		} else {
			return;
		}

		//backward compatibility
		if (sdkVersionUint16 == 0x0100) {
			P.compRxChanCfg.rangeBias = 0;
			P.measureRxChanCfg.enabled = 0;
		}

		/*find which subframe number to plot*/
		P.subFrameToPlot = subframeNumberToPlot(P);
		P.detectedObjectsToPlot = checkDetectedObjectsSetting(P);

		var totalSubframes;
		if (P.dfeDataOutputMode.mode == 1) {
			/* This is legacy frame cfg */
			totalSubframes = 1;
		} 
		else if (P.dfeDataOutputMode.mode == 3) {
			/* This is advanced frame cfg */
			totalSubframes = P.advFrameCfg.numOfSubFrames;
		}


		/* check if BPM configuration is valid  */
		if (((platform == mmwInput.Platform.xWR16xx)||(platform == mmwInput.Platform.xWR18xx)) && (sdkVersionUint16 >= 0x0102)) {
			if (verifyBpmCfg(P, totalSubframes) == -1) {
				return;
			}
		}
		for (var idx = 0; idx < totalSubframes; idx++) {
			var profileCfgIdx;
			profileCfgIdx = getProfileIdx(P, idx);

			/*store this info in Params to be used later*/
			P.subFrameInfo[idx] = {
				profileCfgIndex: profileCfgIdx
			};

			//console.log("Debug: profileidx = %d",profileCfgIdx);
			if (profileCfgIdx == -1) {
				configError("Could not find profile for chirp configuration", false);
				P.configErrorFlag = 1;
				return;
			}

			/*Populate datapath antenna configuration*/
			if (getAntCfg(P, idx) == -1) {
				configError("Could not get antenna configuration", false);
				P.configErrorFlag = 1;
				return;
			}

			P.dataPath[idx].numTxAnt = P.dataPath[idx].numTxElevAnt + P.dataPath[idx].numTxAzimAnt;
			if ((P.dataPath[idx].numRxAnt * P.dataPath[idx].numTxAzimAnt < 2)) {
				P.dataPath[idx].azimuthResolution = 'None';
			} else {
				P.dataPath[idx].azimuthResolution = MyUtil.toPrecision(math.asin(2 / (P.dataPath[idx].numRxAnt * P.dataPath[idx].numTxAzimAnt)) * 180 / 3.1415926, 1);
			}
			if (P.dfeDataOutputMode.mode == 1) {
				/* This is legacy frame cfg */
				P.dataPath[idx].numChirpsPerFrame = (P.frameCfg.chirpEndIdx -
					P.frameCfg.chirpStartIdx + 1) *
					P.frameCfg.numLoops;
			} 
			else {
				/* This is adv frame cfg */
				P.dataPath[idx].numChirpsPerFrame = P.subFrameCfg[idx].numOfChirps * P.subFrameCfg[idx].numLoops;
			}
			P.dataPath[idx].numDopplerBins = P.dataPath[idx].numChirpsPerFrame / P.dataPath[idx].numTxAnt;
			P.dataPath[idx].numRangeBins = 1 << Math.ceil(Math.log2(P.profileCfg[profileCfgIdx].numAdcSamples));
			P.dataPath[idx].rangeResolutionMeters = 300 * P.profileCfg[profileCfgIdx].digOutSampleRate /
				(2 * P.profileCfg[profileCfgIdx].freqSlopeConst * 1e3 * P.profileCfg[profileCfgIdx].numAdcSamples);
			P.dataPath[idx].rangeIdxToMeters = 300 * P.profileCfg[profileCfgIdx].digOutSampleRate /
				(2 * P.profileCfg[profileCfgIdx].freqSlopeConst * 1e3 * P.dataPath[idx].numRangeBins);
			P.dataPath[idx].rangeMeters = 300 * 0.8 * P.profileCfg[profileCfgIdx].digOutSampleRate / (2 * P.profileCfg[profileCfgIdx].freqSlopeConst * 1e3);
			P.dataPath[idx].velocityMps = 3e8 / (4 * P.profileCfg[profileCfgIdx].startFreq * 1e9 *
				(P.profileCfg[profileCfgIdx].idleTime + P.profileCfg[profileCfgIdx].rampEndTime) *
				1e-6 * P.dataPath[idx].numTxAnt);
			P.dataPath[idx].dopplerResolutionMps = 3e8 / (2 * P.profileCfg[profileCfgIdx].startFreq * 1e9 *
				(P.profileCfg[profileCfgIdx].idleTime + P.profileCfg[profileCfgIdx].rampEndTime) *
				1e-6 * P.dataPath[idx].numChirpsPerFrame);

			if (platform == mmwInput.Platform.xWR14xx) {
				P.log2linScale[idx] = 1 / 512;
				if (P.dataPath[idx].numTxElevAnt == 1) P.log2linScale[idx] = P.log2linScale[idx] * 4 / 3; //MMWSDK-439
			} else if ((platform == mmwInput.Platform.xWR16xx)||(platform == mmwInput.Platform.xWR18xx)) {
				P.log2linScale[idx] = 1 / (256 * P.dataPath[idx].numRxAnt * P.dataPath[idx].numTxAnt);
			}

			P.toDB = 20 * Math.log10(2);
			P.rangeAzimuthHeatMapGrid_points = 100;
			P.stats = { activeFrameCPULoad: [], interFrameCPULoad: [], sizeLimit: 100 };
			for (var i = 0; i < P.stats.sizeLimit; i++) {
				P.stats.activeFrameCPULoad.push(0);
				P.stats.interFrameCPULoad.push(0);
			}
			if ((platform == mmwInput.Platform.xWR16xx)||(platform == mmwInput.Platform.xWR18xx)) {
				P.dspFftScaleComp2D_lin[idx] = dspFftScalComp2(16, P.dataPath[idx].numDopplerBins);
				P.dspFftScaleComp2D_log[idx] = 20 * Math.log10(P.dspFftScaleComp2D_lin[idx]);
				P.dspFftScaleComp1D_lin[idx] = dspFftScalComp1(64, P.dataPath[idx].numRangeBins);
				P.dspFftScaleComp1D_log[idx] = 20 * Math.log10(P.dspFftScaleComp1D_lin[idx]);
			} else {
				P.dspFftScaleComp1D_lin[idx] = dspFftScalComp2(32, P.dataPath[idx].numRangeBins);
				P.dspFftScaleComp1D_log[idx] = 20 * Math.log10(P.dspFftScaleComp1D_lin[idx]);
				P.dspFftScaleComp2D_lin[idx] = 1;
				P.dspFftScaleComp2D_log[idx] = 0;
			}

			P.dspFftScaleCompAll_lin[idx] = P.dspFftScaleComp2D_lin[idx] * P.dspFftScaleComp1D_lin[idx];
			P.dspFftScaleCompAll_log[idx] = P.dspFftScaleComp2D_log[idx] + P.dspFftScaleComp1D_log[idx];
		}
		return P;
	};

	/*This function populates the cmdReceivedFlag array.
	This array has a flag for each possible CLI command.
	Value = 0, means command not received
	Value = 1, means command received
	It has a flag for each command for each subframe whenever it
	makes sense.
	For instance, adcbufCfg has a flag defined for all subframes,
	that is:
	ParamsIn.cmdReceivedFlag.adcbufCfg0 =  0 or 1
	ParamsIn.cmdReceivedFlag.adcbufCfg1 =  0 or 1
	ParamsIn.cmdReceivedFlag.adcbufCfg2 =  0 or 1
	ParamsIn.cmdReceivedFlag.adcbufCfg3 =  0 or 1

	For instance, dfeDataOutputMode has a flag defined only for position zero:
	ParamsIn.cmdReceivedFlag.dfeDataOutputMode0 = 0 or 1
	*/
	var setCmdReceivedFlag = function (ParamsIn, subFrameNum, platform, cmd) {
		if ((cmd === "dfeDataOutputMode") || (cmd === "channelCfg") || (cmd === "adcCfg") ||
			(cmd === "profileCfg") || (cmd === "chirpCfg") || (cmd === "frameCfg") ||
			(cmd === "advFrameCfg") || (cmd === "clutterRemoval") || (cmd === "compRangeBiasAndRxChanPhase") ||
			(cmd === "measureRangeBiasAndRxChanPhase")) {
			ParamsIn.cmdReceivedFlag[cmd + "0"] = 1;
		} 
		else {
			if ((platform == mmwInput.Platform.xWR14xx) || (ParamsIn.dfeDataOutputMode.mode == 1)) {
				ParamsIn.cmdReceivedFlag[cmd + "0"] = 1;
			} 
			else {
				if (subFrameNum == -1) {
					for (var i = 0; i < maxNumSubframes; i++) {
						ParamsIn.cmdReceivedFlag[cmd + i] = 1;
					}
				} 
				else {
					ParamsIn.cmdReceivedFlag[cmd + subFrameNum] = 1;
				}
			}
		}
	}


	// Validating Commands arguments and syntax 
	function validateCfg(lines, platform, sdkVersionUint16, P, dynamicFlg) {
		P.configErrorFlag = 0; // To reset the error flag
		for (var idx = 0; idx < lines.length; idx++) {
			var tokens = lines[idx].split(/\s+/);
			if (tokens[0] == 'channelCfg') {
				validateChannelCfg(P, platform, tokens, mmwInput);

			} else if (tokens[0] == 'profileCfg') {

				validateProfileCfg(P, platform, tokens);

			} else if (tokens[0] == 'chirpCfg') {

				validateChirpCfg(P, platform, tokens, mmwInput);
			} else if (tokens[0] == 'frameCfg') {

				validateFrameCfg(P, platform, tokens, dynamicFlg);

			} else if (tokens[0] == 'extendedMaxVelocity') {

				validateExtendedMaxVelocity(P, platform, mmwInput, sdkVersionUint16, tokens, maxNumSubframes, dynamicFlg);

			} else if (tokens[0] == 'guiMonitor') {

				validateguiMonitor(P, platform, mmwInput, dynamicFlg, sdkVersionUint16, tokens);

			} else if (tokens[0] == 'dfeDataOutputMode') {

				validatedfeDataOutputMode(P, platform, tokens, dynamicFlg);

			} else if (tokens[0] == 'advFrameCfg') {

				validateadvFrameCfg(P, tokens, platform, dynamicFlg);

			} else if (tokens[0] == 'subFrameCfg') {

				validatesubFrameCfg(P, platform, tokens, dynamicFlg)

			} else if (tokens[0] == 'cfarCfg') {

				validateCfarCfg(P, platform, mmwInput, tokens, sdkVersionUint16, dynamicFlg);

			} else if (tokens[0] == 'compRangeBiasAndRxChanPhase') {

				validatecompRangeBiasAndRxChanPhase(P, platform, tokens, mmwInput, dynamicFlg);

			} else if (tokens[0] == 'measureRangeBiasAndRxChanPhase') {

				validatemeasureRangeBiasAndRxChanPhase(P, platform, tokens, dynamicFlg);

			} else if (tokens[0] == 'CQRxSatMonitor') {

				validateCQRxSatMonitor(P, tokens, platform, dynamicFlg);

			} else if (tokens[0] == 'CQSigImgMonitor') {

				validateCQSigImgMonitor(P, tokens, platform, dynamicFlg);

			} else if (tokens[0] == 'analogMonitor') {

				validateanalogMonitor(P, dynamicFlg, platform, tokens);

			} else if (tokens[0] == 'peakGrouping') {

				validatepeakGrouping(P, platform, dynamicFlg, mmwInput, sdkVersionUint16, tokens);

			} else if (tokens[0] == 'multiObjBeamForming') {

				validatemultiObjBeamForming(P, platform, mmwInput, dynamicFlg, sdkVersionUint16, tokens);

			} else if (tokens[0] == 'calibDcRangeSig') {

				validatecalibDcRangeSig(P, platform, tokens, mmwInput, sdkVersionUint16, dynamicFlg);

			} else if (tokens[0] == 'adcbufCfg') {

				validateadcbufCfg(P, platform, tokens, dynamicFlg, sdkVersionUint16, mmwInput);

			} else if (tokens[0] == 'adcCfg') {

				validateadcCfg(P, platform, tokens);

			} else if (tokens[0] == 'clutterRemoval') {

				validateClutterRemoval(P, platform, tokens);

			} else if (tokens[0] == 'bpmCfg') {

				validatebpmCfg(P, platform, dynamicFlg, mmwInput, sdkVersionUint16, tokens);

			} else if (tokens[0] == 'lvdsStreamCfg') {

				validatelvdsStreamCfg(P, platform, tokens, mmwInput, sdkVersionUint16, dynamicFlg);

			} else if (tokens[0] == 'nearFieldCfg') {

				validatenearFieldCfg(P, platform, dynamicFlg, tokens, sdkVersionUint16, mmwInput);

			} else if (tokens[0] == 'lowPower') {

				validatelowPower(P, platform, dynamicFlg, mmwInput, sdkVersionUint16, tokens);

			}

		}
		
 		if(P.configErrorFlag == 1) //Returns null if there's an error
 			return;
		
		return P;
	}

	/*verifies BPM configuration, check if number of antennas enabled in the BPM chirps is correct,
	  checks if features incompatible with BPM are disabled*/
	var verifyBpmCfg = function (ParamsIn, numSubframes) {
		/* If BPM is enabled for a chirp then both
		   antennas have to be enabled*/
		for (var i = 0; i < numSubframes; i++) {
			if (ParamsIn.bpmCfg[i].enabled == 1) {
				/*Find which chirpCfg is associated with 
				chirp0Idx of this BPM config and check if all antennas are enabled*/
				for (var j = 0; j < chirpCfgCounter; j++) {
					if ((ParamsIn.bpmCfg[i].chirp0Idx >= ParamsIn.chirpCfg[j].startIdx) &&
						(ParamsIn.bpmCfg[i].chirp0Idx <= ParamsIn.chirpCfg[j].endIdx)) {
						/*Found chirp index, now check if both antennas are enabled*/
						if (ParamsIn.chirpCfg[j].txEnable == 3) {
							/*txEnable is correct, now set numTxAximAnt correctly
							  because this might have been set to 1 in parseCfg and at that point
							  we did not know if BPM was enabled for this chirp.*/
							ParamsIn.chirpCfg[j].numTxAzimAnt = 2;
							//console.log("Debug: changing numTxAzimAnt for chirpCfg = %d subframe %d",j, i);
							break;
						} else {
							configError("Invalid BPM/Chirp configuration. All TX antennas must be enabled for BPM chirp0Idx", dynamicFlg);
							ParamsIn.configErrorFlag = 1;
							return -1;
						}
					}
				}

				/*Find which chirpCfg is associated with 
				chirp1Idx of this BPM config and check if all antennas are enabled*/
				for (var j = 0; j < chirpCfgCounter; j++) {
					if ((ParamsIn.bpmCfg[i].chirp1Idx >= ParamsIn.chirpCfg[j].startIdx) &&
						(ParamsIn.bpmCfg[i].chirp1Idx <= ParamsIn.chirpCfg[j].endIdx)) {
						/*Found chirp index, now check if both antennas are enabled*/
						if (ParamsIn.chirpCfg[j].txEnable == 3) {
							/*txEnable is correct, now set numTxAximAnt correctly
							  because this might have been set to 1 in parseCfg and at that point
							  we did not know if BPM was enabled for this chirp.*/
							ParamsIn.chirpCfg[j].numTxAzimAnt = 2;
							//console.log("Debug: changing numTxAzimAnt for chirpCfg = %d subframe %d",j, i);
							break;
						} else {
							configError("Invalid BPM/Chirp configuration. All TX antennas must be enabled for BPM chirp1Idx", dynamicFlg);
							ParamsIn.configErrorFlag = 1;
							return -1;
						}
					}
				}

				/*Now check if other features that are incompatible are enabled*/
			}
		}

		return 0;
	}

	/*This function verifies if all necessary CLI commands were received
	  Returns -1 if there are missing commands
	  Returns 0 if all commands are present*/
	var verifyCmdReceived = function (ParamsIn, platform, sdkVersionUint16, dynamicFlg) {
		var i, j;
		var tempStr;

		/*array with all commands that must be sent for all subframes*/
		var subframeCmds = [];
		subframeCmds.push("adcbufCfg");
		subframeCmds.push("guiMonitor");
		subframeCmds.push("cfarCfg");
		subframeCmds.push("peakGrouping");
		subframeCmds.push("multiObjBeamForming");
		subframeCmds.push("calibDcRangeSig");

		if ((platform == mmwInput.Platform.xWR16xx) || (platform == mmwInput.Platform.xWR18xx)) {
			subframeCmds.push("extendedMaxVelocity");
			if (sdkVersionUint16 >= 0x0102) {
				/*New commands added in this release should have its presence
				  verified only if the SDK version is greater or equal to the 
				  release where they were added, otherwise this will break
				  backwards compatibility*/
				subframeCmds.push("bpmCfg");
				subframeCmds.push("nearFieldCfg");
				subframeCmds.push("lvdsStreamCfg");
			}
		}

		/*array with all commands that are not per subframe*/
		var frameCmds = [];
		frameCmds.push("dfeDataOutputMode");
		frameCmds.push("channelCfg");
		frameCmds.push("adcCfg");
		frameCmds.push("profileCfg");
		frameCmds.push("chirpCfg");
		frameCmds.push("clutterRemoval");
		frameCmds.push("compRangeBiasAndRxChanPhase");
		frameCmds.push("measureRangeBiasAndRxChanPhase");
		if (sdkVersionUint16 >= 0x0102) {
			/*New commands added in this release should have its presence
			  verified only if the SDK version is greater or equal to the 
			  release where they were added, otherwise this will break
			  backwards compatibility*/
			frameCmds.push("CQRxSatMonitor");
			frameCmds.push("CQSigImgMonitor");
			frameCmds.push("analogMonitor");
		}

		if (sdkVersionUint16 >= 0x0200) {
			/*This command is mandatory for all releases but it will break backwards
			  compatibility if we enforce it in previous releases.*/
			frameCmds.push("lowPower");
		}

		/*DFE mode must be set and must be the first of the frame commands
		  (Here we can not detect if it is the first but only if it is present).*/
		if (ParamsIn.cmdReceivedFlag["dfeDataOutputMode0"] != 1) {
			configError("Missing command dfeDataOutputMode.", dynamicFlg);
			return -1;
		}

		if (ParamsIn.dfeDataOutputMode.mode == 1) {
			/*legacy frame mode, so lets add it to command list*/
			frameCmds.push("frameCfg");

			/*check if subframe commands were received.
			  need to check position zero only*/
			for (i = 0; i < subframeCmds.length; i++) {
				tempStr = subframeCmds[i] + "0";
				if (ParamsIn.cmdReceivedFlag[tempStr] != 1) {
					configError("Missing command " + subframeCmds[i], dynamicFlg);
					return -1;
				}
			}
		} else if (ParamsIn.dfeDataOutputMode.mode == 3) {
			/*this is advanced frame config*/
			/*add adv frame command to list to be checked*/
			frameCmds.push("advFrameCfg");
			/*add subframe command to list to be checked*/
			subframeCmds.push("subFrameCfg");

			/*check if subframe commands were received.
			  need to check all valid subframes*/
			for (i = 0; i < subframeCmds.length; i++) {
				for (j = 0; j < ParamsIn.advFrameCfg.numOfSubFrames; j++) {
					var subframe = j.toString();
					tempStr = subframeCmds[i] + subframe;
					if (ParamsIn.cmdReceivedFlag[tempStr] != 1) {
						configError("Missing command " + subframeCmds[i] + " for subframe " + subframe, dynamicFlg);
						return -1;
					}
				}
			}
		}

		/*check if frame commands were received.
		  need to check position zero only*/
		for (i = 0; i < frameCmds.length; i++) {
			tempStr = frameCmds[i] + "0";
			if (ParamsIn.cmdReceivedFlag[tempStr] != 1) {
				configError("Missing command " + frameCmds[i], dynamicFlg);
				return -1;
			}
		}
		return 0;
	}

	/* Validate Channel Cfg*/
	var validateChannelCfg = function (P, platform, tokens, mmwInput) {
       setCmdReceivedFlag(P, 0, platform, tokens[0]);
		P.channelCfg.txChannelEn = parseInt(tokens[2]);
		/*There is always only one channelCfg command.*/
		if ((platform == mmwInput.Platform.xWR14xx)||(platform == mmwInput.Platform.xWR18xx)) {
			P.channelCfg.numTxAzimAnt = ((P.channelCfg.txChannelEn << 0) & 1) +
				((P.channelCfg.txChannelEn >> 2) & 1);
			P.channelCfg.numTxElevAnt = ((P.channelCfg.txChannelEn >> 1) & 1);
		} else if (platform == mmwInput.Platform.xWR16xx) {
			P.channelCfg.numTxAzimAnt = ((P.channelCfg.txChannelEn << 0) & 1) +
				((P.channelCfg.txChannelEn >> 1) & 1);
			P.channelCfg.numTxElevAnt = 0;
		}
		P.channelCfg.rxChannelEn = parseInt(tokens[1]);
		P.channelCfg.numRxAnt = ((P.channelCfg.rxChannelEn << 0) & 1) +
			((P.channelCfg.rxChannelEn >> 1) & 1) +
			((P.channelCfg.rxChannelEn >> 2) & 1) +
			((P.channelCfg.rxChannelEn >> 3) & 1);
	}
	/* Validate Profile Cfg*/
	var validateProfileCfg = function (P, platform, tokens) {
		P.profileCfg[profileCfgCounter] = {
			profileId: parseInt(tokens[1]),
			startFreq: parseFloat(tokens[2]),
			idleTime: parseFloat(tokens[3]),
			rampEndTime: parseFloat(tokens[5]),
			freqSlopeConst: parseFloat(tokens[8]),
			numAdcSamples: parseInt(tokens[10]),
			digOutSampleRate: parseInt(tokens[11])
		};
		profileCfgCounter++;
		setCmdReceivedFlag(P, 0, platform, tokens[0]);
	}
	/* Validate Chirp Cfg*/
	var validateChirpCfg = function (P, platform, tokens, mmwInput) {
		P.chirpCfg[chirpCfgCounter] = {
			startIdx: parseInt(tokens[1]),
			endIdx: parseInt(tokens[2]),
			profileId: parseInt(tokens[3]),
			txEnable: parseInt(tokens[8]),
			numTxAzimAnt: 0
		}
		//MMWSDK-507
		if ((platform == mmwInput.Platform.xWR14xx)||(platform == mmwInput.Platform.xWR18xx)) {
			if (P.chirpCfg[chirpCfgCounter].txEnable == 5) {
				P.chirpCfg[chirpCfgCounter].numTxAzimAnt = 1; //Non-MIMO - this overrides the channelCfg derived values
			}
		} else if (platform == mmwInput.Platform.xWR16xx) {
			if (P.chirpCfg[chirpCfgCounter].txEnable == 3) {
				P.chirpCfg[chirpCfgCounter].numTxAzimAnt = 1; //Non-MIMO  - this overrides the channelCfg derived values
			}
		}
        chirpCfgCounter++;
		setCmdReceivedFlag(P, 0, platform, tokens[0]);
	}
	/* Validate Frame Cfg*/
	var validateFrameCfg = function (P, platform, tokens, dynamicFlg) {
		if (P.dfeDataOutputMode.mode != 1) {
			configError("frameCfg can only be used with dfeDataOutputMode 1", dynamicFlg);
			P.configErrorFlag = 1;
			return;
		}
		P.frameCfg.chirpStartIdx = parseInt(tokens[1]);
		P.frameCfg.chirpEndIdx = parseInt(tokens[2]);
		P.frameCfg.numLoops = parseInt(tokens[3]);
		P.frameCfg.numFrames = parseInt(tokens[4]);
		P.frameCfg.framePeriodicity = parseFloat(tokens[5]);
		setCmdReceivedFlag(P, 0, platform, tokens[0]);
	}
	/* Validate Extended MaxVelocity*/
	var validateExtendedMaxVelocity = function (P, platform, mmwInput, sdkVersionUint16, tokens, maxNumSubframes, dynamicFlg) {
		if (platform == mmwInput.Platform.xWR14xx) {
			configError("extendedMaxVelocity command is not supported", dynamicFlg);
			P.configErrorFlag = 1;
			return;
		}
		if (checkSubFrameIdx(P, parseInt(tokens[1]), platform, sdkVersionUint16, "extendedMaxVelocity", dynamicFlg) == -1) {
			/*return error*/
			P.configErrorFlag = 1;
			return;
		}
		if (tokens.length != 3) {
			configError("extendedMaxVelocity invalid number of arguments", dynamicFlg);
			P.configErrorFlag = 1;
			return;
		}
		var subFrameMaxVel = parseInt(tokens[1]);
		if (subFrameMaxVel == -1) {
			/*This is a 'broadcast to all subframes' configuration*/
			for (var maxVelIdx = 0; maxVelIdx < maxNumSubframes; maxVelIdx++) {
				P.extendedMaxVelocity[maxVelIdx].enable = parseInt(tokens[2]);
			}
		} else {
			P.extendedMaxVelocity[subFrameMaxVel].enable = parseInt(tokens[2]);
		}
		setCmdReceivedFlag(P, parseInt(tokens[1]), platform, tokens[0]);
	}
	/* Validate guiMonitor*/
	var validateguiMonitor = function (P, platform, mmwInput, dynamicFlg, sdkVersionUint16, tokens) {
		if ((platform == mmwInput.Platform.xWR14xx) || (sdkVersionUint16 == 0x0100)) {
			if (tokens.length != 7) {
				configError("guiMonitor invalid number of arguments", dynamicFlg);
				P.configErrorFlag = 1;
				return;
			}

			P.guiMonitor[0] = {
				detectedObjects: parseInt(tokens[1]),
				logMagRange: parseInt(tokens[2]),
				noiseProfile: parseInt(tokens[3]),
				rangeAzimuthHeatMap: parseInt(tokens[4]),
				rangeDopplerHeatMap: parseInt(tokens[5]),
				statsInfo: parseInt(tokens[6])
			};
		}
		else if ((platform == mmwInput.Platform.xWR16xx)||(platform == mmwInput.Platform.xWR18xx)) {
			if (tokens.length != 8) {
				configError("guiMonitor invalid number of arguments", dynamicFlg);
				P.configErrorFlag = 1;
				return;
			}
			/*GUI monitor for subframe N is stored in array positon N.
			  If GUI monitor command is sent with subframe -1, configuration
			  is copied in all subframes 0-maxNumSubframes*/
			var guiMonIdx = parseInt(tokens[1]);

			if (checkSubFrameIdx(P, guiMonIdx, platform, sdkVersionUint16, "guiMonitor", dynamicFlg) == -1) {
				/*return error*/
				P.configErrorFlag = 1;
				return;
			}

			if (guiMonIdx == -1) {
				/*This is a 'broadcast to all subframes' configuration*/
				for (var guiIdx = 0; guiIdx < maxNumSubframes; guiIdx++) {
					P.guiMonitor[guiIdx] = {
						subFrameIdx: parseInt(tokens[1]),
						detectedObjects: parseInt(tokens[2]),
						logMagRange: parseInt(tokens[3]),
						noiseProfile: parseInt(tokens[4]),
						rangeAzimuthHeatMap: parseInt(tokens[5]),
						rangeDopplerHeatMap: parseInt(tokens[6]),
						statsInfo: parseInt(tokens[7])
					};

				}
			}
			else {
				P.guiMonitor[guiMonIdx] = {
					subFrameIdx: parseInt(tokens[1]),
					detectedObjects: parseInt(tokens[2]),
					logMagRange: parseInt(tokens[3]),
					noiseProfile: parseInt(tokens[4]),
					rangeAzimuthHeatMap: parseInt(tokens[5]),
					rangeDopplerHeatMap: parseInt(tokens[6]),
					statsInfo: parseInt(tokens[7])
				};
			}

		}
		setCmdReceivedFlag(P, parseInt(tokens[1]), platform, tokens[0]);
	}
	/* Validate dfeDataOutputMode*/
	var validatedfeDataOutputMode = function (P, platform, tokens, dynamicFlg) {
		setCmdReceivedFlag(P, 0, platform, tokens[0]);
		if (tokens.length != 2) {
			configError("dfeDataOutputMode invalid number of arguments", dynamicFlg);
			P.configErrorFlag = 1;
			return;
		}
		P.dfeDataOutputMode.mode = parseInt(tokens[1]);
	}
	/* Validate AdvFrame Cfg*/
	var validateadvFrameCfg = function (P, tokens, platform, dynamicFlg) {
		if (tokens.length != 6) {
			configError("advFrameCfg invalid number of arguments", dynamicFlg);
			P.configErrorFlag = 1;
			return;
		}
		if (P.dfeDataOutputMode.mode != 3) {
			configError("advFrameCfg must use dfeDataOutputMode 3", dynamicFlg);
			P.configErrorFlag = 1;
			return;
		}
		P.advFrameCfg.numOfSubFrames = parseInt(tokens[1]);
		P.advFrameCfg.forceProfile = parseInt(tokens[2]);
		P.advFrameCfg.numFrames = parseInt(tokens[3]);
		P.advFrameCfg.triggerSelect = parseInt(tokens[4]);
		P.advFrameCfg.frameTrigDelay = parseInt(tokens[5]);
		if (P.advFrameCfg.numOfSubFrames > maxNumSubframes) {
			configError("advFrameCfg: Maximum number of subframes is 4", dynamicFlg);
			P.configErrorFlag = 1;
			return;
		}
		setCmdReceivedFlag(P, 0, platform, tokens[0]);
	}
	/* Validate subFrame Cfg*/
	var validatesubFrameCfg = function (P, platform, tokens, dynamicFlg) {
		if (tokens.length != 11) {
			configError("subFrameCfg invalid number of arguments", dynamicFlg);
			P.configErrorFlag = 1;
			return;
		}

		if (P.dfeDataOutputMode.mode != 3) {
			configError("subFrameCfg is allowed only in advFrameCfg mode and must use dfeDataOutputMode 3", dynamicFlg);
			P.configErrorFlag = 1;
			return;
		}
		var subFrameNumLocal = parseInt(tokens[1]);
		if (subFrameNumLocal >= maxNumSubframes) {
			configError("Bad subframe config:Invalid subframe number", dynamicFlg);
			P.configErrorFlag = 1;
			return;
		}
		P.subFrameCfg[subFrameNumLocal] = {
			forceProfileIdx: parseInt(tokens[2]),
			chirpStartIdx: parseInt(tokens[3]),
			numOfChirps: parseInt(tokens[4]),
			numLoops: parseInt(tokens[5]),
			burstPeriodicity: parseFloat(tokens[6]),
			chirpStartIdxOffset: parseInt(tokens[7]),
			numOfBurst: parseInt(tokens[8]),
			numOfBurstLoops: parseInt(tokens[9]),
			subFramePeriodicity: parseFloat(tokens[10])
		}

		if (P.subFrameCfg[subFrameNumLocal].numOfBurst != 1) {
			configError("Bad subframe config: numOfBurst must be 1", dynamicFlg);
			P.configErrorFlag = 1;
			return;
		}
		if (P.subFrameCfg[subFrameNumLocal].numOfBurstLoops != 1) {
			configError("Bad subframe config: numOfBurstLoops must be 1", dynamicFlg);
			P.configErrorFlag = 1;
			return;
		}
		setCmdReceivedFlag(P, subFrameNumLocal, platform, tokens[0]);
	}
	/* Validate Cfar Cfg*/
	var validateCfarCfg = function (P, platform, mmwInput, tokens, sdkVersionUint16, dynamicFlg) {
		var localSubframe = parseInt(tokens[1]);
		var checkTokenLength = 9;
		if ((platform == mmwInput.Platform.xWR14xx) || (sdkVersionUint16 == 0x0100)) {
			checkTokenLength = 8;
		}
		if (tokens.length != checkTokenLength) {
			configError("cfarCfg invalid number of arguments", dynamicFlg);
			P.configErrorFlag = 1;
			return;
		}
		if (checkSubFrameIdx(P, parseInt(tokens[1]), platform, sdkVersionUint16, "cfarCfg", dynamicFlg) == -1) {
			/*return error*/
			P.configErrorFlag = 1;
			return;
		}
		setCmdReceivedFlag(P, localSubframe, platform, tokens[0]);
	}
	/* Validate compRangeBiasAndRxChanPhase*/
	var validatecompRangeBiasAndRxChanPhase = function (P, platform, tokens, mmwInput, dynamicFlg) {
		var checkTokenLength = 18; /*2*4*2+1+1;*/
		if ((platform == mmwInput.Platform.xWR14xx) || (platform == mmwInput.Platform.xWR18xx)) {
			checkTokenLength = 26; /*3*4*2+1+1;*/
		}
		if (tokens.length != checkTokenLength) {
			configError("compRangeBiasAndRxChanPhase invalid number of arguments", dynamicFlg);
			P.configErrorFlag = 1;
			return;
		}

		P.compRxChanCfg.rangeBias = parseFloat(tokens[1]);

		setCmdReceivedFlag(P, 0, platform, tokens[0]);
	}
	/* Validate measureRangeBiasAndRxChanPhase*/
	var validatemeasureRangeBiasAndRxChanPhase = function (P, platform, tokens, dynamicFlg) {
		if (tokens.length != 4) {
			configError("measureRangeBiasAndRxChanPhase invalid number of arguments", dynamicFlg);
			P.configErrorFlag = 1;
			return;
		}
		P.measureRxChanCfg.enabled = parseInt(tokens[1]); //0 - compensation; 1- measurement
		setCmdReceivedFlag(P, 0, platform, tokens[0]);
	}
	/* Validate CQRxSatMonitor*/
	var validateCQRxSatMonitor = function (P, tokens, platform, dynamicFlg) {
		if (tokens.length != 6) {
			configError("CQRxSatMonitor invalid number of arguments", dynamicFlg);
			P.configErrorFlag = 1;
			return;
		}
		setCmdReceivedFlag(P, 0, platform, tokens[0]);
	}

	/* Validate CQRxSatMonitor*/
	var validateCQSigImgMonitor = function (P, tokens, platform, dynamicFlg) {
		if (tokens.length != 4) {
			configError("CQSigImgMonitor invalid number of arguments", dynamicFlg);
			P.configErrorFlag = 1;
			return;
		}
		setCmdReceivedFlag(P, 0, platform, tokens[0]);
	}
	/* Validate analogMonitor*/
	var validateanalogMonitor = function (P, dynamicFlg, platform, tokens) {
		if (tokens.length != 3) {
			configError("analogMonitor invalid number of arguments", dynamicFlg);
			P.configErrorFlag = 1;
			return;
		}
		setCmdReceivedFlag(P, 0, platform, tokens[0]);
	}
	/* Validate Peak Grouping*/
	var validatepeakGrouping = function (P, platform, dynamicFlg, mmwInput, sdkVersionUint16, tokens) {
		var localSubframe = parseInt(tokens[1]);
		var checkTokenLength = 7;
		if ((platform == mmwInput.Platform.xWR14xx) || (sdkVersionUint16 == 0x0100)) {
			checkTokenLength = 6;
		}
		if (tokens.length != checkTokenLength) {
			configError("peakGrouping invalid number of arguments", dynamicFlg);
			P.configErrorFlag = 1;
			return;
		}
		if (checkSubFrameIdx(P, parseInt(tokens[1]), platform, sdkVersionUint16, "peakGrouping", dynamicFlg) == -1) {
			/*return error*/
			P.configErrorFlag = 1;
			return;
		}
setCmdReceivedFlag(P, localSubframe, platform, tokens[0]);
	}
	/* Validate multiObjBeamForming*/
	var validatemultiObjBeamForming = function (P, platform, mmwInput, dynamicFlg, sdkVersionUint16, tokens) {
		var localSubframe = parseInt(tokens[1]);
		var checkTokenLength = 4;
		if ((platform == mmwInput.Platform.xWR14xx) || (sdkVersionUint16 == 0x0100)) {
			checkTokenLength = 3;
		}
		if (tokens.length != checkTokenLength) {
			configError("multiObjBeamForming invalid number of arguments", dynamicFlg);
			P.configErrorFlag = 1;
			return;
		}
		if (checkSubFrameIdx(P, parseInt(tokens[1]), platform, sdkVersionUint16, "multiObjBeamForming", dynamicFlg) == -1) {
			/*return error*/
			P.configErrorFlag = 1;
			return;
		}
		setCmdReceivedFlag(P, localSubframe, platform, tokens[0]);
	}
    /* Validate calibDcRangeSig*/
	var validatecalibDcRangeSig = function (P, platform, tokens, mmwInput, sdkVersionUint16, dynamicFlg) {
		var localSubframe = parseInt(tokens[1]);
		var checkTokenLength = 6;
		if ((platform == mmwInput.Platform.xWR14xx) || (sdkVersionUint16 == 0x0100)) {
			checkTokenLength = 5;
		}
		if (tokens.length != checkTokenLength) {
			configError("calibDcRangeSig invalid number of arguments", dynamicFlg);
			P.configErrorFlag = 1;
			return;
		}
		if (checkSubFrameIdx(P, parseInt(tokens[1]), platform, sdkVersionUint16, "calibDcRangeSig", dynamicFlg) == -1) {
			/*return error*/
			P.configErrorFlag = 1;
			return;
		}
		setCmdReceivedFlag(P, localSubframe, platform, tokens[0]);
	}
    /* Validate adcbufCfg*/
	var validateadcbufCfg = function (P, platform, tokens, dynamicFlg, sdkVersionUint16, mmwInput) {
		var localSubframe = parseInt(tokens[1]);
		var checkTokenLength = 6;
		if ((platform == mmwInput.Platform.xWR14xx) || (sdkVersionUint16 == 0x0100)) {
			checkTokenLength = 5;
		}
		if (tokens.length != checkTokenLength) {
			configError("adcbufCfg invalid number of arguments", dynamicFlg);
			P.configErrorFlag = 1;
			return;
		}

		if (checkSubFrameIdx(P, localSubframe, platform, sdkVersionUint16, "adcbufCfg", dynamicFlg) == -1) {
			/*return error*/
			P.configErrorFlag = 1;
			return;
		}
		setCmdReceivedFlag(P, localSubframe, platform, tokens[0]);
	}
     /* Validate adcCfg*/
	var validateadcCfg= function(P, platform, tokens){
	    setCmdReceivedFlag(P, 0, platform, tokens[0]);
	}

	/* Validate clutterRemoval*/
	var validateClutterRemoval = function(P, platform, tokens){
	    setCmdReceivedFlag(P, 0, platform, tokens[0]);
	}
    /* Validate bpmCfg*/
	var validatebpmCfg = function (P, platform, dynamicFlg, mmwInput, sdkVersionUint16, tokens) {
		if ((platform == mmwInput.Platform.xWR14xx) || (sdkVersionUint16 < 0x0102)) {
			configError("bpmCfg command is not supported", dynamicFlg);
			P.configErrorFlag = 1;
			return;
		} else if ((platform == mmwInput.Platform.xWR16xx) || (platform == mmwInput.Platform.xWR18xx)) {
			if (tokens.length != 5) {
				configError("bpmCfg invalid number of arguments", dynamicFlg);
				P.configErrorFlag = 1;
				return;
			}
			/*Info for subframe N is stored in array positon N.
			  If command is sent with subframe -1, configuration
			  is copied in all subframes 0-maxNumSubframes*/
			var bpmSubframeIdx = parseInt(tokens[1]);

			if (checkSubFrameIdx(P, bpmSubframeIdx, platform, sdkVersionUint16, "bpmCfg", dynamicFlg) == -1) {
				/*return error*/
				P.configErrorFlag = 1;
				return;
			}

			if (bpmSubframeIdx == -1) {
				/*This is a 'broadcast to all subframes' configuration*/
				for (var bpmIdx = 0; bpmIdx < maxNumSubframes; bpmIdx++) {
					P.bpmCfg[bpmIdx] = {
						enabled: parseInt(tokens[2]),
						chirp0Idx: parseInt(tokens[3]),
						chirp1Idx: parseInt(tokens[4])
					};
				}
			} else {
				P.bpmCfg[bpmSubframeIdx] = {
					enabled: parseInt(tokens[2]),
					chirp0Idx: parseInt(tokens[3]),
					chirp1Idx: parseInt(tokens[4])
				};
			}

		}
		setCmdReceivedFlag(P, parseInt(tokens[1]), platform, tokens[0]);
	}
    /* Validate lvdsStreamCfg*/
	var validatelvdsStreamCfg = function (P, platform, tokens, mmwInput, sdkVersionUint16, dynamicFlg) {
		if (sdkVersionUint16 < 0x0102) {
			configError("lvdsStreamCfg command is not supported for this SDK version", dynamicFlg);
			P.configErrorFlag = 1;
			return;
		} else {
			if ((platform == mmwInput.Platform.xWR16xx) || (platform == mmwInput.Platform.xWR18xx)) {
				if (tokens.length != 5) {
					configError("lvdsStreamCfg invalid number of arguments", dynamicFlg);
					P.configErrorFlag = 1;
					return;
				}
				/*Info for subframe N is stored in array positon N.
				  If command is sent with subframe -1, configuration
				  is copied in all subframes 0-maxNumSubframes*/
				var lvdsStreamingSubframeIdx = parseInt(tokens[1]);

				if (checkSubFrameIdx(P, lvdsStreamingSubframeIdx, platform, sdkVersionUint16, "lvdsStreamCfg", dynamicFlg) == -1) {
					/*return error*/
					P.configErrorFlag = 1;
					return;
				}
				
			}
			if (platform == mmwInput.Platform.xWR14xx) {
				configError("lvdsStreamCfg command is not supported for this platform.", dynamicFlg);
				P.configErrorFlag = 1;
				return;
			}
		}
		setCmdReceivedFlag(P, parseInt(tokens[1]), platform, tokens[0]);

	}
    /* Validate nearFieldCfg*/
	var validatenearFieldCfg = function (P, platform, dynamicFlg, tokens, sdkVersionUint16, mmwInput) {
		if ((platform == mmwInput.Platform.xWR14xx) || (sdkVersionUint16 < 0x0102)) {
			configError("nearFieldCfg command is not supported", dynamicFlg);
			P.configErrorFlag = 1;
			return;
		}
		if (checkSubFrameIdx(P, parseInt(tokens[1]), platform, sdkVersionUint16, "nearFieldCfg", dynamicFlg) == -1) {
			/*return error*/
			P.configErrorFlag = 1;
			return;
		}
		if (tokens.length != 5) {
			configError("nearFieldCfg invalid number of arguments", dynamicFlg);
			P.configErrorFlag = 1;
			return;
		}
		var subFrameNearField = parseInt(tokens[1]);
		if (subFrameNearField == -1) {
			/*This is a 'broadcast to all subframes' configuration*/
			for (var nearFieldIdx = 0; nearFieldIdx < maxNumSubframes; nearFieldIdx++) {
				P.nearFieldCfg[nearFieldIdx] = {
					enabled: parseInt(tokens[2]),
					startRangeIdx: parseInt(tokens[3]),
					endRangeIdx: parseInt(tokens[4])
				};

			}
		} else {
			P.nearFieldCfg[subFrameNearField] = {
				enabled: parseInt(tokens[2]),
				startRangeIdx: parseInt(tokens[3]),
				endRangeIdx: parseInt(tokens[4])
			};
		}
		setCmdReceivedFlag(P, parseInt(tokens[1]), platform, tokens[0]);
	}
     /* Validate lowPower*/
	var validatelowPower = function (P, platform, dynamicFlg, mmwInput, sdkVersionUint16, tokens) {
		if (tokens.length != 3) {
			configError("lowPower invalid number of arguments", dynamicFlg);
			P.configErrorFlag = 1;
			return;
		}
		setCmdReceivedFlag(P, 0, platform, tokens[0]);
		if ((platform == mmwInput.Platform.xWR16xx) && (sdkVersionUint16 >= 0x0200)) {
			/*for xWR16xx, lpAdcMode must be set to 1 (low power ADC)*/
			var lpAdcMode = tokens[2];
			if (lpAdcMode = !1) {
				configError("lowPower command must have lpAdcMode set to 1", dynamicFlg);
				P.configErrorFlag = 1;
				return;
			}
		}
	}

	//validations.prototype.init = init;
	validations.prototype.parseCfg = parseCfg;
	validations.prototype.validateCfg = validateCfg;

	// export as AMD/CommonJS module or global variable
	if (typeof define === 'function' && define.amd) define('validations', function () {
		return validations;
	});
	else if (typeof module !== 'undefined') module.exports = validations;
	else if (typeof self !== 'undefined') self.validations = validations;
	else window.validations = validations;

})();
