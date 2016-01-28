var should = require('chai').should();
var expect = require('chai').expect;
var http = require('http');

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
	before(function(){
		var server = require('../server.js');
		this.server = new server();
		this.server.start();
	});
	after(function(){
		this.server.stop();
	});
});
