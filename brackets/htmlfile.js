var fs = require("fs");
var htmlparser = require("htmlparser2");

var injectedCSS = fs.readFileSync("frontend.css", 'utf8');
var injectedJS = fs.readFileSync("frontend.js", 'utf8');

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
	var handler = new htmlparser.DomHandler({withStartIndices: true});

	//for whatever reason, the domhandler doesn't have an option to add the
	//end index to elements, so this rewrites the function to do so
	handler._addDomElement = function(element){
		htmlparser.DomHandler.prototype._addDomElement.call(this, element);
		element.endIndex = this._parser.endIndex;
	}

	var parser = new htmlparser.Parser(handler);
	parser.write(this.rawSource);
	parser.done();

	this.parsedHtml = handler.dom;

	//give each element an id
	var elementIndex = 1;	//0 is for root
	htmlparser.DomUtils.filter(function(elem){
		if(elem.type == 'tag' || elem.type == 'style' || elem.type == 'script'){
			elem.attribs['meta-element-index'] = elementIndex;
			elem.index = elementIndex;
			elementIndex++;
		}
	}, this.parsedHtml);

	//and for now... just assume this is a full html document
	//this basically just adds the required css and js to the head
	head = htmlparser.DomUtils.filter(function(elem){
		return htmlparser.DomUtils.getName(elem) == 'head';
	}, this.parsedHtml)[0];

	if(head !== undefined){
		htmlparser.DomUtils.appendChild(head, {
			type: 'script',
			name: 'script',
			attribs: {language: 'javascript'},
			children: [{
				data: injectedJS,
				type: 'text'
			}]
		});
		htmlparser.DomUtils.appendChild(head, {
			type: 'style',
			name: 'style',
			attribs: {type: 'test/css'},
			children: [{
				data: injectedCSS,
				type: 'text'
			}]
		});
	}else{
		throw 'currently, only a full html document is supported';
	}
};

HtmlFile.prototype.webSrc = function(){
	return htmlparser.DomUtils.getOuterHTML(this.parsedHtml);
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

module.exports = HtmlFile;
