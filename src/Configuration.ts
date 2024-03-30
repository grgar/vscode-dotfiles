import { posix as path } from "path";
import * as vscode from "vscode";

export const namespace = "dotfiles";

export enum Section {
	directory = "directory",
	files = "files",
	autoUpdate = "autoUpdate",
}

export default class Configuration {
	readonly namespace: string;
	readonly logger?: (msg: string) => void;

	constructor(namespace: string, logger: (msg: string) => void) {
		this.namespace = namespace;
		this.logger = logger;
	}

	getDirectoryPath() {
		let directory = vscode.workspace.getConfiguration(this.namespace).get<string>(Section.directory) || process.env["XDG_CONFIG_HOME"] || path.join(process.env["HOME"]!, ".config");
		if (directory.endsWith("/")) {
			return directory.slice(directory.length - 1);
		}
		return directory;
	}

	getFiles() {
		return vscode.workspace.getConfiguration(this.namespace).get<{ [key: string]: string; }>(Section.files, {});
	}

	async setFiles(files: { [key: string]: string; }) {
		try {
			await vscode.workspace.getConfiguration(this.namespace).update(Section.files, files, vscode.ConfigurationTarget.Global);
		} catch (err) {
			this.logger?.(`${new Date().toLocaleString()}: failed to update files: ${err}`);
			vscode.window.showErrorMessage("Unable to update dotfiles.files: " + err);
		}
	}

	shouldAutoUpdate() {
		return vscode.workspace.getConfiguration(this.namespace).get<boolean>(Section.autoUpdate, false);
	}
}
