import { requestUrl } from 'obsidian';
import { ImgBedSettings } from './settings';
import { UploadedImage } from './types';

function normalizeBaseUrl(baseUrl: string): string {
	return baseUrl.trim().replace(/\/+$/, '');
}

function appendQuery(url: URL, key: string, value: string | boolean) {
	if (value === '') {
		return;
	}
	url.searchParams.set(key, String(value));
}

function getAuthHeaders(settings: ImgBedSettings): Record<string, string> {
	if (settings.authMode !== 'token' || settings.apiToken === '') {
		return {};
	}

	return {
		Authorization: `Bearer ${settings.apiToken}`,
	};
}

function buildUploadUrl(settings: ImgBedSettings): string {
	const url = new URL(`${normalizeBaseUrl(settings.baseUrl)}/upload`);

	if (settings.authMode === 'authCode') {
		appendQuery(url, 'authCode', settings.authCode);
	}

	appendQuery(url, 'uploadChannel', settings.uploadChannel);
	appendQuery(url, 'channelName', settings.channelName);
	appendQuery(url, 'uploadFolder', settings.uploadFolder);
	appendQuery(url, 'uploadNameType', settings.uploadNameType);
	appendQuery(url, 'returnFormat', settings.returnFullUrl ? 'full' : 'default');
	appendQuery(url, 'serverCompress', settings.serverCompress);
	appendQuery(url, 'autoRetry', settings.autoRetry);

	return url.toString();
}

function parseUploadResponse(json: unknown): UploadedImage {
	const firstResult: unknown = Array.isArray(json) ? (json as unknown[])[0] : json;
	if (
		!firstResult ||
		typeof firstResult !== 'object' ||
		typeof (firstResult as UploadedImage).src !== 'string'
	) {
		throw new Error('Upload succeeded but response did not include an image URL.');
	}

	return firstResult as UploadedImage;
}

function getResponseError(json: unknown, fallback: string): string {
	if (json && typeof json === 'object') {
		const error = (json as { error?: unknown }).error;
		if (typeof error === 'string' && error !== '') {
			return error;
		}

		const message = (json as { message?: unknown }).message;
		if (typeof message === 'string' && message !== '') {
			return message;
		}
	}

	return fallback;
}

function escapeMultipartValue(value: string): string {
	return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\r|\n/g, ' ');
}

function createMultipartBody(
	fieldName: string,
	fileName: string,
	mimeType: string,
	data: ArrayBuffer,
): { body: ArrayBuffer; contentType: string } {
	const boundary = `----obsidian-imgbed-${Date.now()}-${Math.random()
		.toString(16)
		.slice(2)}`;
	const encoder = new TextEncoder();
	const header = encoder.encode(
		`--${boundary}\r\n` +
			`Content-Disposition: form-data; name="${escapeMultipartValue(fieldName)}"; filename="${escapeMultipartValue(fileName)}"\r\n` +
			`Content-Type: ${mimeType}\r\n\r\n`,
	);
	const fileBytes = new Uint8Array(data);
	const footer = encoder.encode(`\r\n--${boundary}--\r\n`);
	const bodyBytes = new Uint8Array(
		header.byteLength + fileBytes.byteLength + footer.byteLength,
	);

	bodyBytes.set(header, 0);
	bodyBytes.set(fileBytes, header.byteLength);
	bodyBytes.set(footer, header.byteLength + fileBytes.byteLength);

	return {
		body: bodyBytes.buffer,
		contentType: `multipart/form-data; boundary=${boundary}`,
	};
}

export function getUploadedImageUrl(
	settings: ImgBedSettings,
	image: UploadedImage,
): string {
	const url = image.publicUrl || image.src || image.fileUrl;
	if (!url) {
		throw new Error('Upload response did not include a usable image URL.');
	}

	if (/^https?:\/\//i.test(url)) {
		return url;
	}

	return `${normalizeBaseUrl(settings.baseUrl)}/${url.replace(/^\/+/, '')}`;
}

export async function uploadImage(
	settings: ImgBedSettings,
	fileName: string,
	mimeType: string,
	data: ArrayBuffer,
): Promise<UploadedImage> {
	if (settings.baseUrl.trim() === '') {
		throw new Error('Set the ImgBed service URL first.');
	}

	if (settings.authMode === 'token' && settings.apiToken === '') {
		throw new Error('Set the ImgBed API token first.');
	}

	if (settings.authMode === 'authCode' && settings.authCode === '') {
		throw new Error('Set the ImgBed upload auth code first.');
	}

	const multipart = createMultipartBody('file', fileName, mimeType, data);
	const headers = {
		...getAuthHeaders(settings),
		'Content-Type': multipart.contentType,
	};

	const response = await requestUrl({
		url: buildUploadUrl(settings),
		method: 'POST',
		headers,
		body: multipart.body,
		throw: false,
	});

	const json = response.json as unknown;
	if (response.status < 200 || response.status >= 300) {
		throw new Error(getResponseError(json, `Upload failed with HTTP ${response.status}.`));
	}

	return parseUploadResponse(json);
}

export function extractFileIdFromRemoteUrl(settings: ImgBedSettings, url: string): string | null {
	const trimmedUrl = url.trim();
	if (trimmedUrl === '') {
		return null;
	}

	if (trimmedUrl.startsWith('/file/')) {
		return decodeURIComponent(trimmedUrl.slice('/file/'.length));
	}

	if (trimmedUrl.startsWith('/')) {
		return decodeURIComponent(trimmedUrl.replace(/^\/+/, ''));
	}

	try {
		const parsedUrl = new URL(trimmedUrl);
		const prefix = '/file/';
		if (parsedUrl.pathname.startsWith(prefix)) {
			return decodeURIComponent(parsedUrl.pathname.slice(prefix.length));
		}

		return decodeURIComponent(parsedUrl.pathname.replace(/^\/+/, ''));
	} catch {
		return null;
	}
}

export async function deleteImage(
	settings: ImgBedSettings,
	fileId: string,
): Promise<void> {
	if (settings.apiToken === '') {
		throw new Error('Set an API token with delete permission first.');
	}

	const encodedPath = fileId
		.split('/')
		.map((part) => encodeURIComponent(part))
		.join('/');
	const url = `${normalizeBaseUrl(settings.baseUrl)}/api/manage/delete/${encodedPath}`;
	const response = await requestUrl({
		url,
		method: 'GET',
		headers: {
			Authorization: `Bearer ${settings.apiToken}`,
		},
		throw: false,
	});

	const json = response.json as unknown;
	if (response.status < 200 || response.status >= 300) {
		throw new Error(getResponseError(json, `Delete failed with HTTP ${response.status}.`));
	}

	if (
		json &&
		typeof json === 'object' &&
		(json as { success?: unknown }).success === false
	) {
		throw new Error(getResponseError(json, 'Delete failed.'));
	}
}
