import childProcess, { ExecFileOptions, ExecFileException } from 'node:child_process';
import nodePath from 'node:path';
import fs from 'node:fs';
import createDebug from 'debug';
import parseDiff from 'parse-diff';
import parse from './parse.js';
import ssh from './ssh.js';
import type {
  RepositoryOptions,
  Commit,
  GitDiffFile,
  DiffOptions,
  DiffStatItem,
  Visitor
} from './types.js';

const debug = createDebug('git-visit');

export class Repository {
  options: RepositoryOptions & {
    executable: string;
    maxBufferForLog: number;
    maxBufferForShow: number;
    defaultBranch: string;
    clone: Record<string, unknown>;
    pull: Record<string, unknown>;
    disableSymlinks: boolean;
  };
  path: string;
  url: string;

  constructor(path: string, url: string, options?: RepositoryOptions) {
    if (!path || typeof path !== 'string') {
      throw new Error('Path must be a non-empty string');
    }
    if (!url || typeof url !== 'string') {
      throw new Error('URL must be a non-empty string');
    }

    const opts = options || {};
    this.options = {
      ...opts,
      executable: opts.executable || 'git',
      maxBufferForLog: opts.maxBufferForLog || 40 * 1024 * 1024,
      maxBufferForShow: opts.maxBufferForShow || 10 * 1024 * 1024,
      defaultBranch: opts.defaultBranch || 'master',
      clone: opts.clone || {},
      pull: opts.pull || {},
      disableSymlinks: opts.disableSymlinks !== false
    };

    if (!this.options.defaultBranch || typeof this.options.defaultBranch !== 'string' || this.options.defaultBranch.startsWith('-')) {
      throw new Error(`Invalid default branch: ${this.options.defaultBranch}`);
    }

    this.path = nodePath.resolve(path);
    this.url = url;
  }

  async update(): Promise<void> {
    const exists = fs.existsSync(this.path);

    if (exists) {
      debug('Destination path %s exists. Pulling...', this.path);
      await this.pull();
    } else {
      debug('Destination path %s does not exist. Cloning...', this.path);
      await this.clone();
    }
  }

  _withSymlinkConfig(args: string[]): string[] {
    if (this.options.disableSymlinks) {
      return ['-c', 'core.symlinks=false', ...args];
    }
    return args;
  }

  async clone(): Promise<void> {
    const additionalOptions = optionsToArgs(this.options.clone);
    const symlinkArgs = this.options.disableSymlinks ? ['-c', 'core.symlinks=false'] : [];
    const args = ['clone', ...symlinkArgs, ...additionalOptions, '--', this.url, this.path];

    await this._gitCommand(args, {});
  }

  async pull(): Promise<void> {
    const additionalOptions = optionsToArgs(this.options.pull);

    // Assure to be on a branch to avoid detached working copies
    await this.checkout(this.options.defaultBranch);

    const args = this._withSymlinkConfig(['pull', ...additionalOptions]);

    await this._gitCommand(args, { cwd: this.path });
  }

  async _gitCommand(
    gitArgsOrCommand: string[] | string,
    options: ExecFileOptions = {}
  ): Promise<{ stdout: string | Buffer; stderr: string | Buffer }> {
    let args: string[];
    if (Array.isArray(gitArgsOrCommand)) {
      args = gitArgsOrCommand;
    } else {
      args = gitArgsOrCommand.split(' ').filter(Boolean);
      if (args.length > 0 && (args[0] === this.options.executable || args[0] === 'git')) {
        args.shift();
      }
    }

    if (this.options.privateKey) {
      debug('Private key provided. Using SSH command to execute git command with args %o', args);

      return await ssh(this.options.privateKey, async (script) => {
        const opts: ExecFileOptions = { ...options };
        opts.env = { ...(opts.env || process.env), GIT_SSH: script };

        return await execFileAsync(this.options.executable, args, opts);
      });
    }

    return await execFileAsync(this.options.executable, args, options);
  }

  async log(dir?: string): Promise<Commit[]> {
    const args = ['--no-pager', 'log', '--name-status', '--no-merges', '--pretty=fuller'];
    if (dir) {
      if (typeof dir !== 'string' || nodePath.isAbsolute(dir) || nodePath.normalize(dir).startsWith('..')) {
        throw new Error(`Invalid directory path: ${dir}`);
      }
      args.push('--', dir);
    }

    const { stdout } = await execFileAsync(
      this.options.executable,
      args,
      {
        cwd: this.path,
        maxBuffer: this.options.maxBufferForLog
      }
    );

    return parse(stdout.toString('utf-8'));
  }

  async checkout(ref: string): Promise<void> {
    if (!ref || typeof ref !== 'string' || ref.startsWith('-')) {
      throw new Error(`Invalid git ref: ${ref}`);
    }

    const args = this._withSymlinkConfig(['checkout', '-qf', '--end-of-options', ref]);

    await execFileAsync(
      this.options.executable,
      args,
      { cwd: this.path }
    );
  }

  async unmodify(): Promise<void> {
    const args = this._withSymlinkConfig(['checkout', '-qf', '--', '.']);

    await execFileAsync(
      this.options.executable,
      args,
      { cwd: this.path }
    );
  }

  async initialCommit(): Promise<string> {
    const { stdout } = await execFileAsync(
      this.options.executable,
      ['rev-list', '--max-parents=0', 'HEAD'],
      { cwd: this.path }
    );

    const output = stdout.toString('utf-8');
    const match = output.match(/[0-9a-f]*/);

    if (!match || !match.length || !match[0]) {
      throw new Error('Could not get initial commit from rev-list');
    }

    return match[0];
  }

  async diff(leftRev: string, rightRev: string, options?: DiffOptions & { output: 'raw' }): Promise<string>;
  async diff(leftRev: string, rightRev: string, options?: DiffOptions & { output?: 'json' }): Promise<GitDiffFile[]>;
  async diff(leftRev: string, rightRev: string, options?: DiffOptions): Promise<GitDiffFile[] | string>;
  async diff(leftRev: string, rightRev: string, options?: DiffOptions): Promise<GitDiffFile[] | string> {
    const opts = options || {};
    const output = opts.output || 'json';

    if (!leftRev || typeof leftRev !== 'string' || leftRev.startsWith('-')) {
      throw new Error(`Invalid left revision: ${leftRev}`);
    }
    if (!rightRev || typeof rightRev !== 'string' || rightRev.startsWith('-')) {
      throw new Error(`Invalid right revision: ${rightRev}`);
    }

    const { stdout } = await execFileAsync(
      this.options.executable,
      ['--no-pager', 'diff', '--end-of-options', leftRev, rightRev],
      { cwd: this.path }
    );

    const out = stdout.toString('utf-8');

    switch (output) {
      case 'raw':
        return out;
      default: {
        const files = parseDiff(out) as GitDiffFile[];
        for (const file of files) {
          file.addedLines = file.additions;
          file.deletedLines = file.deletions;
        }
        return files;
      }
    }
  }

  async diffStat(leftRev: string, rightRev: string): Promise<DiffStatItem[]> {
    if (!leftRev || typeof leftRev !== 'string' || leftRev.startsWith('-')) {
      throw new Error(`Invalid left revision: ${leftRev}`);
    }
    if (!rightRev || typeof rightRev !== 'string' || rightRev.startsWith('-')) {
      throw new Error(`Invalid right revision: ${rightRev}`);
    }

    const { stdout } = await execFileAsync(
      this.options.executable,
      ['--no-pager', 'diff', '--numstat', '--end-of-options', leftRev, rightRev],
      { cwd: this.path }
    );

    const out = stdout.toString('utf-8');
    const lines = out.split(/\r\n|[\n\v\f\r\x85\u2028\u2029]/g);

    const result: DiffStatItem[] = [];
    for (const line of lines) {
      const match = line.match(/(\d+)\s+(\d+)\s+(.+)/i);
      if (!match) continue;

      result.push({
        added: parseInt(match[1], 10),
        deleted: parseInt(match[2], 10),
        path: match[3]
      });
    }

    return result;
  }

  async show(file: string, rev: string): Promise<string> {
    if (!rev || typeof rev !== 'string' || rev.startsWith('-')) {
      throw new Error(`Invalid revision: ${rev}`);
    }
    if (!file || typeof file !== 'string' || nodePath.isAbsolute(file) || nodePath.normalize(file).startsWith('..')) {
      throw new Error(`Invalid file path: ${file}`);
    }

    const { stdout } = await execFileAsync(
      this.options.executable,
      ['--no-pager', 'show', '--end-of-options', `${rev}:${file}`],
      {
        cwd: this.path,
        maxBuffer: this.options.maxBufferForShow
      }
    );

    return stdout.toString('utf-8');
  }

  async visit<T = unknown>(visitor: Visitor<T, Repository>): Promise<T[]> {
    const vis = visitor || {};
    const test = vis.test || (() => true);
    const visitFn = vis.visit || (() => undefined as unknown as T);
    const init = vis.init || (() => {});

    try {
      await this.update();
    } catch (e) {
      debug('Could not update repository due to error %s', e);
      throw e;
    }

    let commits: Commit[];

    try {
      commits = await this.log();
    } catch (e) {
      debug('Could not get a log for repository due to error %s', e);
      throw e;
    }

    const commitsToVisit = commits.filter(commit => test.call(vis, commit));

    init.call(vis, this, commitsToVisit);

    if (commitsToVisit.length > 0) {
      commitsToVisit[0].isFirst = true;
      commitsToVisit[commits.length - 1].isLast = true;
    }

    const results: T[] = [];

    try {
      for (const commit of commitsToVisit) {
        await this.unmodify();
        await this.checkout(commit.hash!);
        const result = await visitFn.call(vis, this, commit);
        results.push(result);
      }
    } catch (e) {
      await this._cleanupCheckout();
      throw e;
    }

    return results;
  }

  async _cleanupCheckout(): Promise<void> {
    await this.checkout(this.options.defaultBranch);
  }
}

function execFileAsync(
  file: string,
  args: string[],
  options: ExecFileOptions = {}
): Promise<{ stdout: string | Buffer; stderr: string | Buffer }> {
  debug('Executing %s with args %o', file, args);

  return new Promise((resolve, reject) => {
    childProcess.execFile(file, args, options, wrapExecError((err, result) => {
      if (err) {
        return reject(err);
      }

      resolve(result);
    }));
  });
}

function wrapExecError(cb: (err: (ExecFileException & { stdout?: string | Buffer; stderr?: string | Buffer }) | null, result: { stdout: string | Buffer; stderr: string | Buffer }) => void) {
  return function(err: ExecFileException | null, stdout: string | Buffer, stderr: string | Buffer) {
    if (err) {
      const errorWithStreams = err as ExecFileException & { stdout?: string | Buffer; stderr?: string | Buffer };
      errorWithStreams.stdout = stdout ? stdout.toString() : '';
      errorWithStreams.stderr = stderr ? stderr.toString() : '';
    }

    cb(err as (ExecFileException & { stdout?: string | Buffer; stderr?: string | Buffer }) | null, { stdout, stderr });
  };
}

function optionsToArgs(options?: Record<string, unknown>): string[] {
  if (!options) return [];

  const args: string[] = [];

  for (const [key, val] of Object.entries(options)) {
    if (val === undefined || val === null) continue;

    if (!/^[a-zA-Z0-9_-]+$/.test(key)) {
      throw new Error(`Invalid option key: ${key}`);
    }

    const flagName = key.length === 1 ? `-${key}` : `--${key.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`)}`;

    if (typeof val === 'boolean') {
      if (val) {
        args.push(flagName);
      } else {
        args.push(key.length === 1 ? `-${key}` : `--no-${key.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`)}`);
      }
    } else if (Array.isArray(val)) {
      for (const v of val) {
        args.push(flagName, String(v));
      }
    } else {
      args.push(flagName, String(val));
    }
  }

  return args;
}

export default Repository;
export * from './types.js';
export { parse, ssh };
