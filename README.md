# dotfiles

Configure dotfiles from your VS Code settings so they're always available.

Run **dotfiles: Apply Config** from the command palette to write files to disk as defined in config (`dotfiles.files`).

If `dotfiles.autoUpdate` is enabled, automatically apply config from settings to files on workbench open, and write changes to settings when saving a file in the editor that matches a file defined in `dotfiles.files`.

## Example

```json
"dotfiles.files": {
	"path/to/file.txt": "foo\nbar\n"
}
```

writes file `$XDG_CONFIG_HOME/path/to/file.txt` with the content of the key.

## Extension Settings

||Description|Default|
|-|-|-|
|`dotfiles.directory`|Base directory path for all config files to be written.|`""`, meaning `$XDG_CONFIG_HOME` or `$HOME/.config` if unset.|
|`dotfiles.files`|Files to be written to the configured directory, where key is the relative path to the file and value is the content of the file.|`{}`|
|`dotfiles.autoUpdate`|Whether to automatically apply changes to files on workbench open, and persist changes back into settings from the editor.|`false`|
