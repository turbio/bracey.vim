var cheerio = require("cheerio");
var fs = require("fs");
var htmlparser = require("./htmlparser.js");

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

//takes a string which will be the new content
//parses said string
//compares the parsed string with the current contents
//calls the callback with a list of differences between the new contents and current
//or, if there are no differences, doesn't call it
//changes this files contents to the new contents
HtmlFile.prototype.setContent = function(newHtml, callback){
	var newParsedHtml = new htmlparser(newHtml).parse();
	console.log(diffParsedHtml(this.parsedHtml, newParsedHtml));
};

//takes two arrays of json dom elements and returns the difference
function diffParsedHtml(a, b){
	var differences = [];

	var diffHtmlObject = function(a, b){
		var keyListA = [];
		var keyListB = [];

		for(var key in a){
			keyListA.push(key);
		}

		for(var key in b){
			keyListB.push(key);
		}

		console.log(keyListA);
		console.log(keyListB);
	}

	a.forEach(function(elem, index, array){
		diffHtmlObject(elem, b[index]);
	});
}

HtmlFile.prototype.parse = function(){
	this.parseToWeb();
	this.parsedHtml = new htmlparser(this.rawSource).parse();
};

HtmlFile.prototype.webSrc = function(){
	if(this.webParsed != undefined){
		return this.webParsed.html();
	}else{
		throw 'source not yet parsed to web';
	}
};

HtmlFile.prototype.tagNumFromPos = function(line, column, elem){
	if(this.parsedHtml == undefined){
		throw 'tag positions not yet parsed';
	}
	if(elem == undefined){
		elem = {name: 'none', children: this.parsedHtml};
	}

	for(i = 0; i < elem.children.length; i++){
		//if between the lines that the start and end tags are on, we are in
		//this element
		//OR
		//if on the start line of tag, must not be before the start column of the tag
		//OR
		//if on the end line of tag, must not be past the end column of the tag
		//OR
		//if on the same line as the tag begins and ends, the column must be
		//between the start and end
		//then we are inside this tag
		if((line > elem.children[i].start[0] && line < elem.children[i].end[0])
				|| (line == elem.children[i].start[0]
					&& line == elem.children[i].end[0]
					&& column <= elem.children[i].end[1]
					&& column >= elem.children[i].start[1])
				|| (line == elem.children[i].start[0]
					&& line != elem.children[i].end[0]
					&& column >= elem.children[i].start[1])
				|| (line == elem.children[i].end[0]
					&& line != elem.children[i].start[0]
					&& column <= elem.children[i].end[1])){
			var child = this.tagNumFromPos(line, column, elem.children[i]);
			if(child != null){
				return child;
			}
		}
	}

	return elem;
}

//parse vim source into web source
HtmlFile.prototype.parseToWeb = function(){
	var webParsed = cheerio.load(this.rawSource, {
		normalizeWhitespace: false	//just cause
	});

	webParsed("*").each(function(i, elem){
		webParsed(this).attr('data-brackets-id', i);
	});

	webParsed("head").append('<script>' + injectedJs + '</script>');
	webParsed("head").append('<style>' + injectedCss + '</style>');

	this.webParsed = webParsed;
}

module.exports = HtmlFile;
