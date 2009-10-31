var multipart = require('/multipart.js');

exports.Request = function(req, res) {
  process.EventEmitter.call(this);

  this.req = req;
  this.res = res;

  this.req.setBodyEncoding('utf8');

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
    this.res.sendHeader(code, {
      'Content-Type': 'text/javascript',
      'Content-Length': response.length
    });
  }
  
  this.res.sendBody(response);
  this.res.finish();
};

exports.Request.prototype.parse = function() {
  if (this.method === 'get') {
    var promise = new process.Promise();
    this.client_id = this.uri.params._client_id || null;
    setTimeout(function() {
      promise.emitSuccess();
    });
    return promise;
  }

  if (this.req.headers['content-type'].match(/form-urlencoded/)) {
    return this.parseUrlencoded();
  }

  return this.parseMultipart();
};

function decode (s) {
  return decodeURIComponent(s.replace(/\+/g, ' '));
}

exports.Request.prototype.parseUrlencoded = function() {
  var promise = new process.Promise();

  var body = '', self = this;
  this.req
    .addListener('body', function(chunk) {
      body = body + chunk || '';
    })
    .addListener('complete', function() {
      var parts = body.split('&');
      for (var j = 0; j < parts.length; j++) {
        var i = parts[j].indexOf('=');
        if (i < 0) continue;
        try {
          var key = decode(parts[j].slice(0,i))
          var value = decode(parts[j].slice(i+1));
          self.body[key] = value;
        } catch (e) {
          continue;
        }
      }
      self.extractBody(promise);
    });
  return promise;
}

exports.Request.prototype.parseMultipart = function() {
  var promise = new process.Promise();

  var self = this, parser = new multipart.parse(this.req);
  parser
    .addErrback(function() {
      promise.emitError();
    })
    .addCallback(function(parts) {
      self.body = parts;
      self.extractBody(promise);
    });
  return promise;
};

exports.Request.prototype.extractBody = function(promise) {
  if ('json' in this.body) {
    try {
      this.body = JSON.parse(this.body.json);
    } catch (e) {
      return promise.emitError();
    }
  }
  this.client_id = this.body._client_id || null;
  promise.emitSuccess();
}