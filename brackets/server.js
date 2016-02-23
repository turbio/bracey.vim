//the brackets server
//this sits between vim and the webpage

var VERSION = "0.0.1";

var websocket = require("websocket");
var http = require("http");
var fs = require("fs");
var mime = require("mime");
var htmlfile = require("./htmlfile.js");

var connections = [];

//TODO: this is all temporary
var webRoot = "./test";
var defaultFile = "index.html";
var currentFileX = 0;
var currentFileY = 0;

var currentFile;

function Server(){
}

Server.prototype.start = function(port){
	currentFile = new htmlfile(webRoot + '/index.html')
	httpServer.listen(port);
};

Server.prototype.stop = function(){
	httpServer.close();
};

var httpServer = http.createServer(function(request, response){
	if(request.url == "/"){
		if(request.method == "POST"){
			var postData = '';

			request.on('data', function(data){
				postData += data;
			});

			request.on('end', function(){
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
							elem = currentFile.tagFromPosition(currentFileY, currentFileX);
							if(elem != null){
								broadcast({
									'command': 'select',
									'selector': '[meta-brackets-element-index=\"' + elem.index + '\"]'
								});
							}
							break;
						case 'b':
							currentFile.setContent(content, function(diff){
								console.log(diff);
								broadcast({
									'command': 'edit',
									'diff': diff
								});
							});
							break;
					}
				}
			});

			response.writeHead(200);
			response.end();
		}else{
			response.writeHead(302, {
				'Location': defaultFile
			});
			response.end();
		}
	}else if(webRoot + request.url == currentFile.path){
		response.writeHead(200);
		response.end(currentFile.webSrc());
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
