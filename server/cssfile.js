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
	this.source = source;
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
			throw new Error("Errors found")
		}
		return results
	}).catch(err => {
		return err
	})

	const parser =  new Promise((res, rej) => { 
		try {
			const parsed = cssparser.parse(source)
			this.parsed = parsed
			res(parsed)
		}
		catch(err){
			rej(err);}
	}
	).then((parsed) => {
		for (const rule of parsed.nodes) {
			let source = rule.source;
			source.start.line--;
			source.start.column--;
			source.end.column++;
		}
	}).catch(err => {
		return err
	})

	Promise.all([lint, parser]).then(result => {
		var changed = (this.source != undefined && this.source != source);
		if(changed){
			callback(null);
		}else{
			callback(null, null);
		}
	}
	).catch(err => {
		if (err === "Errors found") {
			callback(errors)
		}else {
			callback(err)
		}
	})

	return

}

module.exports = CssFile;
