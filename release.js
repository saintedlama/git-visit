const shell = require('shelljs');

/* eslint-disable no-console */
if (exec('git status --porcelain').stdout != '') {
  console.error('Git working directory not clean.');
  process.exit(2);
}

const versionIncrement = process.argv[process.argv.length -1];

if (versionIncrement != 'major' && versionIncrement != 'minor' && versionIncrement != 'patch') {
  console.error('Usage: node release.js major|minor|patch');
  process.exit(1);
}

console.log('Everything looks fine. Starting release process...');

exec('npm version ' + versionIncrement);
console.log(`done npm version ${versionIncrement}`);

exec('npm test');
console.log('done npm test');

exec('git push');
console.log('done git push');

exec('git push --tags');
console.log('done git push --tags');

exec('npm publish');
console.log('Package releases successfully');

function exec(cmd) {
  const ret = shell.exec(cmd, { silent : true });

  if (ret.code != 0) {
    console.error(ret.output);
    process.exit(1);
  }

  return ret;
}
