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
		console.log(event.data);
		message = JSON.parse(event.data);
		console.log(message);
		switch(message['command']){
			case 'select':
				if('index' in message){
					setHighlighted(
							'[meta-brackets-element-index=\"' + message['index'] + '\"]'
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
							'[meta-brackets-element-index=\"' + changeGroup['element'] + '\"]');
					}
					changeGroup['changes'].forEach(function(change){
						makeChange(elem, change);
					});
				});
				break;
			case 'eval':
				eval(message['js']);
				break;
		}
	};

	var makeChange = function(element, change){
		switch(change.action){
			case 'change':
				switch(change.what){
					case 'data':
						element.childNodes[change.index].nodeValue = change.value;
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

	var  setHighlighted = function(selector){
		//if the same selection is sent multiple times, no need to repeat it
		if(lastSelection == selector){
			return;
		}else{
			lastSelection = selector;
		}

		existingSelectors = document.querySelectorAll('.brackets-currently-selected-highlight');
		for(var i = 0, len = existingSelectors.length; i < len; i++){
			existingSelectors[i].parentElement.removeChild(existingSelectors[i]);
		}

		toHighlight = document.querySelectorAll(message['selector']);
		for(var i = 0, len = toHighlight.length; i < len; i++){
			var newHighlight = document.createElement('div');
			newHighlight.className = 'brackets-currently-selected-highlight';

			var box = toHighlight[i].getBoundingClientRect();

			var body = document.body;
			var docEl = document.documentElement;

			var scrollTop = window.pageYOffset || docEl.scrollTop || body.scrollTop;
			var scrollLeft = window.pageXOffset || docEl.scrollLeft || body.scrollLeft;

			var clientTop = docEl.clientTop || body.clientTop || 0;
			var clientLeft = docEl.clientLeft || body.clientLeft || 0;

			var top  = box.top +  scrollTop - clientTop;
			var left = box.left + scrollLeft - clientLeft;

			newHighlight.style.top = top + 'px';
			newHighlight.style.left = left + 'px';
			newHighlight.style.width = (box.right - box.left) + 'px';
			newHighlight.style.height = (box.bottom - box.top) + 'px';

			document.body.appendChild(newHighlight);
		}
	};

	var reloadCSS = function(){
		var elements = document.getElementsByTagName("link");

		var c = 0;

		for (var i = 0; i < elements.length; i++) {
			if (elements[c].rel == "stylesheet") {
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
				elements[i].href = href + ((href.indexOf("?") == -1) ? "?" : "&") + "c=" + (new Date).getTime();
			}
			c++;
		}
	};

	connectSocket();
})();
