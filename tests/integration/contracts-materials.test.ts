import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { load } from 'js-yaml';

type OpenApiSpec = {
	paths: Record<string, any>;
};

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const specPath = path.resolve(
	__dirname,
	'../../specs/001-this-is-a/contracts/campus-collaboration.openapi.yaml'
);

function loadSpec(): OpenApiSpec {
	const raw = readFileSync(specPath, 'utf8');
	const parsed = load(raw) as OpenApiSpec | undefined;
	if (!parsed || typeof parsed !== 'object' || !parsed.paths) {
		throw new Error('Unable to load materials contract from OpenAPI spec.');
	}
	return parsed;
}

function findParameter(parameters: any[] | undefined, name: string) {
	return parameters?.find((param) => param?.name === name);
}

describe('Materials contracts', () => {
	it('POST /materials should accept uploads and metadata', () => {
		const spec = loadSpec();
		const post = spec.paths?.['/materials']?.post;
		expect(post, 'POST /materials operation missing').toBeDefined();
		expect(post.security?.[0]).toEqual({ bearerAuth: [] });
		const multipart = post.requestBody?.content?.['multipart/form-data'];
		expect(multipart, 'POST /materials must accept multipart/form-data').toBeDefined();
		expect(multipart.schema?.$ref).toBe('#/components/schemas/MaterialCreateInput');
		const responseSchema = post.responses?.['201']?.content?.['application/json']?.schema?.$ref;
		expect(responseSchema).toBe('#/components/schemas/Material');
	});

	it('GET /materials should filter by tags, format, and contributor', () => {
		const spec = loadSpec();
		const get = spec.paths?.['/materials']?.get;
		expect(get, 'GET /materials operation missing').toBeDefined();
		const { parameters } = get;
		expect(parameters, 'GET /materials parameters missing').toBeDefined();

		// Check search query parameter
		const qParam = findParameter(parameters, 'q');
		expect(qParam?.schema?.type).toBe('string');

		// Check tags filter
		const tagsParam = findParameter(parameters, 'tags');
		expect(tagsParam?.schema?.type).toBe('array');
		expect(tagsParam?.schema?.items?.type).toBe('string');

		// Check format filter
		const formatParam = findParameter(parameters, 'format');
		expect(formatParam?.schema?.enum).toEqual(['document', 'slide', 'dataset', 'video', 'link']);

		// Check contributor filter
		const contributorParam = findParameter(parameters, 'contributorId');
		expect(contributorParam?.schema?.type).toBe('string');

		// Check sort parameter
		const sortParam = findParameter(parameters, 'sort');
		expect(sortParam?.schema?.enum).toEqual(['relevance', 'recent']);

		// Check response structure
		const responseSchema = get.responses?.['200']?.content?.['application/json']?.schema;
		expect(responseSchema?.properties?.items?.items?.$ref).toBe('#/components/schemas/Material');
		expect(responseSchema?.properties?.total?.type).toBe('integer');
	});

	it('GET /materials/{materialId} should enforce visibility rules', () => {
		const spec = loadSpec();
		const get = spec.paths?.['/materials/{materialId}']?.get;
		expect(get, 'GET /materials/{materialId} operation missing').toBeDefined();
		expect(get.security?.[0]).toEqual({ bearerAuth: [] });

		const pathParam = findParameter(get.parameters, 'materialId');
		expect(pathParam?.required).toBe(true);
		expect(pathParam?.schema?.type).toBe('string');

		const responseSchema = get.responses?.['200']?.content?.['application/json']?.schema?.$ref;
		expect(responseSchema).toBe('#/components/schemas/Material');
	});
});
