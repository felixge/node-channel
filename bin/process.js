var utils = require('/utils.js');
var nodeChannel = require('../lib/node-channel.js');

var server = nodeChannel.createServer();
server.listen(8000);

var channel = server.createChannel('foobar');
setInterval(function() {
	utils.exec("php -r 'echo microtime(true);'").addCallback(function(r) {
		channel.emit('date', r);
	});
}, 250);