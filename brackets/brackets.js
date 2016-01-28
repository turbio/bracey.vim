var port = 1337;

var server = require("./server.js");
server = new server();
server.start(port);
