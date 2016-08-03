var expect = require('chai').expect;
var http = require('http');
var bracey = require('../server.js');
var WebSocketClient = require('websocket').client;
var port = 13378;

var serverSettings = {
	port: port,
	'web-address': '127.0.0.1',
	'editor-address': '127.0.0.1'
}

var  connection;

function send(msg){
	var options = {
		hostname: 'localhost',
		port: port,
		path: '/',
		method: 'POST',
	};

	var request = http.request(options, function(response){
		expect(response.statusCode).to.equal(200);
		response.on('data', function(data){});
		response.on('end', function(){});
	});

	request.on('error', function(e){
		e.should.be.null;
	});

	request.write(msg);
	request.end();
}

var callbacks = [];
var responses = [];

function recieve(callback){
	if(responses.length > 0){
		callback(responses.pop());
	}else{
		callbacks.push(callback);
	}
}

describe('server', function(){
	before(function(done){
		server = new bracey(serverSettings);
		server.start();

		var client = new WebSocketClient();
		client.connect('ws://localhost:' + port);
		client.on('connect', function(c){
			connection = c;
			connection.on('message', function(msg){
				if(callbacks.length > 0){
					callbacks.pop()(JSON.parse(msg.utf8Data));
				}else{
					responses.push(JSON.parse(msg.utf8Data));
				}
			});
			done();
		});
		client.on('connectFailed', function(err){
			done(err);
		});
	});

	after(function(){
		if(connection){
			connection.close();
		}
		server.stop();
	});

	describe('ping', function(){
		it('responds with pong when send ping', function(done){
			send('ping');
			recieve(function(msg){
				msg.should.deep.equal({"command": "pong"});
				done();
			});
		});
	});

	describe('position', function(){
		[
			{command: 'p:2:1', expected: 1},
			{command: 'p:4:1', expected: 2},
			{command: 'p:4:2', expected: 3},
			{command: 'p:22:5', expected: 6},
			{command: 'p:31:2', expected: 13},
			{command: 'p:53:2', expected: 29},
			{command: 'p:54:2', expected: 23}
		].forEach(function(test){
			it('correctly responds to the position command "' + test.command + '"', function(done){
				send(test.command);
				recieve(function(msg){
					msg.should.deep.equal({
						"command": "select",
						"selector": "[meta-bracey-element-index=\"" + test.expected + "\"]"
					});
					done();
				});
			});
		}, this);
	});

	describe('changes', function(){
		it('responds to changes in the document');
		it('makes no changes when given invalid html');
		it('reports invalid html erorrs to vim');
	});
});
