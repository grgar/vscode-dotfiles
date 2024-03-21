import * as assert from "assert";
import * as vscode from "vscode";
import Configuration from "../Configuration";

suite("Extension", () => {
	suiteSetup(() => {
		vscode.extensions.getExtension("grg.dotfiles")!.activate();
	});
	test("setFiles is idempotent", () => {
		const testNamespace = "dotfiles";
		const configuration = new Configuration(testNamespace, () => { });
		const files = configuration.getFiles();
		configuration.setFiles(files);
		configuration.setFiles(files);
		assert.deepStrictEqual(configuration.getFiles(), files);
	});
});
