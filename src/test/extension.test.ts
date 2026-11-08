import * as assert from "assert";
import * as vscode from "vscode";
import Configuration from "../Configuration";
import { appliesToPlatform, filterFiles } from "../platform";

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
	test("forward slash keys apply on Linux and macOS only", () => {
		for (const platform of ["linux", "darwin"] as const) {
			assert.strictEqual(appliesToPlatform("a/b.txt", platform), true);
			assert.strictEqual(appliesToPlatform("a\\b.txt", platform), false);
		}
		assert.strictEqual(appliesToPlatform("a/b.txt", "win32"), false);
	});
	test("backslash keys apply on Windows only", () => {
		assert.strictEqual(appliesToPlatform("a\\b.txt", "win32"), true);
	});
	test("keys without a separator apply everywhere", () => {
		for (const platform of ["linux", "darwin", "win32"] as const) {
			assert.strictEqual(appliesToPlatform("file.txt", platform), true);
		}
	});
	test("keys mixing separators apply nowhere", () => {
		for (const platform of ["linux", "darwin", "win32"] as const) {
			assert.strictEqual(appliesToPlatform("a/b\\c.txt", platform), false);
		}
	});
	test("filterFiles keeps only matching keys", () => {
		const files = { "a/b": "1", "a\\b": "2", "c": "3" };
		assert.deepStrictEqual(filterFiles(files, "linux"), { "a/b": "1", "c": "3" });
		assert.deepStrictEqual(filterFiles(files, "win32"), { "a\\b": "2", "c": "3" });
	});
});
