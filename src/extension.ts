import * as fs from 'fs';
import path from 'path';
import * as vscode from 'vscode';

const configNamespace = "dotfiles";

async function apply() {
	const config = vscode.workspace.getConfiguration(configNamespace);
	const directory = config.get<string>("directory") || process.env["XDG_CONFIG_DIR"] || path.join(process.env["HOME"]!, ".config");
	const files = Object.entries(config.get<object>("files", {}));
	for (const [file, content] of files) {
		const filePath = path.join(directory, file);
		fs.stat(filePath, (err, _) => {
			if (err) {
				vscode.window.showWarningMessage(`${filePath} does not exist`);
				return;
			}
			if (!content) {
				return;
			}
			fs.writeFile(filePath, content, { encoding: "utf-8", mode: "w" }, () => { });
		});
	}
}

export function activate(context: vscode.ExtensionContext) {
	context.subscriptions.push(vscode.commands.registerCommand("dotfiles.apply", apply));
}

export function deactivate() { }
