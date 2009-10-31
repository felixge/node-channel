process.mixin(require('/sys.js'));

var nodeChannel = require('../lib/node-channel.js');
var _ = require('/dep/underscore.js');

var server = nodeChannel.createServer();

server.addListener('createChannel', function(channel) {
  channel.addListener('join', function() {
      for (var i = 0; i < 30; i++) {
        channel.emit('message', {user: 'ROOM', text: 'Hello Hello Hello Hello Hello Hello Hello Hello Hello Hello Hello Hello Hello Hello Hello Hello Hello Hello Hello Hello Hello Hello '+i});
      }
  });

  var clients = {};
  channel.monitor.addListener('request', function(request) {
    clients[request.client_id] = Math.floor((+new Date()) / 1000);
  });

  setInterval(function() {
    var now = Math.floor((+new Date()) / 1000);
    for (var clientId in clients) {
      var lastSeen = (now - clients[clientId])
      if (lastSeen > 10) {
        delete(clients[clientId]);
        channel.emit('leave', {_client_id: clientId});
      }
    }
  }, 1 * 1000);
});

server.listen(8001);