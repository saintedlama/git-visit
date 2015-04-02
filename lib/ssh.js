var crypto = require('crypto');
var path = require('path');
var fs = require('fs');
var os = require('os');
var debug = require('debug')('git-visit');

var WRAP_SSH_TEMPLATE = '#!/bin/sh\n' +
  'ssh -i $key -o StrictHostKeyChecking=no "$@"\n';

module.exports = function wrapSSH(privateKey, fn, cb) {
  if (!privateKey) {
    return fn(null, null, cb);
  }

  var tempFiles = new TempFiles();

  var cleanup = tempFiles.bindCleanup(cb);

  tempFiles.writeKey(privateKey, function (err) {
    if (err) { return cleanup(err); }

    var script = WRAP_SSH_TEMPLATE.replace('$key', tempFiles.filenames.key);

    tempFiles.writeScript(script, function(err) {
      if (err) { return cleanup(err); }

      fn(null, tempFiles.filenames.script, cleanup);
    });
  });
};

function TempFiles() {
  this.filenames = tempFilenames();
}

TempFiles.prototype.writeKey = function(key, next) {
  fs.writeFile(this.filenames.key, key, { encoding: 'utf-8', mode: 0600 }, next);
};

TempFiles.prototype.writeScript = function(script, next) {
  fs.writeFile(this.filenames.script, script, { encoding: 'utf-8', mode: 0700 }, next);
};

TempFiles.prototype.bindCleanup = function(cb) {
  var self = this;

  return function() {
    debug('Cleaning up and calling provided callback');

    var cbArgs = arguments;
    fs.unlink(self.filenames.key, function(err) {
      if (err) { debug('Could not cleanup key file due to error', err); }

      fs.unlink(self.filenames.script, function(err) {
        if (err) { debug('Could not cleanup key file due to error', err); }

        cb.call(Array.prototype.slice.call(cbArgs));
      });
    });
  };
};


function tempFilenames() {
  var randomStr = crypto.pseudoRandomBytes(4).toString('hex');
  var script = mkTempFile('_git_visit_wrapSSH_', randomStr, '.sh');
  var key = mkTempFile('_git_visit_wrapSSH_', randomStr, '.key');

  // Replace all \ occurrences with / on win32 to fix some weird win32/git stuff
  if (process.platform == 'win32') {
    key = key.replace(/\\/g, '/');
  }

  return {
    script : script,
    key : key
  }
}

function mkTempFile(prefix, infix, suffix) {
  var name = prefix + infix + suffix;
  var file = path.join(os.tmpDir(), name);

  return file;
}