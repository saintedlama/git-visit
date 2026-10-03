import path from 'node:path';
import fs from 'node:fs/promises';
import os from 'node:os';
import createDebug from 'debug';

const debug = createDebug('git-visit');

export default async function ssh<T>(
  privateKey: string | null | undefined,
  fn: (script?: string) => Promise<T> | T
): Promise<T> {
  if (!privateKey) {
    return await fn();
  }

  const tempFiles = new TempFiles();

  try {
    await tempFiles.init();
    await tempFiles.writeKey(privateKey);
  } catch (e) {
    debug('Could not write temporary key file containing private key due to error. Invoking cleanup');
    await tempFiles.cleanup();
    throw e;
  }

  const script = tempFiles.generateScript();

  try {
    await tempFiles.writeScript(script);
  } catch (e) {
    debug('Could not write temporary ssh script due to error. Invoking cleanup');
    await tempFiles.cleanup();
    throw e;
  }

  try {
    return await fn(tempFiles.scriptPath);
  } finally {
    await tempFiles.cleanup();
  }
}

class TempFiles {
  dir: string | null = null;
  keyPath = '';
  scriptPath = '';

  async init(): Promise<void> {
    this.dir = await fs.mkdtemp(path.join(os.tmpdir(), 'git-visit-ssh-'));
    this.keyPath = path.join(this.dir, 'key');
    this.scriptPath = path.join(this.dir, 'wrap-ssh.sh');
  }

  generateScript(): string {
    let key = this.keyPath;
    if (process.platform === 'win32') {
      key = key.replace(/\\/g, '/');
    }
    // Safely escape single quotes for shell script
    const escapedKey = key.replace(/'/g, '\'\\\'\'');

    return (
      '#!/bin/sh\n' +
      `ssh -i '${escapedKey}' -o StrictHostKeyChecking=no -o PasswordAuthentication=no -o KbdInteractiveAuthentication=no -o ChallengeResponseAuthentication=no "$@"\n`
    );
  }

  async writeKey(key: string): Promise<void> {
    await fs.writeFile(this.keyPath, key, { encoding: 'utf-8', mode: 0o0600 });
  }

  async writeScript(script: string): Promise<void> {
    await fs.writeFile(this.scriptPath, script, { encoding: 'utf-8', mode: 0o0700 });
  }

  async cleanup(): Promise<void> {
    debug('Cleaning up temporary ssh files');

    if (this.dir) {
      try {
        await fs.rm(this.dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 50 });
      } catch (e) {
        debug('Could not cleanup temp directory due to error: %s', e);
      }
    }
  }
}
