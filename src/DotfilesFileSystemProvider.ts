import * as vscode from "vscode";
import Configuration from "./Configuration";

export const scheme = "dotfiles";

const keyOf = (uri: vscode.Uri) => uri.path.replace(/^\/+/, "").replace(/\/+$/, "");

export const deriveEntries = (keys: string[], prefix: string): Map<string, vscode.FileType> => {
	const start = prefix === "" ? "" : prefix + "/";
	const entries = new Map<string, vscode.FileType>();
	for (const key of keys) {
		if (!key.startsWith(start) || key === prefix) {
			continue;
		}
		const rest = key.slice(start.length);
		const slash = rest.indexOf("/");
		if (slash === -1) {
			if (!entries.has(rest)) {
				entries.set(rest, vscode.FileType.File);
			}
		} else {
			entries.set(rest.slice(0, slash), vscode.FileType.Directory);
		}
	}
	return entries;
};

export class DotfilesFileSystemProvider implements vscode.FileSystemProvider {
	private readonly configuration: Configuration;
	private readonly emitter = new vscode.EventEmitter<vscode.FileChangeEvent[]>();
	readonly onDidChangeFile = this.emitter.event;

	private readonly ctime = Date.now();
	private readonly mtimes = new Map<string, number>();
	// Empty directories cannot be represented in the dotfiles.files key/value
	// store, so directories created before any file exists in them live only
	// for the current session.
	private readonly sessionDirs = new Set<string>();
	private snapshot: { [key: string]: string; };

	constructor(configuration: Configuration) {
		this.configuration = configuration;
		this.snapshot = { ...configuration.getFiles() };
	}

	watch(): vscode.Disposable {
		return new vscode.Disposable(() => { });
	}

	stat(uri: vscode.Uri): vscode.FileStat {
		const key = keyOf(uri);
		const files = this.configuration.getFiles();
		if (key in files) {
			return {
				type: vscode.FileType.File,
				ctime: this.ctime,
				mtime: this.mtimes.get(key) ?? this.ctime,
				size: new TextEncoder().encode(files[key]).byteLength,
			};
		}
		if (this.isDirectory(key, files)) {
			return { type: vscode.FileType.Directory, ctime: this.ctime, mtime: this.ctime, size: 0 };
		}
		throw vscode.FileSystemError.FileNotFound(uri);
	}

	readDirectory(uri: vscode.Uri): [string, vscode.FileType][] {
		const key = keyOf(uri);
		const files = this.configuration.getFiles();
		if (key in files) {
			throw vscode.FileSystemError.FileNotADirectory(uri);
		}
		if (!this.isDirectory(key, files)) {
			throw vscode.FileSystemError.FileNotFound(uri);
		}
		const entries = deriveEntries(Object.keys(files), key);
		for (const [name] of deriveEntries([...this.sessionDirs], key)) {
			entries.set(name, vscode.FileType.Directory);
		}
		return [...entries.entries()];
	}

	readFile(uri: vscode.Uri): Uint8Array {
		const key = keyOf(uri);
		const files = this.configuration.getFiles();
		if (key in files) {
			return new TextEncoder().encode(files[key]);
		}
		if (this.isDirectory(key, files)) {
			throw vscode.FileSystemError.FileIsADirectory(uri);
		}
		throw vscode.FileSystemError.FileNotFound(uri);
	}

	async writeFile(uri: vscode.Uri, content: Uint8Array, options: { create: boolean, overwrite: boolean; }): Promise<void> {
		const key = keyOf(uri);
		const files = { ...this.configuration.getFiles() };
		if (key === "" || (!(key in files) && this.isDirectory(key, files))) {
			throw vscode.FileSystemError.FileIsADirectory(uri);
		}
		const exists = key in files;
		if (!exists && !options.create) {
			throw vscode.FileSystemError.FileNotFound(uri);
		}
		if (exists && options.create && !options.overwrite) {
			throw vscode.FileSystemError.FileExists(uri);
		}
		files[key] = new TextDecoder().decode(content);
		this.mtimes.set(key, Date.now());
		await this.setFilesTracked(files);
		if (this.configuration.getFiles()[key] !== files[key]) {
			throw vscode.FileSystemError.Unavailable(uri);
		}
		this.emitter.fire([{ type: exists ? vscode.FileChangeType.Changed : vscode.FileChangeType.Created, uri }]);
	}

	createDirectory(uri: vscode.Uri): void {
		const key = keyOf(uri);
		const files = this.configuration.getFiles();
		if (key in files) {
			throw vscode.FileSystemError.FileExists(uri);
		}
		this.sessionDirs.add(key);
		this.emitter.fire([{ type: vscode.FileChangeType.Created, uri }]);
	}

	async delete(uri: vscode.Uri, options: { recursive: boolean; }): Promise<void> {
		const key = keyOf(uri);
		if (key === "") {
			throw vscode.FileSystemError.NoPermissions(uri);
		}
		const files = { ...this.configuration.getFiles() };
		const prefix = key + "/";
		const children = Object.keys(files).filter(k => k.startsWith(prefix));
		let matched = false;
		if (key in files) {
			delete files[key];
			matched = true;
		}
		if (children.length > 0) {
			if (!options.recursive) {
				throw vscode.FileSystemError.NoPermissions(uri);
			}
			for (const k of children) {
				delete files[k];
			}
			matched = true;
		}
		for (const dir of this.sessionDirs) {
			if (dir === key || dir.startsWith(prefix)) {
				this.sessionDirs.delete(dir);
				matched = true;
			}
		}
		if (!matched) {
			throw vscode.FileSystemError.FileNotFound(uri);
		}
		await this.setFilesTracked(files);
		this.emitter.fire([{ type: vscode.FileChangeType.Deleted, uri }]);
	}

	async rename(oldUri: vscode.Uri, newUri: vscode.Uri, options: { overwrite: boolean; }): Promise<void> {
		const oldKey = keyOf(oldUri);
		const newKey = keyOf(newUri);
		if (oldKey === "" || newKey === "") {
			throw vscode.FileSystemError.NoPermissions(oldKey === "" ? oldUri : newUri);
		}
		const files = { ...this.configuration.getFiles() };
		const moves = new Map<string, string>();
		if (oldKey in files) {
			moves.set(oldKey, newKey);
		} else if (this.isDirectory(oldKey, files)) {
			const prefix = oldKey + "/";
			for (const k of Object.keys(files)) {
				if (k.startsWith(prefix)) {
					moves.set(k, newKey + "/" + k.slice(prefix.length));
				}
			}
		} else {
			throw vscode.FileSystemError.FileNotFound(oldUri);
		}
		for (const target of moves.values()) {
			if (target in files && !moves.has(target) && !options.overwrite) {
				throw vscode.FileSystemError.FileExists(newUri);
			}
		}
		const now = Date.now();
		for (const [from, to] of moves) {
			files[to] = files[from];
			delete files[from];
			this.mtimes.set(to, this.mtimes.get(from) ?? now);
			this.mtimes.delete(from);
		}
		await this.setFilesTracked(files);
		this.emitter.fire([
			{ type: vscode.FileChangeType.Deleted, uri: oldUri },
			{ type: vscode.FileChangeType.Created, uri: newUri },
		]);
	}

	// Called when dotfiles.files changed outside this provider, e.g. edited in
	// settings.json, changed by settings sync, or written back by autoUpdate.
	handleConfigurationChange(): void {
		const current = this.configuration.getFiles();
		const events: vscode.FileChangeEvent[] = [];
		const now = Date.now();
		for (const key of Object.keys(current)) {
			if (!(key in this.snapshot)) {
				events.push({ type: vscode.FileChangeType.Created, uri: this.uriOf(key) });
				this.mtimes.set(key, now);
			} else if (this.snapshot[key] !== current[key]) {
				events.push({ type: vscode.FileChangeType.Changed, uri: this.uriOf(key) });
				this.mtimes.set(key, now);
			}
		}
		for (const key of Object.keys(this.snapshot)) {
			if (!(key in current)) {
				events.push({ type: vscode.FileChangeType.Deleted, uri: this.uriOf(key) });
				this.mtimes.delete(key);
			}
		}
		this.snapshot = { ...current };
		if (events.length > 0) {
			this.emitter.fire(events);
		}
	}

	// Updating snapshot before the configuration change is applied means
	// handleConfigurationChange diffs this provider's own writes to nothing,
	// so only external changes produce file change events.
	private async setFilesTracked(files: { [key: string]: string; }) {
		this.snapshot = { ...files };
		await this.configuration.setFiles(files);
	}

	private isDirectory(key: string, files: { [key: string]: string; }): boolean {
		if (key === "") {
			return true;
		}
		const prefix = key + "/";
		if (Object.keys(files).some(k => k.startsWith(prefix))) {
			return true;
		}
		return this.sessionDirs.has(key) || [...this.sessionDirs].some(d => d.startsWith(prefix));
	}

	private uriOf(key: string): vscode.Uri {
		return vscode.Uri.from({ scheme, path: "/" + key });
	}
}
