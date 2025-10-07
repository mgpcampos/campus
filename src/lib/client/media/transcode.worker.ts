/// <reference lib="webworker" />

import { ArrayBufferTarget, Muxer } from 'mp4-muxer';
import type {
	TranscodeAudioDataMessage,
	TranscodeConfigureMessage,
	TranscodeWorkerMessage,
	TranscodeWorkerResponse,
	TranscodeVideoFrameMessage
} from './transcode.types';

type JobContext = {
	readonly muxer: Muxer<ArrayBufferTarget>;
	readonly target: ArrayBufferTarget;
	readonly videoEncoder: VideoEncoder;
	readonly audioEncoder?: AudioEncoder;
	readonly expectFrames?: number;
	encodedFrames: number;
};

const activeJobs = new Map<string, JobContext>();

const workerContext = self as unknown as DedicatedWorkerGlobalScope;
const webCodecsScope = globalThis as typeof globalThis & {
	VideoEncoder?: typeof VideoEncoder;
	AudioEncoder?: typeof AudioEncoder;
};

function post(message: TranscodeWorkerResponse, transfer: Transferable[] = []) {
	workerContext.postMessage(message, { transfer });
}

function ensureJob(jobId: string): JobContext {
	const job = activeJobs.get(jobId);
	if (!job) {
		throw new Error(`Unknown transcode job: ${jobId}`);
	}
	return job;
}

async function handleConfigure(message: TranscodeConfigureMessage) {
	const VideoEncoderCtor = webCodecsScope.VideoEncoder;
	if (!VideoEncoderCtor) {
		post({ type: 'unsupported', jobId: message.jobId, reason: 'no-webcodecs' });
		return;
	}

	const {
		options: {
			width,
			height,
			fps,
			bitrate,
			codec = 'avc1.42001E',
			hardwareAcceleration = 'prefer-hardware',
			audio,
			expectFrames
		}
	} = message;

	const encoderConfig: VideoEncoderConfig = {
		codec,
		width,
		height,
		bitrate,
		framerate: fps,
		hardwareAcceleration: hardwareAcceleration as VideoEncoderConfig['hardwareAcceleration'],
		avc: { format: 'annexb' }
	};

	try {
		const support = await VideoEncoderCtor.isConfigSupported(encoderConfig);
		if (!support.supported) {
			post({ type: 'unsupported', jobId: message.jobId, reason: 'codec' });
			return;
		}
	} catch (error) {
		post({ type: 'unsupported', jobId: message.jobId, reason: 'codec' });
		return;
	}

	const target = new ArrayBufferTarget();
	const muxer = new Muxer<ArrayBufferTarget>({
		target,
		video: {
			codec: 'avc',
			width,
			height,
			frameRate: fps
		},
		audio: audio
			? {
					codec: 'aac',
					numberOfChannels: audio.channels,
					sampleRate: audio.sampleRate
				}
			: undefined,
		firstTimestampBehavior: 'offset',
		fastStart: 'in-memory'
	});

	const videoEncoder = new VideoEncoderCtor({
		output(chunk: EncodedVideoChunk, metadata?: EncodedVideoChunkMetadata) {
			muxer.addVideoChunk(chunk, metadata);
		},
		error(error: unknown) {
			post({
				type: 'error',
				jobId: message.jobId,
				error: error instanceof Error ? error.message : String(error)
			});
		}
	});

	await videoEncoder.configure(encoderConfig);

	let audioEncoder: AudioEncoder | undefined;

	if (audio) {
		const AudioEncoderCtor = webCodecsScope.AudioEncoder;
		if (!AudioEncoderCtor) {
			post({ type: 'unsupported', jobId: message.jobId, reason: 'codec' });
			videoEncoder.close();
			muxer.finalize?.();
			return;
		}

		const audioConfig: AudioEncoderConfig = {
			codec: 'mp4a.40.2',
			numberOfChannels: audio.channels,
			sampleRate: audio.sampleRate,
			bitrate: audio.bitrate ?? 128_000
		};

		try {
			const support = await AudioEncoderCtor.isConfigSupported(audioConfig);
			if (!support.supported) {
				post({ type: 'unsupported', jobId: message.jobId, reason: 'codec' });
				videoEncoder.close();
				muxer.finalize?.();
				return;
			}
		} catch (error) {
			post({ type: 'unsupported', jobId: message.jobId, reason: 'codec' });
			videoEncoder.close();
			muxer.finalize?.();
			return;
		}

		audioEncoder = new AudioEncoderCtor({
			output(chunk: EncodedAudioChunk, metadata?: EncodedAudioChunkMetadata) {
				muxer.addAudioChunk(chunk, metadata);
			},
			error(error: unknown) {
				post({
					type: 'error',
					jobId: message.jobId,
					error: error instanceof Error ? error.message : String(error)
				});
			}
		});

		if (audioEncoder) {
			audioEncoder.configure(audioConfig);
		}
	}

	activeJobs.set(message.jobId, {
		muxer,
		target,
		videoEncoder,
		audioEncoder,
		expectFrames,
		encodedFrames: 0
	});

	post({ type: 'ready', jobId: message.jobId });
}

async function handleVideoFrame(message: TranscodeVideoFrameMessage) {
	const job = ensureJob(message.jobId);
	try {
		job.videoEncoder.encode(message.frame, { keyFrame: message.keyFrame ?? false });
		job.encodedFrames += 1;
		post({
			type: 'progress',
			jobId: message.jobId,
			encodedFrames: job.encodedFrames,
			expectFrames: job.expectFrames
		});
	} finally {
		message.frame.close();
	}
}

async function handleAudioData(message: TranscodeAudioDataMessage) {
	const job = ensureJob(message.jobId);
	if (!job.audioEncoder) {
		message.data.close();
		return;
	}
	try {
		job.audioEncoder.encode(message.data);
	} finally {
		message.data.close();
	}
}

async function finalizeJob(jobId: string) {
	const job = activeJobs.get(jobId);
	if (!job) return;
	try {
		await job.videoEncoder.flush();
		if (job.audioEncoder) {
			await job.audioEncoder.flush();
		}
		job.muxer.finalize();
		const buffer = job.target.buffer;
		if (buffer) {
			post({ type: 'complete', jobId, buffer }, [buffer]);
		} else {
			post({
				type: 'error',
				jobId,
				error: 'No buffer produced by muxer'
			});
		}
	} catch (error) {
		post({
			type: 'error',
			jobId,
			error: error instanceof Error ? error.message : String(error)
		});
	} finally {
		job.videoEncoder.close();
		job.audioEncoder?.close();
		activeJobs.delete(jobId);
	}
}

async function cancelJob(jobId: string) {
	const job = activeJobs.get(jobId);
	if (!job) return;
	try {
		await job.videoEncoder.flush().catch(() => undefined);
	} finally {
		job.videoEncoder.close();
		if (job.audioEncoder) {
			await job.audioEncoder.flush().catch(() => undefined);
			job.audioEncoder.close();
		}
		activeJobs.delete(jobId);
	}
}

workerContext.onmessage = (event: MessageEvent<TranscodeWorkerMessage>) => {
	switch (event.data.type) {
		case 'configure':
			handleConfigure(event.data).catch((error) => {
				post({
					type: 'error',
					jobId: event.data.jobId,
					error: error instanceof Error ? error.message : String(error)
				});
			});
			break;
		case 'video-frame':
			handleVideoFrame(event.data).catch((error) => {
				post({
					type: 'error',
					jobId: event.data.jobId,
					error: error instanceof Error ? error.message : String(error)
				});
			});
			break;
		case 'audio-data':
			handleAudioData(event.data).catch((error) => {
				post({
					type: 'error',
					jobId: event.data.jobId,
					error: error instanceof Error ? error.message : String(error)
				});
			});
			break;
		case 'flush':
			finalizeJob(event.data.jobId).catch((error) => {
				post({
					type: 'error',
					jobId: event.data.jobId,
					error: error instanceof Error ? error.message : String(error)
				});
			});
			break;
		case 'cancel':
			cancelJob(event.data.jobId).catch(() => undefined);
			break;
		default:
			break;
	}
};

export {};
