export type PosterCaptureOptions = {
	/** Timestamp in seconds to sample. Defaults to 1s or midpoint when duration < 2s. */
	timestamp?: number;
	/** Desired width in pixels. Height will be scaled automatically when not provided. */
	width?: number;
	/** Desired height in pixels. If omitted, aspect ratio from the source video is preserved. */
	height?: number;
	/** Image MIME type for the generated poster. */
	mimeType?: 'image/jpeg' | 'image/png' | 'image/webp';
	/** Quality hint passed to canvas encoding (0-1). */
	quality?: number;
	/** Optional abort signal to cancel capture. */
	signal?: AbortSignal;
};

export type PosterCaptureResult = {
	blob: Blob;
	width: number;
	height: number;
	timestamp: number;
	duration: number;
};

function throwIfAborted(signal: AbortSignal | undefined) {
	if (signal?.aborted) {
		throw new DOMException('Poster capture aborted', 'AbortError');
	}
}

function waitForEvent(target: EventTarget, event: string, signal?: AbortSignal) {
	return new Promise<void>((resolve, reject) => {
		const onAbort = () => {
			target.removeEventListener(event, onEvent, true);
			reject(new DOMException('Poster capture aborted', 'AbortError'));
		};
		const onEvent = () => {
			signal?.removeEventListener('abort', onAbort);
			resolve();
		};
		target.addEventListener(event, onEvent, { once: true, passive: true });
		if (signal) {
			signal.addEventListener('abort', onAbort, { once: true });
		}
	});
}

function chooseTimestamp(duration: number): number {
	if (!Number.isFinite(duration) || duration <= 0) return 0;
	if (duration <= 2) return Math.min(0.5 * duration, duration - 0.05);
	return Math.min(1, duration / 2);
}

function resolveDimensions(
	sourceWidth: number,
	sourceHeight: number,
	requestedWidth?: number,
	requestedHeight?: number
): { width: number; height: number } {
	if (requestedWidth && requestedHeight) {
		return { width: requestedWidth, height: requestedHeight };
	}
	if (requestedWidth) {
		const aspect = sourceHeight / sourceWidth;
		return { width: requestedWidth, height: Math.round(requestedWidth * aspect) };
	}
	if (requestedHeight) {
		const aspect = sourceWidth / sourceHeight;
		return { width: Math.round(requestedHeight * aspect), height: requestedHeight };
	}
	return { width: sourceWidth, height: sourceHeight };
}

/**
 * Capture a poster frame from a user-selected video file using a hidden video element and canvas.
 */
export async function capturePosterFromFile(
	file: File,
	options: PosterCaptureOptions = {}
): Promise<PosterCaptureResult> {
	if (typeof document === 'undefined') {
		throw new Error('Poster capture requires a browser environment');
	}

	const { signal } = options;
	throwIfAborted(signal);

	const video = document.createElement('video');
	video.muted = true;
	video.playsInline = true;
	video.preload = 'auto';
	video.crossOrigin = 'anonymous';

	const objectUrl = URL.createObjectURL(file);
	video.src = objectUrl;

	try {
		await Promise.race([
			waitForEvent(video, 'loadedmetadata', signal),
			waitForEvent(video, 'error', signal).then(() => {
				throw new Error('Failed to load video metadata');
			})
		]);

		throwIfAborted(signal);

		const duration = Number.isFinite(video.duration) ? video.duration : 0;
		const sampleTimestamp = options.timestamp ?? chooseTimestamp(duration);

		if (Number.isFinite(sampleTimestamp) && sampleTimestamp > 0) {
			await new Promise<void>((resolve, reject) => {
				const onSeeked = () => {
					video.removeEventListener('seeked', onSeeked);
					resolve();
				};
				const onError = () => {
					video.removeEventListener('seeked', onSeeked);
					reject(new Error('Unable to seek to requested poster timestamp'));
				};
				video.addEventListener('seeked', onSeeked, { once: true });
				video.addEventListener('error', onError, { once: true });
				try {
					video.currentTime = sampleTimestamp;
				} catch (error) {
					video.removeEventListener('seeked', onSeeked);
					video.removeEventListener('error', onError);
					reject(error);
				}
			});
		}

		throwIfAborted(signal);

		const { width, height } = resolveDimensions(
			video.videoWidth,
			video.videoHeight,
			options.width,
			options.height
		);

		const canvas =
			typeof OffscreenCanvas !== 'undefined'
				? new OffscreenCanvas(width, height)
				: Object.assign(document.createElement('canvas'), { width, height });

		const context = canvas.getContext('2d');
		if (!context) {
			throw new Error('Unable to create 2D context for poster rendering');
		}

		context.drawImage(video, 0, 0, width, height);

		let blob: Blob | null = null;
		if (canvas instanceof OffscreenCanvas) {
			blob = await canvas.convertToBlob({
				type: options.mimeType ?? 'image/jpeg',
				quality: options.quality ?? 0.92
			});
		} else {
			blob = await new Promise<Blob | null>((resolve) =>
				canvas.toBlob(
					(result) => resolve(result),
					options.mimeType ?? 'image/jpeg',
					options.quality ?? 0.92
				)
			);
		}

		if (!blob) {
			throw new Error('Failed to produce poster blob');
		}

		return {
			blob,
			width,
			height,
			timestamp: sampleTimestamp,
			duration
		};
	} finally {
		URL.revokeObjectURL(objectUrl);
		video.removeAttribute('src');
		video.load();
	}
}
