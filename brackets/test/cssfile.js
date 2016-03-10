var fs = require('fs');
var expect = require('chai').expect;
var cssfile = require('../cssfile');

describe('cssfile', function(){
	beforeEach(function(){
		this.cssfilesrc = fs.readFileSync('test/style.css', 'utf8');
		this.file = new cssfile(this.cssfilesrc,
				'saladman',
				function(err){
					console.log(err);
			expect(err).to.be.null;
		});
	});

	describe('constructor', function(){
		it('sets the path', function(){
			expect(this.file.path).to.equal('saladman');
		});
		it('calls callback with errors', function(done){
			var invalidCss = 'body{ background: red color: white}';
			this.file = new cssfile(invalidCss, 'can be whatever', function(err){
				err.should.not.be.null;
				done();
			});
		});
	});

	describe('#selectorFromPosition()', function(){
		[
			{line: 1, column: 1, expected: 'body'},
			{line: 3, column: 1, expected: 'body'},
			{line: 10, column: 3, expected: 'hr'},
			{line: 27, column: 5, expected: '.classy'},
			{line: 30, column: 6, expected: '#identifiable'}
		].forEach(function(test){
			it('returns the correct selector for ' + test.line + ':' + test.column, function(){
				expect(this.file.selectorFromPosition(test.line, test.column)).to.equal(test.expected);
			});
		});
		it('returns null when no selector for position', function(){
			expect(this.file.selectorFromPosition(100, 1)).to.equal(null);
		});
	});

	describe('#webSrc()', function(){
		it('returns its content', function(){
			expect(this.file.webSrc()).to.equal(this.cssfilesrc);
		});
	});

	describe('#setContent()', function(){
		it('calls callback if file was changed', function(done){
			var newValidCss = 'body{background: red}'
			this.file.setContent(newValidCss, function(err){
				done(err);
			});
		});
		it('calls callback if there were any errors', function(done){
			var newInvalidCss = 'body{background red more invalid stuff:::}'
			this.file.setContent(newInvalidCss, function(err){
				expect(err).to.not.be.null;
				done();
			});
		});
	});
});
