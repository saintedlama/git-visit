import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import fs from 'node:fs/promises';
import childProcess from 'node:child_process';
import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import Repository from '../src/index';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const remoteUrl = pathToFileURL(path.join(__dirname, 'fixtures', 'repo')).href;
const cloneDir = path.join(__dirname, '..', 'test_tmp_sec');

async function cleanupCloneDir() {
  await fs.rm(cloneDir, { recursive: true, force: true, maxRetries: 10, retryDelay: 50 });
}

describe('security hardening', { timeout: 15000 }, () => {
  beforeEach(async () => {
    await cleanupCloneDir();
  });

  afterAll(async () => {
    await cleanupCloneDir();
  });

  describe('option and command injection protection', () => {
    it('should reject invalid option keys with metacharacters in clone options', async () => {
      const repo = new Repository(cloneDir, remoteUrl, {
        clone: { 'depth; whoami': 1 }
      });

      await expect(repo.clone()).rejects.toThrow(/Invalid option key/);
    });

    it('should reject invalid option keys with metacharacters in pull options', async () => {
      const repo = new Repository(cloneDir, remoteUrl, {
        pull: { 'rebase; echo pwned': true }
      });

      await expect(repo.pull()).rejects.toThrow(/Invalid option key/);
    });

    it('should reject invalid defaultBranch starting with a dash', () => {
      expect(() => {
        new Repository(cloneDir, remoteUrl, {
          defaultBranch: '--help'
        });
      }).toThrow(/Invalid default branch/);
    });

    it('should reject invalid checkout ref starting with a dash', async () => {
      const repo = new Repository(cloneDir, remoteUrl);
      await repo.update();

      await expect(repo.checkout('--help')).rejects.toThrow(/Invalid git ref/);
      await expect(repo.checkout('-b')).rejects.toThrow(/Invalid git ref/);
    });

    it('should reject diff and diffStat when revision starts with a dash', async () => {
      const repo = new Repository(cloneDir, remoteUrl);
      await repo.update();

      await expect(repo.diff('--output=/tmp/test', 'HEAD')).rejects.toThrow(/Invalid left revision/);
      await expect(repo.diff('HEAD', '--output=/tmp/test')).rejects.toThrow(/Invalid right revision/);
      await expect(repo.diffStat('--output=/tmp/test', 'HEAD')).rejects.toThrow(/Invalid left revision/);
      await expect(repo.diffStat('HEAD', '--output=/tmp/test')).rejects.toThrow(/Invalid right revision/);
    });

    it('should reject show when revision starts with a dash', async () => {
      const repo = new Repository(cloneDir, remoteUrl);
      await repo.update();

      await expect(repo.show('README.md', '--help')).rejects.toThrow(/Invalid revision/);
    });

    it('should safely treat repository URLs starting with dashes as repo names, not flags', async () => {
      const repo = new Repository(cloneDir, '--upload-pack=echo');

      // Git should complain that the repository does not exist, NOT treat --upload-pack as a command flag
      await expect(repo.clone()).rejects.toThrow(/repository.*does not exist/i);
    });

    it('should safely handle filenames and revisions with special characters without shell execution', async () => {
      const repo = new Repository(cloneDir, remoteUrl);
      await repo.update();

      // Requesting a non-existent file with shell characters should fail safely from git, not execute in a shell
      await expect(repo.show('file;whoami.txt', 'HEAD')).rejects.toThrow();
    });
  });

  describe('path traversal and boundary protection', () => {
    it('should resolve repository path to canonical absolute path', () => {
      const repo = new Repository('./test_tmp_sec', remoteUrl);
      expect(path.isAbsolute(repo.path)).to.be.true;
    });

    it('should reject path traversal in show() file argument', async () => {
      const repo = new Repository(cloneDir, remoteUrl);
      await repo.update();

      await expect(repo.show('../../etc/passwd', 'HEAD')).rejects.toThrow(/Invalid file path/);
      await expect(repo.show(path.resolve('/etc/passwd'), 'HEAD')).rejects.toThrow(/Invalid file path/);
    });

    it('should reject path traversal in log() dir argument', async () => {
      const repo = new Repository(cloneDir, remoteUrl);
      await repo.update();

      await expect(repo.log('../../other')).rejects.toThrow(/Invalid directory path/);
      await expect(repo.log(path.resolve('/'))).rejects.toThrow(/Invalid directory path/);
    });

    it('should disable symlinks by default in clone config to prevent symlink traversal', async () => {
      const repo = new Repository(cloneDir, remoteUrl);
      expect(repo.options.disableSymlinks).to.be.true;

      await repo.update();

      const { stdout } = await new Promise<{ stdout: string }>((resolve, reject) => {
        childProcess.execFile('git', ['-C', cloneDir, 'config', '--get', 'core.symlinks'], (err, stdout) => {
          if (err) return reject(err);
          resolve({ stdout: stdout.trim() });
        });
      });

      expect(stdout).to.equal('false');
    });

    it('should allow enabling symlinks if explicitly configured with disableSymlinks: false', () => {
      const repo = new Repository(cloneDir, remoteUrl, { disableSymlinks: false });
      expect(repo.options.disableSymlinks).to.be.false;
      expect(repo._withSymlinkConfig(['checkout', 'HEAD'])).to.deep.equal(['checkout', 'HEAD']);
    });
  });
});
