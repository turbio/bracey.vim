var cheerio = require("cheerio");
var fs = require("fs");

var injectedCss = fs.readFileSync("frontend.css", 'utf8');
var injectedJs = fs.readFileSync("frontend.js", 'utf8');

function HtmlFile(path){
	if(path != undefined){
		this.path = path;
		var self = this;
		fs.readFile(path, 'utf8', function(err, data){
			self.rawSource = data;
			self.parse();
		});
	}
}

HtmlFile.prototype.parse = function(){
	this.parseToWeb();
	this.createElementPositions();
};

HtmlFile.prototype.webSrc = function(){
	if(this.webParsed != undefined){
		return this.webParsed.html();
	}else{
		throw 'source not parsed';
	}
};

HtmlFile.prototype.tagNumFromPos = function(column, line){
	throw 'not implemented';
}

//parse vim source into web source
HtmlFile.prototype.parseToWeb = function(){
	var webParsed = cheerio.load(this.rawSource, {
		normalizeWhitespace: true	//just cause
	});

	webParsed("*").each(function(i, elem){
		webParsed(this).attr('data-brackets-id', i);
	});

	webParsed("head").append('<script>' + injectedJs + '</script>');
	webParsed("head").append('<style>' + injectedCss + '</style>');

	this.webParsed = webParsed;
}

//make a list of elementNumbers and their correspoding start and end line
//this makes it much easier to get an elementNumber from the current
//cursor positions in the future
HtmlFile.prototype.createElementPositions = function(){
	this.elementPositions = [];

	var lines = this.rawSource.split('\n');
	var maxLine = lines.length;

	var parser = {
		lines: lines,
		maxLine: maxLine,
		elementPositions: [],
		maxColumn: function(line){
			if(line < lines.length){
				return lines[line].length;
			}else{
				return null;
			}
		},
		forwardUntil: function(line, column, searchChars, callback){
			if(searchChars.constructor !== Array){
				searchChars = searchChars.split('');
			}

			passedOver = '';

			while((curChar = this.charAt(line, column)) !== null){
				passedOver += curChar;

				if(searchChars.indexOf(curChar) > -1){
					if(callback !== undefined){
						callback(line, column, passedOver);
						break;
					}else{
						return [line, column, data];
					}

				}

				column++;
				if(column >= this.maxColumn(line)){
					column = 0;
					line++;
				}
			}

			return null;
		},
		//might want to cache this value, it's fetched a lot in the same line which
		//always returns the same value
		charAt: function(line, column){
			if(line < this.maxLine && column < this.maxColumn(line)){
				return this.lines[line][column];
			}else{
				return null;
			}
		},
		parse: function(state){
			if(state == undefined){
				state = {
					line: 0,
					column: 0,
				};
			}

			var self = this;

			//go the the start of a tag
			this.forwardUntil(state.line, state.column, '<', function(line, column, data){
				//or if it's a comment
				if(data.startsWith('<!--')){
				}else if(data.startsWith('<script')){
				}else if(data.startsWith('<style')){
				}
				state.line = line;
				state.column = column;

				self.forwardUntil(state.line, state.column, '>', function(line, column, data){
					console.log(
						state.line + ':' + state.column
						+ '-'
						+ line + ':' + column + '\t' + data);
					//check it this is a closing tag
					if(data.startsWith('</')){
					}

					state.tag = {
						text: data,
						start: [state.line, state.column],
						end: [line,column],
					}
					self.parse({
						line: line,
						column: column
					});
				});
			});
		}
	}

	//start parsing
	console.time('parsing');
	parser.parse();
	console.timeEnd('parsing');
}

function cloneObject(obj){
	var target = {};
	for(var i in obj){
		if(obj.hasOwnProperty(i)){
			target[i] = obj[i];
		}
	}
	return target;
}

module.exports = HtmlFile;
