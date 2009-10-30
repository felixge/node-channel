function User(name) {
  this.init(name);
}

User.prototype.init = function(user) {
  this.name = user.name;
  this.client_id = user._client_id;
};