var path = require('path');
require.paths.unshift(path.join(path.dirname(__filename), '..'));

var Server = require('lib/node-channel/server').Server;
exports.createServer = function(options) {
  return new Server(options);
};