//the brackets server
//this sits between vim and the webpage

var VERSION = "0.0.1";

var websocket = require("websocket");
var http = require("http");
var fs = require("fs");
var mime = require("mime");
var htmlfile = require("./htmlfile.js");
var cssfile = require("./cssfile.js");

var connections = [];

var files = {
	newFile: function(source, path, type){
		switch(type){
			case 'html':
				break;
			case 'css':
				break;
			case 'js':
				break;
		}
	},
	getFile: function(path){

	},
	getCurrentFile: function(){

	},
	getCurrentHtmlFile: function(){
		if(this.currentHtmlFile == undefined || this.files[this.currentHtmlFile] == undefined){
			return null;
		}

		return files[currentHtmlFile];
	},
	currentFile: undefined,
	currentHtmlFile: undefined,
	root: undefined,
	webRoot: undefined,
	files: []
};

var errorPage = {
	webSrc: function(title, details){
		if(!this.template_source){
			this.template_source = fs.readFileSync(this.template_path, "utf8");
		}

		return this.template_source.replace(/%TITLE%/g, title).replace(/%DETAILS%/g, details);
	},
	template_source: undefined,
	template_path: 'error_template.html'
};

function Server(){
	htmlfile.setCSS(fs.readFileSync('frontend.css', "utf8"));
	htmlfile.setJS(fs.readFileSync('frontend.js', "utf8"));
}

Server.prototype.start = function(port){
	httpServer.listen(port);
};

Server.prototype.stop = function(){
	httpServer.close();
};

function handleEditorRequest(data){
	if(data == 'ping'){
		broadcast({'command': 'pong'});
		return;
	}

	console.log(data);

	command = data[0];
	length = data.substr(2, data.indexOf(':', 2) - 2);
	content = data.substr(data.indexOf(':', 2) + 1, length);
	handleEditorCommand(command, content);
}

function handleEditorCommand(command, data){
	console.log(command);
	console.log(data);
	switch(command){
		//full buffer update
		case 'b':
			files.getCurrentHtmlFile().setContent(content, function(err, diff){
				broadcast({
					'command': 'edit',
					'changes': diff
				});
			});
			break;
		//eval js
		case 'e':
			break;
		//reload page
		case 'r':
			break;
		//set the current file
		case 'f':
			break;
		//set variables
		case 'v':
			break;
		//cursor position
		case 'p':
			cords = content.split(':');
			currentFileX = cords[1] - 1;
			currentFileY = cords[0] - 1;
			elem = currentFile.selectorFromPosition(currentFileY, currentFileX);
			if(elem != null){
				broadcast({
					'command': 'select',
					'selector': elem
				});
			}
			break;
	}
}

function handleFileRequest(request, response){
	if(request.url == '/'){
		var file = files.getCurrentHtmlFile();
		if(file == null){
			response.writeHead(200);
			response.end(errorPage.webSrc(
				'wait for file...',
				"vim hasn't opened an html file yet, or at least brackets isn't aware of any"));
		}else{
			response.writeHead(302, {
				'Location': file.path.web
			});
			response.end();
		}
		return;

	}

	var file = files.getFile(request.url);

	if(file){
		response.writeHead(200);
		response.end(file.webSrc());
	}else{
		fs.readFile(files.webRoot + request.url, function(err, data){
			if(err){
				response.writeHead(404);
				response.end(errorPage.webSrc(
					'file could not be read',
					err.toString()));
			}else{
				response.writeHead(200, {
					"Content-Type": mime.lookup(request.url)
				});
				response.end(data, "binary");
			}
		});
	}
}

var httpServer = http.createServer(function(request, response){
	if(request.method == 'GET'){
		handleFileRequest(request, response);
	}else{
		var postData = '';

		request.on('data', function(data){
			postData += data;
		});

		request.on('end', function(){
			handleEditorRequest(postData);
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

function broadcast(command){
	for(var i = 0; i < connections.length; i++){
		connections[i].sendUTF(JSON.stringify(command));
	}
}

module.exports = Server;
