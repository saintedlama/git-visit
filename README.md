# git-visit

[![CI](https://github.com/saintedlama/git-visit/actions/workflows/ci.yml/badge.svg)](https://github.com/saintedlama/git-visit/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/git-visit.svg)](https://www.npmjs.com/package/git-visit)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](https://opensource.org/licenses/ISC)

Git command line wrapping library to visit commit history, including SSH key handling, log, and diff parsing.

## Installation

```bash
npm install git-visit
```

## Usage

```typescript
import Repository from 'git-visit';

const repo = new Repository(
  './destination-dir',
  'https://github.com/saintedlama/git-visit.git'
);

// Clone (or pull if it already exists)
await repo.update();

// Get parsed commit log
const commits = await repo.log();
console.log(`Repository has ${commits.length} commits`);

// Visit commits sequentially
await repo.visit({
  async visit(repo, commit) {
    console.log(`Visiting ${commit.hash}: ${commit.message}`);
  }
});
```
