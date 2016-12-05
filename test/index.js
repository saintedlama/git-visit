var path = require('path');
var fs = require('fs');
var rimraf = require('rimraf');

var expect = require('chai').expect;
var Repository = require('../');

var debug = require('debug')('git-visit');

const remoteUrl = path.join(__dirname, 'fixtures', 'repo');
const cloneDir = path.join(__dirname, '..', 'test_tmp');

describe('repository', function() {
  this.timeout(5000);

  beforeEach(function(next) {
    rimraf(cloneDir, (err) => {
      if (err) { debug(err); }
      next();
    });
  });

  describe('show', function() {
    it('should show file contents of a specific revision', function(next) {

      var repo = new Repository(cloneDir, remoteUrl);
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

  describe('visit', function() {
    it('should clone the repo if the repo does not exist', function(next) {
      var visitor = {
        counter : 0,
        visit : function(repo, commit, cb) {
          this.counter ++;
          cb();
        }
      };

      var repo = new Repository(cloneDir, remoteUrl);
      repo.visit(visitor, function(err) {
        expect(err).to.not.exist;
        expect(visitor.counter).to.equal(5);

        next();
      });
    });

    it('should get a parsed git diff numstat', function(next) {
      var repo = new Repository(cloneDir, remoteUrl);

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

    it('should add first and last flags to commits', function(next) {
      var visitor = {
        commits : [],
        visit : function(repo, commit, cb) {
          this.commits.push(commit);

          cb();
        }
      };

      var repo = new Repository(cloneDir, remoteUrl);
      repo.visit(visitor, function(err) {
        expect(err).to.not.exist;
        expect(visitor.commits[0].isFirst).to.equal(true);
        expect(visitor.commits[visitor.commits.length - 1].isLast).to.equal(true);

        next();
      });
    });
  });
});
