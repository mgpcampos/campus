declare module 'js-yaml' {
	type LoadOptions = Record<string, unknown>
	type DumpOptions = Record<string, unknown>
	export function load(str: string, opts?: LoadOptions): unknown
	export function dump(obj: unknown, opts?: DumpOptions): string
}
