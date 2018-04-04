# git-visit
[![Build Status](https://travis-ci.org/saintedlama/git-visit.svg?branch=master)](https://travis-ci.org/saintedlama/git-visit)
[![Coverage Status](https://coveralls.io/repos/github/saintedlama/git-visit/badge.svg?branch=master)](https://coveralls.io/github/saintedlama/git-visit?branch=master)

Git command line wrapping library including SSH key handling, log and diff parsing

## Usage

```bash
> npm i git-visit
```

```javascript
const Repository = require('git-visit');

async function getLog() {
  const repo = new Repository('/path/to/git/repository');

  const log = await repo.log();
}

getLog().then(() => console.log('got a parsed git log'));
```

## API
