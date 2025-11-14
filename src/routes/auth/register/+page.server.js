import { fail, redirect } from '@sveltejs/kit'
import { ClientResponseError } from 'pocketbase'
import { superValidate } from 'sveltekit-superforms/server'
import { getErrorMessage } from '$lib/utils/errors.js'
import { registerSchema } from '$lib/utils/validation.js'
import { withZod } from '$lib/validation'

/** @type {import('./$types').PageServerLoad} */
export async function load({ locals }) {
	if (locals.user) {
		throw redirect(302, '/feed')
	}

	return {
		form: await superValidate(withZod(registerSchema))
	}
}

/** @type {import('./$types').Actions} */
export const actions = {
	default: async ({ request, locals }) => {
		const form = await superValidate(request, withZod(registerSchema))

		if (!form.valid) {
			return fail(400, { form })
		}

		try {
			// Create user account with PocketBase
			const userData = {
				email: form.data.email,
				password: form.data.password,
				passwordConfirm: form.data.passwordConfirm,
				username: form.data.username,
				name: form.data.name
			}

			const user = await locals.pb.collection('users').create(userData)

			// Automatically log in the user after registration
			await locals.pb.collection('users').authWithPassword(form.data.email, form.data.password)

			throw redirect(302, '/feed')
		} catch (error) {
			// If it's a redirect, re-throw it
			if (error && typeof error === 'object' && 'status' in error && error.status === 302) {
				throw error
			}

			// Handle registration errors
			const errorMessage = getErrorMessage(error)
			const status = error instanceof ClientResponseError ? (error.status ?? 400) : 500
			return fail(status, {
				form,
				error: errorMessage
			})
		}
	}
}
