# git-visit

[![CI](https://github.com/saintedlama/git-visit/actions/workflows/ci.yml/badge.svg)](https://github.com/saintedlama/git-visit/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/git-visit.svg)](https://www.npmjs.com/package/git-visit)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](https://opensource.org/licenses/ISC)

Git command line wrapping library to visit commit history, including SSH key handling, log, diff, and stat parsing.

## Installation

```bash
npm install git-visit
```

## Usage

### Initialize & Update

```typescript
import Repository from 'git-visit';

const repo = new Repository(
  './destination-dir',
  'https://github.com/saintedlama/git-visit.git'
);

// Clone repository (or pull if it already exists)
await repo.update();
```

### Commit History (`log`)

Retrieve full parsed commit history with author, committer, timestamps, commit messages, and file change modes:

```typescript
// Get parsed commit log (optionally scoped to a directory or file)
const commits = await repo.log('src');

for (const commit of commits) {
  console.log(`${commit.hash} - ${commit.author?.name}: ${commit.message}`);
  for (const file of commit.files) {
    console.log(`  ${file.mode} ${file.path}`);
  }
}
```

### Diffs and Line Statistics (`diffStat` & `diff`)

Inspect line addition/deletion metrics or inspect full diffs between revisions:

```typescript
// Get line stats (+added / -deleted) per file
const stats = await repo.diffStat('HEAD~5', 'HEAD');
for (const stat of stats) {
  console.log(`${stat.path}: +${stat.added} -${stat.deleted}`);
}

// Get parsed structured diff files (chunks, additions, deletions)
const diffFiles = await repo.diff('HEAD~1', 'HEAD');
for (const file of diffFiles) {
  console.log(`${file.to}: +${file.addedLines} -${file.deletedLines}`);
}

// Or get the raw git diff string
const rawDiff = await repo.diff('HEAD~1', 'HEAD', { output: 'raw' });
```

### View File at Revision (`show`)

Read the content of any file at a specific commit without checking out the revision:

```typescript
const content = await repo.show('package.json', 'HEAD~1');
console.log(content);
```

### Step Through Commit History (`visit`)

Sequentially checkout commits to analyze repository state over time:

```typescript
await repo.visit({
  // Optional filter: select which commits to visit
  test: (commit) => !commit.message.startsWith('chore'),

  // Optional hook before visiting begins
  init: (repo, commits) => {
    console.log(`Visiting ${commits.length} commits`);
  },

  // Called for each checked-out commit
  async visit(repo, commit) {
    console.log(`Analyzing commit ${commit.hash} (${commit.message})`);
    // Repository working tree is now checked out to this commit
  }
});
```

### Private Repositories with SSH Keys

Pass an SSH private key string in options for secure, temporary SSH agent wrapper authentication:

```typescript
const repo = new Repository(
  './private-repo',
  'git@github.com:owner/private-repo.git',
  {
    privateKey: process.env.SSH_PRIVATE_KEY
  }
);

await repo.update();
```
