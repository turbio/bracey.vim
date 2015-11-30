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
	this.createElementPos();
};

//make a list of elementNumbers and their correspoding start and end line
//this makes it much easier to get an elementNumber from the current
//cursor positions in the future
HtmlFile.prototype.createElementPos = function(){
	this.elementPos = {};

	var lines = this.rawSource.split('\n');
	var maxColumn = lines[0].length, maxLine = lines.length;

	var currentColumn = 0, currentLine = 0;

	while(currentColumn < maxColumn && currentLine < maxLine){

		curChar = lines[currentLine][currentColumn];

		currentColumn++;
		if(currentColumn == maxColumn){
			currentColumn = 0;
			currentLine++;
			maxColumn = lines[currentLine].length;
		}
	}
}

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

module.exports = HtmlFile;
