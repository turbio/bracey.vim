var stylelint = require('stylelint');
var postcss = require('postcss');

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

   var messages = stylelint.lint({ code: source });
   messages.then(result => {
      let messages = JSON.parse(result.output);
      var errors = [];

      messages[0].warnings.forEach(msg => {
         if (msg.severity == 'error') {
            data = { type: msg.severity, line: msg.line, col: msg.column, 
               message: msg.rule, evidence: msg.text }
            errors.push(data);
         }
      });

      if (errors.length > 0 && callback) {
         callback(errors);
         return;
      }
   });

	var changed = (this.source != undefined && this.source != source);

	this.source = source;

	try{
		this.parsed = postcss.parse(source);
	}catch(err){
		callback(err);
		return;
	}

	for (const rule of this.parsed.nodes) {
		let source = rule.source;
		source.start.line--;
		source.start.column--;
		source.end.column++;
	}

	if(changed){
		callback(null);
	}else{
		callback(null, null);
	}
};

module.exports = CssFile;
