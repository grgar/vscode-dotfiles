import * as fs from "fs/promises";
import path from 'path';
import * as vscode from 'vscode';

const configNamespace = "dotfiles";
const outputChannel = vscode.window.createOutputChannel(configNamespace);

async function apply() {
	const config = vscode.workspace.getConfiguration(configNamespace);
	const directory = config.get<string>("directory") || process.env["XDG_CONFIG_DIR"] || path.join(process.env["HOME"]!, ".config");
	const files = Object.entries(config.get<object>("files", {}));
	for (const [file, content] of files) {
		const filePath = path.join(directory, file);
		try {
			await fs.stat(filePath);
			await fs.writeFile(filePath, content);
			outputChannel.appendLine(`${new Date().toLocaleString()}: wrote ${filePath}`);
		} catch (err) {
			vscode.window.showWarningMessage(`${filePath} was not written: ${err}`);
		}
	}
}

export function activate(context: vscode.ExtensionContext) {
	context.subscriptions.push(vscode.commands.registerCommand("dotfiles.apply", apply));
}

export function deactivate() { }
