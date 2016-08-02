var expect = require('chai').expect;
var fs = require("fs");

describe('htmlfile', function(){
	var htmlFile, file;
	var expectedHTMLPath = 'test/fixtures/expected_processed_html.html';
	var testHtmlPath = 'test/fixtures/test_html.html';
	var injectedJSPath = 'frontend.js';
	var injectedCSSPath = 'frontend.css';

	before(function(){
		htmlFile = require('../htmlfile');
		htmlFile.setCSS(fs.readFileSync(injectedCSSPath, "utf8"));
		htmlFile.setJS(fs.readFileSync(injectedJSPath, "utf8"));
	});

	beforeEach(function(){
		file = new htmlFile(fs.readFileSync(testHtmlPath, "utf8"));
	});

	describe('constructor', function(){
		it('should have errors with invalid html', function(){
			//var illFormed = new htmlFile('<this is></not><a valid html file');
		});
	});

	describe('#tagFromPosition()', function(){
		it('should return null when given a negative line or column', function(){
			expect(file.tagFromPosition(-1, -1)).to.be.null;
		});
		it('should return null when given an out of bound line', function(){
			expect(file.tagFromPosition(10000, 0)).to.be.null;
		});
		it('should return null when given an out of bound column', function(){
			expect(file.tagFromPosition(0, 10000)).to.be.null;
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
				var elem = file.tagFromPosition(test.line, test.column);
				elem.should.have.property('name', test.expected.name);
				elem.should.have.property('index', test.expected.index);
			});
		});
	});

	describe('#webSrc()', function(){
		var expectedHTML, injectedJS, injectedCSS;

		before(function(){
			expectedHTML = fs.readFileSync(expectedHTMLPath, 'utf8').toString();
			injectedJS = fs.readFileSync(injectedJSPath, 'utf8').toString();
			injectedCSS = fs.readFileSync(injectedCSSPath, 'utf8').toString();
		});

		it('should have the contents of frontend.js injected inside', function(){
			file.webSrc().should.include(injectedJS);
		});

		it('should have the contents of frontend.css injected inside', function(){
			file.webSrc().should.include(injectedCSS);
		});

		it('should return correctly processed html', function(){
			file.webSrc().should.equal(expectedHTML);
		});

		it('should wrap html which does not have proper html/head/body tags');
	});

	describe('#setContent()', function(){
		var originalHtml;

		before(function(){
			originalHtml = fs.readFileSync(testHtmlPath, 'utf8').toString();
		});

		it('should not call callback when nothing has changed', function(){
			file.setContent(this.indexhtml,function(err, diff){
				throw 'reported changes when nothing was changed';
			});
		});

		it('should ignore all whitespace changes to root', function(){
			file.setContent(this.indexhtml + '   \n  ',function(err, diff){
				throw 'reported changes when only root whitespace was changed';
			});
		});

		it('should call callback when changes are made', function(done){
			//make a change...
			var newhtml = this.indexhtml.slice(0, 46)
				+ 'still '
				+ this.indexhtml.slice(46, -1);

			file.setContent(newhtml,function(err, diff){
				done(err);
			});
		});

		it('should report a text element change correctly', function(done){
			var newhtml = this.indexhtml.slice(0, 46)
				+ 'still '
				+ this.indexhtml.slice(46, -1);
			file.setContent(newhtml,function(err, diff){
				diff.should.deep.equal([
					{
						"element":3,
						"changes": [
							{
								"action":"change",
								"what":"data",
								"index":0,
								"value":"this is still a test"
							}
						]
					}
				]);
				done(err);
			});
		});

		it('should report a text element removal correctly', function(done){
			var newhtml = this.indexhtml.slice(0, 38) + this.indexhtml.slice(52, -1);
			file.setContent(newhtml,function(err, diff){
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
			file.setContent(newhtml, function(err, diff){
				expect(err).to.be.null;
			});

			//and now read it
			var newhtml = this.indexhtml.slice(0, 38) + 'a new title' + this.indexhtml.slice(52, -1);
			file.setContent(newhtml, function(err, diff){
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

			file.setContent(newhtml, function(err, diff){
				diff.should.deep.equal([{"element":13,"changes":[{"index":4,"action":"change","what":"data","value":"\n\t"},{"index":5,"action":"remove"},{"index":5,"action":"remove"}]}]);
				done(err);
			});
		});

		it('should report html element addition correctly', function(done){
			//remove line
			var newhtml = this.indexhtml.slice(0, 610) + '<li>d</li>' + this.indexhtml.slice(610, -1);

			file.setContent(newhtml, function(err, diff){
				diff.should.deep.equal([{"element":13,"changes":[{"index":6,"action":"add","value":{"type":"tag","name":"li","attribs":{"meta-bracey-element-index":64},"index":64,"children":[{"type":"text","data":"d"}]}}]}]);
				done(err);
			});
		});

		it('should report html element changes correctly');

		it('should report errors in html');
	});
});
