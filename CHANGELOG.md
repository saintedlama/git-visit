# Change Log

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

<a name="4.1.0"></a>
# [4.1.0](https://github.com/saintedlama/git-visit/compare/v4.0.0...v4.1.0) (2018-06-07)


### Bug Fixes

* update dependencies to fix security vulnerabilities ([50e502e](https://github.com/saintedlama/git-visit/commit/50e502e))
* update fs-extra dependency ([3bf5bc4](https://github.com/saintedlama/git-visit/commit/3bf5bc4))


### Features

* add directory option to log function ([80a6bac](https://github.com/saintedlama/git-visit/commit/80a6bac))



<a name="4.0.0"></a>
# [4.0.0](https://github.com/saintedlama/git-visit/compare/v3.1.0...v4.0.0) (2018-04-04)


### Features

* implement git diff using diff2html ([05ac544](https://github.com/saintedlama/git-visit/commit/05ac544))


### BREAKING CHANGES

* renamed diff to diffStat



## Change Log

### v2.3.0 (2017/03/22 08:27 +00:00)
- [46b1466](https://github.com/saintedlama/git-visit/commit/46b146661f4825327065159c07684ed67d8c78da) 2.3.0 (@saintedlama)

### v2.2.0 (2017/03/22 08:27 +00:00)
- [4d7fd6a](https://github.com/saintedlama/git-visit/commit/4d7fd6abe24b8140c064a8c8359f4a19c8abca2d) 2.2.0 (@saintedlama)

### v2.1.0 (2017/03/17 19:21 +00:00)
- [e36f10c](https://github.com/saintedlama/git-visit/commit/e36f10c3893a321ba0b0db9f4f3385c7f0ba542a) 2.1.0 (@saintedlama)
- [681cf2d](https://github.com/saintedlama/git-visit/commit/681cf2d897d1f5b46e1133f26eee0a577d3a504c) Update dependencies (@saintedlama)
- [c47bf15](https://github.com/saintedlama/git-visit/commit/c47bf15e4bb8919b7447fed56bb97d09bd335c79) Add support for clone and pull options (@saintedlama)

### v2.0.1 (2017/03/03 21:07 +00:00)
- [bd01a80](https://github.com/saintedlama/git-visit/commit/bd01a80638c33b27c6a7de99539e50b602a248f0) 2.0.1 (@saintedlama)
- [294130b](https://github.com/saintedlama/git-visit/commit/294130b83212be6cf4951d1a6f87b21772e0eaa2) Update dependencies (@saintedlama)
- [3711bf2](https://github.com/saintedlama/git-visit/commit/3711bf24f5267233df84ed09100a93e776863574) Fix parsing of renames (@saintedlama)
- [7d607b4](https://github.com/saintedlama/git-visit/commit/7d607b480c5437554ec540816c9792493907ae7f) Drop support for node 4 and 5. Add 7 to build matrix (@saintedlama)

### v2.0.0 (2016/12/06 09:27 +00:00)
- [b595e20](https://github.com/saintedlama/git-visit/commit/b595e2081bea26baf5071ed925d07729928f86a6) 2.0.0 (@saintedlama)
- [23da9e6](https://github.com/saintedlama/git-visit/commit/23da9e6959e13dfef570115d5776dc36579d1a39) Transition to ES6 (@saintedlama)

### v1.8.0 (2016/12/05 20:48 +00:00)
- [167582d](https://github.com/saintedlama/git-visit/commit/167582ddcad0f3992843588b1487394dfbda3dfb) 1.8.0
- [d34f4ef](https://github.com/saintedlama/git-visit/commit/d34f4ef6b96090913839b158423d912bd18a585f) Fix checking of exec output
- [415eb27](https://github.com/saintedlama/git-visit/commit/415eb27226af28daab56f068f4266403e2a24f58) Add isFirst and isLast flags to first and last commit
- [8119972](https://github.com/saintedlama/git-visit/commit/8119972609a9982fd6816fadf3915e99d23372a8) Fix rev-list newline char bug
- [d4d765b](https://github.com/saintedlama/git-visit/commit/d4d765b7ed60b3b53733e7fbd384857dc70b5fc5) Writing debug output when executing a command
- [b654718](https://github.com/saintedlama/git-visit/commit/b65471844c24d4918d34f7f410779dfd68b1b9be) Use LF for newline
- [34bd4f6](https://github.com/saintedlama/git-visit/commit/34bd4f69b06d6502d884f49a4dc41bc6adf443e3) Add a newline
- [6d3f78d](https://github.com/saintedlama/git-visit/commit/6d3f78d9f99f3eec38ff518abbba6d323c9f260c) Delete obsolete fixture
- [95f1fa9](https://github.com/saintedlama/git-visit/commit/95f1fa95cafa07ef7be8885338588b909f4edaa7) Graceful delete and use project scoped test_tmp
- [89e16f3](https://github.com/saintedlama/git-visit/commit/89e16f33a345db89066f12afb09673f7ad57c38a) Remove useless tests and use local git repo for tests
- [6338e44](https://github.com/saintedlama/git-visit/commit/6338e44fec4a0accef9fded5d3a5f683da4b4bbc) Safe match git log regex
- [913e7c9](https://github.com/saintedlama/git-visit/commit/913e7c967a0babe53c4daffaba99046db5d25dc4) Use template strings
- [d35093b](https://github.com/saintedlama/git-visit/commit/d35093bca5b4bc4ce1d676f319e214be1938d83a) Update cross-env and mocha
- [4529814](https://github.com/saintedlama/git-visit/commit/4529814f86490de8706e0424275e6bb792cda5b5) Drop support for 0.12 and 0.10

### v1.7.0 (2016/07/15 08:04 +00:00)
- [f432a07](https://github.com/saintedlama/git-visit/commit/f432a073202d51a65ae22990a297bc6ba56cefe2) 1.7.0 (@saintedlama)
- [e4ab287](https://github.com/saintedlama/git-visit/commit/e4ab2874206419ac14bdf90ac28d51fbb46f59b0) Adapt tests to match commits in fixture (@saintedlama)
- [f39610f](https://github.com/saintedlama/git-visit/commit/f39610f6deb55ab1f84fb588c191241fdac10b82) Update dependencies (@saintedlama)
- [8c670a8](https://github.com/saintedlama/git-visit/commit/8c670a83518930ee86c2fa133c96080edfda4209) Update README.md (@saintedlama)
- [e9e39bd](https://github.com/saintedlama/git-visit/commit/e9e39bd2d51a52fd08a13f991be4500d8655b3e1) Travis CI adaptions (@saintedlama)

### v1.6.0 (2016/03/24 14:51 +00:00)
- [a696e01](https://github.com/saintedlama/git-visit/commit/a696e0192c3e5b1edf18d7235ac22841b9f66568) 1.6.0 (@saintedlama)

### v1.5.0 (2016/03/24 14:46 +00:00)
- [67cbb4b](https://github.com/saintedlama/git-visit/commit/67cbb4b93ce2878068bf609369d3e2472f477c93) 1.5.0 (@saintedlama)
- [c3cda28](https://github.com/saintedlama/git-visit/commit/c3cda28803a2a96b560c476e162aa45ce8ebb1b5) Update dependencies (@saintedlama)

### v1.4.0 (2015/12/08 12:50 +00:00)
- [dc2d81e](https://github.com/saintedlama/git-visit/commit/dc2d81e624a4cef4b2e507a0118e059bc94110fb) 1.4.0 (@saintedlama)
- [8276c52](https://github.com/saintedlama/git-visit/commit/8276c52cf441961298849d3a11e85dc2c5e023e4) Add init callback (@saintedlama)
- [76dfdbc](https://github.com/saintedlama/git-visit/commit/76dfdbc536d8eb621b39bc2fe71c5f002a476a72) Update dependencies (@saintedlama)

### v1.3.0 (2015/09/01 14:55 +00:00)
- [0b12cfc](https://github.com/saintedlama/git-visit/commit/0b12cfc110e7b1a37ed0557cb2000f77340e275f) 1.3.0 (@saintedlama)
- [a81f99d](https://github.com/saintedlama/git-visit/commit/a81f99d115820ee9c0e0b5b19e82e3cfc6bdac7a) Update rimraf (@saintedlama)

### v1.2.0 (2015/09/01 14:54 +00:00)
- [445ece9](https://github.com/saintedlama/git-visit/commit/445ece9417d30632bc2b2065185294c6ff58ae38) 1.2.0 (@saintedlama)
- [2c30814](https://github.com/saintedlama/git-visit/commit/2c308143e0f4caffe72cd7253031e8893bd16013) Add release script (@saintedlama)
- [18952ed](https://github.com/saintedlama/git-visit/commit/18952ed25f225e97f7285383b08ce31064007780) Checkout master before pulling to ensure to avoid detached working copies (@saintedlama)
- [50af413](https://github.com/saintedlama/git-visit/commit/50af413d7e2c40f61e164f45087851fc540a8f87) Add node v0.12 and iojs environments (@saintedlama)
- [00c4287](https://github.com/saintedlama/git-visit/commit/00c42874dc67c4e57fc59d678d8b5f5d9aa28496) Add functionality to get initial commits and numstat diffs (@saintedlama)
- [fe86f38](https://github.com/saintedlama/git-visit/commit/fe86f38245f09c0e26dc4bbc7dc1015ffad43ab0) Refactor error wrapping by using a dedicated 'exec' function (@saintedlama)
- [92db413](https://github.com/saintedlama/git-visit/commit/92db413d526535c4795e321b68cb26ca0d4d7f49) Bump version (@saintedlama)
- [edd27dd](https://github.com/saintedlama/git-visit/commit/edd27dd0254ef6f089bf7d9aed310dcf2f0be38f) Disable interactive login (@saintedlama)
- [d93268a](https://github.com/saintedlama/git-visit/commit/d93268af12c720d0c3ca416ce7c4f7c7126b6165) Add stdout and stderr for errors in error object as string fields (@saintedlama)
- [00a8817](https://github.com/saintedlama/git-visit/commit/00a8817b3fbb5bfd1d49e1d8bff7a965efdba5aa) Bump version (@saintedlama)
- [386cd0a](https://github.com/saintedlama/git-visit/commit/386cd0a60c4245b10ab09b35f9b0e0935f6f8a5e) Fix error propagating arguments (@saintedlama)
- [31343d8](https://github.com/saintedlama/git-visit/commit/31343d8c403d5806d12da98fc3533820ec8e4a0a) Add more debug output (@saintedlama)
- [4240b99](https://github.com/saintedlama/git-visit/commit/4240b99da1a699e29567ea9b2e2329cdf6fc49ee) Fix windows weirdness with git/bash setup (@saintedlama)
- [b0c8c06](https://github.com/saintedlama/git-visit/commit/b0c8c064b12e9edccfd0e4e9272d11aef8c549ac) Bump version (@saintedlama)
- [c630087](https://github.com/saintedlama/git-visit/commit/c63008759853e3e75d108e8b169f3ff1fd127fdf) Correct win32 behavior, git does not work with the cmd (@saintedlama)
- [528f11a](https://github.com/saintedlama/git-visit/commit/528f11aa6038ce1f5558ca1ab0dc75590db886e5) Implement GIT_SSH wrapping functionality (@saintedlama)
- [9ced3e0](https://github.com/saintedlama/git-visit/commit/9ced3e024233e8a51c31d22e8b2e2ba6edf9bc89) Add travis support (@saintedlama)
- [71392a6](https://github.com/saintedlama/git-visit/commit/71392a6491fd0ded016af088752161df78bf024a) Ignore npm packages (@saintedlama)
- [3a60dc5](https://github.com/saintedlama/git-visit/commit/3a60dc5910b37194b1098c92e219888eae488649) Initial commit (@saintedlama)
- [f9f93d9](https://github.com/saintedlama/git-visit/commit/f9f93d9c1cce9d26d7befcecddfdd24b68f2e5de) Initial commit (@saintedlama)