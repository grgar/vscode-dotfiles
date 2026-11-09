import * as fs from "fs/promises";
import * as path from "path";
import * as vscode from "vscode";
import Configuration, { namespace as configNamespace, Section } from "./Configuration";
import { appliesToPlatform, filterFiles } from "./platform";
import { SettingsLensProvider } from "./SettingsLensProvider";

const outputChannel = vscode.window.createOutputChannel(configNamespace);
const log = (msg: string) => outputChannel.appendLine(msg);

async function apply() {
	const configuration = new Configuration(configNamespace, log);
	const directory = configuration.getDirectoryPath();
	for (const [file, content] of Object.entries(filterFiles(configuration.getFiles()))) {
		const filePath = path.join(directory, file);
		try {
			await fs.stat(filePath);
		} catch (err) {
			switch (await vscode.window.showWarningMessage(`${filePath} does not exist: ${err}`, "Create")) {
				case "Create":
					break;
				default:
					continue;
			}
		}
		try {
			await fs.mkdir(path.dirname(filePath), { recursive: true });
			await fs.writeFile(filePath, content);
			outputChannel.appendLine(`${new Date().toLocaleString()}: wrote ${filePath}`);
		} catch (err) {
			vscode.window.showWarningMessage(`${filePath} was not written: ${err}`);
		}
	}
}

function didSave(doc: vscode.TextDocument) {
	const configuration = new Configuration(configNamespace, log);
	if (!configuration.shouldAutoUpdate()) {
		return;
	}
	if (doc.uri.scheme !== "file") {
		return;
	}
	const directory = configuration.getDirectoryPath();
	const relativePath = path.relative(directory, doc.uri.fsPath);
	if (relativePath === "" || relativePath === ".." || relativePath.startsWith(".." + path.sep) || path.isAbsolute(relativePath)) {
		return;
	}
	const files = configuration.getFiles();
	if (!appliesToPlatform(relativePath) || !Object.hasOwn(files, relativePath)) {
		outputChannel.appendLine(`${new Date().toLocaleString()}: file ${relativePath} in ${directory} not found in settings`);
		return;
	}
	files[relativePath] = doc.getText();
	configuration.setFiles(files);
	outputChannel.appendLine(`${new Date().toLocaleString()}: updated ${relativePath}`);
}

export function activate(context: vscode.ExtensionContext) {
	const configuration = new Configuration(configNamespace, log);
	context.subscriptions.push(
		vscode.commands.registerCommand("dotfiles.apply", apply),
		vscode.workspace.onDidSaveTextDocument(didSave),
		vscode.languages.registerCodeLensProvider(
			{
				language: 'jsonc',
				pattern: '**/settings.json',
			},
			new SettingsLensProvider(`${configNamespace}.${Section.files}`, () => configuration.getDirectoryPath()),
		)
	);
	if (configuration.shouldAutoUpdate()) {
		apply();
	}
}

export function deactivate() { }
