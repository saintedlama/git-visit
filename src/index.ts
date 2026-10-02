import childProcess, { ExecOptions, ExecException } from 'node:child_process';
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
  };
  path: string;
  url: string;

  constructor(path: string, url: string, options?: RepositoryOptions) {
    const opts = options || {};
    this.options = {
      ...opts,
      executable: opts.executable || 'git',
      maxBufferForLog: opts.maxBufferForLog || 40 * 1024 * 1024,
      maxBufferForShow: opts.maxBufferForShow || 10 * 1024 * 1024,
      defaultBranch: opts.defaultBranch || 'master',
      clone: opts.clone || {},
      pull: opts.pull || {}
    };

    this.path = path;
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

  async clone(): Promise<void> {
    const additionalOptions = stringifyOptions(this.options.clone);
    const cmd = [this.options.executable, 'clone', additionalOptions, this.url, this.path]
      .filter(Boolean)
      .join(' ');

    await this._gitCommand(cmd, {});
  }

  async pull(): Promise<void> {
    // Assure to be on a branch to avoid detached working copies
    await this.checkout(this.options.defaultBranch);

    const additionalOptions = stringifyOptions(this.options.pull);
    const cmd = [this.options.executable, 'pull', additionalOptions]
      .filter(Boolean)
      .join(' ');

    await this._gitCommand(cmd, { cwd: this.path });
  }

  async _gitCommand(gitCommand: string, options: ExecOptions): Promise<{ stdout: string | Buffer; stderr: string | Buffer }> {
    if (this.options.privateKey) {
      debug('Private key provided. Using SSH command to execute git command %s', gitCommand);

      return await ssh(this.options.privateKey, async (script) => {
        const opts = { ...options };
        opts.env = opts.env || {};
        opts.env.GIT_SSH = script;

        return await exec(gitCommand, opts);
      });
    }

    return await exec(gitCommand, options);
  }

  async log(dir?: string): Promise<Commit[]> {
    const { stdout } = await exec(
      `${this.options.executable} --no-pager log --name-status --no-merges --pretty=fuller ${toCLIArgument(dir)}`,
      {
        cwd: this.path,
        maxBuffer: this.options.maxBufferForLog
      }
    );

    return parse(stdout.toString('utf-8'));
  }

  async checkout(ref: string): Promise<void> {
    await exec(`${this.options.executable} checkout -qf ${ref}`, { cwd: this.path });
  }

  async unmodify(): Promise<void> {
    await exec(`${this.options.executable} checkout -qf -- .`, { cwd: this.path });
  }

  async initialCommit(): Promise<string> {
    const { stdout } = await exec(`${this.options.executable} rev-list --max-parents=0 HEAD`, { cwd: this.path });

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

    const { stdout } = await exec(
      `${this.options.executable} --no-pager diff ${toCLIArgument(leftRev)} ${toCLIArgument(rightRev)}`,
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
    const { stdout } = await exec(
      `${this.options.executable} --no-pager diff --numstat ${leftRev} ${rightRev}`,
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
    const { stdout } = await exec(`${this.options.executable} --no-pager show ${rev}:${file}`, {
      cwd: this.path,
      maxBuffer: this.options.maxBufferForShow
    });

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

function exec(cmd: string, options: ExecOptions): Promise<{ stdout: string | Buffer; stderr: string | Buffer }> {
  debug('Executing command %s', cmd);

  return new Promise((resolve, reject) => {
    childProcess.exec(cmd, options, wrapExecError((err, result) => {
      if (err) {
        return reject(err);
      }

      resolve(result);
    }));
  });
}

function wrapExecError(cb: (err: (ExecException & { stdout?: string | Buffer; stderr?: string | Buffer }) | null, result: { stdout: string | Buffer; stderr: string | Buffer }) => void) {
  return function(err: ExecException | null, stdout: string | Buffer, stderr: string | Buffer) {
    if (err) {
      const errorWithStreams = err as ExecException & { stdout?: string | Buffer; stderr?: string | Buffer };
      errorWithStreams.stdout = stdout.toString();
      errorWithStreams.stderr = stderr.toString();
    }

    cb(err as (ExecException & { stdout?: string | Buffer; stderr?: string | Buffer }) | null, { stdout, stderr });
  };
}

function toCLIArgument(arg?: string | null): string {
  if (arg === undefined || arg === null) {
    return '';
  }

  if (process.platform === 'win32') {
    return `"${arg}"`;
  }

  return arg;
}

function stringifyOptions(options?: Record<string, unknown>): string {
  if (!options) return '';

  const flags: string[] = [];

  for (const [key, val] of Object.entries(options)) {
    if (val === undefined || val === null) continue;

    const flagName = key.length === 1 ? `-${key}` : `--${key.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`)}`;

    if (typeof val === 'boolean') {
      if (val) {
        flags.push(flagName);
      } else {
        flags.push(key.length === 1 ? `-${key}` : `--no-${key.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`)}`);
      }
    } else if (Array.isArray(val)) {
      for (const v of val) {
        flags.push(flagName, String(v));
      }
    } else {
      flags.push(flagName, String(val));
    }
  }

  return flags.join(' ');
}

export default Repository;
export * from './types.js';
export { parse, ssh };
