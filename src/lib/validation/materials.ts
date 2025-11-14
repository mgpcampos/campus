import { materialCreateSchema, materialSearchSchema } from '$lib/schemas/material.js'

/**
 * Re-export schemas for use with sveltekit-superforms
 */
export { materialCreateSchema, materialSearchSchema }

/**
 * Default values for material creation form
 */
export const materialCreateDefaults = {
	title: '',
	description: '',
	courseCode: '',
	tags: [],
	format: 'document',
	visibility: 'institution'
}

/**
 * Default values for material search form
 */
export const materialSearchDefaults = {
	q: '',
	tags: [],
	sort: 'relevance',
	page: 1,
	perPage: 20
}
