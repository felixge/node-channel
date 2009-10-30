require.paths.unshift(node.path.join(node.path.dirname(__filename), '..'));

var Server = require('node-channel/server.js').Server;
exports.createServer = function() {
  return new Server();
};