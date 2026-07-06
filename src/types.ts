export interface LocalImageMatch {
	fullMatch: string;
	altText: string;
	path: string;
	start: number;
	end: number;
}

export interface UploadedImage {
	src: string;
	publicUrl?: string;
	fullId?: string;
	fileUrl?: string;
}
