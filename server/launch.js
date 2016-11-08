var fs = require('fs');
var util = require('util');

var args = [
	{
		short: 'p',
		long: 'port',
		value: true
	},
	{
		short: 'w',
		long: 'web-address',
		value: true
	},
	{
		short: 'a',
		long: 'allow-remote-web',
		value: false
	},
	{
		short: 'e',
		long: 'editor-address',
		value: true
	},
	{
		short: 'r',
		long: 'allow-remote-editor',
		value: false
	},
	{
		short: 'l',
		long: 'log-path',
		value: true
	},
];

var settings = {};

for(var i = 2; i < process.argv.length; i++){
	var arg = process.argv[i];
	if(arg[0] != '-'){
		continue;
	}

	var foundArg = null;
	if(arg[1] == '-'){
		arg = arg.substr(2);
		for(var f = 0; f < args.length; f++){
			if(args[f].long == arg){
				foundArg = args[f];
				break;
			}
		}
	}else{
		arg = arg.substr(1);
		for(var f = 0; f < args.length; f++){
			if(args[f].short == arg){
				foundArg = args[f];
				break;
			}
		}
	}

	if(foundArg){
		settings[foundArg.long] = (foundArg.value) ? process.argv[i + 1] : true
	}
};

settings['port'] = settings.port || 13378;
settings['web-address'] = settings.address || '127.0.0.1';
settings['editor-address'] = settings.address || '127.0.0.1';
settings['log-path'] = settings.address || '/tmp/bracey_server.log';

var log_file = fs.createWriteStream(settings['log-path'], {flags : 'w'});
var log_stdout = process.stdout;

console.log = function(msg) {
	log_file.write(util.format(msg) + '\n');
	log_stdout.write(util.format(msg) + '\n');
};

console.log('starting bracey with arguments:');

for(arg in settings){
	console.log(arg + ': ' + settings[arg]);
};

var server = require("./server.js");
server = new server(settings);
server.start();
