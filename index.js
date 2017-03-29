const childProcess = require('child_process');
const opted = require('opted');
const fs = require('fs');

const parse = require('./parse');
const async = require('async');
const ssh = require('./lib/ssh');

const debug = require('debug')('git-visit');

function Repository(path, url, options) {
  options = options || {};
  options.executable = options.executable || 'git';
  options.maxBufferForLog = options.maxBufferForLog || 40 * 1024 * 1024; // 40 MB;
  options.maxBufferForShow = options.maxBufferForShow ||10 * 1024 * 1024; // 10MB;

  options.defaultBranch = options.defaultBranch || 'master';

  options.clone = options.clone || {};
  options.pull = options.pull || {};

  this.options = options;

  this.path = path;
  this.url = url;
}

Repository.prototype.update = function(cb) {
  fs.exists(this.path, (exists) => {
    if (exists) {
      debug('Destination path %s exists. Pulling...', this.path);
      this.pull(cb);
    } else {
      debug('Destination path %s does not exist. Cloning...', this.path);
      this.clone(cb);
    }
  });
};

Repository.prototype.clone = function(cb) {
  const additionalOptions = opted(this.options.clone).join(' ');

  this._gitCommand(`${this.options.executable} clone ${additionalOptions} ${this.url} ${this.path}`, {}, cb);
};

Repository.prototype.pull = function(cb) {
  // Assure to be on a branch to avoid detached working copies
  this.checkout(this.options.defaultBranch, (err) => {
    if (err) { return cb(err); }

    const additionalOptions = opted(this.options.pull).join(' ');

    this._gitCommand(`${this.options.executable} pull ${additionalOptions} `, { cwd: this.path}, cb);
  });
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

  exec(gitCommand, options, cb);
};

Repository.prototype.log = function(cb) {
  exec(`${this.options.executable} --no-pager log --name-status --no-merges --pretty=fuller`,
    {
      cwd: this.path,
      maxBuffer : this.options.maxBufferForLog
    }, function(err, stdout) {
      if (err) { return cb(err); }

      try {
        const commits = parse(stdout.toString('utf-8'));
        return cb(null, commits);
      } catch (err) {
        return cb(err);
      }
    });
};

Repository.prototype.checkout = function(ref, cb) {
  exec(`${this.options.executable} checkout -qf ${ref}`, {cwd: this.path}, cb);
};

Repository.prototype.unmodify = function(cb) {
  exec(`${this.options.executable} checkout -qf -- .`, {cwd: this.path}, cb);
};

Repository.prototype.initialCommit = function(cb) {
  exec(`${this.options.executable} rev-list --max-parents=0 HEAD`, {cwd: this.path}, function(err, stdout) {
    if (err) { return cb(err); }

    const output = stdout.toString('utf-8');
    const match = output.match(/[0-9a-f]*/);

    if (!match.length > 0) {
      return cb(new Error('Could not get initial commit from rev-list'));
    }

    return cb(null, match[0]);
  });
};

Repository.prototype.diff = function(leftRev, rightRev, cb) {
  exec(`${this.options.executable} --no-pager diff --numstat ${leftRev} ${rightRev}`, {cwd: this.path}, function(err, stdout) {
    if (err) { return cb(err); }

    try {
      const out = stdout.toString('utf-8');
      // see: http://www.unicode.org/reports/tr18/#Line_Boundaries
      const lines = out.split(/\r\n|[\n\v\f\r\x85\u2028\u2029]/g);

      const diffs = lines.map(function(line) {
        const match = line.match(/(\d+)\s+(\d+)\s+(.+)/i);

        if (!match) {
           return;
        }

        return { added: parseInt(match[1], 10), deleted : parseInt(match[2], 10), path : match[3] };
      }).filter(diff => diff);

      return cb(null, diffs);
    } catch (err) {
      return cb(err);
    }
  });
};

Repository.prototype.show = function(file, rev, cb) {
  exec(`${this.options.executable} --no-pager show ${rev}:${file}`, {
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
  visitor.init = visitor.init || function() { };

  this.update((err) => {
    if (err) {
      debug('Could not update repository due to error %s', err);
      return cb(err);
    }

    this.log((err, commits) => {
      if (err) {
        debug('Could not get a log for repository due to error %s', err);
        return cb(err);
      }

      const commitsToVisit = commits.filter(visitor.test);

      visitor.init(this, commits);

      if (commits.length > 0) {
        commits[0].isFirst = true;
        commits[commits.length - 1].isLast = true;
      }

      async.mapSeries(commitsToVisit, (commit, cb) => {
        this.unmodify((err) => {
          if (err) {
            return this._cleanupCheckout(cb, err);
          }

          this.checkout(commit.hash, (err) => {
            if (err) {
              return this._cleanupCheckout(cb, err);
            }

            visitor.visit(this, commit, cb);
          });
        });
      }, (err, results) => {
        this._cleanupCheckout(cb, err, results);
      });
    });
  });
};

Repository.prototype._cleanupCheckout = function(cb, err, results) {
  this.checkout(this.options.defaultBranch, function() { // TODO: Deal with this error too!
    cb(err, results);
  });
};

function exec(cmd, options, cb) {
  debug('Executing command %s', cmd);

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
