/*
 * this is what will be injected into whatever page is being viewed
 */
(function(){
	var endSession = false;
	var webSocket = null;

	var connectSocket = function(){
		webSocket = new WebSocket('ws://' + window.location.host);
		webSocket.onopen = ws_handle_open;
		webSocket.onclose = ws_handle_close;
		webSocket.onerror = ws_handle_error;
		webSocket.onmessage = we_handle_message;
	}

	var ws_handle_open = function(event){
	};

	var ws_handle_close = function(event){
		if(!endSession){
			setTimeout(function(){
				connectSocket();
			}, 10000);	//wait ten seconds
		}
	};

	var ws_handle_error = function(event){
		console.log('error...');
		console.log(event);
	};

	var we_handle_message = function(event){
		message = JSON.parse(event.data);
		switch(message['command']){
			case 'select':
				if('error' in message){
					setError(message['error']);
				}

				if('index' in message){
					setHighlighted(
							'[meta-brackets-element-index=\"' +
							message['index'] +
							'\"]'
							);
				}else if('selector' in message){
					setHighlighted(message['selector']);
				}
				break;
			case 'reload_page':
				location.reload();
				break;
			case 'reload_css':
				reloadCSS();
				break;
			case 'goto':
				window.location.href = message['location'];
				break;
			case 'edit':
				message['changes'].forEach(function(changeGroup){
					var elem = null;
					if(changeGroup['element'] == 0){
						elem = document;
					}else{
						elem = document.querySelector(
							'[meta-brackets-element-index=\"' +
							changeGroup['element'] +
							'\"]');
					}
					changeGroup['changes'].forEach(function(change){
						makeChange(elem, change);
					});
				});
				reHighlight();
				break;
			case 'eval':
				eval(message['js']);
				break;
		}
	};

	var setError = function(state){
		var existingSelectors = document.querySelectorAll('.brackets-currently-selected-highlight');
		for(var i = 0; i < existingSelectors.length; i++){
			if(state){
				existingSelectors[i].classList.add('brackets-highlight-error');
			}else{
				existingSelectors[i].classList.remove('brackets-highlight-error');
			}
		}
	};

	var makeChange = function(element, change){
		switch(change.action){
			case 'change':
				element = element.childNodes[change.index];
				switch(change.what){
					case 'data':
						element.childNodes[change.index].nodeValue = change.value;
						break;
					case 'name':
						break;
					case 'attribs':
						console.log(change);
						while(element.attributes.length > 1){
							if(element.attributes[0].name != 'meta-brackets-element-index'){
								element.removeAttribute(element.attributes[0].name);
							}else{
								element.removeAttribute(element.attributes[1].name);
							}
						}
						for(attrib in change.value){
							element.setAttribute(attrib, change.value[attrib]);
							console.log(element);
						}
						break;
				}
				break;
			case 'remove':
				element.removeChild(element.childNodes[change.index]);
				break;
			case 'add':
				var newElem = constructElem(change.value);
				if(element.childNodes.length == 0){
					element.appendChild(newElem);
				}else{
					element.insertBefore(newElem, element.childNodes[change.index]);
				}
				break;
		};
	};

	var constructElem = function(data){
		var newElem = null;
		if(data.type == 'text'){
			newElem = document.createTextNode(data.data);
		}else{
			newElem = document.createElement(data.name);

			for(attrib in data.attribs){
				newElem.setAttribute(attrib, data.attribs[attrib]);
			}

			data.children.forEach(function(val, index){
				newElem.appendChild(constructElem(val));
			});
		}

		return newElem;
	};

	var lastSelection = '';

	var removeHighlights = function(){
		var existingSelectors = document.querySelectorAll('.brackets-currently-selected-highlight');
		for(var i = 0, len = existingSelectors.length; i < len; i++){
			existingSelectors[i].parentElement.removeChild(existingSelectors[i]);
		}
	};

	var elementBox = function(element){
		var box = element.getBoundingClientRect();

		var body = document.body;
		var docElem = document.documentElement;

		var scrollTop = window.pageYOffset || docElem.scrollTop || body.scrollTop;
		var scrollLeft = window.pageXOffset || docElem.scrollLeft || body.scrollLeft;

		var clientTop = docElem.clientTop || body.clientTop || 0;
		var clientLeft = docElem.clientLeft || body.clientLeft || 0;

		var top  = box.top +  scrollTop - clientTop;
		var left = box.left + scrollLeft - clientLeft;

		return {
			top: top + 'px',
			left: left + 'px',
			width: (box.right - box.left) + 'px',
			height: (box.bottom - box.top) + 'px'
		};
	};

	var reHighlight = function(){
		var existingSelectors = document.querySelectorAll('.brackets-currently-selected-highlight');
		for(var i = 0; i < existingSelectors.length; i++){
			var highlight = existingSelectors[i];
			var toHighlight = document.querySelectorAll(
					'[meta-brackets-element-index=\"' +
					highlight.getAttribute('highlighting') +
					'\"]')[0];
			if(!toHighlight){
				highlight.parentElement.removeChild(highlight);
			}else{
				var box = elementBox(toHighlight);
				highlight.style.top = box.top;
				highlight.style.left = box.left;
				highlight.style.width = box.width;
				highlight.style.height = box.height;
				highlight.style.position = window.getComputedStyle(toHighlight).position;
			}
		}
	};

	var  setHighlighted = function(selector){
		//if the same selection is sent multiple times, no need to repeat it
		if(lastSelection == selector){
			return;
		}else{
			lastSelection = selector;
		}

		removeHighlights();

		var toHighlight = document.querySelectorAll(selector);
		for(var i = 0; i < toHighlight.length; i++){
			var newHighlight = document.createElement('div');
			newHighlight.className = 'brackets-currently-selected-highlight';

			var box = elementBox(toHighlight[i]);

			newHighlight.style.top = box.top;
			newHighlight.style.left = box.left;
			newHighlight.style.width = box.width;
			newHighlight.style.height = box.height;
			newHighlight.style.position = window.getComputedStyle(toHighlight[i]).position;
			newHighlight.setAttribute('highlighting', toHighlight[i].getAttribute('meta-brackets-element-index'));

			document.body.appendChild(newHighlight);
		};
	};

	var reloadCSS = function(){
		var elements = document.getElementsByTagName("link");

		var c = 0;

		for(var i = 0; i < elements.length; i++){
			if(elements[c].rel == "stylesheet"){
				var href = elements[i].getAttribute("data-href");

				if (href == null) {
					href = elements[c].href;
					elements[c].setAttribute("data-href", href);
				}

				if (window.__BL_OVERRIDE_CACHE) {
					var link = document.createElement("link");
					link.href = href;
					link.rel = "stylesheet";
					document.head.appendChild(link);
					document.head.removeChild(elements[c]);
					continue;
				}
				elements[i].href = href;
			}
			c++;
		}

		reHighlight();
		//it's hacky, but it works for now...
		for(var trys = 0; trys < 5; trys++){
			setTimeout(reHighlight, 5 * Math.pow(4, trys));
		}
	};

	connectSocket();
})();
