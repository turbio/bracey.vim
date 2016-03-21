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
	if(!arg.startsWith('-')){
		continue;
	}

	if(arg.startsWith('--')){
		arg = arg.substr(2);
		arg = args.find(function(f){ return f.long == arg; });
	}else{
		arg = arg.substr(1);
		arg = args.find(function(f){ return f.short == arg; });
	}

	if(arg){
		settings[arg.long] = (arg.value) ? process.argv[i + 1] : true
	}
};

settings.port = settings.port || 13378;
settings.address = settings.address || '127.0.0.1';

var server = require("./server.js");
server = new server();
server.start(settings);
