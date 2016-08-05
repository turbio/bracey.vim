var csslint = require('csslint').CSSLint;
var cssparser = require('css');

function CssFile(source, path, callback){
	callback = callback || function(){}
	this.path = path;
	this.setContent(source, callback);
}

CssFile.prototype.webSrc = function(){
	return this.source;
};

CssFile.prototype.selectorFromPosition = function(line, column){
	var rules = this.parsed.stylesheet.rules;
	for(var i = 0; i < rules.length; i++){
		var position = rules[i].position;
		if((position.start.line < line && position.end.line > line)
				|| (position.start.line == line
					&& position.end.line != line
					&& position.start.column <= line)
				|| (position.start.line != line
					&& position.end.line == line
					&& position.start.column >= line)
				|| (position.start.line == line
					&& position.end.line == line
					&& position.start.column <= line
					&& position.end.column >= line)){
			if(rules[i].selectors){
				return rules[i].selectors.join(' ');
			}else{
				return null;
			}
		}
	}

	return null;
};

CssFile.prototype.setContent = function(source, callback){
	var messages = csslint.verify(source).messages;
	var errors = [];
	messages.forEach(function(msg){
		if(msg.type == 'error'){
			errors.push(msg);
		}
	});

	if(errors.length > 0 && callback){
		callback(errors);
		return;
	}

	var changed = (this.source != undefined && this.source != source);

	this.source = source;

	try{
		this.parsed = cssparser.parse(source);
	}catch(err){
		callback(err);
		return;
	}

	this.parsed.stylesheet.rules.forEach(function(rule){
		var position = rule.position;
		position.start.line--;
		position.start.column--;
	});

	if(changed){
		callback(null);
	}else{
		callback(null, null);
	}
};

module.exports = CssFile;
