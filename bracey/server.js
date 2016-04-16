//the bracey server
//this sits between vim and the webpage

var VERSION = "0.0.1";

var websocket = require("websocket");
var http = require("http");
var fs = require("fs");
var mime = require("mime");
var htmlfile = require("./htmlfile.js");
var cssfile = require("./cssfile.js");
var settings;

var connections = [];

var injectedJs = undefined;
var injectedCss = undefined;

var files = {
	newFile: function(id, name, path, type, source){
		console.log('created a new file with id: ' + id + ', name: ' + name
				+ ', path: ' + path + ', type: ' + type);
		if(source == undefined){
			source = '';
		}

		var createdFile = {};
		switch(type){
			case 'html':
				createdFile = new htmlfile(source);
				break;
			case 'css':
				createdFile = new cssfile(source);
				break;
			default:
				console.log('it\'s not a recognized filetype so we\'ll ignore this');
				//TODO: for now...
				return;
				break;
		}

		createdFile.name = name;

		var relativePath = null;
		if(path.startsWith(this.editorRoot)){
			relativePath = path.substring(this.editorRoot.length);
			if(relativePath[0] == '/'){
				relativePath = relativePath.substr(1);
			}
		}else{
			relativePath = name;
		}

		createdFile.path = {
			system: path,
			relative: relativePath
		};

		createdFile.type = type;

		this.files[id] = createdFile;
	},
	getById: function(id){
		return this.files[id] || null;
	},
	getByPath: function(path){
		throw 'not implemented';
	},
	getByWebPath: function(path){
		if(path[0] == '/'){
			path = path.substr(1);
		}

		for(var file in this.files){
			if(this.files[file].path.relative == path
					|| this.files[file].name == path){
				return this.files[file];
			}
		}

		return null;
	},
	getByName: function(name){
		throw 'not implemented';
	},
	getCurrentFile: function(){
		if(this.currentFile){
			return this.files[this.currentFile] || null;
		}else{
			return null;
		}
	},
	setCurrentFile: function(id){
		if(!this.files[id]){
			this.currentFile = null;
			return;
		}

		this.currentFile = id;

		if(this.files[id].type == 'html'){
			this.currentHtmlFile = id;
			sendGoto(this.files[id].name);
		}
	},
	getCurrentHtmlFile: function(){
		if(this.currentHtmlFile == undefined
				|| this.files[this.currentHtmlFile] == undefined){
			return null;
		}

		return this.files[this.currentHtmlFile];
	},
	getEditorRoot: function(){
		if(!this.editorRoot){
			console.log('requested editor root before it was defined');
		}
		return this.editorRoot;
	},
	currentFile: undefined,
	currentHtmlFile: undefined,
	editorRoot: undefined,
	files: {}
};

var errorPage = {
	webSrc: function(title, details){
		if(!this.template_source){
			this.template_source = fs.readFileSync(this.template_path, "utf8");
			this.template_source = this.template_source.replace(
					/%JAVASCRIPT%/g,
					injectedJs);
		}

		return this.template_source
			.replace(/%TITLE%/g, title)
			.replace(/%DETAILS%/g, details);
	},
	template_source: undefined,
	template_path: 'error_template.html'
};

function Server(){
	injectedCss = fs.readFileSync('frontend.css', "utf8");
	console.log('loaded injected css');
	injectedJs = fs.readFileSync('frontend.js', "utf8");
	console.log('loaded injected js');

	htmlfile.setCSS(injectedCss);
	htmlfile.setJS(injectedJs);
}

Server.prototype.start = function(set){
	settings = set;
	if(settings['allow-remote-web']){
		console.log('starting http server on port ' + settings['port']);
		httpServer.listen(settings['port']);
	}else{
		console.log('starting http server on port ' + settings['port']
			+ ' with address restricted to ' + settings['web-address']);
		httpServer.listen(settings['port'], settings['web-address']);
	}
};

Server.prototype.stop = function(){
	console.log('stopping http server');
	httpServer.close();
};

function parseEditorRequest(data){
	if(data == 'ping'){
		console.log('recieved ping, sending pong');
		sendPong();
		return;
	}


	var command = data[0];
	var headerLength = data.indexOf(':', 2);
	var dataLength = parseInt(data.substr(2, headerLength - 2));
	var commandData = data.substr(headerLength + 1, dataLength);

	commandArgs = [commandData];

	while(data[headerLength + dataLength + 1] == ':'){
		data = data.substr(headerLength + dataLength + 2);
		headerLength = data.indexOf(':');
		dataLength = parseInt(data.substr(0, headerLength));
		commandData = data.substr(headerLength + 1, dataLength);
		commandArgs.push(commandData);
	}

	handleEditorCommand(command, commandArgs);

	var remaining = data.substr(headerLength + dataLength + 1);
	if(remaining.length > 0){
		parseEditorRequest(remaining);
	}
}

function handleEditorCommand(command, data){
	switch(command){
		//full buffer update
		case 'b':
			var currentFile = files.getCurrentFile();
			if(!currentFile){
				break;
			}

			if(currentFile.type == 'html'){
				currentFile.setContent(data[0], function(err, diff){
					if(!err){
						sendEdit(diff);
					}
				});
				sendSelect(null, currentFile.errorState);
			}else if(currentFile.type == 'css'){
				currentFile.setContent(data[0], function(err){
					if(!err){
						broadcast({'command': 'reload_css'});
					}
				});
			}
			break;
		//eval js
		case 'e':
			broadcast({
				'command': 'eval',
				'js': data[0]
			});
			break;
		//reload page
		case 'r':
			broadcast({'command': 'reload_page'});
			break;
		//set the current file
		//buffer number, name, path, type
		case 'f':
			var file = files.getById(data[0]);
			if(!file){
				files.newFile(data[0], data[1], data[2], data[3]);
			}
			files.setCurrentFile(data[0]);
			break;
		//set variables
		case 'v':
			files.editorRoot = data[0];
			break;
		//cursor position
		case 'p':
			var currentFile = files.getCurrentFile();
			if(!currentFile){
				break;
			}

			if(!currentFile.errorState){
				currentFile.cursorX = data[0] - 1;
				currentFile.cursorY = data[1] - 1;

				var selector = null;
				if(currentFile.type == 'html'){
					selector = currentFile.tagFromPosition(
							currentFile.cursorX,
							currentFile.cursorY);
					if(selector != null){
						selector = selector.index;
					}
				}else if(currentFile.type == 'css'){
					selector = currentFile.selectorFromPosition(
							currentFile.cursorX,
							currentFile.cursorY);
				}
				if(selector != null){
					sendSelect(selector);
				}
			}

			break;
	}
}

function stripParams(url){
	return url.split('?')[0]
}

function handleFileRequest(request, response){
	console.log('web file requested ' + request.url);

	if(request.url == '/'){
		var currentFile = files.getCurrentHtmlFile();
		if(currentFile == null){
			response.writeHead(200);
			response.end(errorPage.webSrc(
				'wait for file...',
				"vim hasn't opened an html file yet, or at least bracey isn't aware of any"));
		}else{
			response.writeHead(302, {
				'Location': currentFile.path.relative
			});
			response.end();
		}
		return;
	}

	var url = stripParams(request.url);
	var file = files.getByWebPath(url);

	if(file){
		console.log('already known to bracey as ' + url);
		response.writeHead(200, {
			"Content-Type": mime.lookup(url)
		});
		response.end(file.webSrc());
	}else{
		console.log('loading from ' + files.editorRoot + url);
		fs.readFile(files.editorRoot + url, function(err, data){
			if(err){
				response.writeHead(404);
				response.end(errorPage.webSrc(
					'file could not be read',
					err.toString()));
			}else{
				response.writeHead(200, {
					"Content-Type": mime.lookup(url)
				});
				response.end(data, "binary");
			}
		});
	}
}

var httpServer = http.createServer(function(request, response){
	if(request.method == 'GET'){
		handleFileRequest(request, response);
	}else if(request.method == 'POST'
			&& (settings['allow-remote-editor']
				|| request.connection.remoteAddress.includes(settings['editor-address']))){
		var postData = '';

		request.on('data', function(data){
			postData += data;
		});

		request.on('end', function(){
			parseEditorRequest(postData);
		});

		response.writeHead(200);
		response.end();
	}
});

var webSocketServer = new websocket.server({
	httpServer: httpServer,
	autoAcceptConnections: false
});

webSocketServer.on('request', webSocketRequest);

function webSocketRequest(request){
	var connection = request.accept('', request.origin);
	connections.push(connection)
	var i = connections.length - 1;

	connection.on('close', function(reason, description){
		connections.splice(i, 1);
	});

	connection.on('message', function(message){
		var content = JSON.parse(message.utf8Data);
		//TODO: handle client messages
	});
}

var lastGoto = '';
function sendGoto(location){
	if(lastGoto != location){
		broadcast({
			'command': 'goto',
			'location': location
		});
		lastGoto = location;
	}
}

function sendPong(){
	broadcast({'command': 'pong'});
}

function sendEdit(diff){
	broadcast({
		'command': 'edit',
		'changes': diff
	});
}

var lastSelector = undefined;
var lastError = undefined;
function sendSelect(selector, error){
	var cmd = {
		'command': 'select'
	};

	var hasChange = false;

	if(selector != lastSelector){
		if(typeof selector == 'number'){
			cmd['index'] = selector;
			hasChange = true;
		}else if(typeof selector == 'string'){
			cmd['selector'] = selector;
			hasChange = true;
		}
		lastSelector = selector;
	}

	error = (error == true);
	if(error !== lastError){
		cmd['error'] = error;
		lastError = error;
		hasChange = true;
	}

	if(hasChange){
		broadcast(cmd);
	}
}

function broadcast(command){
	for(var i = 0; i < connections.length; i++){
		connections[i].sendUTF(JSON.stringify(command));
	}
}

module.exports = Server;
