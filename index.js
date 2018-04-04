const childProcess = require('child_process');
const opted = require('opted');
const fs = require('fs-extra');

const parse = require('./lib/parse');
const ssh = require('./lib/ssh');
const { Diff2Html } = require('diff2html');

const debug = require('debug')('git-visit');

class Repository {
  constructor(path, url, options) {
    options = options || {};
    options.executable = options.executable || 'git';
    options.maxBufferForLog = options.maxBufferForLog || 40 * 1024 * 1024; // 40 MB;
    options.maxBufferForShow = options.maxBufferForShow || 10 * 1024 * 1024; // 10MB;

    options.defaultBranch = options.defaultBranch || 'master';

    options.clone = options.clone || {};
    options.pull = options.pull || {};

    this.options = options;

    this.path = path;
    this.url = url;
  }

  async update() {
    const exists = await fs.exists(this.path);

    if (exists) {
      debug('Destination path %s exists. Pulling...', this.path);
      await this.pull();
    } else {
      debug('Destination path %s does not exist. Cloning...', this.path);
      await this.clone();
    }
  }

  async clone() {
    const additionalOptions = opted(this.options.clone).join(' ');

    await this._gitCommand(`${this.options.executable} clone ${additionalOptions} ${this.url} ${this.path}`, {});
  }

  async pull() {
    // Assure to be on a branch to avoid detached working copies
    await this.checkout(this.options.defaultBranch);

    const additionalOptions = opted(this.options.pull).join(' ');

    await this._gitCommand(`${this.options.executable} pull ${additionalOptions} `, { cwd: this.path });
  }

  async _gitCommand(gitCommand, options) {
    if (this.options.privateKey) {
      debug('Private key provided. Using SSH command to execute git command %s', gitCommand);

      return await ssh(this.options.privateKey, async (script) => {
        options = options || {};
        options.env = options.env || {};
        options.env.GIT_SSH = script;

        return await exec(gitCommand, options);
      });
    }

    return await exec(gitCommand, options);
  }

  async log() {
    const { stdout } = await exec(`${this.options.executable} --no-pager log --name-status --no-merges --pretty=fuller`,
      {
        cwd: this.path,
        maxBuffer: this.options.maxBufferForLog
      });

    return parse(stdout.toString('utf-8'));
  }

  async checkout(ref) {
    await exec(`${this.options.executable} checkout -qf ${ref}`, { cwd: this.path });
  }

  async unmodify() {
    await exec(`${this.options.executable} checkout -qf -- .`, { cwd: this.path });
  }

  async initialCommit() {
    const { stdout } = await exec(`${this.options.executable} rev-list --max-parents=0 HEAD`, { cwd: this.path });


    const output = stdout.toString('utf-8');
    const match = output.match(/[0-9a-f]*/);

    if (!match.length > 0) {
      throw new Error('Could not get initial commit from rev-list');
    }

    return match[0];
  }

  async diff(leftRev, rightRev, options) {
    options = options || {};
    options.output = options.output || 'json';

    const { stdout } = await exec(`${this.options.executable} --no-pager diff ${toCLIArgument(leftRev)} ${toCLIArgument(rightRev)}`, { cwd: this.path });

    const out = stdout.toString('utf-8');

    switch (options.output) {
      case 'html': return Diff2Html.getPrettyHtml(out, options);
      case 'raw': return out;
      default:
        return Diff2Html.getJsonFromDiff(out, options);
    }
  }

  async diffStat(leftRev, rightRev) {
    const { stdout } = await exec(`${this.options.executable} --no-pager diff --numstat ${leftRev} ${rightRev}`, { cwd: this.path });

    const out = stdout.toString('utf-8');
    // see: http://www.unicode.org/reports/tr18/#Line_Boundaries
    const lines = out.split(/\r\n|[\n\v\f\r\x85\u2028\u2029]/g);

    return lines.map(function(line) {
      const match = line.match(/(\d+)\s+(\d+)\s+(.+)/i);

      if (!match) {
        return;
      }

      return { added: parseInt(match[1], 10), deleted: parseInt(match[2], 10), path: match[3] };
    }).filter(diff => diff);
  }

  async show(file, rev) {
    const { stdout } = await exec(`${this.options.executable} --no-pager show ${rev}:${file}`, {
      cwd: this.path,
      maxBuffer: this.options.maxBufferForShow
    });

    return stdout.toString('utf-8');
  }

  async visit(visitor) {
    visitor = visitor || {};
    visitor.test = visitor.test || function() { return true; };
    visitor.visit = visitor.visit || function() { };
    visitor.init = visitor.init || function() { };

    try {
      await this.update();
    } catch (e) {
      debug('Could not update repository due to error %s', e);
      throw e;
    }

    let commits = null;

    try {
      commits = await this.log();
    } catch (e) {
      debug('Could not get a log for repository due to error %s', e);
      throw e;
    }

    const commitsToVisit = commits.filter(visitor.test);

    visitor.init(this, commitsToVisit);

    if (commitsToVisit.length > 0) {
      commitsToVisit[0].isFirst = true;
      commitsToVisit[commits.length - 1].isLast = true;
    }

    const results = [];

    try {
      for (const commit of commitsToVisit) {

        await this.unmodify();


        await this.checkout(commit.hash);
        const result = await visitor.visit(this, commit);

        results.push(result);
      }
    } catch (e) {
      await this._cleanupCheckout();

      throw e;
    }

    return results;
  }

  async _cleanupCheckout() {
    await this.checkout(this.options.defaultBranch);
  }
}

function exec(cmd, options) {
  debug('Executing command %s', cmd);

  return new Promise((resolve, reject) => {
    childProcess.exec(cmd, options, wrapExecError((err, result) => {
      if (err) { return reject(err); }

      resolve(result);
    }));
  });
}

function wrapExecError(cb) {
  return function(err, stdout, stderr) {
    if (err) {
      err.stdout = stdout.toString();
      err.stderr = stderr.toString();
    }

    cb(err, { stdout, stderr });
  };
}

function toCLIArgument(arg) {
  if (arg === undefined || arg === null) {
    return '';
  }

  if (process.platform == 'win32') {
    return `"${arg}"`;
  }

  return arg;
}

module.exports = Repository;
