//the brackets server
//this sits between vim and the webpage

var VERSION = "0.0.1";

var websocket = require("websocket");
var http = require("http");
var fs = require("fs");
var path = require("path");
var mime = require("mime");

var connections = [];
var port = 1337;

//TODO: this is all temporary
var webRoot = "/home/mason/Git/lentils-as-a-service/mockups/";
var defaultFile = "index.html";
var currentFile = "index.html";

//TODO this is also temporary
var currentFileSrc = ""

fs.readFile(path.resolve(webRoot + currentFile), function(err, data){
	if(!err){
		currentFileSrc = data;
	}
});

console.log("brackets server");
console.log("version: " + VERSION);

var server = http.createServer(function(request, response){
	console.log("requested: " + request.url);

	if(request.url == "/"){
		if(request.method == "POST"){
			response.writeHead(200);
			response.end("brackets " + VERSION);
		}else{
			response.writeHead(302, {
				'Location': defaultFile
			});
			response.end();
		}
	}else if(request.url == "/" + currentFile){
		response.writeHead(200);
		response.end(currentFileSrc);
	}else{
		fs.readFile(path.resolve(webRoot + request.url), function(err, data){
			if(err){
				response.writeHead(404);
				response.end(err.toString());
			}else{
				response.writeHead(200, {"Content-Type": mime.lookup(request.url)});
				response.end(data, "binary");
			}
		});
	}
});

server.listen(port);

webSocketServer = new websocket.server({
	httpServer: server,
	autoAcceptConnections: false
});

webSocketServer.on('request', function(request){
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
});

function broadcast(message){
	for(var i = 0; i < connections.length; i++){
		connections[i].sendUTF(message);
	}
}
