/*
 * this is what will be injected into whatever page is being viewed
 */
(function(){
	var webSocket = new WebSocket('ws://127.0.0.1:1337');
	webSocket.onopen = function(event){};
	webSocket.onclose = function(event){};
	webSocket.onerror = function(event){};

	webSocket.onmessage = function(event){
		message = JSON.parse(event.data);
		console.log("recieved: " + event.data);
		switch(message['command']){
			case 'select':
				setHighlighted(message['selector']);
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
				change = document.querySelector('[meta-brackets-element-index="' + message['element'] + '"]');
				change.innerHTML = message['content'];
				break;
			case 'eval':
				eval(message['js']);
				break;
		}
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

			newHighlight.style.top = top;
			newHighlight.style.left = left;
			newHighlight.style.width = box.right - box.left;
			newHighlight.style.height = box.bottom - box.top;

			document.body.appendChild(newHighlight);
		}
	}

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
	}
})();
