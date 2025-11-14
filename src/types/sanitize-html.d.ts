declare module 'sanitize-html' {
	interface IOptions {
		allowedTags?: string[]
		allowedAttributes?: Record<string, string[]>
		disallowedTagsMode?: 'discard' | 'recursiveEscape' | 'escape'
		textFilter?(text: string): string
	}
	export default function sanitizeHtml(dirty: string, options?: IOptions): string
}
