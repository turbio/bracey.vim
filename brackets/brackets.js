//the brackets server
//this sits between vim and the webpage

var VERSION = "0.0.1";

console.log("brackets server");
console.log("version: " + VERSION);

var websocket = require("websocket");
var http = require("http");
var fs = require("fs");
var path = require("path");
var mime = require("mime");
var cheerio = require("cheerio");

var connections = [];
var port = 1337;

//TODO: this is all temporary
var webRoot = "/home/mason/Git/lentils-as-a-service/mockups/";
var defaultFile = "index.html";
var currentFile = "index.html";

//TODO this is also temporary
var currentFileSrc = "";
var injectedJs = "";
var injectedCss = "";

fs.readFile(path.resolve("frontend.css"), function(err, data){
	injectedCss = data.toString();
	fs.readFile(path.resolve("frontend.js"), function(err, data){
		injectedJs = data.toString();
		fs.readFile(path.resolve(webRoot + currentFile), function(err, data){
			currentFileSrc = data.toString();
			$ = cheerio.load(currentFileSrc);
			$("*").each(function(i, elem){
				$(this).attr('data-brackets-id', i);
			});
			$("head").append('<script>' + injectedJs + '</script>');
			$("head").append('<style>' + injectedCss + '</style>');
			currentFileSrc = $.html();
		});
	});
});

var server = http.createServer(function(request, response){
	console.log("requested: " + request.url);

	if(request.url == "/"){
		if(request.method == "POST"){
			var postData = '';

			request.on('data', function(data){
				postData += data;
			});

			request.on('end', function(){
				console.log(JSON.parse(postData));
				broadcast(postData);
			});

			response.writeHead(200);
			response.end();
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
	console.log("websocket connected");
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
