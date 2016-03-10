function CssFile(source, path, callback){

}

CssFile.prototype.webSrc = function(){
	throw 'not implemented';
};

CssFile.prototype.selectorFromPosition = function(line, column){
	throw 'not implemented';
};

CssFile.prototype.setContent = function(source){
	throw 'not implemented';
};

module.exports = CssFile;
