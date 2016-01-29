var fs = require("fs");
var htmlparser = require("htmlparser2");
var differ = require("jsondiffpatch").create({
	objectHash: function(obj) {
		return obj.index;
	}
});

var injectedCSS = fs.readFileSync("frontend.css", 'utf8');
var injectedJS = fs.readFileSync("frontend.js", 'utf8');

//takes an optinal path and an opional callback
//if there is a path, read and parse said file
//if reading it or parsing it causes a problem, call the callback
//stating the problem
function HtmlFile(path, callback){
	if(path != undefined){
		this.path = path;
		var self = this;
		fs.readFile(path, 'utf8', function(err, data){
			if(callback !== undefined && err){
				callback(err);
				return;
			}
			self.rawSource = data;
			self.parsedHtml = parse(data);
			if(callback){
				callback(null);
			}
		});
	}
}

HtmlFile.prototype.webSrc = function(){
	//transform the internal html sturcture into websource only when it's requested

	//and for now... just assume this is a full html document
	//this basically just adds the required css and js to the head
	//also set the index attribute
	var head = htmlparser.DomUtils.filter(function(elem){
		if(elem.index != undefined){
			elem.attribs['meta-brackets-element-index'] = elem.index;
		}
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
			children: [{
				data: injectedCSS,
				type: 'text'
			}]
		});
	}else{
		throw 'currently, only a full html document is supported';
	}

	return htmlparser.DomUtils.getOuterHTML(this.parsedHtml);
};

HtmlFile.prototype.tagFromPosition = function(line, column){
	if(this.parsedHtml == undefined){
		throw 'tag positions not yet parsed';
	}

	var lines = this.rawSource.split('\n');

	//negative lines and columns don't correspond to any element
	if(line < 0 || column < 0){
		return null;
	}
	//if the line requested is larger than the number of lines in
	//the file, then it must be out of bounds
	if(line >= lines.length){
		return null;
	}
	//if the column requested is larger than the number of columns in the
	//requested line, then is must be out of bounds
	if(column >= lines[line].length){
		return null;
	}

	//convert the line and column into a character index
	var charIndex = 0;

	charIndex += column;
	line--;
	while(line >= 0){
		charIndex += lines[line].length + 1;
		line--;
	}

	return tagNumFromIndex(charIndex, {
		name: 'none',
		index: 0,
		children: this.parsedHtml
	});
};

//takes a string which will be the new content
//parses said string
//compares the parsed string with the current contents
//calls the callback with a list of differences between the new contents and current
//or, if there are no differences, doesn't call it
//changes this files contents to the new contents
HtmlFile.prototype.setContent = function(newHtml, callback){
	var newParsedHtml = parse(newHtml);
	console.log(diffParsedHtml(this.parsedHtml, newParsedHtml));
};

//takes two arrays of json dom elements and returns the difference
function diffParsedHtml(a, b){
	return differ.diff(a, b);
}

function parse(inputSrc){
	var handler = new htmlparser.DomHandler({withStartIndices: true});

	//for whatever reason, the domhandler doesn't have an option to add the
	//end index to elements, so this rewrites the function to do so
	handler._setEnd = function(elem){
		elem.endIndex = this._parser.endIndex;
	};
	handler.onprocessinginstruction = function(name, data){
		this._parser.endIndex = this._parser._tokenizer._index;
		htmlparser.DomHandler.prototype.onprocessinginstruction.call(this, name, data);
	};
	handler._addDomElement = function(elem){
		var parent = this._tagStack[this._tagStack.length - 1];
		var siblings = parent ? parent.children : this.dom;

		elem.startIndex = this._parser.startIndex;

		if (this._options.withDomLvl1) {
			elem.__proto__ = elem.type === "tag" ? ElementPrototype : NodePrototype;
		}

		siblings.push(elem);
		this._setEnd(elem);
	};
	handler.onclosetag =
	handler.oncommentend =
	handler.oncdataend = function onElemEnd() {
		this._setEnd(this._tagStack.pop());
	};

	var parser = new htmlparser.Parser(handler);
	parser.write(inputSrc);
	parser.done();

	var parsedHtml = handler.dom;

	//give each element an index
	var elementIndex = 1;	//0 is for root
	htmlparser.DomUtils.filter(function(elem){
		if(elem.type == 'tag' || elem.type == 'style' || elem.type == 'script'){
			elem.index = elementIndex;
			elementIndex++;
		}
	}, parsedHtml);

	return parsedHtml;
};

function tagNumFromIndex(index, elem){
	for(i = 0; i < elem.children.length; i++){
		var child = elem.children[i];
		if(child.type == 'tag'
				&& index >= child.startIndex
				&& index <= child.endIndex){
			child = tagNumFromIndex(index, elem.children[i]);
			if(child != null){
				return child;
			}
		}
	}

	return elem;
};

module.exports = HtmlFile;
