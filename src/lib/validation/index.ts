import { superValidate } from 'sveltekit-superforms/server';
import {
	zod,
	zodClient,
	type ClientValidationAdapter,
	type ValidationAdapter
} from 'sveltekit-superforms/adapters';
import type { RequestEvent } from '@sveltejs/kit';
import type { ZodTypeAny } from 'zod';

type SuperValidateOptions = Parameters<typeof superValidate>[2];

type ClientOptions = {
	SPA?: true | string | { failStatus?: number };
};

type OutputRecord<T extends ZodTypeAny> = T['_output'] & Record<string, unknown>;
type InputRecord<T extends ZodTypeAny> = T['_input'] & Record<string, unknown>;

type ServerAdapter<T extends ZodTypeAny> = ValidationAdapter<OutputRecord<T>, InputRecord<T>>;
type ClientAdapter<T extends ZodTypeAny> = ClientValidationAdapter<OutputRecord<T>, InputRecord<T>>;

type SuperValidateSource<T extends ZodTypeAny> =
	| RequestEvent
	| Request
	| FormData
	| URLSearchParams
	| URL
	| Partial<InputRecord<T>>
	| null
	| undefined;

const adaptZod = zod as unknown as <T extends ZodTypeAny>(schema: T) => ServerAdapter<T>;
const adaptZodClient = zodClient as unknown as <T extends ZodTypeAny>(
	schema: T
) => ClientAdapter<T>;

export const withZod = <T extends ZodTypeAny>(schema: T): ServerAdapter<T> => adaptZod(schema);

export const withZodClient = <T extends ZodTypeAny>(schema: T): ClientAdapter<T> =>
	adaptZodClient(schema);

export const validateForm = async <T extends ZodTypeAny>(
	source: SuperValidateSource<T>,
	schema: T,
	options?: SuperValidateOptions
) => superValidate(source, withZod(schema), options);

export const createClientFormOptions = <T extends ZodTypeAny>(
	schema: T,
	options: ClientOptions = {}
) => ({
	...options,
	validators: withZodClient(schema)
});
