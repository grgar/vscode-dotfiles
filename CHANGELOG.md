# Changelog
### v1.1.7

- Release dependabot updates


- Bump braces in the npm_and_yarn group across 1 directory


- Bump the npm_and_yarn group across 1 directory with 2 updates

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
