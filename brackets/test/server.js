var expect = require('chai').expect;
var http = require('http');
var WebSocketClient = require('websocket').client;
var port = 1337;

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
	});
	request.write(msg);
	request.end();
}

var callbacks = [];
function recieve(callback){
	callbacks.push(callback);
}

describe('server', function(){
	before(function(done){
		var brackets = require('../server.js');
		server = new brackets();
		server.start(port);

		var client = new WebSocketClient();
		client.connect('ws://localhost:' + port);
		client.on('connect', function(c){
			connection = c;
			connection.on('message', function(msg){
				if(callbacks.length > 0){
					callbacks.pop()(JSON.parse(msg.utf8Data));
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

	it('responds with pong when send ping', function(done){
		recieve(function(msg){
			msg.should.deep.equal({"command": "pong"});
			done();
		});
		send('ping');
	});

	describe('position', function(){
		[
			{command: 'p:2:1', expected: 1},
			{command: 'p:4:1', expected: 2},
			{command: 'p:4:2', expected: 3},
			{command: 'p:22:5', expected: 6},
			{command: 'p:31:2', expected: 13},
			{command: 'p:53:2', expected: 29},
			{command: 'p:54:2', expected: 23},
		].forEach(function(test){
			it('correctly responds to the position command "' + test.command + '"', function(done){
				recieve(function(msg){
					msg.should.deep.equal({
						"command": "select",
						"selector": "[meta-brackets-element-index=\"" + test.expected + "\"]"
					});
					done();
				});
				send(test.command);
			});
		}, this);
	});

	describe('set contents', function(){
		it('correctly responds to buffer changes');
	});
});
