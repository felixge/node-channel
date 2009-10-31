process.mixin(require('sys'));

// try {
//   var config = require('config');
// } catch (e) {
  var config = {};
// }

var nodeChannel = require('./../lib/node-channel');
var _ = require('dep/underscore');

function PasteChat() {
  this.clientInterval = 6 * 1000;
  this.channels = {};
  this.bindServer(nodeChannel.createServer(config));
}

PasteChat.prototype.bindServer = function(server) {
  server.addListener('createChannel', _.bind(this.bindChannel, this));
  this.server = server;
};

PasteChat.prototype.bindChannel = function(channel) {
  channel.users = {};
  channel.addListener('join', _.bind(this.handleJoin, this, channel));
  channel.monitor.addListener('request', _.bind(this.handleRequest, this, channel));

  this.channels[channel.id] = channel;
};

PasteChat.prototype.handleJoin = function(channel, user) {
  // This client was already connected as a different user, kick out the old one
  if (channel.users[user._client_id]) {
    clearInterval(channel.users[user._client_id].timer);
    channel.emit('leave', channel.users[user._client_id])
  }

  channel.users[user._client_id] = user;

  user.lastSeen = (+new Date());
  user.timer = setInterval(
    _.bind(this._checkAlive, this, channel, user),
    1 * 1000
  );
};

PasteChat.prototype.handleRequest = function(channel, request) {
  if (request.client_id in channel.users) {
    channel.users[request.client_id].lastSeen = (+new Date());
  }
}

// Kick out any user who's client has not been active for 2 poll intervals
PasteChat.prototype._checkAlive = function(channel, user) {
  var now = (+new Date());
      lastSeen = (now - user.lastSeen);

  if (lastSeen > (this.clientInterval * 2)) {
    delete(channel.users[user._client_id]);
    clearInterval(user.timer);
    channel.emit('leave', user);
  }
};

PasteChat.prototype.start = function(port) {
  this.server.listen(port);
};

var chat = new PasteChat();
chat.start(8001);