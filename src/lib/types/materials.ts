/**
 * Materials Repository Types
 * Provides TypeScript definitions for the materials and material_access_logs collections
 */

export type MaterialFormat = 'document' | 'slide' | 'dataset' | 'video' | 'link';
export type MaterialVisibility = 'institution' | 'course' | 'group' | 'public';
export type MaterialAccessAction = 'view' | 'download';

/**
 * Material record from PocketBase materials collection
 */
export interface MaterialRecord {
	id: string;
	uploader: string;
	title: string;
	description?: string;
	courseCode?: string;
	tags?: string[];
	format: MaterialFormat;
	file?: string;
	linkUrl?: string;
	visibility: MaterialVisibility;
	keywords?: string;
	searchTerms?: string;
	created: string;
	updated: string;
}

/**
 * Material with expanded relations
 */
export interface MaterialResponse<TExpand = unknown> extends MaterialRecord {
	expand?: TExpand;
}

/**
 * Material with expanded uploader
 */
export type MaterialWithUploader = MaterialResponse<{
	uploader?: { id: string; name?: string; username: string };
}>;

/**
 * Material access log record
 */
export interface MaterialAccessLogRecord {
	id: string;
	material: string;
	user: string;
	action: MaterialAccessAction;
	created: string;
}

/**
 * Material access log with expanded relations
 */
export interface MaterialAccessLogResponse<TExpand = unknown> extends MaterialAccessLogRecord {
	expand?: TExpand;
}

/**
 * Utility type for material creation
 */
export interface MaterialCreateInput {
	uploader: string;
	title: string;
	description?: string;
	courseCode?: string;
	tags?: string[];
	format: MaterialFormat;
	file?: File | Blob;
	linkUrl?: string;
	visibility: MaterialVisibility;
	keywords?: string;
}

/**
 * Utility type for material update
 */
export type MaterialUpdateInput = Partial<Omit<MaterialCreateInput, 'uploader'>>;

/**
 * Search filter parameters for materials
 */
export interface MaterialSearchParams {
	q?: string;
	tags?: string[];
	format?: MaterialFormat;
	contributorId?: string;
	visibility?: MaterialVisibility;
	courseCode?: string;
	sort?: 'relevance' | 'recent';
	page?: number;
	perPage?: number;
}

/**
 * Search results with pagination
 */
export interface MaterialSearchResults {
	items: MaterialResponse[];
	total: number;
	page: number;
	perPage: number;
}
