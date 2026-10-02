import type { File as DiffFile } from 'parse-diff';
import type { Repository } from './index.js';

export interface RepositoryOptions {
  executable?: string;
  maxBufferForLog?: number;
  maxBufferForShow?: number;
  defaultBranch?: string;
  clone?: Record<string, unknown>;
  pull?: Record<string, unknown>;
  privateKey?: string | null;
}

export interface CommitAuthor {
  name: string;
  email?: string;
}

export interface CommitFile {
  mode?: string;
  path?: string;
  similarity?: number;
  fromPath?: string;
}

export interface Commit {
  hash: string | null;
  author: CommitAuthor | null;
  authorDate: Date | null;
  committer: CommitAuthor | null;
  committerDate: Date | null;
  message: string;
  files: CommitFile[];
  isFirst?: boolean;
  isLast?: boolean;
}

export interface GitDiffFile extends DiffFile {
  addedLines: number;
  deletedLines: number;
}

export interface DiffOptions {
  output?: 'json' | 'raw';
  [key: string]: unknown;
}

export interface DiffStatItem {
  added: number;
  deleted: number;
  path: string;
}

export interface Visitor<T = unknown, R = Repository> {
  test?: (commit: Commit) => boolean;
  init?: (repo: R, commits: Commit[]) => void;
  visit?: (repo: R, commit: Commit) => Promise<T> | T;
}
