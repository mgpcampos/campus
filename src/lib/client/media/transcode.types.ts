export type HardwareAccelerationPreference =
	| 'prefer-hardware'
	| 'require-hardware'
	| 'prefer-software'
	| 'deny';

export type TranscodeAudioOptions = {
	readonly channels: number;
	readonly sampleRate: number;
	readonly bitrate?: number;
};

export type TranscodeJobOptions = {
	readonly width: number;
	readonly height: number;
	readonly fps: number;
	readonly bitrate: number;
	readonly codec?: string;
	readonly hardwareAcceleration?: HardwareAccelerationPreference;
	readonly audio?: TranscodeAudioOptions;
	readonly expectFrames?: number;
};

export type TranscodeConfigureMessage = {
	readonly type: 'configure';
	readonly jobId: string;
	readonly options: TranscodeJobOptions;
};

export type TranscodeVideoFrameMessage = {
	readonly type: 'video-frame';
	readonly jobId: string;
	readonly frame: VideoFrame;
	readonly keyFrame?: boolean;
};

export type TranscodeAudioDataMessage = {
	readonly type: 'audio-data';
	readonly jobId: string;
	readonly data: AudioData;
};

export type TranscodeFlushMessage = { readonly type: 'flush'; readonly jobId: string };
export type TranscodeCancelMessage = { readonly type: 'cancel'; readonly jobId: string };

export type TranscodeWorkerMessage =
	| TranscodeConfigureMessage
	| TranscodeVideoFrameMessage
	| TranscodeAudioDataMessage
	| TranscodeFlushMessage
	| TranscodeCancelMessage;

export type TranscodeProgressMessage = {
	readonly type: 'progress';
	readonly jobId: string;
	readonly encodedFrames: number;
	readonly expectFrames?: number;
};

export type TranscodeReadyMessage = { readonly type: 'ready'; readonly jobId: string };
export type TranscodeUnsupportedMessage = {
	readonly type: 'unsupported';
	readonly jobId: string;
	readonly reason: 'no-webcodecs' | 'codec';
};

export type TranscodeErrorMessage = {
	readonly type: 'error';
	readonly jobId: string;
	readonly error: string;
};

export type TranscodeCompleteMessage = {
	readonly type: 'complete';
	readonly jobId: string;
	readonly buffer: ArrayBuffer;
};

export type TranscodeWorkerResponse =
	| TranscodeProgressMessage
	| TranscodeReadyMessage
	| TranscodeUnsupportedMessage
	| TranscodeErrorMessage
	| TranscodeCompleteMessage;
