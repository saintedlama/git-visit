import type { Commit, CommitAuthor, CommitFile } from './types.js';

export function parse(commitLog: string): Commit[] {
  const parser = new Parser(commitLog);
  const commits = parser.parse();
  return commits.reverse();
}

class Parser {
  private commitLogLines: string[];
  private line = 0;

  constructor(commitLog: string) {
    this.commitLogLines = commitLog.split(/\r\n|[\n\v\f\r]/g);
    this.line = 0;
  }

  parse(): Commit[] {
    const commits: Commit[] = [];

    if (!this.commitLogLines || !this.commitLogLines.length) {
      return commits;
    }

    while (this.line < this.commitLogLines.length - 1) {
      commits.push(this.parseCommit());
    }

    return commits;
  }

  parseCommit(): Commit {
    const commit: Commit = {
      hash: parseHash(this.popLine()),
      author: parseAuthor(this.popLine()),
      authorDate: parseAuthorDate(this.popLine()),
      committer: parseCommitter(this.popLine()),
      committerDate: parseCommitterDate(this.popLine()),
      message: '',
      files: []
    };

    this.popLine();

    commit.message = this.parseCommitMessage();
    commit.files = this.parseCommitFiles();

    return commit;
  }

  parseCommitMessage(): string {
    const messageParts: string[] = [];
    let messagePart: string | undefined;

    while (isNotEmpty(messagePart = this.popLine())) {
      messageParts.push(messagePart!.trimStart());
    }

    return messageParts.join('\n');
  }

  parseCommitFiles(): CommitFile[] {
    const files: CommitFile[] = [];
    let file: string | undefined;

    if (this.line < this.commitLogLines.length - 1 && isCommitStart(this.currentLine())) {
      return files;
    }

    while (isNotEmpty(file = this.popLine())) {
      files.push(parseFileNameStat(file!));
    }

    return files;
  }

  popLine(): string | undefined {
    return this.commitLogLines[this.line++];
  }

  currentLine(): string | undefined {
    return this.commitLogLines[this.line];
  }
}

function isNotEmpty(line: string | undefined): boolean {
  return Boolean(line && line.length > 0);
}

function parseHash(hashLine?: string): string | null {
  if (!hashLine) return null;
  return extractMatch(/^commit\s([0-9a-f]*)$/.exec(hashLine), 1);
}

function isCommitStart(hashLine?: string): boolean {
  if (!hashLine) return false;
  return /^commit\s([0-9a-f]*)$/.test(hashLine);
}

function parseAuthor(authorLine?: string): CommitAuthor | null {
  if (!authorLine) return null;
  const identifier = extractMatch(/^Author:\s+(.*)$/.exec(authorLine), 1);
  return identifier ? parseNameIdentifier(identifier) : null;
}

function parseAuthorDate(dateLine?: string): Date | null {
  if (!dateLine) return null;
  const dateRaw = extractMatch(/^AuthorDate:\s(.*)$/.exec(dateLine), 1);
  return dateRaw ? new Date(dateRaw) : null;
}

function parseCommitter(committerLine?: string): CommitAuthor | null {
  if (!committerLine) return null;
  const identifier = extractMatch(/^Commit:\s+(.*)$/.exec(committerLine), 1);
  return identifier ? parseNameIdentifier(identifier) : null;
}

function parseCommitterDate(dateLine?: string): Date | null {
  if (!dateLine) return null;
  const dateRaw = extractMatch(/^CommitDate:\s(.*)$/.exec(dateLine), 1);
  return dateRaw ? new Date(dateRaw) : null;
}

function extractMatch(matches: RegExpExecArray | null, index: number): string | null {
  if (matches && matches.length > index) {
    return matches[index];
  }

  return null;
}

function parseNameIdentifier(authorIdentifier: string): CommitAuthor {
  const match = authorIdentifier.match(/^(.*)<(.*)>/);

  if (!match) {
    return { name: authorIdentifier };
  }

  return {
    name: match[1].trim(),
    email: match[2].trim()
  };
}

function parseFileNameStat(fileModeName: string): CommitFile {
  const fileModes = fileModeName.split(/\s+/g);

  if (!fileModes || fileModes.length < 2) {
    return {};
  }

  let mode: string | undefined = fileModes[0];
  let similarity: number | undefined;
  let path: string | undefined = fileModes[1];
  let fromPath: string | undefined;

  if (mode[0] === 'R' || mode[0] === 'C') {
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

export default parse;
