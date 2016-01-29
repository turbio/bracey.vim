var should = require('chai').should();
var expect = require('chai').expect;
var http = require('http');
var WebSocketClient = require('websocket').client;
var port = 1337;

describe('htmlfile', function(){
	before(function(){
		this.htmlfile = require('../htmlfile');
	});

	describe('constructor', function(){
		it('should not throw errors under any circumstance', function(){
			this.htmlfile();
		});

		describe('callback', function(){
			it('should have no errors with valid file', function(done){
				this.htmlfile('test/index.html', function(err){
					expect(err).to.be.null;
					done();
				});
			});
			it('should have errors with nonexistent file', function(done){
				this.htmlfile('file which does not exist', function(err){
					err.should.be.ok;
					done();
				});
			});
			it('should have errors with invalid html');
		});
	});

	describe('#tagFromPosition()', function(){
		before(function(done){
			this.file = new this.htmlfile('test/index.html', function(err){
				done(err);
			});
		});
		it('should return null when given a negative line or column', function(){
			expect(this.file.tagFromPosition(-1, -1)).to.be.null;
		});
		it('should return null when given an out of bound line or column', function(){
			expect(this.file.tagFromPosition(10000, 0)).to.be.null;
			expect(this.file.tagFromPosition(0, 10000)).to.be.null;
		});
		[
			{line: 1, column: 0, expected: {name: 'html', index: 1}},
			{line: 3, column: 0, expected: {name: 'head', index: 2}},
			{line: 3, column: 1, expected: {name: 'title', index: 3}},
			{line: 21, column: 4, expected: {name: 'body', index: 6}},
			{line: 30, column: 1, expected: {name: 'ol', index: 13}},
			{line: 52, column: 1, expected: {name: 'tr', index: 29}},
			{line: 53, column: 1, expected: {name: 'table', index: 23}},
		].forEach(function(test){
			it('finds the correct element on ' + test.line + ':' + test.column, function(){
				var elem = this.file.tagFromPosition(test.line, test.column);
				elem.should.have.property('name', test.expected.name);
				elem.should.have.property('index', test.expected.index);
			});
		}, this);
	});
});

describe('server', function(){
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
});
