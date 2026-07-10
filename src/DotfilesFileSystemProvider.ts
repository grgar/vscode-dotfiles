import * as vscode from "vscode";
import Configuration from "./Configuration";

export const scheme = "dotfiles";

type Files = { [key: string]: string; };

const keyOf = (uri: vscode.Uri) => uri.path.replace(/^\/+/, "").replace(/\/+$/, "");

// Own-property check: `in` would also match Object.prototype members such as
// "constructor" or "toString".
const has = (files: Files, key: string) => Object.prototype.hasOwnProperty.call(files, key);

const sameFiles = (a: Files, b: Files) => {
	const keys = Object.keys(a);
	return keys.length === Object.keys(b).length && keys.every(key => has(b, key) && a[key] === b[key]);
};

export const deriveEntries = (keys: string[], prefix: string): Map<string, vscode.FileType> => {
	const start = prefix === "" ? "" : prefix + "/";
	const entries = new Map<string, vscode.FileType>();
	for (const key of keys) {
		if (!key.startsWith(start) || key === prefix) {
			continue;
		}
		const rest = key.slice(start.length);
		const slash = rest.indexOf("/");
		const name = slash === -1 ? rest : rest.slice(0, slash);
		// Keys with a leading or doubled slash (accepted by apply() via path.join)
		// have no addressable name here, so they are left out of listings.
		if (name === "") {
			continue;
		}
		if (slash === -1) {
			if (!entries.has(name)) {
				entries.set(name, vscode.FileType.File);
			}
		} else {
			entries.set(name, vscode.FileType.Directory);
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
	private snapshot: Files;
	// Mutations read the whole setting, change it and write it back, so they
	// must not interleave or a later write would drop an earlier one's change.
	private queue: Promise<unknown> = Promise.resolve();

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
		if (has(files, key)) {
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
		if (has(files, key)) {
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
		if (has(files, key)) {
			return new TextEncoder().encode(files[key]);
		}
		if (this.isDirectory(key, files)) {
			throw vscode.FileSystemError.FileIsADirectory(uri);
		}
		throw vscode.FileSystemError.FileNotFound(uri);
	}

	writeFile(uri: vscode.Uri, content: Uint8Array, options: { create: boolean, overwrite: boolean; }): Promise<void> {
		return this.serialize(async () => {
			const key = keyOf(uri);
			const files = { ...this.configuration.getFiles() };
			const exists = has(files, key);
			if (key === "" || (!exists && this.isDirectory(key, files))) {
				throw vscode.FileSystemError.FileIsADirectory(uri);
			}
			if (key === "__proto__") {
				throw vscode.FileSystemError.NoPermissions(uri);
			}
			if (!exists && !options.create) {
				throw vscode.FileSystemError.FileNotFound(uri);
			}
			if (exists && options.create && !options.overwrite) {
				throw vscode.FileSystemError.FileExists(uri);
			}
			files[key] = new TextDecoder().decode(content);
			await this.setFilesTracked(files);
			this.mtimes.set(key, Date.now());
			this.emitter.fire([{ type: exists ? vscode.FileChangeType.Changed : vscode.FileChangeType.Created, uri }]);
		});
	}

	createDirectory(uri: vscode.Uri): void {
		const key = keyOf(uri);
		const files = this.configuration.getFiles();
		if (has(files, key) || this.isDirectory(key, files)) {
			throw vscode.FileSystemError.FileExists(uri);
		}
		this.sessionDirs.add(key);
		this.emitter.fire([{ type: vscode.FileChangeType.Created, uri }]);
	}

	delete(uri: vscode.Uri, options: { recursive: boolean; }): Promise<void> {
		return this.serialize(async () => {
			const key = keyOf(uri);
			if (key === "") {
				throw vscode.FileSystemError.NoPermissions(uri);
			}
			const files = { ...this.configuration.getFiles() };
			const prefix = key + "/";
			const removed = Object.keys(files).filter(k => k === key || k.startsWith(prefix));
			const removedDirs = [...this.sessionDirs].filter(dir => dir === key || dir.startsWith(prefix));
			if (removed.some(k => k !== key) && !options.recursive) {
				throw vscode.FileSystemError.NoPermissions(uri);
			}
			if (removed.length === 0 && removedDirs.length === 0) {
				throw vscode.FileSystemError.FileNotFound(uri);
			}
			for (const k of removed) {
				delete files[k];
			}
			if (removed.length > 0) {
				await this.setFilesTracked(files);
			}
			for (const k of removed) {
				this.mtimes.delete(k);
			}
			for (const dir of removedDirs) {
				this.sessionDirs.delete(dir);
			}
			this.emitter.fire([{ type: vscode.FileChangeType.Deleted, uri }]);
		});
	}

	rename(oldUri: vscode.Uri, newUri: vscode.Uri, options: { overwrite: boolean; }): Promise<void> {
		return this.serialize(async () => {
			const oldKey = keyOf(oldUri);
			const newKey = keyOf(newUri);
			if (oldKey === "" || newKey === "") {
				throw vscode.FileSystemError.NoPermissions(oldKey === "" ? oldUri : newUri);
			}
			if (oldKey === newKey) {
				return;
			}
			if (newKey === "__proto__") {
				throw vscode.FileSystemError.NoPermissions(newUri);
			}
			const files = { ...this.configuration.getFiles() };
			const prefix = oldKey + "/";
			const moves = new Map<string, string>();
			if (has(files, oldKey)) {
				moves.set(oldKey, newKey);
			} else if (this.isDirectory(oldKey, files)) {
				for (const k of Object.keys(files)) {
					if (k.startsWith(prefix)) {
						moves.set(k, newKey + "/" + k.slice(prefix.length));
					}
				}
			} else {
				throw vscode.FileSystemError.FileNotFound(oldUri);
			}
			for (const target of moves.values()) {
				if (has(files, target) ? !moves.has(target) && !options.overwrite : this.isDirectory(target, files)) {
					throw vscode.FileSystemError.FileExists(newUri);
				}
			}
			for (const [from, to] of moves) {
				files[to] = files[from];
				delete files[from];
			}
			if (moves.size > 0) {
				await this.setFilesTracked(files);
			}
			const now = Date.now();
			for (const [from, to] of moves) {
				this.mtimes.set(to, this.mtimes.get(from) ?? now);
				this.mtimes.delete(from);
			}
			for (const dir of [...this.sessionDirs]) {
				if (dir === oldKey || dir.startsWith(prefix)) {
					this.sessionDirs.delete(dir);
					this.sessionDirs.add(newKey + dir.slice(oldKey.length));
				}
			}
			this.emitter.fire([
				{ type: vscode.FileChangeType.Deleted, uri: oldUri },
				{ type: vscode.FileChangeType.Created, uri: newUri },
			]);
		});
	}

	// Called when dotfiles.files changed outside this provider, e.g. edited in
	// settings.json, changed by settings sync, or written back by autoUpdate.
	handleConfigurationChange(): void {
		const current = this.configuration.getFiles();
		const events: vscode.FileChangeEvent[] = [];
		const now = Date.now();
		for (const key of Object.keys(current)) {
			if (!has(this.snapshot, key)) {
				events.push({ type: vscode.FileChangeType.Created, uri: this.uriOf(key) });
				this.mtimes.set(key, now);
			} else if (this.snapshot[key] !== current[key]) {
				events.push({ type: vscode.FileChangeType.Changed, uri: this.uriOf(key) });
				this.mtimes.set(key, now);
			}
		}
		for (const key of Object.keys(this.snapshot)) {
			if (!has(current, key)) {
				events.push({ type: vscode.FileChangeType.Deleted, uri: this.uriOf(key) });
				this.mtimes.delete(key);
			}
		}
		this.snapshot = { ...current };
		if (events.length > 0) {
			this.emitter.fire(events);
		}
	}

	private serialize<T>(operation: () => Promise<T>): Promise<T> {
		const result = this.queue.then(operation);
		this.queue = result.catch(() => { });
		return result;
	}

	// Updating snapshot before the configuration change is applied means
	// handleConfigurationChange diffs this provider's own writes to nothing,
	// so only external changes produce file change events.
	//
	// Configuration.setFiles swallows errors, so check the setting really holds
	// what was written; otherwise restore the snapshot, resync it with whatever
	// the configuration contains and fail the operation.
	private async setFilesTracked(files: Files) {
		const previous = this.snapshot;
		this.snapshot = { ...files };
		await this.configuration.setFiles(files);
		if (!sameFiles(this.configuration.getFiles(), files)) {
			this.snapshot = previous;
			this.handleConfigurationChange();
			throw vscode.FileSystemError.Unavailable("Unable to update dotfiles.files");
		}
	}

	private isDirectory(key: string, files: Files): boolean {
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
