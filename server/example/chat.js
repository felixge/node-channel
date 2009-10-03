var nodeChannel = require('../lib/node-channel.js');

var server = nodeChannel.createServer();
server.listen(8000);

var channel = server.createChannel('foobar');

// Delete messages from the chat history after 10 seconds
channel.monitor.addListener('emit', function() {
	setTimeout(function() {
		channel.history.shift();
	}, 10 * 1000);
});