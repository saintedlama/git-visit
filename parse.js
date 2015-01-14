var S = require('string');

module.exports = function parse(commitLog) {
  var commitLogLines = commitLog.split('\n');

  var commits = [];
  var commit;
  while(commit = parseCommit(commitLogLines)) {
    commits.push(commit);
  }

  return commits.reverse();
};

function parseCommit(commitLogLines) {
  if (!commitLogLines || !commitLogLines.length) {
    return;
  }

  var commit = {
    hash : parseHash(commitLogLines.shift()),
    author: parseAuthor(commitLogLines.shift()),
    authorDate: parseAuthorDate(commitLogLines.shift()),
    committer : parseCommitter(commitLogLines.shift()),
    committerDate: parseCommitterDate(commitLogLines.shift())
  };

  commitLogLines.shift();

  var messageParts = [];
  var messagePart;
  while ((messagePart = commitLogLines.shift()).length > 1) {
    messageParts.push(S(messagePart).trimLeft().s);
  }

  commit.message = messageParts.join('\n');

  if (commitLogLines.length > 0) {
    if (isCommitStart(commitLogLines[0])) {
      commit.files = [];
      return commit;
    }
  }

  var files = [];
  var file;
  while ((file = commitLogLines.shift()).length > 1) {
    files.push(parseFileNameStat(file));
  }

  commit.files = files;

  return commit;
}

// TODO: Make regex match code save!
function parseHash(hashLine) {
  return /^commit\s([0-9a-f]*)$/.exec(hashLine)[1];
}

function isCommitStart(hashLine) {
  return /^commit\s([0-9a-f]*)$/.test(hashLine);
}

function parseAuthor(authorLine) {
  return parseNameIdentifier(/^Author:\s+(.*)$/.exec(authorLine)[1]);
}

function parseAuthorDate(dateLine) {
  var dateRaw = /^AuthorDate:\s(.*)$/.exec(dateLine)[1];

  return new Date(dateRaw);
}

function parseCommitter(committerLine) {
  return parseNameIdentifier(/^Commit:\s+(.*)$/.exec(committerLine)[1]);
}

function parseCommitterDate(dateLine) {
  var dateRaw = /^CommitDate:\s(.*)$/.exec(dateLine)[1];

  return new Date(dateRaw);
}

// --diff-filter=[(A|C|D|M|R|T|U|X|B)...[*]]::
// Select only files that are Added (`A`), Copied (`C`),
// Deleted (`D`), Modified (`M`), Renamed (`R`), have their
// type (i.e. regular file, symlink, submodule, ...) changed (`T`),
// are Unmerged (`U`), are
// Unknown (`X`), or have had their pairing Broken (`B`).
// Any combination of the filter characters (including none) can be used.
// When `*` (All-or-none) is added to the combination, all
// paths are selected if there is any file that matches
// other criteria in the comparison; if there is no file
// that matches other criteria, nothing is selected.
function parseFileNameStat(fileModeName) {
  var match = /^([ACDMRTUXB*])\s(.*)$/.exec(fileModeName);

  return {
    mode : match[1],
    path : match[2]
  }
}

function parseNameIdentifier(nameIdentifier) {
  var match = /^(.*)\s<(.*)>$/.exec(nameIdentifier);

  return {
    name : match[1],
    email : match[2]
  }
}
