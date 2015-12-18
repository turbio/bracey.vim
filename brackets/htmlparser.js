function HtmlParser(source){
	this.lines = source.split('\n');
	this.maxLine = this.lines.length;
}

HtmlParser.prototype.maxColumn = function(line){
	if(line < this.lines.length){
		return this.lines[line].length;
	}else{
		return null;
	}
}

HtmlParser.prototype.forwardUntil = function(line, column, searchChars){
	if(searchChars.constructor !== Array){
		searchChars = searchChars.split('');
	}

	var passedOver = '';
	var curChar = '';

	while((curChar = this.charAt(line, column)) !== null){
		passedOver += curChar;

		if(searchChars.indexOf(curChar) > -1){
			return {
				line: line,
				column: column,
				data: passedOver
			};
		}

		column++;
		if(column >= this.maxColumn(line)){
			column = 0;
			line++;
		}
	}

	return null;
}

//might want to cache this value, it's fetched a lot in the same line which
//always returns the same value
HtmlParser.prototype.charAt = function(line, column){
	if(line < this.maxLine && column < this.maxColumn(line)){
		return this.lines[line][column];
	}else{
		return null;
	}
}

HtmlParser.prototype.parse = function(){
	var tags = [];
	var parsedTag = this.parseNext();

	while(parsedTag !== null){
		tags.push(parsedTag);
		parsedTag = this.parseNext({
			line: parsedTag.end[0],
			column: parsedTag.end[1]
		});
	}

	//give all the tags an index
	tags.forEach(this.giveIndexes, {
		giveIndexes: this.giveIndexes,
		index: 0
	});

	return tags;
}

HtmlParser.prototype.parseTag = function(line, column){
	//go to the start of a tag
	var tagStart = this.forwardUntil(line, column, '<');

	//if tagStart is null, then there is his (hopefully) not another
	//tag because eof was reached before anything was found
	if(tagStart == null){
		return null;
	}

	//an now to the end of the tag
	var tagEnd = this.forwardUntil(tagStart.line, tagStart.column, '>');
	if(tagEnd == null){
		return null;
	}

	//if we go to this point, it's (probably) a tag and thus
	//we can (probably) safely create a tag object
	var tag = {
		text: tagEnd.data,
		name: this.tagName(tagEnd.data),
		closing: tagEnd.data.startsWith('</'),
		selfclosing: false,
		start: [tagStart.line, tagStart.column],
		end: [tagEnd.line, tagEnd.column],
		children: []
	};

	return tag;
}

HtmlParser.prototype.parseNext = function(state){
	if(state == undefined){
		state = {
			line: 0,
			column: 0,
		};
	}

	//parse the tag after the current cursor line and column
	//if it's null (because there is no tag after the cursor) return
	//null
	if((state.tag = this.parseTag(state.line, state.column)) == null){
		return null;
	}

	//if this tag closes, just return it
	if(state.tag.closing){
		return state.tag;
	}

	//otherwise, continue finding the next tag after this tag until
	//it's either a closing tag or null (there is no next tag)
	//at which point, return
	var lastTag = state.tag;
	while(true){
		var nextTag = this.parseNext({
			line: lastTag.end[0],
			column: lastTag.end[1]
		});

		//if there's no next tag (it's null)
		if(nextTag == null){
			//and this tag is not closing (as determined earlier),
			//it must be selfclosing
			state.tag.children = [];
			state.tag.selfclosing = true;
			return state.tag;
		}

		//if the next tag is closing
		if(nextTag.closing){
			//see if it closes this tag
			if(state.tag.name == nextTag.name){
				//and if so, change this tags end to where it's closing
				//tag (the next tag) ends
				state.tag.end = nextTag.end;
				state.tag.children = state.tag.children.concat(nextTag.children);
				return state.tag;
			}else{
				//if the next tag is closing, but does not close this tag,
				//this is a self closing tag
				state.tag.selfclosing = true;
				state.tag.children = [];
				return state.tag;
			}
		}else{
			//otherwise add the next tag to this tags children
			state.tag.children.push(nextTag);

			//set the next tag as the last tag
			lastTag = nextTag

			//and continue the loop looking for this tag's closing tag
			//or the end of the file
		}
	}
}

HtmlParser.prototype.tagName = function(tagStr){
	return tagStr.match(/<\/?\s*([a-zA-Z0-9]+).*>/)[1];
}

HtmlParser.prototype.giveIndexes = function(elem, index, array){
	elem.index = this.index;
	this.index++;
	elem.children.forEach(this.giveIndexes, this);
}

module.exports = HtmlParser;
