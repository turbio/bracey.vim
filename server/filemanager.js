var htmlfile = require("./htmlfile.js");
var cssfile = require("./cssfile.js");
var fs = require("fs");

var FileManager = function(changePageCallback){
	this.changePageCallback = changePageCallback || function(){
		//console.log('page change will be ignored');
	};

	this.files = {};

	this.currentFile = undefined;
	this.currentHtmlFile = undefined;
	this.editorRoot = undefined;

	var injectedCss = fs.readFileSync('frontend.css', "utf8");
	//console.log('loaded injected css');

	var injectedJs = fs.readFileSync('frontend.js', "utf8");
	//console.log('loaded injected js');

	htmlfile.setCSS(injectedCss);
	htmlfile.setJS(injectedJs);

	this.errorPage.injectedJs = injectedJs;
}

FileManager.prototype.newFile = function(id, name, path, type, source){
	//console.log('created a new file with id: ' + id + ', name: ' + name
			//+ ', path: ' + path + ', type: ' + type);

	if(source == undefined){
		source = '';
	}

	var createdFile = {};
	switch(type){
		case 'html':
			createdFile = new htmlfile(source);
			break;
		case 'css':
			createdFile = new cssfile(source);
			break;
		default:
			//console.log('it\'s not a recognized filetype so we\'ll ignore this');
			//TODO: for now...
			return;
			break;
	}

	createdFile.name = name;

	var relativePath = null;
	if(path.startsWith(this.editorRoot)){
		relativePath = path.substring(this.editorRoot.length);
		if(relativePath[0] == '/'){
			relativePath = relativePath.substr(1);
		}
	}else{
		relativePath = name;
	}

	createdFile.path = {
		system: path,
		relative: relativePath
	};

	createdFile.type = type;

	this.files[id] = createdFile;
}

FileManager.prototype.getById = function(id){
	return this.files[id];
};

FileManager.prototype.getByPath = function(path){
	throw 'not implemented';
};

FileManager.prototype.getByWebPath = function(path){
	if(path[0] == '/'){
		path = path.substr(1);
	}

	for(var file in this.files){
		if(this.files[file].path.relative == path
				|| this.files[file].name == path){
			return this.files[file];
		}
	}

	return null;
};

FileManager.prototypegetByName = function(name){
	throw 'not implemented';
};

FileManager.prototype.getCurrentFile = function(){
	if(this.currentFile !== undefined){
		return this.files[this.currentFile];
	}
};

FileManager.prototype.setCurrentFile = function(id){
	if(!this.files[id]){
		this.currentFile = undefined;
		return;
	}

	this.currentFile = id;

	if(this.files[id].type == 'html'){
		this.currentHtmlFile = id;
		this.changePageCallback(this.files[id]);
	}
};

FileManager.prototype.getCurrentHtmlFile = function(){
	if(this.currentHtmlFile !== undefined){
		return this.files[this.currentHtmlFile];
	}
};

FileManager.prototype.getEditorRoot = function(){
	if(!this.editorRoot){
		//console.log('requested editor root before it was defined');
	}
	return this.editorRoot;
};

FileManager.prototype.errorPage = {
	webSrc: function(title, details){
		if(!this.template_source){
			this.template_source = fs.readFileSync(this.template_path, "utf8");
			this.template_source = this.template_source.replace(
					/%JAVASCRIPT%/g,
					this.injectedJs);
		}

		return this.template_source
			.replace(/%TITLE%/g, title)
			.replace(/%DETAILS%/g, details);
	},
	template_source: undefined,
	injectedJs: undefined,
	template_path: 'error_template.html'
};

module.exports = FileManager;
