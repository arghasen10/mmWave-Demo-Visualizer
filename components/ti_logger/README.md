# ti_logger 

A TI logging library for node.js and Node-Webkit

## Motivation
ti_logger is a logging and tracing library.
It supports logging to the console and/or to a file.

While there are many logging libraries, none support some of the special requirements ti_logger adresses.
This include:

* The ability to specify a source when logging.
* The ability to specify for each source the logging-level
* The ability to have different logging levels for the console and for the file.
* The ability to configure the logger using a config-file
* etc

## Installation

```bash
npm install git://gitorious.design.ti.com/guicomposer-nw/ti_logger.git
```

## Usage
The ti_logger module .

``` js
  var logger = require('ti_logger')();

  logger.error("this is a sample error');
```

## Logging Levels
ti_logger define the following logging and tracing levels:

* off
* error 
* warn
* info
* trace
* tracefiner
* tracefinest


### Using The Logging Levels

``` js
  var logger = require('ti_logger')();
  
  logger.error("my error messsage");
  logger.warn("my warning messsage");
  logger.info("my info messsage");
  logger.trace("my trace messsage");
  logger.tracefiner("my tracefiner messsage");
  logger.tracefinest("my tracefinest messsage");
```

## configuration

ti_logger is very flexible and may be configured in several ways:

* via a configuration file
* via a configuration Object

###The configuration file

The default location for the configuration file is under: <userhome>/ti/<appname>
The config file name name is: log-config.json.
This file is loaded when no arguments are specified in the require derictive:

``` js
  // no argument to the require -> load default config file
  var logger = require('ti_logger')();
  
```

The user have the option of specifying the location of the config path.

``` js
  // config file is loaded from specified filename instead of the default one.
  var myConfigFile = 'c:/dir1/dir2/myAppDir/myOwnConfig.json";
  var logger = require('ti_logger')(myConfigFile);
  
```

A typical content of the file will look like this:

``` js
	{
    	handleUncaughtExceptions: true,
		"fileLogger":
		{
			"json": false,
			"timestamp":true,
			"maxRollingFiles": 7,	
			"maxFileSize": 3145728,
			"levels": 
			{
				"defaultLevel": "trace",
				"module1":"warn",
				"module2":"trace"	
			}
		},
		"consoleLogger":
		{
			"json": false,
			"timestamp":true,
			"levels": 
			{
				"defaultLevel": "trace",
				"module1":"info",
				"module3":"trace"
			}
		}
	}
```

This file is loaded when the file require('ti_logger') is executed.

### the configuration Object
When a configuration file may not be used, a configuration Object may be passed to the module as an arguments. In this case the default configuration file is ignored.

``` js
	var myConfig = 
	{
    	handleUncaughtExceptions: true,
		"fileLogger":
		{
			"logDirectory":"c:/temp/mydirectory/logs",
			"logFilename":"myApp.log",
			"json": true,
			"timestamp":true,
			"maxRollingFiles": 5,	
			"maxFileSize": 3145728,
			"levels": 
			{
				"defaultLevel": "trace"
			}
		},
		"consoleLogger":
		{
			"json": false,
			"timestamp":false,
			"levels": 
			{
				"defaultLevel": "trace"
			}
		}
	};
	
	var logger = require('ti_logger')(myConfig);
```


### the configuration parameters

* __handleUncaughtExceptions__: A boolean that specifies whether uncaught exceptions should be handle by the logger or not
* __logDirectory__:   The directory where log files will reside
* __logFilename__:   the name of the log file.
* __json__:  controls if the output is json based or not.
* __timestamp__:   controls if the log message will contain the date/time in an ISO format (example 2014-06-06T13:37:21.249Z)
* __maxRollingFiles__:   The maximum number of rolling log files. When a file reaches the maxFileSize, a new file is created. 
* __maxFileSize__:   The maximum size in bytes of the log file.
* __defaultLevel__:   This is the default consoleLogger or fileLogger logging level. This may be any of: *off, error, warn, info, trace, tracefiner, tracefinest* 

### the configuration defaults
When a config parameters is not specified in the configuration, the following defaults are assumed:

* __handleUncaughtExceptions__: true
* __logDirectory__:   <userhome>/ti/<appname>/logs
* __logFilename__:   mainLog.log
* __json__:  **true** for fileLogger and *false* for the consoleLogger
* __timestamp__:  true* for fileLogger and *false* for the consoleLogger 
* __maxRollingFiles__:   5
* __maxFileSize__:   3145728 (in bytes) or 3MB
* __defaultLevel__:   *warn* for fileLogger and *off* for the consoleLogger

### Runtime Configuration changes
This is typically not required as we expect the configutaion to not change at runtime.
However, if need arises, there are two ways to make changes to the configuration while the application is running:

####By making changes to the configuration file: 
When changes are made to the active configuration file and the file is then saved; the content of the file is automatically read and the changes are applied dynamically.

####Configuration API
In the rare case where consoleLogger level or fileLevel needs to be programatically changed at runtime based on some criteria, an API has been provided to do that:

``` js
  var logger = require('ti_logger')(configurationObject);
  ....
  ....
  if(condition_1)
  {
	logger.setConfiguration(configObject1);
  }
  else if(condition_2)
  {
	logger.setConfiguration(configObject2);
  }
  else if(someOtherCondition)
  {
	logger.setConfiguration(configObject3);
  }
```
#####Important Note:
Setconfiguration overrides all config-parameters with two exceptions:

* __logDirectory__:   will not be affected
* __logFilename__:   will not be affected 

### Configuration precedence

Since configuration may be applied in different ways, this define what takes precedence:

1. ConfigurationObject or Configuration-file as argument to the require
2. Configuration file under <userHome>/ti/appname


###The Source parameter

When logging a message, the developer may choose to include a source. The source may be a module name or a feature-name or anything else the developer wants it to be.
In this case the API call would look like this:

``` js
  var logger = require('ti_logger')();

  logger.error("sourcename", "this is a sample error');
```

### Specifying Source levels
The developer has the option of specifying a logging level in the configuration. The source logging level may be specified for the fileLogger, the consoleLogger or both.

``` js
	{
		"fileLogger":
		{
			"levels": 
			{
				"defaultLevel": "error",
				"source1":"warn",
				"source2":"trace"	
			}
		},
		"consoleLogger":
		{
			"levels": 
			{
				"defaultLevel": "off",
				"source1":"info",
				"source2":"warn",
				"source3":"trace"
			}
		}
	}
```
## Important Notes
It is important that the ???require??? for the logger be called first in your application and initialized properly.
Otherwise you may run into this situation

1.	Some other module(s) will perform the require and start using the logger with default parameters
2.	Some messages logged by the modules are going to go through since the log level for the app and the filter are not what you intended
3.	The log format may be also be not what you intended.
4.	When you finally execute: var logger = require('ti_logger')(myConfig); no change will take place since the ???require??? returns the same logger (with default parameters)
5.	Using logger.setConfiguration(myConfig ) would alter logging parameters. But again, but this time, many messages would have gone through unfiltered and possibly using the wrong format.

