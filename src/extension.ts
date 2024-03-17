import * as fs from 'fs';
import path from 'path';
import * as vscode from 'vscode';

const configNamespace = "dotfiles";

async function apply() {
	const config = vscode.workspace.getConfiguration(configNamespace);
	const directory = config.get<string>("directory") || process.env["XDG_CONFIG_DIR"] || path.join(process.env["HOME"]!, ".config");
	const filePath = path.join(directory, config.get<string>("file") || "fish/conf.d/vscode.fish");
	fs.stat(filePath, (err, _) => {
		if (err) {
			vscode.window.showWarningMessage(`${filePath} does not exist`);
			return;
		}
		const data = config.get<string>("content");
		if (!data) {
			vscode.window.showInformationMessage("No content to write");
			return;
		}
		fs.writeFile(filePath, data, { encoding: "utf-8", mode: "w" }, () => { });
	});
}

export function activate(context: vscode.ExtensionContext) {
	context.subscriptions.push(vscode.commands.registerCommand('config-setup.apply', apply));
}

export function deactivate() { }
