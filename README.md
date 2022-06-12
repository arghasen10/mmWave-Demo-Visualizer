# mmWave Demo Visualizer
This is the TI Gallery APP for configuring mmWave sensors and
visualizing point cloud objects generated by the [mmWave SDK demo](http://www.ti.com/tool/mmwave-sdk). This app is meant to be
used in conjunction with the [mmWave SDK demo](http://www.ti.com/tool/mmwave-sdk) running on the TI Evaluation module (EVM) for mmWave devices. This app can also be reached via [TI Gallery](https://dev.ti.com/gallery/) – search for mmWave_Demo_Visualizer. The
TI Gallery app is a browser-based app and can be run on any PC operating system (Windows®, Linux®, or
macOS®), and TI recommends running the app using the Chrome® browser for the best plotting
performance.

## Note about compatibility
This version of app is compatible with mmWave SDK versions 2.1.0, 2.0.0 and 1.2.0. Users should select the right SDK version in this app as the mmWave demo version running on the mmWave device. If user chooses to upgrade the custom configuration based off mmWave SDK 2.0.0 so that they are able to run the same config across mmWave SDK 2.1.0, then then there is a script mmwDemo_&lt;platform>_update_config.pl provided in the mmwave\_sdk\_&lt;ver>/packages/ti/demo/&lt;platform>/mmw/profiles directory that they can use to convert the configuration file from older release to a compatible version for the new release. See [mmWave SDK User Guide](http://www.ti.com/tool/mmwave-sdk) for more details.

Basic steps for running the app are listed here. For more detailed information, please refer to the [mmWave Demo Visualizer User's guide](http://www.ti.com/lit/pdf/swru529).

## Steps for using this App

* If this is the first time you are using this App, you may be requested to install a plug-in and the TI Cloud Agent Application.
* Power up the mmWave Sensors and load/run the mmW Demo located at mmwave\_sdk/_&lt;ver>/packages/ti/demo/&lt;platform>/mmw. Refer to the mmWave SDK user guide in the [mmWave SDK package](http://www.ti.com/tool/mmwave-sdk) for more information.
* Once the demo is running on the mmWave sensors and the USB is connected from the board to the PC, the app will try to automatically detect the COM ports for your device. If auto-detection doesn't work, then you will need to configure the serial ports in this App. 
In the App, go to the Menu->Options->Serial Port.<br>
  * **CFG_port**: Use COM port number for "XDS110 Class Application/User UART": Baud: 115200
  * **Data_port**: Use COM port "XDS110 Class Auxiliary Data port": Baud: 921600
Hint: Navigate to the device manager on the windows PC to locate the COm port numbers
* At this point this app will automatically try to connect to the target (mmWave Sensor).
If it does not connect or if the connection fails, you should try to connect to the target by clicking in the bottom left corner of this App.
* After the App is connected to the target, you can select the configuration parameters in this App (Frequency Band, Platform, etc) in the "Scene Selection" area of the **CONFIGURE** tab.
* Besides selecting the configuration parameters, you should select which plots you want to see. This can be done using the "check boxes" in the "Plot Selection" area.
* Once the configuration is selected, you can send the configuration to the device (use "SEND CONFIG TO MMWAVE DEVICE" button) or save the configuration to the PC (use "SAVE CONFIG TO PC" button).
* After the configuration is sent to the device, you can switch to the **PLOT** view/tab and the plots that you selected will be shown.
* On the plots tab, user has access to real time tuning tab and advanced commands tab to tune the processing chain. The commands are sent immediately to the device (without sensorStop) and effect of those commands (if any) should be visible in the displayed plots
* You can switch back from "Plot" tab to "Configure" tab, reconfigure your "Scene Selection" and/or "Plot Selection" and re-send the configuration to the device to try a different profile. After a new configuration has been selected, just press the "SEND CONFIG TO MMWAVE DEVICE" button again and the device will be reconfigured. This can be done without rebooting the device.If you change the parameters in the "Setup Details", then you will need to take further action before trying the new configurations
  * If Platform is changed: make sure the COM ports match the TI EVM/platform you are trying to configure and visualizer
  * If SDK version is changed: make sure the mmW demo running on the connected TI EVM matches the selected SDK version in the GUI
  * If Antenna Config is changed: make sure the TI EVM is rebooted before sending the new configuration.
* If board is rebooted, follow the steps starting from 1 above. 

## Advanced options
* User can configure the device from their own configuration file or the saved app-generated configuration file by using the "LOAD CONFIG FROM PC AND SEND" button on the **PLOTS** tab. Make sure the first two commands in this config file are "sensorStop" followed by "flushCfg".
* User can temporarily pause the mmWave sensor by using the "STOP" button on the plots tab. The sensor can be restarted by using the "START" button. In this case, sensor starts again with the already loaded configuration and no new configuration is sent from the App.
* It is recommended to always use the online/cloud version of the Visualizer for the mmWave experience with the TI devices but we do understand that users may not always have access to internet connection while trying to evaluate the mmWave devices, especially in the field trial. For such scenarios, there is a link for offline version available under “Help->Download or Clone Visualizer”.
* If the user desires to save the incoming processed stream from the mmWave device for some offline analysis while its getting plotted, users can use the “Record Start” button in the plots tab. More details can be found in the [mmWave Demo Visualizer User's guide](http://www.ti.com/lit/pdf/swru529). **Note**: This feature requires the browser version requirement to be as mentioned here: [ti-widget-streamsaver](https://dev.ti.com/gc/components/ti-widget-streamsaver/index.html#ti-widget-streamsaver)



## ChangeLog:
* mmWave Demo Visualizer 2.1
  * Added check for low Power command for xWR14xx
  * Added dynamic command and real-time tunning features in the plots tab and removed Object Detection settings from the configure tab
  * Removed support for older SDK versions 1.0 and 1.1

	**Compatible with: mmWave SDK 2.1.0, mmWave SDK 2.0.0, mmWave SDK 1.2.0**

* mmWave Demo Visualizer 2.0
  * Added check for low Power command for xWR16xx

	**Compatible with: mmWave SDK 2.0.0, mmWave SDK 1.2.0, mmWave SDK 1.1.0, mmWave SDK 1.0.0**

* mmWave Demo Visualizer 1.2
  * Support for new advanced commands for xWR16xx via CLI - bpmCfg, lvdsStreamCfg, nearfieldCfg, CQ
  * Support for new advanced commands for xWR14xx via CLI - CQ

	**Compatible with: mmWave SDK 1.2.0, mmWave SDK 1.1.0, mmWave SDK 1.0.0**

* mmWave Demo Visualizer 1.1
  * New section "Setup details" in the Configure tab
  * Support for new commands - static clutter removal and range/angle bias compensation
  * Save data from DATA_port to a timestamped binary file for offline analysis
  * Support for visualizing subframe data when mmWave device is configured in advanced frame mode
  * Normalize the range profile data for processing gains before plotting
  * Default to log scale for range profile plot
  * Use of 'jet' colormap for heatmap plots

	**Compatible with: mmWave SDK 1.1.0, mmWave SDK 1.0.0**

* mmWave Demo Visualizer 1.0
  * Initial version

	**Compatible with: mmWave SDK 1.0.0**


