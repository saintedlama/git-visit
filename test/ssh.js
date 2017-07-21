const { expect } = require('chai');
const fs = require('fs');
const ssh = require('../lib/ssh');

describe('ssh', function() {
  it('should provide a ssh wrapping for arbitrary functions', async () => {
    function sshWrappedCommand(script) {
      expect(script).to.exist;
    }

    await ssh('key', sshWrappedCommand);
  });

  it('should provide no script if private key was not passed', async () => {
    function sshWrappedCommand(script) {
      expect(script).to.not.exist;
    }

    await ssh(null, sshWrappedCommand);
  });

  it('should cleanup files before callback is called', async () => {
    let sshScript = null;

    function sshWrappedCommand(script) {
      expect(script).to.exist;
      sshScript = script;
    }

    await ssh('key', sshWrappedCommand);

    expect(fs.existsSync(sshScript)).to.be.false;
  });

  it('should await ssh script wrapped function', async () => {
    let called = false;

    function sshWrappedCommand() {
      return new Promise((resolve) => {
        setTimeout(() => {
          called = true;
          resolve();
        }, 400);
      });
    }

    await ssh('key', sshWrappedCommand);

    expect(called).to.be.true;
  });

  it('should cleanup ssh script if wrapped function throws', async () => {
    let sshScript = null;

    function sshWrappedCommand(script) {
      sshScript = script;
      throw new Error('This can happen!');
    }

    try {
      await ssh('key', sshWrappedCommand);
    } catch (e) {
      expect(sshScript).to.exist;
      expect(fs.existsSync(sshScript)).to.be.false;

      return;
    }

    throw new Error('This function is expected to throw, catch and return before');
  });

  it('should return what wrapped function returns', async () => {
    function sshWrappedCommand() {
      return 'ok';
    }

    const result = await ssh('key', sshWrappedCommand);

    expect(result).to.equal('ok');
  });
});