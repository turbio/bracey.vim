//the bracey server
//this sits between vim and the webpage

var VERSION = "0.0.1";

var websocket = require("websocket");
var http = require("http");
var fs = require("fs");
var mime = require("mime");
var files = require("./filemanager.js");

var connections = [];

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

function Server(settings){
	this.settings = settings;
	this.files = new Files();
}

Server.prototype.start = function(){
	if(this.settings['allow-remote-web']){
		console.log('starting http server on port ' + this.settings['port']);
		httpServer.listen(this.settings['port']);
	}else{
		console.log('starting http server on port ' + this.settings['port']
			+ ' with address restricted to ' + this.settings['web-address']);
		httpServer.listen(this.settings['port'], this.settings['web-address']);
	}
};

Server.prototype.stop = function(){
	console.log('stopping http server');
	httpServer.close();
};

Server.prototype.parseEditorRequest = function(data){
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
		this.parseEditorRequest(remaining);
	}
}

function handleEditorCommand(command, data){
	switch(command){
		//full buffer update
		case 'b':
			var currentFile = this.files.getCurrentFile();
			if(!currentFile){
				break;
			}

			if(currentFile.type == 'html'){
				currentFile.setContent(data[0], function(err, diff){
					if(!err){
						sendEdit(diff);
					}else{
						console.log('file ' + currentFile.name + ' parse error');
					}
				});
				sendSelect(null, currentFile.errorState);
			}else if(currentFile.type == 'css'){
				currentFile.setContent(data[0], function(err){
					if(!err){
						broadcast({'command': 'reload_css'});
					}else{
						console.log('file ' + currentFile.name + ' parse error');
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
			var file = this.files.getById(data[0]);
			if(!file){
				this.files.newFile(data[0], data[1], data[2], data[3]);
			}
			this.files.setCurrentFile(data[0]);
			break;
		//set variables
		case 'v':
			this.files.editorRoot = data[0];
			break;
		//cursor position
		case 'p':
			var currentFile = this.files.getCurrentFile();
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
		var currentFile = this.files.getCurrentHtmlFile();
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
	var file = this.files.getByWebPath(url);

	if(file){
		console.log('already known to bracey as ' + url);
		response.writeHead(200, {
			"Content-Type": mime.lookup(url)
		});
		response.end(file.webSrc());
	}else{
		console.log('loading from ' + this.files.editorRoot + url);
		fs.readFile(this.files.editorRoot + url, function(err, data){
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
			&& (this.settings['allow-remote-editor']
				|| request.connection.remoteAddress.includes(this.settings['editor-address']))){
		var postData = '';

		request.on('data', function(data){
			postData += data;
		});

		request.on('end', function(){
			response.writeHead(200);
			response.end();
			console.log('recieved from editor: ' + postData);

			this.parseEditorRequest(postData);
		});
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
