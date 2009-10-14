node.mixin(require('/sys.js'));

var nodeChannel = require('../lib/node-channel.js');

var server = nodeChannel.createServer();
server.listen(8001);