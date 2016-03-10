var csslint = require('csslint').CSSLint;

function CssFile(source, path, callback){
	this.path = path;
	this.setContent(source, callback);
}

CssFile.prototype.webSrc = function(){
	return this.source;
};

CssFile.prototype.selectorFromPosition = function(line, column){
	throw 'not implemented';
};

CssFile.prototype.setContent = function(source, callback){
	var messages = csslint.verify(source).messages;
	var errors = [];
	messages.forEach(function(msg){
		if(msg.type == 'error'){
			errors.push(msg);
		}
	});

	if(errors.length > 0){
		callback(errors);
		return;
	}

	var changed = (this.source != undefined && this.source != source);

	this.source = source;

	if(changed){
		callback(null);
	}
};

module.exports = CssFile;
