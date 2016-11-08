var fs = require('fs');
var expect = require('chai').expect;
var cssfile = require('../cssfile');

describe('cssfile', function(){
	var cssFileSrc, file;

	beforeEach(function(){
		cssFileSrc = fs.readFileSync('test/fixtures/test_css.css', 'utf8');
		file = new cssfile(cssFileSrc,
				'saladman',
				function(err){
			expect(err).to.be.null;
		});
	});

	describe('constructor', function(){
		it('sets the path', function(){
			expect(file.path).to.equal('saladman');
		});

		it('calls callback with errors', function(done){
			var invalidCss = 'body{ background: red color: white}';
			file = new cssfile(invalidCss, 'can be whatever', function(err){
				err.should.not.be.null;
				done();
			});
		});

		it('should not error if no callback is given', function(){
			var validCss = 'div{ color: red; }';
			file = new cssfile(validCss, 'can be whatever');
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
				expect(file.selectorFromPosition(test.line, test.column)).to.equal(test.expected);
			});
		});
		it('returns null when no selector for position', function(){
			expect(file.selectorFromPosition(100, 1)).to.equal(null);
		});
	});

	describe('#webSrc()', function(){
		it('returns its content', function(){
			expect(file.webSrc()).to.equal(cssFileSrc);
		});
	});

	describe('#setContent()', function(){
		it('calls callback if file was changed', function(done){
			var newValidCss = 'body{background: red}'
			file.setContent(newValidCss, function(err){
				done(err);
			});
		});

		it('calls callback if file was not changed', function(done){
			file.setContent(cssFileSrc, function(err, diff){
				expect(diff).to.be.null;
				expect(err).to.be.null;
				done(err);
			});
		});

		it('calls callback if there were any errors', function(done){
			var newInvalidCss = 'body{background red more invalid stuff:::}'
			file.setContent(newInvalidCss, function(err){
				expect(err).to.not.be.null;
				done();
			});
		});
	});
});
