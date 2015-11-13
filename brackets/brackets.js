//the brackets server
//this sits between vim and the webpage

var VERSION = "0.0.1";

console.log("brackets server");
console.log("version: " + VERSION);

var websocket = require("websocket");
var http = require("http");
var fs = require("fs");
var mime = require("mime");
var cheerio = require("cheerio");
var domtosource = require('domtosource');

var connections = [];
var port = 1337;

//TODO: this is all temporary
var webRoot = "/home/mason/git/lentils-as-a-service/mockups";
var defaultFile = "index.html";
var currentFile = "index.html";
var currentFileX = 0;
var currentFileY = 0;

//TODO this is also temporary
var injectedCss = fs.readFileSync("frontend.css", 'utf8');
var injectedJs = fs.readFileSync("frontend.js", 'utf8');

var vimSrc = fs.readFileSync(webRoot + '/' + currentFile, 'utf8');
var webSrc = parseVimSource(vimSrc);

var server = http.createServer(function(request, response){
	console.log("requested: " + request.url);

	if(request.url == "/"){
		if(request.method == "POST"){
			var postData = '';

			request.on('data', function(data){
				postData += data;
			});

			request.on('end', function(){
				postCommands = postData.split('\n');
				for(i = 0; i < postCommands.length; i++){
					message = postCommands[i];
					if(message.length > 2){
						command = message[0];
						content = message.substring(2);
						switch(command){
							case 'p':
								cords = content.split(':');
								currentFileX = cords[1] - 1;
								currentFileY = cords[0] - 1;
								broadcast({
									'command': 'select',
									'selector': '[data-brackets-id=\"' + elementIdByPos(currentFileX, currentFileY) + '\"]'
								});
								break;
							//case 'l':
								//lines = currentEditorSrc.split('\n');
								//if(lines[currentFileY] != content){
									//lines[currentFileY] = content
									//currentEditorSrc = lines.join('\n');
									//console.log('not the same');
								//}
								//break;
						}
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
	}else if(request.url == "/" + currentFile){
		response.writeHead(200);
		response.end(webSrc.html());
	}else{
		fs.readFile(webRoot + request.url, function(err, data){
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

function broadcast(command){
	for(var i = 0; i < connections.length; i++){
		connections[i].sendUTF(JSON.stringify(command));
	}
}

//returns an elements brackets-id by it's x and y position in the editors's
//source
function elementIdByPos(column, line){
	var $ = cheerio.load(vimSrc);
	elementFromPos(column, line, $.root());
	return line;
}

function elementFromPos(column, line, root, l, curColumn, curLine){
	if(typeof(l) === 'undefined'){
		l = 0;
	}
	if(typeof(curColumn) === 'undefined'){
		curColumn = 0;
	}

	if(typeof(curLine) === 'undefined'){
		curLine = 0;
	}


	if(!('type' in root)){
		root = root[0];
	}

	content = '';

	if(root['type'] == 'text'){
		console.log(p(l) + 'tex: ' + root['data'].replace('\n', '\\n').replace('\t', '\\t'));
		content = root['data'];
	}else{
		console.log(p(l) + 'tag: ' + root['name']);
		content = cheerio(root).html();
	}

	height = content.split('\n').length;
	width = Math.max.apply(Math, content.split('\n').map(function(item){
		return item.length;
	}));
	console.log(p(l) + 'dim: ' + width + 'x' + height);
	if(curLine

	if('children' in root){
		root['children'].forEach(function(item){
			elementFromPos(line, column, item, l + 1);
		});
	}
}

function p(n){
	s = "";
	while(n > 0){
		n--;
		s += "│";
	}
	return s;
}

function elementFromId(id){
	return null;
}

function idFromElement(element){
	return null;
}

//parse vim source into web source (and return that)
function parseVimSource(src){
	var $ = cheerio.load(vimSrc);

	$("*").each(function(i, elem){
		$(this).attr('data-brackets-id', i);
	});

	$("head").append('<script>' + injectedJs + '</script>');
	$("head").append('<style>' + injectedCss + '</style>');

	return $;
}
