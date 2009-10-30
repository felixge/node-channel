function User(name) {
  this.init(name);
}

User.prototype.init = function(name) {
  this.name = name;
};