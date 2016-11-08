var expect = require('chai').expect;
var fs = require('fs');
var http = require('http');
var bracey = require('../server.js');
var WebSocketClient = require('websocket').client;
var port = 13378;

var serverSettings = {
	port: port,
	'web-address': '127.0.0.1',
	'editor-address': '127.0.0.1'
}

var web = {
	recieve: function(callback){
		this.recievers.push(callback);
	},
	recievers: []
};

var editor = {
	send: function(msg){
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
};

describe('server', function(){
	before(function(done){
		//start bracey
		server = new bracey(serverSettings);
		server.start();

		//connect to bracey from websocket (simulator web browser
		var client = new WebSocketClient();
		client.connect('ws://localhost:' + port);

		client.on('connect', function(c){
			connection = c;
			connection.on('message', function(msg){
				web.recievers.shift()(JSON.parse(msg.utf8Data));
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

	afterEach('should have no messages pending', function(){
		web.recievers.length.should.equal(0);
	});

	describe('ping', function(){
		it('responds with pong when send ping', function(done){
			web.recieve(function(msg){
				msg.should.deep.equal({"command": "pong"});
				done();
			});
			editor.send('ping');
		});
	});

	describe('position', function(){
		before(function(done){
			var testHtmlFile = fs.readFileSync('test/fixtures/test_html.html', 'utf8');


			web.recieve(function(msg){
				msg.command.should.equal('goto')
				msg.location.should.equal('test.html')

				web.recieve(function(msg){
					msg.should.be.ok;
					msg.command.should.equal('edit');
					done();
				});
				editor.send('b:' + testHtmlFile.length + ':' + testHtmlFile);
			});
			editor.send('f:1:1:9:test.html:10:/home/html:4:html');
		});

		[
			{command: 'p:1:2:1:1', expected: 1},
			{command: 'p:1:4:1:1', expected: 2},
			{command: 'p:1:4:1:2', expected: 3},
			{command: 'p:2:22:1:5', expected: 6},
			{command: 'p:2:31:1:2', expected: 13},
			{command: 'p:2:53:1:2', expected: 29},
			{command: 'p:2:54:1:2', expected: 23}
		].forEach(function(test){
			it('correctly responds to the position command "' + test.command + '"', function(done){
				web.recieve(function(msg){
					msg.should.deep.equal({
						"command": "select",
						"index": test.expected
					});
					done();
				});

				editor.send(test.command);
			});
		}, this);
	});

	describe('changes', function(){
		it('responds to changes in the document');
		it('makes no changes when given invalid html');
		it('reports invalid html erorrs');
	});

	describe('buffer change', function(){
		var testCssFile;

		before(function(done){
			var testHtmlFile = fs.readFileSync('test/fixtures/test_html.html', 'utf8');
			testCssFile = fs.readFileSync('test/fixtures/test_css.css', 'utf8');


			web.recieve(function(msg){
				msg.command.should.equal('goto')
				msg.location.should.equal('test.html')

				web.recieve(function(msg){
					msg.should.be.ok;
					msg.command.should.equal('edit');
					done();
				});
				editor.send('b:' + testHtmlFile.length + ':' + testHtmlFile);
			});

			editor.send('f:1:1:9:test.html:10:/home/html:4:html');
		});

		//it('should change between html and css file', function(done){
			//web.recieve(function(msg){
				//msg.command.should.equal('goto')
				//msg.location.should.equal('test.html')
				//done();
			//});

			//editor.send('f:1:1:9:test.html:10:/home/html:4:html');
		//});
	});
});
