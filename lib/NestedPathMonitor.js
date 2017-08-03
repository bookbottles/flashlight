var fbutil = require('./fbutil');

function NestedPathMonitor(ref, factory) {
  console.log('Nested path monitoring started', ref.toString());
  this.factory = factory;
  this.paths = {}; // store instance of monitor, so we can unset it if the value changes
  ref.on('child_added', this._add.bind(this));
  ref.on('child_removed', this._remove.bind(this));
}

NestedPathMonitor.prototype = {
  _add: function(snap) {
    var name = snap.key;
    var pathProps = snap.val();
    this.paths[name] = this.factory(name);
    console.log('Monitoring nested index %s'.blue, name);
  },
  _remove: function(snap) {
    this._purge(snap.key);
  },
  _purge: function(name) {
    // kill old monitor
    if (this.paths[name]) {
      var path = this.paths[name];
      this.paths[name]._stop();
      this.paths[name] = null;
      console.log('Stopped monitoring nested index %s'.blue, name);
    }
  }
};

module.exports = NestedPathMonitor;
