import { vi } from 'vitest';

type ApplyAction = (result: unknown) => Promise<void>;

type DeserializeInput =
	| FormData
	| URLSearchParams
	| Record<string, unknown>
	| string
	| null
	| undefined;

type DeserializeOutput = Record<string, unknown> | null;

type Enhance = (form: HTMLFormElement, opts?: Record<string, unknown>) => void;

export const applyAction: ApplyAction = vi.fn(async () => {});
export const deserialize: (input: DeserializeInput) => DeserializeOutput = vi.fn((input) => {
	if (input instanceof FormData) {
		return Object.fromEntries(input.entries());
	}
	if (input instanceof URLSearchParams) {
		return Object.fromEntries(input.entries());
	}
	if (typeof input === 'string') {
		return { value: input };
	}
	return input ?? null;
});
export const enhance: Enhance = vi.fn();
