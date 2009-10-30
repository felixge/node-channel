function HomeUi(context) {
  node.EventEmitter.call(this);

  this.init(context);
  this.bindEvents();
}
node.inherits(HomeUi, node.EventEmitter);

HomeUi.prototype.init = function(context) {
  this.faildogs = [
    'http://lh3.ggpht.com/SergioAlex76/SO-B3KhnCyI/AAAAAAAAAKs/Kqb-ZxjiD80/fail-dog-ball%5B2%5D.jpg',
    'http://images.triplem.com.au/2009/05/28/195337/fail-dog-24-600x400.jpg',
    'http://data.tumblr.com/zcTqHiK8c5mqoszxmemvnwtF_400.jpg',
    'http://farm3.static.flickr.com/2014/2263874070_55958e6727.jpg',
    'http://untitled00.files.wordpress.com/2009/03/fail-dog.jpg',
    'http://farm4.static.flickr.com/3271/2298205761_299e5e7706.jpg',
    'http://aggregatemadbox.com/bloggregate/wp-content/uploads/2008/03/fail_dogs.jpg'
  ];

  this.$home = $('.home', context);
  this.$button = $('button', this.$home);
};

HomeUi.prototype.bindEvents = function() {
  var self = this;
  this.$button.click(function() {
    self.emit('button.click');
  });
};

HomeUi.prototype.showFaildog = function(error) {
  var random = Math.floor(Math.random() * this.faildogs.length);
  var $faildog = $(tmpl('faildog', {
    error: error,
    faildog: this.faildogs[random]
  }))

  $faildog.insertAfter(this.$button);
};

HomeUi.prototype.showButton = function() {
  this.$button.fadeIn();
};

HomeUi.prototype.hide = function() {
  this.$home.hide();
};

HomeUi.prototype.show = function() {
  this.$home.fadeIn();
};