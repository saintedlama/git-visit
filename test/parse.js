var fs = require('fs');
var expect = require('chai').expect;

var parse = require('../parse');

var path = require('path');

var logInput = fs.readFileSync(path.join(__dirname, 'fixtures/gitlog.txt'), 'utf-8');
var logInputWithoutFiles = fs.readFileSync(path.join(__dirname, 'fixtures/gitlogwithoutfiles.txt'), 'utf-8');

describe('parse', function() {
  it('should parse correct commit entries count', function() {
    var entries = parse(logInput);

    expect(entries.length).to.equal(55);
  });

  it('should parse information from commit entry', function() {
    var entries = parse(logInput);

    var entry = entries[entries.length - 1];

    expect(entry.author.name).to.equal('saintelama');
    expect(entry.author.email).to.equal('christoph.walcher@gmail.com');

    expect(entry.committer.name).to.equal('saintelama');
    expect(entry.committer.email).to.equal('christoph.walcher@gmail.com');

    expect(entry.hash).to.equal('a968331c378a91e322321fc5ffd38a9d32e9c8cc');
  });

  it('should parse file information from commit entry', function() {
    var entries = parse(logInput);

    var entry = entries[entries.length - 1];

    expect(entry.files.length).to.equal(1);
    expect(entry.files[0].mode).to.equal('M');
    expect(entry.files[0].path).to.equal('README.md');
  });

  it('should parse message from commit entry', function() {
    var entries = parse(logInput);

    var entry = entries[entries.length - 1];

    expect(entry.message).to.equal('Add coveralls badge');
  });

  it('should parse multiple files from commit entry', function() {
    var entries = parse(logInput);

    var entry = entries[entries.length - 3];

    expect(entry.hash).to.equal('f809dbe33b983848a2c1f0a1c29a56396ae75f3b');

    expect(entry.files[0].mode).to.equal('A');
    expect(entry.files[0].path).to.equal('lib/set-schema-options.js');

    expect(entry.files[1].mode).to.equal('M');
    expect(entry.files[1].path).to.equal('lib/strategies/array.js');

    expect(entry.files[2].mode).to.equal('M');
    expect(entry.files[2].path).to.equal('lib/strategies/collection.js');

    expect(entry.files[3].mode).to.equal('A');
    expect(entry.files[3].path).to.equal('test/set-schema-options.js');
  });

  it('should parse commit logs without changed files', function() {
    var entries = parse(logInputWithoutFiles);

    expect(entries.length).to.equal(2);

    expect(entries[0].hash).to.equal('77f109eeef1aa6e4389b006aa52528be1d34baa4');
    expect(entries[1].hash).to.equal('f3d451a1f76e1cd95cf5284785de42034e8bc729');
  });
});