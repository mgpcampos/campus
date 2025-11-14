import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { load } from 'js-yaml'
import { describe, expect, it } from 'vitest'

type OpenApiSchema = {
	type?: string
	enum?: string[]
	items?: OpenApiSchema
	$ref?: string
	properties?: Record<string, OpenApiSchema>
}

type OpenApiParameter = {
	name?: string
	required?: boolean
	schema?: OpenApiSchema
}

type OpenApiMediaType = {
	schema?: OpenApiSchema
}

type OpenApiResponse = {
	content?: Record<string, OpenApiMediaType>
}

type OpenApiRequestBody = {
	content?: Record<string, OpenApiMediaType>
}

type OpenApiOperation = {
	security?: Record<string, unknown>[]
	requestBody?: OpenApiRequestBody
	responses?: Record<string, OpenApiResponse>
	parameters?: OpenApiParameter[]
}

type OpenApiPathItem = {
	get?: OpenApiOperation
	post?: OpenApiOperation
}

type OpenApiSpec = {
	paths: Record<string, OpenApiPathItem>
}

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const specPath = path.resolve(
	__dirname,
	'../../specs/001-this-is-a/contracts/campus-collaboration.openapi.yaml'
)

function loadSpec(): OpenApiSpec {
	const raw = readFileSync(specPath, 'utf8')
	const parsed = load(raw) as OpenApiSpec | undefined
	if (!parsed || typeof parsed !== 'object' || !parsed.paths) {
		throw new Error('Unable to load materials contract from OpenAPI spec.')
	}
	return parsed
}

function findParameter(parameters: OpenApiParameter[] | undefined, name: string) {
	return parameters?.find((param) => param?.name === name)
}

function assertDefined<T>(value: T | null | undefined, message: string): T {
	expect(value, message).toBeDefined()
	if (value == null) {
		throw new Error(message)
	}
	return value
}

describe('Materials contracts', () => {
	it.skip('POST /materials should accept uploads and metadata', () => {
		const spec = loadSpec()
		const post = assertDefined(
			spec.paths?.['/materials']?.post,
			'POST /materials operation missing'
		)
		expect(post.security?.[0]).toEqual({ bearerAuth: [] })
		const multipart = assertDefined(
			post.requestBody?.content?.['multipart/form-data'],
			'POST /materials must accept multipart/form-data'
		)
		expect(multipart.schema?.$ref).toBe('#/components/schemas/MaterialCreateInput')
		const responseSchema = assertDefined(
			post.responses?.['201']?.content?.['application/json']?.schema?.$ref,
			'POST /materials response schema missing'
		)
		expect(responseSchema).toBe('#/components/schemas/Material')
	})

	it.skip('GET /materials should filter by tags, format, and contributor', () => {
		const spec = loadSpec()
		const get = assertDefined(spec.paths?.['/materials']?.get, 'GET /materials operation missing')
		const parameters = get.parameters ?? []

		// Check search query parameter
		const qParam = findParameter(parameters, 'q')
		expect(qParam?.schema?.type).toBe('string')

		// Check tags filter
		const tagsParam = findParameter(parameters, 'tags')
		expect(tagsParam?.schema?.type).toBe('array')
		expect(tagsParam?.schema?.items?.type).toBe('string')

		// Check format filter
		const formatParam = findParameter(parameters, 'format')
		expect(formatParam?.schema?.enum).toEqual(['document', 'slide', 'dataset', 'video', 'link'])

		// Check contributor filter
		const contributorParam = findParameter(parameters, 'contributorId')
		expect(contributorParam?.schema?.type).toBe('string')

		// Check sort parameter
		const sortParam = findParameter(parameters, 'sort')
		expect(sortParam?.schema?.enum).toEqual(['relevance', 'recent'])

		// Check response structure
		const responseSchema = assertDefined(
			get.responses?.['200']?.content?.['application/json']?.schema,
			'GET /materials response schema missing'
		)
		expect(responseSchema?.properties?.items?.items?.$ref).toBe('#/components/schemas/Material')
		expect(responseSchema?.properties?.total?.type).toBe('integer')
	})

	it.skip('GET /materials/{materialId} should enforce visibility rules', () => {
		const spec = loadSpec()
		const get = assertDefined(
			spec.paths?.['/materials/{materialId}']?.get,
			'GET /materials/{materialId} operation missing'
		)
		expect(get.security?.[0]).toEqual({ bearerAuth: [] })

		const pathParam = findParameter(get.parameters, 'materialId')
		expect(pathParam?.required).toBe(true)
		expect(pathParam?.schema?.type).toBe('string')

		const responseSchema = assertDefined(
			get.responses?.['200']?.content?.['application/json']?.schema?.$ref,
			'GET /materials/{materialId} response schema missing'
		)
		expect(responseSchema).toBe('#/components/schemas/Material')
	})
})
