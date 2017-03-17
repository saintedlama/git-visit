const path = require('path');
const fs = require('fs');
const rimraf = require('rimraf');
const fileUrl = require('file-url');

const expect = require('chai').expect;
const Repository = require('../');

const debug = require('debug')('git-visit');

const remoteUrl = fileUrl(path.join(__dirname, 'fixtures', 'repo'));
const cloneDir = path.join(__dirname, '..', 'test_tmp');

describe('repository', function() {
  this.timeout(10000);

  beforeEach(function(next) {
    rimraf(cloneDir, (err) => {
      if (err) { debug(err); }
      next();
    });
  });

  describe('show', function() {
    it('should show file contents of a specific revision', function(next) {

      const repo = new Repository(cloneDir, remoteUrl);
      repo.update(function(err) {
        expect(err).to.not.exist;

        repo.show('README.md', 'c43f0f08c9da96b951aabce724795a20ed8149ce', function(err, contents) {
          expect(err).to.not.exist;

          expect(contents).to.contain('Change 1');
          expect(contents).to.not.contain('Change 2');

          next();
        })
      });
    });
  });

  describe('diff', function() {
    it('should get a parsed git diff numstat', function(next) {
      const repo = new Repository(cloneDir, remoteUrl);

      repo.update(function(err) {
        expect(err).to.not.exist;

        repo.initialCommit(function(err, hash) {
          expect(err).to.not.exist;

          repo.diff(hash, 'HEAD', function(err, diffs) {
            expect(err).to.not.exist;

            expect(diffs).to.exist;
            expect(diffs[0].path).to.equal('README.md');
            expect(diffs[0].added).to.equal(7);
            expect(diffs[0].deleted).to.equal(0);

            next();
          });
        });
      });
    });
  });

  describe('update', function() {
    it('should pass clone options to git command', function(next) {
      const repo = new Repository(cloneDir, remoteUrl, { clone: { depth: 1 } });

      repo.update(function(err) {
        expect(err).to.not.exist;

        repo.log((err, log) => {
          expect(err).to.not.exist;

          expect(log.length).to.equal(1);
          next();
        });
      });
    });
  });

  describe('visit', function() {
    it('should clone the repo if the repo does not exist', function(next) {
      const visitor = {
        counter : 0,
        visit : function(repo, commit, cb) {
          this.counter ++;
          cb();
        }
      };

      const repo = new Repository(cloneDir, remoteUrl);
      repo.visit(visitor, function(err) {
        expect(err).to.not.exist;
        expect(visitor.counter).to.equal(5);

        next();
      });
    });

    it('should add first and last flags to commits', function(next) {
      const visitor = {
        commits : [],
        visit : function(repo, commit, cb) {
          this.commits.push(commit);

          cb();
        }
      };

      const repo = new Repository(cloneDir, remoteUrl);
      repo.visit(visitor, function(err) {
        expect(err).to.not.exist;
        expect(visitor.commits[0].isFirst).to.equal(true);
        expect(visitor.commits[visitor.commits.length - 1].isLast).to.equal(true);

        next();
      });
    });
  });
});
