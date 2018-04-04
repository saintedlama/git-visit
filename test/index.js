const path = require('path');
const fs = require('fs-extra');
const fileUrl = require('file-url');

const expect = require('chai').expect;
const Repository = require('../');

const remoteUrl = fileUrl(path.join(__dirname, 'fixtures', 'repo'));
const cloneDir = path.join(__dirname, '..', 'test_tmp');

describe('repository', function() {
  this.timeout(10000);

  beforeEach(() => fs.remove(cloneDir));

  describe('show', function() {
    it('should show file contents of a specific revision', async () => {

      const repo = new Repository(cloneDir, remoteUrl);
      await repo.update();
      const contents = await repo.show('README.md', 'c43f0f08c9da96b951aabce724795a20ed8149ce');

      expect(contents).to.contain('Change 1');
      expect(contents).to.not.contain('Change 2');
    });
  });

  describe('diffStat', function() {
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

  describe('diff', function() {
    async function arrange() {
      const repo = new Repository(cloneDir, remoteUrl);

      await repo.update();
      const hash = await repo.initialCommit();

      return { repo, hash };
    }

    it('should get a parsed git source diff', async () => {
      const {repo, hash} = await arrange();
      const diffs = await repo.diff(hash, 'HEAD');

      expect(diffs).to.have.length(1);
      expect(diffs[0].addedLines).to.equal(7);
      expect(diffs[0].deletedLines).to.equal(0);
    });

    it('should get a raw string git source diff', async () => {
      const {repo, hash} = await arrange();
      const diffs = await repo.diff(hash, 'HEAD', { output: 'raw' });

      expect(diffs).to.be.a('string');
      expect(diffs).to.not.contain('<div class="d2h-wrapper">');
    });

    it('should get a html string git source diff', async () => {
      const {repo, hash} = await arrange();
      const diffs = await repo.diff(hash, 'HEAD', { output: 'html' });

      expect(diffs).to.be.a('string');
      expect(diffs).to.contain('<div class="d2h-wrapper">');
    });    
  });

  describe('update', function() {
    it('should pass clone options to git command', async () => {
      const repo = new Repository(cloneDir, remoteUrl, { clone: { depth: 1 } });

      await repo.update();
      const log = await repo.log();

      expect(log.length).to.equal(1);
    });
  });

  describe('visit', function() {
    it('should clone the repo if the repo does not exist', async () => {
      const visitor = {
        counter: 0,
        visit() {
          this.counter++;
        }
      };

      const repo = new Repository(cloneDir, remoteUrl);
      await repo.visit(visitor);

      expect(visitor.counter).to.equal(5);
    });

    it('should add first and last flags to commits', async () => {
      const visitor = {
        commits: [],
        visit(repo, commit) {
          this.commits.push(commit);
        }
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
          return new Promise((resolve) => {
            setTimeout(() => {
              this.visited = true;
              resolve();
            }, 200);
          });
        }
      };

      const repo = new Repository(cloneDir, remoteUrl);
      await repo.visit(visitor);

      expect(visitor.visited).to.equal(true);
    });
  });
})
;
