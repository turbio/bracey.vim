//all this does is just take in some html as a string and parse it into a json
//object.
//yeah... there are probably quite a few existing packages that will do this but
//i need some specific tag information that is not always supplied

var htmlparser = require("htmlparser2");
var parser = require("parse5");

function HtmlParser(source){
	this.source = source;
}

HtmlParser.prototype.parse = function(){
	var html = parser.parse(this.source, {locationInfo: true});
	console.log(JSON.stringify(html, null, 2));
}

module.exports = HtmlParser;
