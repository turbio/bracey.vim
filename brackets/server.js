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

htmlfile.setCSS(fs.readFileSync('frontend.css', "utf8"));
htmlfile.setJS(fs.readFileSync('frontend.js', "utf8"));

//TODO: this is all temporary
var webRoot = "./test";
var currentFileX = 0;
var currentFileY = 0;

var files = [];

var currentHtmlFile;
var currentFile;

function getFile(path){
}

function getCurrentFile(){
}

function getCurrentHtmlFile(){
	if(currentHtmlFile == undefined || files[currentHtmlFile] == undefined){
		return null;
	}

	return files[currentHtmlFile];
}

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
}

function newFile(source, path, type){
	switch(type){
		case 'html':
			break;
		case 'css':
			break;
		case 'js':
			break;
	}
}

Server.prototype.start = function(port){
	//currentHtmlFile = new htmlfile(fs.readFileSync(webRoot + '/index.html', "utf8"), webRoot + '/index.html');
	//currentFile = new cssfile(fs.readFileSync(webRoot + '/style.css', "utf8"), webRoot + '/index.html');
	httpServer.listen(port);
};

Server.prototype.stop = function(){
	httpServer.close();
};

function handleEditorRequest(data){
	if(postData.length > 2){
		if(postData == 'ping'){
			broadcast({'command': 'pong'});
			return;
		}
		command = postData[0];
		content = postData.substring(2);
		switch(command){
			//cursor position command
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
			case 'b':
				currentHtmlFile.setContent(content, function(err, diff){
					broadcast({
						'command': 'edit',
						'changes': diff
					});
				});
				break;
		}
	}
}

function handleFileRequest(request, response){
	if(request.url == '/'){
		var file = getCurrentHtmlFile();
		if(file == null){
			response.writeHead(200);
			response.end(errorPage.webSrc(
				'wait for file...',
				"vim hasn't opened an html file yet, or at least brackets isn't aware of any"));
		}else{
			response.writeHead(302, {
				'Location': file.path
			});
			response.end();
		}
		return;

	}

	if(webRoot + request.url == currentHtmlFile.path){
		response.writeHead(200);
		response.end(currentHtmlFile.webSrc());
	}else{
		fs.readFile(webRoot + request.url, function(err, data){
			if(err){
				response.writeHead(404);
				response.end(err.toString());
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
