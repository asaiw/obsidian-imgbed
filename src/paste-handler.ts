import { Editor, MarkdownFileInfo, MarkdownView, Notice } from 'obsidian';
import {
	getUploadedImageUrl,
	uploadImage,
} from './imgbed-client';
import ImgBedPlugin from './main';
import { inferMimeType } from './images';

interface PastedImage {
	fileName: string;
	mimeType: string;
	data: ArrayBuffer;
}

export function registerPasteHandler(plugin: ImgBedPlugin) {
	plugin.registerEvent(
		plugin.app.workspace.on(
			'editor-paste',
			(evt: ClipboardEvent, editor: Editor, info: MarkdownView | MarkdownFileInfo) => {
				if (!plugin.settings.autoUploadPastedImages || evt.defaultPrevented || !info.file) {
					return;
				}

				const files = getImageFiles(evt);
				if (files.length === 0) {
					return;
				}

				evt.preventDefault();
				void uploadPastedImages(plugin, editor, files);
			},
		),
	);
}

function getImageFiles(evt: ClipboardEvent): File[] {
	const clipboardFiles = Array.from(evt.clipboardData?.files ?? []);
	const imageFiles = clipboardFiles.filter((file) => file.type.startsWith('image/'));
	if (imageFiles.length > 0) {
		return imageFiles;
	}

	const items = Array.from(evt.clipboardData?.items ?? []);
	return items
		.filter((item) => item.kind === 'file' && item.type.startsWith('image/'))
		.map((item) => item.getAsFile())
		.filter((file): file is File => file !== null);
}

async function uploadPastedImages(
	plugin: ImgBedPlugin,
	editor: Editor,
	files: File[],
) {
	const placeholders: string[] = [];
	const pastedImages = await Promise.all(files.map((file) => readPastedImage(file)));

	for (const image of pastedImages) {
		const placeholder = `![正在上传 ${image.fileName}...](#imgbed-upload-${Date.now()}-${Math.random()
			.toString(16)
			.slice(2)})`;
		placeholders.push(placeholder);
		editor.replaceSelection(placeholder);
	}

	new Notice(`正在上传 ${pastedImages.length} 张粘贴图片...`);

	for (let index = 0; index < pastedImages.length; index += 1) {
		const image = pastedImages[index];
		const placeholder = placeholders[index];
		if (!image || !placeholder) {
			continue;
		}

		try {
			const uploadedImage = await uploadImage(
				plugin.settings,
				image.fileName,
				image.mimeType,
				image.data,
			);
			const url = getUploadedImageUrl(plugin.settings, uploadedImage);
			replaceFirst(editor, placeholder, `![${image.fileName}](${url})`);
		} catch (error) {
			replaceFirst(editor, placeholder, '');
			console.error(`ImgBed: failed to upload pasted image ${image.fileName}`, error);
			new Notice(`粘贴图片上传失败：${getErrorMessage(error)}`);
		}
	}
}

function readPastedImage(file: File): Promise<PastedImage> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => {
			if (!(reader.result instanceof ArrayBuffer)) {
				reject(new Error('读取粘贴图片失败。'));
				return;
			}

			resolve({
				fileName: getPastedFileName(file),
				mimeType: file.type || inferMimeType(file.name),
				data: reader.result,
			});
		};
		reader.onerror = () => reject(reader.error ?? new Error('读取粘贴图片失败。'));
		reader.readAsArrayBuffer(file);
	});
}

function getPastedFileName(file: File): string {
	if (file.name) {
		return file.name;
	}

	const extension = file.type.split('/')[1] || 'png';
	return `pasted-image-${new Date().toISOString().replace(/[:.]/g, '-')}.${extension}`;
}

function replaceFirst(editor: Editor, search: string, replacement: string) {
	const markdown = editor.getValue();
	const start = markdown.indexOf(search);
	if (start === -1) {
		return;
	}

	editor.replaceRange(
		replacement,
		editor.offsetToPos(start),
		editor.offsetToPos(start + search.length),
	);
}

function getErrorMessage(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}
