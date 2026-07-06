import { Editor, MarkdownFileInfo, MarkdownView, Notice } from 'obsidian';
import ImgBedPlugin from './main';
import {
	deleteImage,
	extractFileIdFromRemoteUrl,
	getUploadedImageUrl,
	uploadImage,
} from './imgbed-client';
import {
	findLocalImages,
	inferMimeType,
	replaceRanges,
	resolveImageFile,
} from './images';

const REMOTE_IMAGE_AT_CURSOR_REGEX = /!\[[^\]]*\]\(([^)]+)\)/g;

interface SelectedImage {
	url: string;
	fromOffset: number;
	toOffset: number;
}

export function registerCommands(plugin: ImgBedPlugin) {
	plugin.addCommand({
		id: 'upload-local-images-in-current-note',
		name: '上传当前文档中的本地图片',
		checkCallback: (checking) => {
			const view = plugin.app.workspace.getActiveViewOfType(MarkdownView);
			if (!view?.file) {
				return false;
			}

			if (!checking) {
				void uploadLocalImagesInCurrentNote(plugin, view);
			}

			return true;
		},
	});

	plugin.addCommand({
		id: 'delete-remote-image-at-cursor',
		name: '删除图床图片',
		editorCheckCallback: (
			checking: boolean,
			editor: Editor,
			ctx: MarkdownView | MarkdownFileInfo,
		) => {
			if (!ctx.file) {
				return false;
			}

			const image = getSelectedImage(editor) ?? getImageAtCursor(editor);
			const fileId = image
				? extractFileIdFromRemoteUrl(plugin.settings, image.url)
				: null;
			if (!image || !fileId) {
				return false;
			}

			if (!checking) {
				void deleteRemoteImageAtCursor(plugin, editor, fileId, image);
			}

			return true;
		},
	});
}

async function uploadLocalImagesInCurrentNote(
	plugin: ImgBedPlugin,
	view: MarkdownView,
) {
	if (!view.file) {
		return;
	}

	const markdown = view.editor.getValue();
	const images = findLocalImages(markdown);
	if (images.length === 0) {
		new Notice('当前文档中没有找到本地图片。');
		return;
	}

	const replacements: Array<{ start: number; end: number; value: string }> = [];
	let uploadedCount = 0;
	let skippedCount = 0;

	new Notice(`正在上传 ${images.length} 张本地图片...`);

	for (const image of images) {
		const imageFile = resolveImageFile(plugin.app, view.file, image.path);
		if (!imageFile) {
			skippedCount += 1;
			console.warn(`ImgBed: could not resolve local image: ${image.path}`);
			continue;
		}

		try {
			const data = await plugin.app.vault.readBinary(imageFile);
			const uploadedImage = await uploadImage(
				plugin.settings,
				imageFile.name,
				inferMimeType(imageFile.name),
				data,
			);
			const url = getUploadedImageUrl(plugin.settings, uploadedImage);
			replacements.push({
				start: image.start,
				end: image.end,
				value: `![${image.altText}](${url})`,
			});
			uploadedCount += 1;
		} catch (error) {
			skippedCount += 1;
			console.error(`ImgBed: failed to upload ${image.path}`, error);
			new Notice(`上传失败：${image.path}，${getErrorMessage(error)}`);
		}
	}

	if (replacements.length > 0) {
		view.editor.setValue(replaceRanges(markdown, replacements));
	}

	new Notice(`已上传 ${uploadedCount} 张图片，跳过 ${skippedCount} 张。`);
}

function getSelectedImage(editor: Editor): SelectedImage | null {
	const selection = editor.getSelection().trim();
	if (selection === '') {
		return null;
	}

	const imageUrl = getUrlFromImageMarkdown(selection) ?? selection;
	const cursor = editor.getCursor('from');
	const fromOffset = editor.posToOffset(cursor);
	return {
		url: imageUrl.trim(),
		fromOffset,
		toOffset: fromOffset + editor.getSelection().length,
	};
}

function getImageAtCursor(editor: Editor): SelectedImage | null {
	const cursor = editor.getCursor();
	const offset = editor.posToOffset(cursor);
	const markdown = editor.getValue();

	for (const match of markdown.matchAll(REMOTE_IMAGE_AT_CURSOR_REGEX)) {
		const start = match.index;
		const fullMatch = match[0];
		const url = match[1];
		if (start === undefined || url === undefined) {
			continue;
		}

		const end = start + fullMatch.length;
		if (offset >= start && offset <= end) {
			return {
				url: url.trim(),
				fromOffset: start,
				toOffset: end,
			};
		}
	}

	return null;
}

function getUrlFromImageMarkdown(markdown: string): string | null {
	const match = markdown.match(/^!\[[^\]]*\]\(([^)]+)\)$/);
	return match?.[1] ?? null;
}

async function deleteRemoteImageAtCursor(
	plugin: ImgBedPlugin,
	editor: Editor,
	fileId: string,
	image: SelectedImage,
) {
	try {
		await deleteImage(plugin.settings, fileId);
		new Notice(`已删除图床文件：${fileId}`);

		editor.replaceRange(
			'',
			editor.offsetToPos(image.fromOffset),
			editor.offsetToPos(image.toOffset),
		);
	} catch (error) {
		console.error(`ImgBed: failed to delete ${fileId}`, error);
		new Notice(`删除失败：${fileId}，${getErrorMessage(error)}`);
	}
}

function getErrorMessage(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}
