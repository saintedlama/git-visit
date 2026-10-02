import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import fs from 'node:fs/promises';
import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import Repository from '../src/index';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const remoteUrl = pathToFileURL(path.join(__dirname, 'fixtures', 'repo')).href;
const cloneDir = path.join(__dirname, '..', 'test_tmp');

async function cleanupCloneDir() {
  await fs.rm(cloneDir, { recursive: true, force: true, maxRetries: 10, retryDelay: 50 });
}

describe('repository', { timeout: 15000 }, () => {
  beforeEach(async () => {
    await cleanupCloneDir();
  });

  afterAll(async () => {
    await cleanupCloneDir();
  });

  describe('show', () => {
    it('should show file contents of a specific revision', async () => {
      const repo = new Repository(cloneDir, remoteUrl);
      await repo.update();
      const contents = await repo.show('README.md', 'c43f0f08c9da96b951aabce724795a20ed8149ce');

      expect(contents).to.contain('Change 1');
      expect(contents).to.not.contain('Change 2');
    });
  });

  describe('diffStat', () => {
    it('should get a parsed git diff numstat', async () => {
      const repo = new Repository(cloneDir, remoteUrl);

      await repo.update();
      const hash = await repo.initialCommit();
      const diffs = await repo.diffStat(hash, 'HEAD');

      expect(diffs).to.exist;
      expect(diffs[0].path).to.equal('README.md');
      expect(diffs[0].added).to.equal(7);
      expect(diffs[0].deleted).to.equal(0);
    });
  });

  describe('diff', () => {
    async function arrange() {
      const repo = new Repository(cloneDir, remoteUrl);

      await repo.update();
      const hash = await repo.initialCommit();

      return { repo, hash };
    }

    it('should get a parsed git source diff', async () => {
      const { repo, hash } = await arrange();
      const diffs = await repo.diff(hash, 'HEAD');

      expect(diffs).to.have.length(1);
      expect(diffs[0].addedLines).to.equal(7);
      expect(diffs[0].deletedLines).to.equal(0);
      expect(diffs[0].to).to.equal('README.md');
    });

    it('should get a raw string git source diff', async () => {
      const { repo, hash } = await arrange();
      const diffs = await repo.diff(hash, 'HEAD', { output: 'raw' });

      expect(diffs).to.be.a('string');
      expect(diffs).to.contain('diff --git a/README.md b/README.md');
    });
  });

  describe('update', () => {
    it('should pass clone options to git command', async () => {
      const repo = new Repository(cloneDir, remoteUrl, { clone: { depth: 1 } });

      await repo.update();
      const log = await repo.log();

      expect(log.length).to.equal(1);
    });
  });

  describe('visit', () => {
    it('should clone the repo if the repo does not exist', async () => {
      const visitor = {
        counter: 0,
        visit() {
          this.counter++;
        },
      };

      const repo = new Repository(cloneDir, remoteUrl);
      await repo.visit(visitor);

      expect(visitor.counter).to.equal(5);
    });

    it('should add first and last flags to commits', async () => {
      const visitor = {
        commits: [] as any[],
        visit(repo: any, commit: any) {
          this.commits.push(commit);
        },
      };

      const repo = new Repository(cloneDir, remoteUrl);
      await repo.visit(visitor);

      expect(visitor.commits[0].isFirst).to.equal(true);
      expect(visitor.commits[visitor.commits.length - 1].isLast).to.equal(true);
    });

    it('should await async visitor', async () => {
      const visitor = {
        visited: false,
        visit() {
          return new Promise<void>((resolve) => {
            setTimeout(() => {
              this.visited = true;
              resolve();
            }, 200);
          });
        },
      };

      const repo = new Repository(cloneDir, remoteUrl);
      await repo.visit(visitor);

      expect(visitor.visited).to.equal(true);
    });
  });
});
