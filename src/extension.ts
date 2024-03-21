import * as fs from "fs/promises";
import path from 'path';
import * as vscode from 'vscode';

const configNamespace = "dotfiles";
const outputChannel = vscode.window.createOutputChannel(configNamespace);

function getDirectoryPath() {
	let directory = vscode.workspace.getConfiguration(configNamespace).get<string>("directory") || process.env["XDG_CONFIG_HOME"] || path.join(process.env["HOME"]!, ".config");
	if (directory.endsWith("/")) {
		return directory.slice(directory.length - 1);
	}
	return directory;
}

function getFiles() {
	return vscode.workspace.getConfiguration(configNamespace).get<{ [key: string]: string; }>("files", {});
}

async function setFiles(files: { [key: string]: string; }) {
	try {
		await vscode.workspace.getConfiguration(configNamespace).update("files", files, vscode.ConfigurationTarget.Global);
	} catch (err) {
		outputChannel.appendLine(`${new Date().toLocaleString()}: failed to update files: ${err}`);
		vscode.window.showErrorMessage("Unable to update dotfiles.files: " + err);
	}
}

function shouldAutoUpdate() {
	return vscode.workspace.getConfiguration(configNamespace).get<boolean>("autoUpdate", false);
}

async function apply() {
	const directory = getDirectoryPath();
	for (const [file, content] of Object.entries(getFiles())) {
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

function didSave(doc: vscode.TextDocument) {
	if (!shouldAutoUpdate()) {
		return;
	}
	if (doc.uri.scheme !== "file") {
		return;
	}
	const directory = getDirectoryPath();
	if (!doc.uri.path.startsWith(directory + "/")) {
		return;
	}
	const files = getFiles();
	const relativePath = doc.uri.path.slice(directory.length + 1);
	if (!files[relativePath]) {
		outputChannel.appendLine(`${new Date().toLocaleString()}: file ${relativePath} in ${directory} not found in settings`);
		return;
	}
	files[relativePath] = doc.getText();
	setFiles(files);
	outputChannel.appendLine(`${new Date().toLocaleString()}: updated ${relativePath}`);
}

export function activate(context: vscode.ExtensionContext) {
	context.subscriptions.push(
		vscode.commands.registerCommand("dotfiles.apply", apply),
		vscode.workspace.onDidSaveTextDocument(didSave)
	);
	if (shouldAutoUpdate()) {
		apply();
	}
}

export function deactivate() { }
