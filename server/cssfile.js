var cssparser = require('postcss');
var stylelint = require('stylelint');

function CssFile(source, path, callback){
	callback = callback || function(){}
	this.path = path;
	this.setContent(source, callback);
}

CssFile.prototype.webSrc = function(){
	return this.source;
};

CssFile.prototype.selectorFromPosition = function(line, column){
	for (const rule of this.parsed.nodes) {
		const {
			start: { line: startLine, column: startColumn },
			end: { line: endLine, column: endColumn },
		} = rule.source
		if((startLine < line && endLine > line)
			|| (startLine == line
				&& endLine != line
				&& startColumn <= line)
			|| (startLine != line
				&& endLine == line
				&& startColumn >= line)
			|| (startLine == line
				&& endLine == line
				&& startColumn <= line
				&& endColumn >= line)){
			return rule.selector || null;
		}
	}
	return null;
};

CssFile.prototype.setContent = function(source, callback){
	const errors = [];
	const lint = stylelint.lint({code: source}).then((result) => result.results).then(results => {
		results.forEach((msg) =>{
			if(msg.errored){
				msg.warnings.forEach(warning => {
					errors.push(warning)
				});
			}
		})
		return results
	}).then(results => {
		if(errors.length > 0 && callback){
			callback(errors)
		}
		return results
	}).catch(err => {
	 //console.log(err)  //TODO: a proper catch to the errors
	})

	try {
		this.parsed = cssparser.parse(source)
	}
	catch(err){
		callback(err);
	}
	for (const rule of this.parsed.nodes) {
		let source = rule.source;
		source.start.line--;
		source.start.column--;
		source.end.column++;
	}

	var changed = (this.source != undefined && this.source != source);
	this.source = source;
	if(changed){
		callback(null);
	}else{
		callback(null, null);
	}
}

module.exports = CssFile;
