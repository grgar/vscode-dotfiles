import * as assert from "assert";
import * as vscode from "vscode";
import Configuration, { namespace } from "../Configuration";
import { deriveEntries } from "../DotfilesFileSystemProvider";

const uri = (path: string) => vscode.Uri.from({ scheme: "dotfiles", path });

suite("deriveEntries", () => {
	const keys = ["a.txt", "fish/config.fish", "fish/functions/l.fish", "git/config"];
	test("root lists top-level files and derived directories", () => {
		assert.deepStrictEqual([...deriveEntries(keys, "")], [
			["a.txt", vscode.FileType.File],
			["fish", vscode.FileType.Directory],
			["git", vscode.FileType.Directory],
		]);
	});
	test("nested prefix lists its own children only", () => {
		assert.deepStrictEqual([...deriveEntries(keys, "fish")], [
			["config.fish", vscode.FileType.File],
			["functions", vscode.FileType.Directory],
		]);
	});
	test("empty keys give empty root", () => {
		assert.deepStrictEqual([...deriveEntries([], "")], []);
	});
});

suite("DotfilesFileSystemProvider", () => {
	const configuration = new Configuration(namespace, () => { });
	let originalFiles: { [key: string]: string; };

	suiteSetup(async () => {
		await vscode.extensions.getExtension("grg.dotfiles")!.activate();
		originalFiles = configuration.getFiles();
		await configuration.setFiles({
			"a.txt": "A",
			"fish/config.fish": "F",
		});
	});

	suiteTeardown(async () => {
		await configuration.setFiles(originalFiles);
	});

	test("readDirectory derives directories from key prefixes", async () => {
		const root = await vscode.workspace.fs.readDirectory(uri("/"));
		assert.deepStrictEqual(root.sort(), [
			["a.txt", vscode.FileType.File],
			["fish", vscode.FileType.Directory],
		]);
		const nested = await vscode.workspace.fs.readDirectory(uri("/fish"));
		assert.deepStrictEqual(nested, [["config.fish", vscode.FileType.File]]);
	});

	test("readFile returns setting content", async () => {
		const content = await vscode.workspace.fs.readFile(uri("/fish/config.fish"));
		assert.strictEqual(new TextDecoder().decode(content), "F");
	});

	test("stat reports files and directories", async () => {
		assert.strictEqual((await vscode.workspace.fs.stat(uri("/a.txt"))).type, vscode.FileType.File);
		assert.strictEqual((await vscode.workspace.fs.stat(uri("/fish"))).type, vscode.FileType.Directory);
		assert.strictEqual((await vscode.workspace.fs.stat(uri("/"))).type, vscode.FileType.Directory);
	});

	test("stat missing file throws FileNotFound", async () => {
		await assert.rejects(() => Promise.resolve(vscode.workspace.fs.stat(uri("/missing.txt"))), (err: vscode.FileSystemError) => err.code === "FileNotFound");
	});

	test("writeFile persists new file to settings", async () => {
		await vscode.workspace.fs.writeFile(uri("/new/nested.txt"), new TextEncoder().encode("N"));
		assert.strictEqual(configuration.getFiles()["new/nested.txt"], "N");
	});

	test("writeFile updates existing file in settings", async () => {
		await vscode.workspace.fs.writeFile(uri("/a.txt"), new TextEncoder().encode("A2"));
		assert.strictEqual(configuration.getFiles()["a.txt"], "A2");
	});

	test("delete removes file from settings", async () => {
		await vscode.workspace.fs.writeFile(uri("/doomed.txt"), new TextEncoder().encode("D"));
		await vscode.workspace.fs.delete(uri("/doomed.txt"));
		assert.strictEqual(configuration.getFiles()["doomed.txt"], undefined);
	});

	test("recursive delete of directory removes nested keys", async () => {
		await vscode.workspace.fs.writeFile(uri("/dir/one.txt"), new TextEncoder().encode("1"));
		await vscode.workspace.fs.writeFile(uri("/dir/two.txt"), new TextEncoder().encode("2"));
		await vscode.workspace.fs.delete(uri("/dir"), { recursive: true });
		const files = configuration.getFiles();
		assert.strictEqual(files["dir/one.txt"], undefined);
		assert.strictEqual(files["dir/two.txt"], undefined);
	});

	test("rename moves key", async () => {
		await vscode.workspace.fs.writeFile(uri("/from.txt"), new TextEncoder().encode("R"));
		await vscode.workspace.fs.rename(uri("/from.txt"), uri("/to.txt"));
		const files = configuration.getFiles();
		assert.strictEqual(files["from.txt"], undefined);
		assert.strictEqual(files["to.txt"], "R");
		await vscode.workspace.fs.delete(uri("/to.txt"));
	});

	test("external setting change is readable through the provider", async () => {
		const files = configuration.getFiles();
		await configuration.setFiles({ ...files, "external.txt": "E" });
		const content = await vscode.workspace.fs.readFile(uri("/external.txt"));
		assert.strictEqual(new TextDecoder().decode(content), "E");
		await vscode.workspace.fs.delete(uri("/external.txt"));
	});
});
