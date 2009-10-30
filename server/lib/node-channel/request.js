var multipart = require('/multipart.js');

exports.Request = function(req, res) {
  process.EventEmitter.call(this);

  this.req = req;
  this.res = res;

  this.method = this.req.method.toLowerCase();
  this.uri = this.req.uri;
  this.body = {};
  this.client_id = null;

  this.response = null;
};
process.inherits(exports.Request, process.EventEmitter);

exports.Request.prototype.respond = function(code, response) {
  this.response = {code: code, response: response};

  response = JSON.stringify(response);

  var jsonp = this.req.uri.params.callback;
  if (jsonp) {
    response = jsonp + '('+response+')';
    this.res.sendHeader(200, {'Content-Type': 'text/javascript'});
  } else {
    this.res.sendHeader(code, {'Content-Type': 'text/javascript'});
  }
  
  this.res.sendBody(response);
  this.res.finish();
};

exports.Request.prototype.parse = function() {
  var promise = new process.Promise();

  if (this.method === 'get') {
    this.client_id = this.uri.params._client_id || null;
    setTimeout(function() {
      promise.emitSuccess();
    });
    return promise;
  }

  var self = this, parser = new multipart.parse(this.req);
  parser
    .addErrback(function() {
      promise.emitError();
    })
    .addCallback(function(parts) {
      self.body = parts;
      if ('json' in self.body) {
        try {
          self.body = JSON.parse(self.body.json);
        } catch (e) {
          return promise.emitError();
        }
      }
      self.client_id = self.body._client_id || null;
      promise.emitSuccess();
    });
  return promise;
};