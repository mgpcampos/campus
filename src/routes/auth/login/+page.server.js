import { fail, redirect } from '@sveltejs/kit'
import { ClientResponseError } from 'pocketbase'
import { superValidate } from 'sveltekit-superforms/server'
import { getErrorMessage } from '$lib/utils/errors.ts'
import { loginSchema } from '$lib/utils/validation.js'
import { withZod } from '$lib/validation'

/** @type {import('./$types').PageServerLoad} */
export async function load({ locals, url }) {
	if (locals.user) {
		const returnUrl = url.searchParams.get('returnUrl')
		throw redirect(302, returnUrl || '/feed')
	}

	return {
		form: await superValidate(withZod(loginSchema))
	}
}

/** @type {import('./$types').Actions} */
export const actions = {
	default: async ({ request, locals, url }) => {
		const form = await superValidate(request, withZod(loginSchema))

		if (!form.valid) {
			return fail(400, { form })
		}

		try {
			// Authenticate with PocketBase
			await locals.pb
				.collection('users')
				.authWithPassword(form.data.email, form.data.password)

			// Check if there's a return URL
			const returnUrl = url.searchParams.get('returnUrl')
			if (returnUrl) {
				throw redirect(302, returnUrl)
			}

			throw redirect(302, '/feed')
		} catch (error) {
			// If it's a redirect, re-throw it
			if (error && typeof error === 'object' && 'status' in error && error.status === 302) {
				throw error
			}

			// Handle authentication errors
			const errorMessage = getErrorMessage(error)
			let status = 500
			if (error instanceof ClientResponseError) {
				status = error.status
				if (status === 400 || status === 404) {
					status = 401
				}
			}
			return fail(status, {
				form,
				error: errorMessage
			})
		}
	}
}
