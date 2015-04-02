var expect = require('chai').expect;
var fs = require('fs');
var ssh = require('../lib/ssh');

describe('ssh', function() {
  it('should provide a ssh wrapping for arbitrary functions', function(done) {
    function sshWrappedCommand(err, script, next) {
      expect(err).to.not.exist;
      expect(script).to.exist;
      expect(next).to.exist;

      next();
    }

    ssh('key', sshWrappedCommand, done);
  });

  it('should provide no script if private key was not passed', function(done) {
    function sshWrappedCommand(err, script, next) {
      expect(err).to.not.exist;
      expect(script).to.not.exist;
      expect(next).to.exist;

      next();
    }

    ssh(null, sshWrappedCommand, done);
  });

  it('should cleanup files before callback is called', function(done) {
    var sshScript;

    function sshWrappedCommand(err, script, next) {
      expect(err).to.not.exist;
      expect(script).to.exist;
      expect(next).to.exist;

      sshScript = script;

      next();
    }

    ssh('key', sshWrappedCommand, function() {
      expect(fs.existsSync(sshScript)).to.be.false;

      done();
    });
  });
});