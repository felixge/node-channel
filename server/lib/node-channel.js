require.paths.unshift(process.path.join(process.path.dirname(__filename), '..'));

var Server = require('node-channel/server.js').Server;
exports.createServer = function(options) {
  return new Server(options);
};