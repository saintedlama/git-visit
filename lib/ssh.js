const crypto = require('crypto');
const path = require('path');
const fs = require('fs-extra');
const os = require('os');
const debug = require('debug')('git-visit');

const WRAP_SSH_TEMPLATE = '#!/bin/sh\n' +
  'ssh -i $key -o StrictHostKeyChecking=no -o PasswordAuthentication=no -o KbdInteractiveAuthentication=no -o ChallengeResponseAuthentication=no "$@"\n';

module.exports = async function(privateKey, fn) {
  if (!privateKey) {
    return await fn();
  }

  const tempFiles = new TempFiles();

  try {
    await tempFiles.writeKey(privateKey);
  } catch (e) {
    debug('Could not write temporary key file containing private key due to error. Invoking cleanup');
    await tempFiles.cleanup();

    throw e;
  }

  const script = WRAP_SSH_TEMPLATE.replace('$key', tempFiles.filenames.key);

  try {
    await tempFiles.writeScript(script);
  } catch (e) {
    debug('Could not write temporary ssh script due to error. Invoking cleanup');
    await tempFiles.cleanup();

    throw e;
  }

  try {
    return await fn(tempFiles.filenames.script);
  } finally {
    await tempFiles.cleanup();
  }
};

class TempFiles {
  constructor() {
    this.filenames = tempFilenames();
  }

  async writeKey(key) {
    await fs.writeFile(this.filenames.key, key, { encoding: 'utf-8', mode: 0o0600 });
  }

  async writeScript(script) {
    await fs.writeFile(this.filenames.script, script, { encoding: 'utf-8', mode: 0o0700 });
  }

  async cleanup() {
    debug('Cleaning up and calling provided callback');

    //const cbArgs = arguments;
    try {
      await fs.unlink(this.filenames.key);
    } catch (e) {
      debug('Could not cleanup key file due to error', e);
    }

    try {
      await fs.unlink(this.filenames.script);
    } catch (e) {
      debug('Could not cleanup script file due to error', e);
    }
  }
}


function tempFilenames() {
  const randomStr = crypto.pseudoRandomBytes(12).toString('hex');
  const script = mkTempFile('_git_visit_wrapSSH_', randomStr, '.sh');
  let key = mkTempFile('_git_visit_wrapSSH_', randomStr, '.key');

  // Replace all \ occurrences with / on win32 to fix some weird win32/git stuff
  if (process.platform === 'win32') {
    key = key.replace(/\\/g, '/');
  }

  return {
    script: script,
    key: key
  };
}

function mkTempFile(prefix, infix, suffix) {
  const name = prefix + infix + suffix;
  return path.join(os.tmpdir(), name);
}