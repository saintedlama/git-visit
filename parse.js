const S = require('string');

module.exports = function parse(commitLog) {
  // see: http://www.unicode.org/reports/tr18/#Line_Boundaries
  const commitLogLines = commitLog.split(/\r\n|[\n\v\f\r\x85\u2028\u2029]/g);

  const commits = [];
  let commit;
  while(commit = parseCommit(commitLogLines)) {
    commits.push(commit);
  }

  return commits.reverse();
};

function parseCommit(commitLogLines) {
  if (!commitLogLines || !commitLogLines.length) {
    return;
  }

  const commit = {
    hash : parseHash(commitLogLines.shift()),
    author: parseAuthor(commitLogLines.shift()),
    authorDate: parseAuthorDate(commitLogLines.shift()),
    committer : parseCommitter(commitLogLines.shift()),
    committerDate: parseCommitterDate(commitLogLines.shift())
  };

  commitLogLines.shift();

  const messageParts = [];
  let messagePart;
  while (isNotEmpty(messagePart = commitLogLines.shift())) {
    messageParts.push(S(messagePart).trimLeft().s);
  }

  commit.message = messageParts.join('\n');

  if (commitLogLines.length > 0) {
    if (isCommitStart(commitLogLines[0])) {
      commit.files = [];
      return commit;
    }
  }

  const files = [];
  let file;
  while (isNotEmpty(file = commitLogLines.shift())) {
    files.push(parseFileNameStat(file));
  }

  commit.files = files;

  return commit;
}

function isNotEmpty(line) {
  return line && line.length > 0;
}

function parseHash(hashLine) {
  return extractMatch(/^commit\s([0-9a-f]*)$/.exec(hashLine), 1);
}

function isCommitStart(hashLine) {
  return /^commit\s([0-9a-f]*)$/.test(hashLine);
}

function parseAuthor(authorLine) {
  return parseNameIdentifier(extractMatch(/^Author:\s+(.*)$/.exec(authorLine), 1));
}

function parseAuthorDate(dateLine) {
  const dateRaw = extractMatch(/^AuthorDate:\s(.*)$/.exec(dateLine), 1);

  return new Date(dateRaw);
}

function parseCommitter(committerLine) {
  return parseNameIdentifier(extractMatch(/^Commit:\s+(.*)$/.exec(committerLine), 1));
}

function parseCommitterDate(dateLine) {
  const dateRaw = extractMatch(/^CommitDate:\s(.*)$/.exec(dateLine), 1);

  return new Date(dateRaw);
}

function extractMatch(matches, index) {
  if (matches.length > index) {
    return matches[index];
  }

  return null;
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
  const fileModes = fileModeName.split(/\s+/g);

  if (!fileModes || fileModes.length < 2) {
    return {};
  }

  let mode = fileModes[0];
  let similarity;
  let path = fileModes[1];
  let fromPath;

  if (mode[0] == 'R' || mode[0] == 'C') {
    similarity = parseInt(mode.substring(1), 10);
    mode = mode[0];
    path = fileModes[2];
    fromPath = fileModes[1];
  }

  return {
    mode,
    path,
    similarity,
    fromPath
  }
}

function parseNameIdentifier(nameIdentifier) {
  const match = /^(.*)\s<(.*)>$/.exec(nameIdentifier);

  return {
    name : match[1],
    email : match[2]
  }
}
