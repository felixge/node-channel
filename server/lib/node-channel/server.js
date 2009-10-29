var http = require('/http.js');
var multipart = require('/multipart.js');
var utils = require('/utils.js');

var uuid = require('misc.js').uuid;
var Request = require('request.js').Request;
var Channel = require('channel.js').Channel;

exports.Server = function() {
  node.EventEmitter.call(this);

  this.channels = {};
  this.responses = {};

  var self = this;
  this.httpServer = http.createServer(function(req, res) {
    var request = new Request(req, res);
    request
      .parse()
      .addErrback(function() {
        request.respond(500, {error: 'Could not parse request.'});
      })
      .addCallback(function() {
        p(request.form);
        p('no');
        self.emit('request', request);
      });
  });

  this.addListener('request', function(request) {
    var prefix = request.uri.path.substr(1, 1);
    if (prefix == '_') {
      var data = {};
      if (request.form.data) {
        try {
          data = JSON.parse(request.form.data);
        } catch (e) {
          // @fixme needs to be handled
        }
      }

      switch (request.uri.path) {
        case '/_response':
          var request_id = request.uri.params._request_id;
          var response = self.responses[request_id];
          if (response) {
            request.respond(response.code, response.response);
          } else {
            request.respond(404, {error: 
              'Unknown request_id: '+
              JSON.stringify(request_id)
            })

          }
          break;
        case '/_create_channel':
          var id = uuid();
          var channel = self.createChannel(id);

          request.respond(200, {
            ok: true,
            id: id
          });
          break;
        default:
          request.respond(404, {error: 
            'Unknown command: '+
            JSON.stringify(req.uri.path)
          })
          break;
      }

      if (data._request_id) {
        self.responses[data._request_id] = request.response;
      }
      return;
    }

    var id = request.uri.path.substr(1);
    if (!id) {
      return request.respond(200, {ok: true, welcome: 'node-channel'});
    }

    if (!(id in this.channels)) {
      return request.respond(404, {error: 'Unknown channel: '+JSON.stringify(id)})
    }

    var channel = this.channels[id];
    if (request.method === 'post') {
      this.emit('postEvents', channel, request);
    } else {
      this.emit('getEvents', channel, request);
    }
  });

  this.addListener('getEvents', function(channel, request) {
    var since = parseInt(request.req.uri.params.since || 0, 10);
    channel.onHistory(since, function(history) {
      request.respond(200, {
        ok: true,
        since: since,
        history: history
      });
    });
  });

  this.addListener('postEvents', function(channel, request) {
    var parser = new multipart.parse(request.req), self = this;

    parser.addCallback(function(parts) {
      if (!('data' in parts) || !parts.data) {
        return request.respond(400, 'Sorry, but your message body contained no data!');
      }

      var events = JSON.parse(parts.data);
      for (var i = 0; i < events.length; i++) {
        var event = events[i], args = event.args;
        args.unshift(event.name);
        channel.emit.apply(channel, args);
      }

      request.respond(200, {
        ok: true
      });
    });
  });
};
node.inherits(exports.Server, node.EventEmitter);

exports.Server.prototype.listen = function(port) {
  this.httpServer.listen(port);
};

exports.Server.prototype.createChannel = function(id) {
  var channel = new Channel(id);
  return this.channels[id] = channel;
};