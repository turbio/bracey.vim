(function(){
	var webSocket = new WebSocket('ws://127.0.0.1:1337');
	webSocket.onopen = function(event){};
	webSocket.onclose = function(event){};
	webSocket.onmessage = function(event){
		message = JSON.parse(event.data);
		switch(message['command']){
			case 'select':
				console.log("selecting item: " + message['selector']);
				setHighlighted(message['selector']);
				break;
			case 'reload':
				location.reload();
				break;
			case 'goto':
				window.location.href = message['location'];
				break;
		}
	};
})();

function setHighlighted(selector){
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
