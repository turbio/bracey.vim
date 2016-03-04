var fs = require("fs");
var htmlparser = require("htmlparser2");
var util = require('util');

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

	var webSourceHtml = stripElements(this.parsedHtml, true);

	//and for now... just assume this is a full html document
	//this basically just adds the required css and js to the head
	//also set the index attribute
	var head = htmlparser.DomUtils.filter(function(elem){
		if(elem.index != undefined){
			elem.attribs['meta-brackets-element-index'] = elem.index;
		}
		return htmlparser.DomUtils.getName(elem) == 'head';
	}, webSourceHtml)[0];

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
	var newParsedHtml = parse(newHtml);
	var diff = diffParsedHtml(this.parsedHtml, newParsedHtml, true);
	if(diff.length > 0){
		callback(diff);
	}

	this.parsedHtml = newParsedHtml;
	this.rawSource = newHtml;
};

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

		newElems.attribs['meta-brackets-element-index'] = elem.index;
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

		for(key in left.attribs){
			if(left.attribs[key] != right.attribs[key]){
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

//takes two arrays of json dom elements and returns the difference
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

	function pushReplace(index){
		selfDiff.changes.push({
			'action': 'replace',
			'index': index,
			'value': stripElement(right[index])
		});
		left[index] = right[index];
	}

	function pushChange(fromIndex, toIndex, key){
		selfDiff.changes.push({
			'index': fromIndex,
			'action': 'change',
			'what': key,
			'value': right[toIndex][key]
		});
		left[fromIndex][key] = right[toIndex][key]
	}

	function pushAdd(fromIndex, toIndex){
		selfDiff.changes.push({
			'index': fromIndex,
			'action': 'add',
			'value': stripElement(right[toIndex])
		});
		left.splice(toIndex, 0, right[fromIndex]);
	}

	function pushRemove(index){
		selfDiff.changes.push({
			'index': index,
			'action': 'remove',
		});
		left.splice(index, 1);
	}

	function pushMove(fromIndex, toIndex){
		selfDiff.changes.push({
			'index': fromIndex,
			'action': 'move',
			'to': toIndex
		});
		var temp = left[fromIndex];
		left.splice(fromIndex, 1)
		left.splice(toIndex, 0, temp)
	}

	function findElementMatch(elem, searchList){

	}

	for(var elem = 0; elem < left.length || elem < right.length; elem++){
		var leftElem = left[elem];
		var rightElem = right[elem];

		if(leftElem == undefined && rightElem != undefined){
			pushAdd(elem, left.length);
			continue;
		}

		if(rightElem == undefined && leftElem != undefined){
			pushRemove(elem);
			continue;
		}

		var elemDiff = compareElements(leftElem, rightElem);

		if(elemDiff.same){
			continue
		}

		//if there's only once difference, then an easy transition can probably
		//be made
		if(elemDiff.only_reason() == 'data'){
			pushChange(elem, elem, 'data');
			continue;
		}

		if(elemDiff.only_reason() == 'name'){
			pushChange(elem, elem, 'name');
			continue;
		}

		if(elemDiff.only_reason() == 'attrib'){
			pushChange(elem, elem, 'attribs');
			continue
		}

		//TODO: smarter diffing, determine if another element is similar and
		//moving can take place

		//for now, if the children are the only difference,
		//just fix the children
		if(elemDiff.only_reason() == 'children'){
			diff = diff.concat(diffParsedHtml(
				left[elem].children,
				right[elem].children,
				true,
				left[elem].index));
			continue;
		}

		//...later on a move detection should be implemented
		//for now, this will have to work
		bestMatch = null;
		for(var sub = elem; sub < left.length; sub++){
			var subDiff = compareElements(left[sub], right[elem]);
			//var corDiff = compareElements(left[sub], right[sub]);
			if(subDiff.same){
				bestMatch = left[sub];
			}
			//if(subDiff.compatible &&
					//subDiff.reasons.length < corDiff.reasons.length){
				//bestMatch = left[sub]
			//}
		}

		if(bestMatch == null){
			pushAdd(elem, elem);
		}else{
			pushMove(bestMatch.index, elem);
		}

	}

	if(selfDiff.changes.length != 0){
		diff = diff.concat(selfDiff);
	}

	return diff;
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
	var elementIndex = 1;	//0 is for root
	htmlparser.DomUtils.filter(function(elem){
		if(elem.type == 'tag' || elem.type == 'style' || elem.type == 'script'){
			elem.index = elementIndex;
			elementIndex++;
		}
	}, parsedHtml);

	//remove all text objects from the root element
	parsedHtml.forEach(function(value, index, array){
		if(value.type == 'text'){
			array.splice(index, 1);
		}
	});

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
