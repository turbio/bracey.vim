var args = [
	{
		short: 'p',
		long: 'port',
		value: true
	},
	{
		short: 'a',
		long: 'address',
		value: true
	},
	{
		short: 'r',
		long: 'remote-connect',
		value: false
	},
	{
		short: 'v',
		long: 'remote-vim',
		value: false
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

settings.port = settings.port || 13378;
settings.address = settings.address || '127.0.0.1';

var server = require("./server.js");
server = new server();
server.start(settings);
