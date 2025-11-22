# Changelog
### v1.1.8

- Release dependabot updates


- Bump glob in the npm_and_yarn group across 1 directory
  
  Bumps the npm_and_yarn group with 1 update in the / directory: [glob](https://github.com/isaacs/node-glob).
  
  
  Updates `glob` from 10.3.10 to 10.5.0
  - [Changelog](https://github.com/isaacs/node-glob/blob/main/changelog.md)
  - [Commits](https://github.com/isaacs/node-glob/compare/v10.3.10...v10.5.0)
  
  ---
  updated-dependencies:
  - dependency-name: glob
    dependency-version: 10.5.0
    dependency-type: indirect
    dependency-group: npm_and_yarn
  ...
  
  Signed-off-by: dependabot[bot] <support@github.com>

- Bump js-yaml in the npm_and_yarn group across 1 directory
  
  Bumps the npm_and_yarn group with 1 update in the / directory: [js-yaml](https://github.com/nodeca/js-yaml).
  
  
  Updates `js-yaml` from 4.1.0 to 4.1.1
  - [Changelog](https://github.com/nodeca/js-yaml/blob/master/CHANGELOG.md)
  - [Commits](https://github.com/nodeca/js-yaml/compare/4.1.0...4.1.1)
  
  ---
  updated-dependencies:
  - dependency-name: js-yaml
    dependency-version: 4.1.1
    dependency-type: indirect
    dependency-group: npm_and_yarn
  ...
  
  Signed-off-by: dependabot[bot] <support@github.com>
### v1.1.7

- Release dependabot updates


- Bump braces in the npm_and_yarn group across 1 directory
  
  Bumps the npm_and_yarn group with 1 update in the / directory: [braces](https://github.com/micromatch/braces).
  
  
  Updates `braces` from 3.0.2 to 3.0.3
  - [Changelog](https://github.com/micromatch/braces/blob/master/CHANGELOG.md)
  - [Commits](https://github.com/micromatch/braces/compare/3.0.2...3.0.3)
  
  ---
  updated-dependencies:
  - dependency-name: braces
    dependency-type: indirect
    dependency-group: npm_and_yarn
  ...
  
  Signed-off-by: dependabot[bot] <support@github.com>

- Bump the npm_and_yarn group across 1 directory with 2 updates
  
  Bumps the npm_and_yarn group with 2 updates in the / directory: [serialize-javascript](https://github.com/yahoo/serialize-javascript) and [mocha](https://github.com/mochajs/mocha).
  
  
  Updates `serialize-javascript` from 6.0.0 to 6.0.2
  - [Release notes](https://github.com/yahoo/serialize-javascript/releases)
  - [Commits](https://github.com/yahoo/serialize-javascript/compare/v6.0.0...v6.0.2)
  
  Updates `mocha` from 10.3.0 to 10.8.2
  - [Release notes](https://github.com/mochajs/mocha/releases)
  - [Changelog](https://github.com/mochajs/mocha/blob/main/CHANGELOG.md)
  - [Commits](https://github.com/mochajs/mocha/compare/v10.3.0...v10.8.2)
  
  ---
  updated-dependencies:
  - dependency-name: serialize-javascript
    dependency-type: indirect
    dependency-group: npm_and_yarn
  - dependency-name: mocha
    dependency-type: indirect
    dependency-group: npm_and_yarn
  ...
  
  Signed-off-by: dependabot[bot] <support@github.com>
### v1.1.6

- Fix icon colour for dark mode

### v1.1.5

- Use category for command

### v1.1.4

- Show editor for files in settings UI

### v1.1.3

- Add create option if file does not exist
  
  If the file doesn't exist, a warning is displayed. Add a create button to create the file on the warning and proceed.

### v1.1.2

- Always use posix-specific pathing
  
  https://nodejs.org/dist/latest-v10.x/docs/api/path.html#path_windows_vs_posix


- Add Codicons

### v1.1.1

- Fix missing jsonc-parser dependency


- Fix Makefile shell syntax

### v1.1.0

- Add code lens for editing files from settings
  
  Add ability to open editor for file added to `dotfiles.files` settings using a code lens, to make it faster to update the files in settings.json. Changes made in the editor automatically update the file's content in settings.json if `dotfiles.autoUpdate` is enabled.


- Simplify Makefile

### v1.0.1

- Refactor Configuration to a separate class

### v1.0.0

- Add example to readme


- Fix XDG_CONFIG_HOME env var


- Optionally automatically update dotfiles to and from settings
  
  Add a new config option to automatically apply files from settings, and to apply changes to the files back to settings.


- Log files written to output channel


- Add more links to marketplace listing
  
  Also use light background for gallery banner


- Fix Makefile publish target

### v0.1.2

- Add icon


- Link to GitHub for Q&A


- Add Makefile

### v0.1.1

- Fix command identifier
  
  Use ID of extension as prefix in command ID and title.

### v0.1.0

- Create LICENSE


- Add support for multiple files
  
  Use an object as config where each key-value is a file to be written.


- Scaffold to apply one file from settings
  
  Adds some configuration options to write one file from settings to the configured (or defaulted) dotfiles folder.


- Initial commit

