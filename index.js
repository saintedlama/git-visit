var childProcess = require('child_process');

var fs = require('fs');
var parse = require('./parse');
var async = require('async');

function Repository(path, url, options) {
  options = options || {};
  options.executable = options.executable || 'git';
  options.maxBufferForLog = options.maxBufferForLog || 40 * 1024 * 1024; // 40 MB;
  options.maxBufferForShow =options.maxBufferForShow ||10 * 1024 * 1024; // 10MB;

  this.options = options;

  this.path = path;
  this.url = url;
}

Repository.prototype.update = function(cb) {
  var self = this;

  fs.exists(this.path, function(exists) {
    if (exists) {
      self.pull(cb);
    } else {
      self.clone(cb);
    }
  });
};

Repository.prototype.clone = function(cb) {
  childProcess.exec(this.options.executable + ' clone ' + this.url + ' ' + this.path, cb);
};

Repository.prototype.pull = function(cb) {
  childProcess.exec(this.options.executable + ' pull ', { cwd: this.path }, cb);
};

Repository.prototype.log = function(cb) {
  childProcess.exec(this.options.executable + ' --no-pager log --name-status --no-merges --pretty=fuller',
    {
      cwd: this.path,
      maxBuffer : this.options.maxBufferForLog
    },
    function(err, stdout) {
      if (err) {
        return cb(err);
      }

      try {
        var commits = parse(stdout.toString('utf-8'));
        return cb(null, commits);
      } catch (err) {
        return cb(err);
      }
    });
};

Repository.prototype.checkout = function(ref, cb) {
  childProcess.exec(this.options.executable + ' checkout -qf ' + ref, {cwd: this.path}, cb);
};

Repository.prototype.unmodify = function(cb) {
  childProcess.exec(this.options.executable + ' checkout -qf -- .', {cwd: this.path}, cb);
};

Repository.prototype.show = function(file, rev, cb) {
  childProcess.exec(this.options.executable + ' --no-pager show ' + rev + ':' + file, {
      cwd: this.path ,
      maxBuffer : this.options.maxBufferForShow
    },
    function(err, stdout) {
      if (err) {
        return cb(err);
      }

      try {
        return cb(null, stdout.toString('utf-8'));
      } catch (err) {
        return cb(err);
      }
    });
};

Repository.prototype.visit = function(visitor, cb) {
  visitor = visitor || {};
  visitor.test = visitor.test || function() { return true; };
  visitor.visit = visitor.visit || function(cb) { return cb(); };

  var self = this;

  self.update(function(err) {
    if (err) {
      return cb(err);
    }

    self.log(function(err, commits) {
      if (err) {
        return cb(err);
      }

      var commitsToVisit = commits.filter(visitor.test);

      async.mapSeries(commitsToVisit, function(commit, cb) {
        self.unmodify(function(err) {
          if (err) {
            return self._cleanupCheckout(cb, err);
          }

          self.checkout(commit.hash, function(err) {
            if (err) {
              return self._cleanupCheckout(cb, err);
            }

            visitor.visit(self, commit, cb);
          });
        });
      }, function(err, results) {
        self._cleanupCheckout(cb, err, results);
      });
    });
  });
};

Repository.prototype._cleanupCheckout = function(cb, err, results) {
  this.checkout('master', function() { // TODO: Deal with this error too!
    cb(err, results);
  });
};

module.exports = Repository;