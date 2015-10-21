(function(){
	var webSocket = new WebSocket('ws://127.0.0.1:1337');
	webSocket.onopen = function(event){};
	webSocket.onclose = function(event){};
	webSocket.onmessage = function(event){
		message = JSON.parse(event.data);
		switch(message['command']){
			case 'select':
				console.log("selecting item: " + message['selector']);
				setSelected(message['selector']);
				break;
		}
	};
})();

var currentlySelected = [];

function setSelected(selector){
	for(var i = 0, len = currentlySelected.length; i < len; i++){
		currentlySelected[i].classList.remove("brackets-currently-selected");
	}

	currentlySelected = document.querySelectorAll(message['selector']);
	for(var i = 0, len = currentlySelected.length; i < len; i++){
		currentlySelected[i].classList.add("brackets-currently-selected");
	}
}
