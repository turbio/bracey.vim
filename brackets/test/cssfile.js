var expect = require('chai').expect;

describe('cssfile', function(){
	describe('constructor', function(){
		it('calls callback with errors');
	});
	describe('#selectorFromPosition()', function(){
		it('returns the correct selector for position');
		it('returns null when no selector for position');
	});
	describe('#webSrc()', function(){
		it('returns its content');
	});
	describe('#setContent()', function(){
		it('calls callback if file was changed');
		it('calls callback if thtere were any errors');
	});
});
