function Home(ui) {
  this.ui = ui;
  this.server = null;
  this.chat = null;
  this.config = {};

  this.bindEvents();
}

Home.prototype.bindEvents = function() {
  var self = this;
  this.ui.addListener('button.click', function() {
    self.ui.hide();

    var ui = new ChatUi(self.ui);
    var chat = new Chat(ui, self);

    chat.createRoom();
  });
};

Home.prototype.loadConfig = function() {
  var here = parseUri(window.location.href);
  var defaults = {
    server: 'http://'+here.host+':8001/'
  };

  var self = this;
  $.ajax({
    url: 'config.js',
    dataType: 'json',
    complete: function() {
      self.testConnectivity();
    },
    success: function(config) {
      self.config = $.extend(defaults, config);
    },
    error: function() {
      self.config = $.extend(defaults, config);
    }
  })
};

Home.prototype.testConnectivity = function() {
  var self = this;

  this.server = $.nodeChannel.server(this.config.server);

  // Check if our node.js server is only
  this.server.request('get', '/')
    .addCallback(function() {
      var channelId = window.location.hash.replace(/\?.*$/, '').substr(1);
      if (!channelId) {
        return self.ui.showButton();
      }

      self.connectChannel(channelId);
    })
    .addErrback(function() {
      self.ui.showFaildog('Sorry, but our systems are currently down : (');
    });
};

Home.prototype.connectChannel = function(id) {
  this.ui.hide();

  var ui = new ChatUi(this.ui);
  var chat = new Chat(ui, this);

  var connect = chat.connectRoom(id), self = this;
  connect.addErrback(function() {
    ui.hide();
    self.ui.show();
    self.ui.showButton();
    self.ui.showFaildog(
      'Sorry, but the room you tried to join no longer exists : ('
    );
  });
}

$(function() {
  var ui = new HomeUi(document);
  var home = new Home(ui);

  home.loadConfig();
  // ui.emit('button.click');
});