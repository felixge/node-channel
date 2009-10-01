var utils = require('/utils.js');
var nodeChannel = require('../lib/node-channel.js');

var server = nodeChannel.createServer();
server.listen(8000);

var channel = server.createChannel('foobar');
setInterval(function() {
	channel.emit('date', new Date());
}, 6000);

channel.addListener('ping', function() {
	channel.emit('pong');
});