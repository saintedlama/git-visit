var childProcess = require('child_process');

var fs = require('fs');
var parse = require('./parse');
var async = require('async');
var ssh = require('./lib/ssh');

var debug = require('debug')('git-visit');

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
      debug('Destination path %s exists. Pulling...', self.path);
      self.pull(cb);
    } else {
      debug('Destination path %s does not exist. Cloning...', self.path);
      self.clone(cb);
    }
  });
};

Repository.prototype.clone = function(cb) {
  this._gitCommand(this.options.executable + ' clone ' + this.url + ' ' + this.path, {}, cb);
};

Repository.prototype.pull = function(cb) {
  this._gitCommand(this.options.executable + ' pull ', { cwd: this.path}, cb);
};

Repository.prototype._gitCommand = function(gitCommand, options, cb) {
  if (this.options.privateKey) {
    debug('Private key provided. Using SSH command to execute git command %s', gitCommand);

    return ssh(this.options.privateKey,
      function(err, script, next) {
        if (err) { return cb(err); }

        options = options || {};
        options.env = options.env || {};
        options.env.GIT_SSH = script;

        exec(gitCommand, options, next);
      }, cb);
  }

  debug('Executing git command %s', gitCommand);

  exec(gitCommand, options, cb);
};

Repository.prototype.log = function(cb) {
  exec(this.options.executable + ' --no-pager log --name-status --no-merges --pretty=fuller',
    {
      cwd: this.path,
      maxBuffer : this.options.maxBufferForLog
    }, function(err, stdout) {
      if (err) { return cb(err); }

      try {
        var commits = parse(stdout.toString('utf-8'));
        return cb(null, commits);
      } catch (err) {
        return cb(err);
      }
    });
};

Repository.prototype.checkout = function(ref, cb) {
  exec(this.options.executable + ' checkout -qf ' + ref, {cwd: this.path}, cb);
};

Repository.prototype.unmodify = function(cb) {
  exec(this.options.executable + ' checkout -qf -- .', {cwd: this.path}, cb);
};

Repository.prototype.show = function(file, rev, cb) {
  exec(this.options.executable + ' --no-pager show ' + rev + ':' + file, {
      cwd: this.path ,
      maxBuffer : this.options.maxBufferForShow
    }, function(err, stdout) {
      if (err) { return cb(err); }

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
      debug('Could not update repository due to error %s', err);
      return cb(err);
    }

    self.log(function(err, commits) {
      if (err) {
        debug('Could not get a log for repository due to error %s', err);
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

function exec(cmd, options, cb) {
  childProcess.exec(cmd, options, wrapExecError(cb));
}

function wrapExecError(cb) {
  return function(err, stdout, stderr) {
    if (err) {
      err.stdout = stdout.toString();
      err.stderr = stderr.toString();
    }

    cb(err, stdout, stderr);
  }
}

module.exports = Repository;