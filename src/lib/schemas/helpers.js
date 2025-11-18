import { z } from 'zod'

/**
 * @typedef {{ name?: string; size?: number; arrayBuffer?: () => Promise<ArrayBuffer> | ArrayBuffer; type?: string }} MaybeFile
 */

const FileCtor =
	globalThis !== undefined && globalThis.File !== undefined ? globalThis.File : undefined

/**
 * @param {unknown} value
 * @returns {boolean}
 */
const isFileLike = (value) => {
	if (!value || typeof value !== 'object') {
		return false
	}

	if (FileCtor && value instanceof FileCtor) {
		return true
	}

	const name = Reflect.get(value, 'name')
	const size = Reflect.get(value, 'size')
	const arrayBuffer = Reflect.get(value, 'arrayBuffer')

	return typeof name === 'string' && typeof size === 'number' && typeof arrayBuffer === 'function'
}

export const fileLikeSchema = z.custom((value) => isFileLike(value), {
	message: 'Invalid file upload'
})

/**
 * @param {number} maxFiles
 * @param {string} message
 */
export const fileArraySchema = (maxFiles, message) =>
	z.array(fileLikeSchema).max(maxFiles, message).default([])
