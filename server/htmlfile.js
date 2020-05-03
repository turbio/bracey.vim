var htmlparser = require("htmlparser2");
var util = require('util');
var HTMLHintClass  = require("htmlhint").HTMLHint;
var htmlhint = new HTMLHintClass;

HtmlFile.setCSS = function(source){
	HtmlFile.injectedCSS = source;
}

HtmlFile.setJS = function(source){
	HtmlFile.injectedJS = source;
}

function newElemIndex(){
	return this.currentElemIndex++;
}

function freeElemIndex(index){
	//TODO: this function
}

//takes an optinal path and an opional callback
//if there is a path, read and parse said file
//if reading it or parsing it causes a problem, call the callback
//stating the problem
function HtmlFile(source, callback){
	if(HtmlFile.injectedCSS == undefined || HtmlFile.injectedJS == undefined){
		throw 'must set injected js and css of htmlfile';
	}

	callback = callback || function(){};

	//starts at 1 because 0 is the document root
	this.currentElemIndex = 1;
	this.setContent(source, callback);
}

HtmlFile.prototype.webSrc = function(){
	//transform the internal html sturcture into websource only when it's requested

	var webSourceHtml = stripElements(this.parsedHtml, true);

	//and for now... just assume this is a full html document
	//this basically just adds the required css and js to the head
	//also set the index attribute
	var first = htmlparser.DomUtils.findOne(function() {return true}, webSourceHtml);

	htmlparser.DomUtils.appendChild(first, {
		type: 'script',
		name: 'script',
		attribs: {language: 'javascript'},
		children: [{
			data: HtmlFile.injectedJS,
			type: 'text'
		}]
	});
	htmlparser.DomUtils.appendChild(first, {
		type: 'style',
		name: 'style',
		children: [{
			data: HtmlFile.injectedCSS,
			type: 'text'
		}]
	});

	return htmlparser.DomUtils.getOuterHTML(webSourceHtml);
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
	//before even begining, check to make sure there are no errors
	var errors;
	try{
		errors = htmlhint.verify(newHtml, { 'tag-pair': true, 'spec-char-escape': true });
	}catch(e){
		callback(e, null);
		return;
	}

	if(errors && errors.length > 0){
		this.errorState = true;
		callback(errors, null);
		return;
	}else{
		this.errorState = false;
	}

	this.rawSource = newHtml;

	//if this is the first time this file gets any source, treat it as the starting
	//point, thus no diffing required
	if(this.parsedHtml == undefined){
		this.parsedHtml = parse.call(this, newHtml, true);
		callback(null, null);
		return;
	}

	//now that we know we recieved valid html, and this a modification from the base
	//it will only be compared to the currently existing html and won't be used on it's own
	///thus we don't need indexes
	var newParsedHtml = parse(newHtml, false);

	var diff = diffParsedHtml.call(this, this.parsedHtml, newParsedHtml, true);
	if(diff.length > 0){
		//update the position information
		updateCharIndex(newParsedHtml, this.parsedHtml);

		callback(null, diff);
	}else{
		callback(null, null);
	}
};

//insert the character index posotions in "from" and put them into "to"
function updateCharIndex(from, to){
	to.forEach(function(toElem, index){
		toElem.startIndex = from[index].startIndex;
		toElem.endIndex = from[index].endIndex;

		if(toElem.children && toElem.children.length > 0){
			updateCharIndex(from[index].children, toElem.children);
		}
	});
}

//takes an element created by htmlparser2 and strips the meta information
function stripElement(elem, include_index){
	var newElem = {
		type: elem.type
	};

	if(elem.name)
		newElem.name = elem.name;

	if(elem.attribs){
		newElem.attribs = {}
		for(var attr in elem.attribs){
			newElem.attribs[attr] = elem.attribs[attr];
		}
	}

	if(include_index && elem.index){
		newElem.index = elem.index;

		if(!elem.attribs){
			newElem.attribs = {};
		}

		newElem.attribs['meta-bracey-element-index'] = elem.index.toString();
	}

	if(elem.data)
		newElem.data = elem.data;

	if(elem.children != undefined){
		newElem.children = elem.children.slice();
		newElem.children.forEach(function(value, index, array){
			array[index] = stripElement(value, include_index);
		});
	}

	return newElem;
}

function stripElements(elems, include_index){
	var newElems = [];

	elems.forEach(function(elem){
		newElems.push(stripElement(elem, include_index));
	});

	return newElems;
}

//returns how close two elements
function compareElements(left, right){
	var leftHash = JSON.stringify(stripElement(left, false));
	var rightHash = JSON.stringify(stripElement(right, false));

	if(leftHash == rightHash){
		return {same: true};
	}

	var diff = {
		same: false,
		compatible: false,
		reasons: [],
		only_reason: function(){
			if(this.reasons.length == 1){
				return this.reasons[0];
			}else{
				return false;
			}
		}
	};

	if(left.type != right.type){
		diff.compatible = false;
		diff.reasons.push('type');
		return diff;
	}

	if(left.type == 'text'){
		//the only difference there could be is probably the text's data
		diff.compatible = true;
		diff.reasons.push('data');
		return diff;
	}else{
		diff.compatible = true;

		if(left.name != right.name){
			diff.reasons.push('name');
		}

		var keys = Object.keys(left.attribs).concat(Object.keys(right.attribs));
		for(var i = 0; i < keys.length; i++){
			var k = keys[i];
			var l = left.attribs[k];
			var r = right.attribs[k];
			if(l === undefined
					|| r === undefined
					|| l != r){
				diff.reasons.push('attrib');
				break;
			}
		}

		var leftChildHash = JSON.stringify(
				stripElements(left.children, false));
		var rightChildHash = JSON.stringify(
				stripElements(right.children, false));

		if(leftChildHash != rightChildHash){
			diff.reasons.push('children');;
		}

		return diff;
	}
}

function assignNewIndexes(elem){
	if(elem.type == 'tag'
			|| elem.type == 'style'
			|| elem.type == 'script'){
		elem.index = newElemIndex.call(this);

		if(elem.children != undefined && elem.children.length > 0){
			elem.children.forEach(function(e){
				assignNewIndexes.call(this, e);
			}, this);
		}
	}

	return elem;
};

//takes two arrays of json dom elements and returns the difference
//TODO: this function could be a lot smarter about diffs, and implement
//moves
function diffParsedHtml(left, right, edit_left, parent){
	if(parent == undefined){
		parent = 0;
	}
	if(edit_left != true){
		left = left.slice();
	}

	var diff = [];

	var selfDiff = {
		'element': parent,
		'changes': []
	};

	function pushChange(fromIndex, toIndex, key){
		selfDiff.changes.push({
			'index': fromIndex,
			'action': 'change',
			'what': key,
			'value': right[toIndex][key]
		});
		left[fromIndex][key] = right[toIndex][key]
	}

	function pushAdd(fromRightIndex, toIndex){
		assignNewIndexes.call(this, right[fromRightIndex]);
		selfDiff.changes.push({
			'index': toIndex,
			'action': 'add',
			'value': stripElement(right[fromRightIndex], true)
		});
		left.splice(toIndex, 0, right[fromRightIndex]);
	}

	function pushRemove(index){
		selfDiff.changes.push({
			'index': index,
			'action': 'remove',
		});
		left.splice(index, 1);
	}

	for(var elem = 0; elem < left.length || elem < right.length; elem++){
		var leftElem = left[elem];
		var rightElem = right[elem];

		if(leftElem == undefined && rightElem != undefined){
			pushAdd.call(this, elem, left.length);
			continue;
		}

		if(rightElem == undefined && leftElem != undefined){
			while(left.length > right.length){
				pushRemove.call(this, elem);
			}
			continue;
		}

		var elemDiff = compareElements(leftElem, rightElem);

		if(elemDiff.same){
			continue
		}

		//if there's only once difference, then an easy transition can probably
		//be made
		if(elemDiff.only_reason() == 'data'){
			pushChange.call(this, elem, elem, 'data');
			continue;
		}

		if(elemDiff.only_reason() == 'name'){
			pushRemove.call(this, elem);
			pushAdd.call(this, elem, elem);
			continue;
		}

		if(elemDiff.only_reason() == 'attrib'){
			pushChange.call(this, elem, elem, 'attribs');
			continue
		}

		//for now, if the children are the only difference,
		//just fix the children
		if(elemDiff.only_reason() == 'children'){
			diff = diff.concat(diffParsedHtml.call(this,
				left[elem].children,
				right[elem].children,
				true,
				left[elem].index));
			continue;
		}

		pushAdd.call(this, elem, elem);
	}

	if(selfDiff.changes.length != 0){
		diff = diff.concat(selfDiff);
	}

	return diff;
}

function parse(inputSrc, include_index){
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
		htmlparser.DomHandler.prototype._addDomElement.call(this, elem);
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
	if(include_index){
		var self = this;
		htmlparser.DomUtils.filter(function(elem){
			if(elem.type == 'tag' || elem.type == 'style' || elem.type == 'script'){
				elem.index = newElemIndex.call(self);
			}
		}, parsedHtml);
	}

	//remove all text objects from the root element
	parsedHtml.forEach(function(value, index, array){
		if(value.type == 'text'){
			array.splice(index, 1);
		}
	});

	if (!parsedHtml.length) {
		parsedHtml = [
			{
				type: 'tag',
				name: 'html',
				attribs: {},
				children: [],
				next: null,
				startIndex: 0,
				prev: null,
				parent: null,
				endIndex: inputSrc.length,
			}
		]
	}

	return parsedHtml;
};

function tagNumFromIndex(index, elem){
	for(var i = 0; i < elem.children.length; i++){
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
