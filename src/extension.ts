import * as fs from "fs/promises";
import { posix as path } from "path";
import * as vscode from "vscode";
import Configuration, { namespace as configNamespace, Section } from "./Configuration";
import { SettingsLensProvider } from "./SettingsLensProvider";

const outputChannel = vscode.window.createOutputChannel(configNamespace);

async function apply() {
	const configuration = new Configuration(configNamespace, outputChannel.appendLine);
	const directory = configuration.getDirectoryPath();
	for (const [file, content] of Object.entries(configuration.getFiles())) {
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
	const configuration = new Configuration(configNamespace, outputChannel.appendLine);
	if (!configuration.shouldAutoUpdate()) {
		return;
	}
	if (doc.uri.scheme !== "file") {
		return;
	}
	const directory = configuration.getDirectoryPath();
	if (!doc.uri.path.startsWith(directory + "/")) {
		return;
	}
	const files = configuration.getFiles();
	const relativePath = doc.uri.path.slice(directory.length + 1);
	if (!files[relativePath]) {
		outputChannel.appendLine(`${new Date().toLocaleString()}: file ${relativePath} in ${directory} not found in settings`);
		return;
	}
	files[relativePath] = doc.getText();
	configuration.setFiles(files);
	outputChannel.appendLine(`${new Date().toLocaleString()}: updated ${relativePath}`);
}

export function activate(context: vscode.ExtensionContext) {
	const configuration = new Configuration(configNamespace, outputChannel.appendLine);
	context.subscriptions.push(
		vscode.commands.registerCommand("dotfiles.apply", apply),
		vscode.workspace.onDidSaveTextDocument(didSave),
		vscode.languages.registerCodeLensProvider(
			{
				language: 'jsonc',
				pattern: '**/settings.json',
			},
			new SettingsLensProvider(`${configNamespace}.${Section.files}`, configuration.getDirectoryPath()),
		)
	);
	if (configuration.shouldAutoUpdate()) {
		apply();
	}
}

export function deactivate() { }
