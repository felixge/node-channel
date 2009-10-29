var Server = require('node-channel/server.js').Server;
exports.createServer = function() {
  return new Server();
};