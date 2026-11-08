import { JSONVisitor, visit } from "jsonc-parser";
import { posix as path } from "path";
import * as vscode from "vscode";

export class SettingsLensProvider implements vscode.CodeLensProvider {
	private key: string;
	private basePath: string;

	constructor(key: string, basePath: string) {
		this.key = key;
		this.basePath = basePath;
	}

	provideCodeLenses(document: vscode.TextDocument): vscode.ProviderResult<vscode.CodeLens[]> {
		const { section, files } = parseJSONForFileLocations(this.key, document);
		const lenses = files.map(
			({ name, range }) =>
				new vscode.CodeLens(
					range,
					{
						title: "$(go-to-file) open file",
						command: "vscode.open",
						arguments: [path.join(this.basePath, name)],
					},
				),
		);
		if (section) {
			lenses.unshift(new vscode.CodeLens(
				section,
				{
					title: "$(file-directory) browse",
					command: "dotfiles.browse",
				},
			));
		}
		return lenses;
	}
}

export interface FileLocation {
	name: string;
	range: vscode.Range;
}

const parseJSONForFileLocations = (filesProperty: String, document: vscode.TextDocument, buffer = document.getText()): { section?: vscode.Range; files: FileLocation[]; } => {
	let level = 0;
	let inFiles = false;
	let section: vscode.Range | undefined;
	const files: FileLocation[] = [];
	const visitor: JSONVisitor = {
		onObjectBegin() {
			level++;
		},
		onObjectEnd() {
			inFiles = false;
			level--;
		},
		onObjectProperty(property: string, offset: number, length: number) {
			if (level === 1 && property === filesProperty) {
				inFiles = true;
				section = new vscode.Range(document.positionAt(offset), document.positionAt(offset + length));
			} else if (inFiles) {
				files.push({
					name: property,
					range: new vscode.Range(document.positionAt(offset), document.positionAt(offset + length))
				});
			}
		},
	};
	visit(buffer, visitor);
	return { section, files };
};
