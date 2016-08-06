//the bracey server
//this sits between vim and the webpage

var VERSION = "0.0.1";

var websocket = require("websocket");
var http = require("http");
var fs = require("fs");
var mime = require("mime");
var filemanager = require("./filemanager.js");

function Server(settings){
	this.settings = settings;
	this.connections = [];

	var self = this;

	this.files = new filemanager(function(file){
		self.sendGoto(file.name)
	});
}

Server.prototype.start = function(){
	this.httpServer = http.createServer(this.httpRequest.bind(this));

	this.webSocketServer = new websocket.server({
		httpServer: this.httpServer,
		autoAcceptConnections: false
	});

	this.webSocketServer.on('request', this.webSocketRequest.bind(this));

	if(this.settings['allow-remote-web']){
		//console.log('starting http server on port ' + this.settings['port']);

		this.httpServer.listen(this.settings['port']);

	}else{
		//console.log('starting http server on port ' + this.settings['port']
			//+ ' with address restricted to ' + this.settings['web-address']);

		this.httpServer.listen(this.settings['port'], this.settings['web-address']);
	}

};

Server.prototype.httpRequest = function(request, response){
	if(request.method == 'GET'){
		this.handleFileRequest(request, response);
	}else if(request.method == 'POST'
			&& (this.settings['allow-remote-editor']
			|| request.connection.remoteAddress.includes(this.settings['editor-address']))){
		var postData = '';

		request.on('data', function(data){
			postData += data;
		});

		var self = this;
		request.on('end', function(){
			response.writeHead(200);
			response.end();
			//console.log('recieved from editor: ' + postData);

			self.parseEditorRequest(postData);
		});
	}
};

Server.prototype.stop = function(){
	//console.log('stopping http server');
	this.httpServer.close();
};

Server.prototype.parseEditorRequest = function(data){
	if(data === 'ping'){
		//console.log('recieved ping, sending pong');
		this.sendPong();
		return;
	}

	var command = data[0];
	var headerLength = data.indexOf(':', 2);
	var dataLength = parseInt(data.substr(2, headerLength - 2));
	var commandData = data.substr(headerLength + 1, dataLength);

	var commandArgs = [commandData];

	while(data[headerLength + dataLength + 1] == ':'){
		data = data.substr(headerLength + dataLength + 2);
		headerLength = data.indexOf(':');
		dataLength = parseInt(data.substr(0, headerLength));
		commandData = data.substr(headerLength + 1, dataLength);
		commandArgs.push(commandData);
	}

	this.handleEditorCommand(command, commandArgs);

	var remaining = data.substr(headerLength + dataLength + 1);

	if(remaining.length > 0){
		this.parseEditorRequest(remaining);
	}
}

Server.prototype.handleEditorCommand = function(command, data){
	switch(command){
	case 'b': //full buffer update
		var currentFile = this.files.getCurrentFile();
		if(!currentFile){
			break;
		}

		if(currentFile.type == 'html'){
			var self = this;
			currentFile.setContent(data[0], function(err, diff){
				if(err){
					//console.log('file ' + currentFile.name + ' parse error');
					self.setError(err);
				}else{
					self.setError(false);
					
					if(diff){
						self.sendEdit(diff);
					}
				}
			});

		}else if(currentFile.type == 'css'){
			var self = this;
			currentFile.setContent(data[0], function(err){
				if(!err){
					self.setError(false);
					self.broadcast({'command': 'reload_css'});
				}else{
					//console.log('file ' + currentFile.name + ' parse error');
					self.setError(err);
				}
			});
		}

		break;

	case 'e': //eval js
		this.broadcast({
			'command': 'eval',
			'js': data[0]
		});
		break;
	
	case 'r': //reload page
		this.broadcast({'command': 'reload_page'});
		break;
	
	case 'f': //set the current file buffer number, name, path, type
		var file = this.files.getById(data[0]);
		if(file === undefined){
			this.files.newFile(data[0], data[1], data[2], data[3]);
		}
		this.files.setCurrentFile(data[0]);
		break;
	
	case 'v': //set variables
		this.files.editorRoot = data[0];
		break;
	
	case 'p': //cursor position
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
				this.sendSelect(selector);
			}
		}

		break;
	}
}

Server.prototype.stripParams = function(url){
	return url.split('?')[0]
};

Server.prototype.handleFileRequest = function(request, response){
	//console.log('web file requested ' + request.url);

	if(request.url == '/'){
		var currentFile = this.files.getCurrentHtmlFile();
		if(currentFile === undefined){
			response.writeHead(200);
			response.end(this.files.errorPage.webSrc(
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

	var url = this.stripParams(request.url);
	var file = this.files.getByWebPath(url);

	var self = this;
	if(file){
		//console.log('already known to bracey as ' + url);
		response.writeHead(200, {
			"Content-Type": mime.lookup(url)
		});
		response.end(file.webSrc());

	}else{
		//console.log('loading from ' + this.files.editorRoot + url);
		fs.readFile(this.files.editorRoot + url, function(err, data){
			if(err){
				response.writeHead(404);
				response.end(self.files.errorPage.webSrc(
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
};

Server.prototype.webSocketRequest = function(request){
	var connection = request.accept('', request.origin);
	this.connections.push(connection)
	var i = this.connections.length - 1;

	connection.on('close', this.connections.splice.bind(this, i, 1));

	connection.on('message', function(message){
		var content = JSON.parse(message.utf8Data);
		//TODO: handle client messages
	});
};

var lastGoto = '';
Server.prototype.sendGoto = function(location){
	if(lastGoto != location){
		this.broadcast({
			'command': 'goto',
			'location': location
		});
		lastGoto = location;
	}
};

Server.prototype.sendPong = function(){
	this.broadcast({'command': 'pong'});
};

Server.prototype.sendEdit = function(diff){
	this.broadcast({
		'command': 'edit',
		'changes': diff
	});
};

Server.prototype.setError = function(message){
	if(!this.hasError && !message) {
		return;
	}

	if(message){
		this.hasError = true;
		var err = message[0];

		this.broadcast({
			'command': 'error',
			'action': 'show',
			'message': err.line + ':' + err.col + ': ' + err.message
		});
	}else{
		this.hasError = false;
		this.broadcast({
			'command': 'error',
			'action': 'clear'
		});
	}
};

var lastSelector = undefined;
Server.prototype.sendSelect = function(selector){
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

	if(hasChange){
		this.broadcast(cmd);
	}
};

Server.prototype.broadcast = function(command){
	for(var i = 0; i < this.connections.length; i++){
		this.connections[i].sendUTF(JSON.stringify(command));
	}
};

module.exports = Server;
