import crypto from 'node:crypto';
import path from 'node:path';
import fs from 'node:fs/promises';
import os from 'node:os';
import createDebug from 'debug';

const debug = createDebug('git-visit');

const WRAP_SSH_TEMPLATE = '#!/bin/sh\n' +
  'ssh -i $key -o StrictHostKeyChecking=no -o PasswordAuthentication=no -o KbdInteractiveAuthentication=no -o ChallengeResponseAuthentication=no "$@"\n';

export default async function ssh<T>(
  privateKey: string | null | undefined,
  fn: (script?: string) => Promise<T> | T
): Promise<T> {
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
}

class TempFiles {
  filenames: { script: string; key: string };

  constructor() {
    this.filenames = tempFilenames();
  }

  async writeKey(key: string): Promise<void> {
    await fs.writeFile(this.filenames.key, key, { encoding: 'utf-8', mode: 0o0600 });
  }

  async writeScript(script: string): Promise<void> {
    await fs.writeFile(this.filenames.script, script, { encoding: 'utf-8', mode: 0o0700 });
  }

  async cleanup(): Promise<void> {
    debug('Cleaning up and calling provided callback');

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

function tempFilenames(): { script: string; key: string } {
  const randomStr = crypto.pseudoRandomBytes(12).toString('hex');
  const script = mkTempFile('_git_visit_wrapSSH_', randomStr, '.sh');
  let key = mkTempFile('_git_visit_wrapSSH_', randomStr, '.key');

  if (process.platform === 'win32') {
    key = key.replace(/\\/g, '/');
  }

  return {
    script,
    key
  };
}

function mkTempFile(prefix: string, infix: string, suffix: string): string {
  const name = prefix + infix + suffix;
  return path.join(os.tmpdir(), name);
}
