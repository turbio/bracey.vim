var expect = require('chai').expect;
var fs = require("fs");

describe('htmlfile', function(){
	before(function(){
		this.htmlfile = require('../htmlfile');
	});

	beforeEach(function(){
		this.htmlfile.setCSS(fs.readFileSync('frontend.css', "utf8"));
		this.htmlfile.setJS(fs.readFileSync('frontend.js', "utf8"));
		this.file = new this.htmlfile(fs.readFileSync('test/index.html', "utf8"));
	});

	describe('constructor', function(){
		it('should have errors with invalid html');
	});

	describe('#tagFromPosition()', function(){
		it('should return null when given a negative line or column', function(){
			expect(this.file.tagFromPosition(-1, -1)).to.be.null;
		});
		it('should return null when given an out of bound line', function(){
			expect(this.file.tagFromPosition(10000, 0)).to.be.null;
		});
		it('should return null when given an out of bound column', function(){
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

	describe('#webSrc()', function(){
		before(function(done){
			var self = this;
			fs.readFile('test/index_websrc.html', 'utf8', function(err, data){
				self.indexwebsrc = data;
				fs.readFile('frontend.js', 'utf8', function(err, data){
					self.frontendjs = data;
					fs.readFile('frontend.css', 'utf8', function(err, data){
						self.frontendcss = data;
						done(err);
					});
				});
			});
		});
		it('should have the contents of frontend.js injected inside', function(){
			this.file.webSrc().should.include(this.frontendjs);
		});
		it('should have the contents of frontend.css injected inside', function(){
			this.file.webSrc().should.include(this.frontendcss);
		});
		it('should return correctly formated html', function(){
			this.file.webSrc().should.equal(this.indexwebsrc);
		});
	});

	describe('#setContent()', function(){
		before(function(done){
			var self = this;
			fs.readFile('test/index.html', 'utf8', function(err, data){
				self.indexhtml = data;
				done(err);
			});
		});
		it('should not call callback when nothing has changed', function(){
			this.file.setContent(this.indexhtml,function(err, diff){
				throw 'reported changes when nothing was changed';
			});
		});
		it('should ignore all whitespace changes to root', function(){
			this.file.setContent(this.indexhtml + '   \n  ',function(err, diff){
				throw 'reported changes when only root whitespace was changed';
			});
		});
		it('should call callback when changes are made', function(done){
			//make a change...
			var newhtml = this.indexhtml.slice(0, 46)
				+ 'still '
				+ this.indexhtml.slice(46, -1);

			this.file.setContent(newhtml,function(err, diff){
				done(err);
			});
		});
		it('should report a text element change correctly', function(done){
			var newhtml = this.indexhtml.slice(0, 46)
				+ 'still '
				+ this.indexhtml.slice(46, -1);
			this.file.setContent(newhtml,function(err, diff){
				diff.should.deep.equal([{
							"element":3,
							"changes": [{
									"action":"change",
									"what":"data",
									"index":0,
									"value":"this is still a test"
								}]
				}]);
				done(err);
			});
		});
		it('should report a text element removal correctly', function(done){
			var newhtml = this.indexhtml.slice(0, 38) + this.indexhtml.slice(52, -1);
			this.file.setContent(newhtml,function(err, diff){
				diff.should.deep.equal([{
							"element":3,
							"changes": [{
									"action":"remove",
									"index":0,
								}]
				}]);
				done(err);
			});
		});
		it('should report a text element addition correctly', function(done){
			var newhtml = this.indexhtml.slice(0, 38) + this.indexhtml.slice(52, -1);
			//first remove the title
			this.file.setContent(newhtml, function(err, diff){});

			//and now readd it
			var newhtml = newhtml.slice(0, 38) + 'a new title' + newhtml.slice(38, -1);
			this.file.setContent(newhtml, function(err, diff){
				diff.should.deep.equal([{
							"element":3,
							"changes": [{
									"action":"add",
									"index":0,
									"value": { "data": "a new title", "type": "text" }
								}]
				}]);
				done(err);
			});
		});
		it('should report html element remove correctly', function(done){
			//remove line
			var newhtml = this.indexhtml.slice(0, 597) + this.indexhtml.slice(610, -1);

			this.file.setContent(newhtml, function(err, diff){
				diff.should.deep.equal([{"element":13,"changes":[{"index":4,"action":"change","what":"data","value":"\n\t"},{"index":5,"action":"remove"},{"index":5,"action":"remove"}]}]);
				done(err);
			});
		});
		it('should report html element addition correctly', function(done){
			//remove line
			var newhtml = this.indexhtml.slice(0, 610) + '<li>d</li>' + this.indexhtml.slice(610, -1);

			this.file.setContent(newhtml, function(err, diff){
				diff.should.deep.equal([{"element":13,"changes":[{"index":6,"action":"add","value":{"type":"tag","name":"li","attribs":{"meta-brackets-element-index":64},"index":64,"children":[{"type":"text","data":"d"}]}}]}]);
				done(err);
			});
		});
		it('should report html element changes correctly');
		it('should report errors in html');
	});
});
