import { spawn } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import sharp from 'sharp'

export type ThumbnailFormat = 'jpeg' | 'png' | 'webp'

export type ThumbnailOptions = {
	timestamp?: number
	width?: number
	height?: number
	format?: ThumbnailFormat
	quality?: number
	signal?: AbortSignal
}

export type ThumbnailResult = {
	buffer: Buffer
	width: number
	height: number
	format: ThumbnailFormat
	timestamp: number
}

type VideoSource = { path: string } | { buffer: ArrayBuffer | ArrayBufferView | Buffer }

function isPathSource(source: VideoSource): source is { path: string } {
	return typeof (source as { path?: string }).path === 'string'
}

async function createTempDir() {
	return await mkdtemp(path.join(tmpdir(), 'campus-thumb-'))
}

async function runFfmpeg(
	inputPath: string,
	outputPath: string,
	options: ThumbnailOptions
): Promise<void> {
	const timestamp =
		Number.isFinite(options.timestamp) && options.timestamp !== undefined ? options.timestamp : 1
	const vf: string[] = []
	if (options.width || options.height) {
		const width = options.width ?? -1
		const height = options.height ?? -1
		vf.push(`scale=${width}:${height}:flags=lanczos`)
	}
	const args: string[] = ['-y']
	if (timestamp > 0) {
		args.push('-ss', timestamp.toFixed(3))
	}
	args.push('-i', inputPath, '-frames:v', '1')
	if (vf.length > 0) {
		args.push('-vf', vf.join(','))
	}
	args.push('-f', 'image2', outputPath)

	await new Promise<void>((resolve, reject) => {
		const child = spawn('ffmpeg', args, { stdio: 'ignore' })
		const onAbort = () => {
			child.kill('SIGKILL')
			reject(new DOMException('Thumbnail extraction aborted', 'AbortError'))
		}

		const onExit = (code: number | null, signal: NodeJS.Signals | null) => {
			options.signal?.removeEventListener('abort', onAbort)
			if (code === 0 && signal === null) {
				resolve()
			} else {
				reject(new Error(`ffmpeg exited with code ${code ?? 'null'} signal ${signal ?? 'null'}`))
			}
		}

		child.on('error', reject)
		child.on('close', onExit)
		if (options.signal) {
			options.signal.addEventListener('abort', onAbort, { once: true })
		}
	})
}

async function convertWithSharp(
	buffer: Buffer,
	options: ThumbnailOptions
): Promise<{ buffer: Buffer; width: number; height: number }> {
	const sharpInstance = sharp(buffer, { failOn: 'none' })
	if (options.width || options.height) {
		sharpInstance.resize({
			width: options.width,
			height: options.height,
			fit: 'inside',
			fastShrinkOnLoad: true
		})
	}

	const format = options.format ?? 'jpeg'
	const quality = options.quality

	switch (format) {
		case 'png':
			sharpInstance.png({ compressionLevel: 9 })
			break
		case 'webp':
			sharpInstance.webp({ quality: quality ? Math.round(quality * 100) : 75 })
			break
		default:
			sharpInstance.jpeg({ quality: quality ? Math.round(quality * 100) : 92, mozjpeg: true })
	}

	const output = await sharpInstance.toBuffer({ resolveWithObject: true })
	return {
		buffer: output.data,
		width: output.info.width,
		height: output.info.height
	}
}

async function persistBuffer(
	dir: string,
	data: ArrayBuffer | ArrayBufferView | Buffer
): Promise<string> {
	const filename = `${randomUUID()}-source`
	const targetPath = path.join(dir, filename)
	const buffer =
		data instanceof Buffer
			? data
			: data instanceof ArrayBuffer
				? Buffer.from(data)
				: Buffer.from(data.buffer, data.byteOffset, data.byteLength)
	await writeFile(targetPath, buffer)
	return targetPath
}

export async function generateVideoThumbnail(
	source: VideoSource,
	options: ThumbnailOptions = {}
): Promise<ThumbnailResult | null> {
	let dir: string | null = null
	let inputPath = ''
	let outputPath = ''
	try {
		dir = await createTempDir()
		inputPath = isPathSource(source) ? source.path : await persistBuffer(dir, source.buffer)
		outputPath = path.join(dir, `${randomUUID()}-poster.png`)

		await runFfmpeg(inputPath, outputPath, options)
		const rawPoster = await readFile(outputPath)
		const converted = await convertWithSharp(rawPoster, options)

		return {
			buffer: converted.buffer,
			width: converted.width,
			height: converted.height,
			format: options.format ?? 'jpeg',
			timestamp:
				Number.isFinite(options.timestamp) && options.timestamp !== undefined
					? options.timestamp
					: 1
		}
	} catch (error) {
		if (error instanceof DOMException && error.name === 'AbortError') {
			throw error
		}
		if ((error as NodeJS.ErrnoException)?.code === 'ENOENT') {
			return null
		}
		return null
	} finally {
		if (dir) {
			await rm(dir, { recursive: true, force: true })
		}
	}
}

export async function isFfmpegAvailable(): Promise<boolean> {
	try {
		await new Promise<void>((resolve, reject) => {
			const child = spawn('ffmpeg', ['-version'], { stdio: 'ignore' })
			child.once('error', reject)
			child.once('close', (code) => {
				if (code === 0) {
					resolve()
				} else {
					reject(new Error('ffmpeg exited with non-zero code'))
				}
			})
		})
		return true
	} catch {
		return false
	}
}
