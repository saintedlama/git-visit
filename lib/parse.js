const trimLeft = require('trim-left');

module.exports = function parse(commitLog) {
  const parser = new Parser(commitLog);

  const commits = parser.parse();

  return commits.reverse();
};

class Parser {
  constructor(commitLog) {
    this.commitLogLines = commitLog.split(/\r\n|[\n\v\f\r]/g);
    this.line = 0;
  }

  parse() {
    const commits = [];

    if (!this.commitLogLines || !this.commitLogLines.length) {
      return commits;
    }

    while (this.line < this.commitLogLines.length - 1) {
      commits.push(this.parseCommit());
    }

    return commits;
  }

  parseCommit() {
    const commit = {
      hash : parseHash(this.popLine()),
      author: parseAuthor(this.popLine()),
      authorDate: parseAuthorDate(this.popLine()),
      committer : parseCommitter(this.popLine()),
      committerDate: parseCommitterDate(this.popLine())
    };

    this.popLine();

    commit.message = this.parseCommitMessage();
    commit.files = this.parseCommitFiles();

    return commit;
  }

  parseCommitMessage() {
    const messageParts = [];
    let messagePart;

    while (isNotEmpty(messagePart = this.popLine())) {
      messageParts.push(trimLeft(messagePart));
    }

    return messageParts.join('\n');
  }

  parseCommitFiles() {
    const files = [];
    let file;

    if (this.line < this.commitLogLines.length - 1  && isCommitStart(this.currentLine())) {
      return files;
    }

    while (isNotEmpty(file = this.popLine())) {
      files.push(parseFileNameStat(file));
    }

    return files;
  }

  popLine() {
    return this.commitLogLines[this.line++];
  }

  currentLine() {
    return this.commitLogLines[this.line];
  }
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
  };
}

function parseNameIdentifier(nameIdentifier) {
  const match = /^(.*)\s<(.*)>$/.exec(nameIdentifier);

  return {
    name : match[1],
    email : match[2]
  };
}
