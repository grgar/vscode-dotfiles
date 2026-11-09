/**
 * Whether a `dotfiles.files` key applies on the given platform.
 *
 * Keys using backslash separators are for Windows and keys using forward slash separators are for Linux/macOS. The
 * two are deliberately not mapped to each other: the separator only selects which environment a file is written on.
 * A key without a separator applies everywhere, and a key mixing both separators applies nowhere.
 */
export function appliesToPlatform(file: string, platform: NodeJS.Platform = process.platform): boolean {
	const foreignSeparator = platform === "win32" ? "/" : "\\";
	return !file.includes(foreignSeparator);
}

/** Picks the entries of a `dotfiles.files` object that apply on the given platform. */
export function filterFiles(files: { [key: string]: string; }, platform: NodeJS.Platform = process.platform) {
	return Object.fromEntries(Object.entries(files).filter(([file]) => appliesToPlatform(file, platform)));
}
