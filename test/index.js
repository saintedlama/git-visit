var path = require('path');
var fs = require('fs');

var expect = require('chai').expect;
var Repository = require('../');

describe('repository', function() {
  describe('show', function() {
    it('should show file contents of a specific revision [endtoendtest]', function(next) {
      this.timeout(50000);

      var expectedContents = fs.readFileSync(path.join(__dirname,'fixtures', 'README.md'), { encoding : 'utf-8' });

      var repo = new Repository('test_tmp/visit/mongoose-version-show', 'https://github.com/saintedlama/mongoose-version.git');
      repo.update(function(err) {
        expect(err).to.not.exist;

        repo.show('README.md', 'cd7833b1cefdec4c12fe648cb6ccbc7508fbf222', function(err, contents) {
          expect(err).to.not.exist;

          expect(contents).to.equal(expectedContents);

          next();
        })
      });
    });
  });

  describe('visit', function() {
    it('should clone the repo if the repo does not exist [endtoendtest]', function(next) {
      this.timeout(50000);

      var visitor = {
        counter : 0,
        visit : function(repo, commit, cb) {
          this.counter ++;
          cb();
        }
      };

      // TODO: rimraf before executing this test!
      var repo = new Repository('test_tmp/visit/mongoose-version', 'https://github.com/saintedlama/mongoose-version.git');
      repo.visit(visitor, function(err) {
        expect(err).to.not.exist;
        expect(visitor.counter).to.equal(57);

        next();
      });
    });

    it('should pass results of visitor.visit to callback [endtoendtest]', function(next) {
      this.timeout(50000);

      var visitor = {
        visit : function(repo, commit, cb) {
          cb(null, 1);
        }
      };

      var repo = new Repository('test_tmp/visit/mongoose-version', 'https://github.com/saintedlama/mongoose-version.git');
      repo.visit(visitor, function(err, results) {
        expect(err).to.not.exist;

        expect(results).to.exist;
        expect(results.length).to.equal(57);

        results.forEach(function(result) {
          expect(result).to.equal(1);
        });

        next();
      });
    });
  });
});
