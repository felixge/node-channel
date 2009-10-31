var http = require('http');
var multipart = require('multipart');
var utils = require('utils');

var _ = require('dep/underscore');
var uuid = require('./misc').uuid;
var Request = require('./request').Request;
var Channel = require('./channel').Channel;

var Server = exports.Server = function(options) {
  process.EventEmitter.call(this);

  this.options = options;
  this.channels = {};
  this.responses = {};

  this.httpServer = http.createServer(_.bind(this._handleRequest, this));
}
process.inherits(Server, process.EventEmitter);

Server.prototype._handleRequest = function(req, res) {
  var prefixed = this.options.proxyPrefix
                 && req.uri.path.indexOf(this.options.proxyPrefix) === 0;

  if (prefixed) {
    req.uri.path = req.uri.path.substr(this.options.proxyPrefix.length);
  }
  var request = new Request(req, res), self = this;

  request
    .parse()
    .addErrback(function() {
      request.respond(400, {error: 'Could not parse request.'});
    })
    .addCallback(function() {
      if (!request.client_id && request.uri.path !== '/') {
        return request.respond(400, {
          error: 'Insane world: no _client_id was given.'}
        );
      }

      var route = _.detect(self.routes, _.bind(self.router, self, request))[2];
      route.call(self, request);

      // Store iframe submit responses so they can be fetched later on
      if (request.body._request_id) {
        self.responses[request.body._request_id] = request.response;
      }
    });
};

Server.prototype.routes = [
  ['get', '/:channel-id', function(request) {
    if (request.uri.params._exists) {
      return request.respond(200, {ok: true});
    }

    var since = parseInt(request.uri.params.since || 0, 10);
    request.channel.onHistory(since, function(history) {
      request.respond(200, {
        ok: true,
        since: since,
        history: history
      });
    });

    request.channel.monitor.emit('request', request);
  }],
  ['post', '/:channel-id', function(request) {
    var events = request.body.events;
    for (var i = 0; i < events.length; i++) {
      var event = events[i], args = event.args;
      if (event.args[0].constructor == Object) {
        process.mixin(event.args[0], {_client_id: request.client_id});
      }
      args.unshift(event.name);
      request.channel.emit.apply(request.channel, args);
    }

    request.respond(200, {
      ok: true
    });

    request.channel.monitor.emit('request', request);
  }],
  ['get', '/', function(request) {
    request.respond(200, {ok: true, welcome: 'node-channel'})
  }],
  ['get', '/_response', function(request) {
    var request_id = request.uri.params._request_id;
    if (!request_id) {
      return request.respond(400, {error: 'No "_request_id" was given'});
    }

    var response = this.responses[request_id];
    if (!response) {
      return request.respond(404, {
        error: 'Unknown "_request_id": '+JSON.stringify(request_id)
      });
    }

    request.respond(response.code, response.response);
  }],
  ['post', '/_create_channel', function(request) {
    var id = uuid();
    var channel = this.createChannel(id);

    request.respond(200, {
      ok: true,
      id: id
    });
  }],
  [/.*/, /.*/, function(request) {
    request.respond(404, {error: 'Unknown route or channel'})
  }]
];

Server.prototype.router = function(request, route) {
  var method = route[0], url = route[1];

  if (typeof method == 'string' && request.method !== method) {
    return false;
  } else if (method.constructor == RegExp && !request.method.match(method)) {
    return false;
  }

  if (url == '/:channel-id') {
    var id = request.uri.path.substr(1);
    if (id in this.channels) {
      request.channel = this.channels[id];
      return true;
    }
    return false;
  }

  if (typeof url == 'string' && request.uri.path !== url) {
    return false;
  } else if (url.constructor == RegExp && !request.uri.path.match(url)) {
    return false;
  }

  return true;
};

Server.prototype.listen = function(port) {
  this.httpServer.listen(port);
};

Server.prototype.createChannel = function(id) {
  var channel = new Channel(id);
  this.channels[id] = channel;

  this.emit('createChannel', channel);
  return channel;
};