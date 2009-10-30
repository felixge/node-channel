function Home(ui) {
  this.ui = ui;
  this.server = null;
  this.chat = null;

  this.init();
  this.bindEvents();
}

Home.prototype.init = function() {
  var here = parseUri(window.location.href);
  this.server = $.nodeChannel.server('http://'+here.host+':8001/');
};

Home.prototype.bindEvents = function() {
  var self = this;
  this.ui.addListener('button.click', function() {
    self.ui.hide();

    var ui = new ChatUi(self.ui);
    var chat = new Chat(ui, self);

    chat.createRoom();
  });
};


Home.prototype.testConnectivity = function() {
  var self = this;

  // Check if our node.js server is only
  this.server.request('get', '/')
    .addCallback(function() {
      self.ui.showButton();
    })
    .addErrback(function() {
      self.ui.showFaildog();
    });
};

$(function() {
  var ui = new HomeUi(document);
  var home = new Home(ui);

  home.testConnectivity();

  ui.emit('button.click');
});