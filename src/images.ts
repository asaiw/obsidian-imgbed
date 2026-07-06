import { App, TFile } from 'obsidian';
import { LocalImageMatch } from './types';

const MARKDOWN_IMAGE_REGEX = /!\[([^\]]*)\]\(([^)]+)\)/g;
const WIKI_IMAGE_REGEX = /!\[\[([^\]|#]+)(?:#[^\]|]+)?(?:\|[^\]]*)?\]\]/g;
const IMAGE_EXTENSIONS = new Set([
	'avif',
	'bmp',
	'gif',
	'jpeg',
	'jpg',
	'png',
	'svg',
	'webp',
]);

function stripWrappedPath(rawPath: string): string {
	const trimmedPath = rawPath.trim();
	if (
		(trimmedPath.startsWith('<') && trimmedPath.endsWith('>')) ||
		(trimmedPath.startsWith('"') && trimmedPath.endsWith('"')) ||
		(trimmedPath.startsWith("'") && trimmedPath.endsWith("'"))
	) {
		return trimmedPath.slice(1, -1).trim();
	}

	return trimmedPath;
}

function isRemotePath(path: string): boolean {
	return /^[a-z][a-z\d+.-]*:/i.test(path) || path.startsWith('//');
}

function isImagePath(path: string): boolean {
	const cleanPath = path.split(/[?#]/)[0] || path;
	const extension = cleanPath.split('.').pop()?.toLowerCase();
	return extension ? IMAGE_EXTENSIONS.has(extension) : false;
}

export function findLocalImages(markdown: string): LocalImageMatch[] {
	const matches: LocalImageMatch[] = [];

	for (const match of markdown.matchAll(MARKDOWN_IMAGE_REGEX)) {
		const fullMatch = match[0];
		const rawPath = match[2];
		const index = match.index;
		if (rawPath === undefined || index === undefined) {
			continue;
		}

		const path = stripWrappedPath(rawPath);
		if (!isRemotePath(path) && isImagePath(path)) {
			matches.push({
				fullMatch,
				altText: match[1] ?? '',
				path,
				start: index,
				end: index + fullMatch.length,
			});
		}
	}

	for (const match of markdown.matchAll(WIKI_IMAGE_REGEX)) {
		const fullMatch = match[0];
		const rawPath = match[1];
		const index = match.index;
		if (rawPath === undefined || index === undefined) {
			continue;
		}

		const path = stripWrappedPath(rawPath);
		if (!isRemotePath(path) && isImagePath(path)) {
			matches.push({
				fullMatch,
				altText: path.split('/').pop() ?? path,
				path,
				start: index,
				end: index + fullMatch.length,
			});
		}
	}

	return matches.sort((a, b) => a.start - b.start);
}

export function resolveImageFile(app: App, sourceFile: TFile, imagePath: string): TFile | null {
	const decodedPath = decodeURIComponent(imagePath);
	const linkedFile = app.metadataCache.getFirstLinkpathDest(
		decodedPath,
		sourceFile.path,
	);
	if (linkedFile instanceof TFile) {
		return linkedFile;
	}

	const directFile = app.vault.getAbstractFileByPath(decodedPath);
	return directFile instanceof TFile ? directFile : null;
}

export function inferMimeType(fileName: string): string {
	const extension = fileName.split('.').pop()?.toLowerCase();
	switch (extension) {
		case 'avif':
			return 'image/avif';
		case 'bmp':
			return 'image/bmp';
		case 'gif':
			return 'image/gif';
		case 'jpg':
		case 'jpeg':
			return 'image/jpeg';
		case 'png':
			return 'image/png';
		case 'svg':
			return 'image/svg+xml';
		case 'webp':
			return 'image/webp';
		default:
			return 'application/octet-stream';
	}
}

export function replaceRanges(
	markdown: string,
	replacements: Array<{ start: number; end: number; value: string }>,
): string {
	let nextMarkdown = markdown;
	for (const replacement of [...replacements].sort((a, b) => b.start - a.start)) {
		nextMarkdown =
			nextMarkdown.slice(0, replacement.start) +
			replacement.value +
			nextMarkdown.slice(replacement.end);
	}

	return nextMarkdown;
}
