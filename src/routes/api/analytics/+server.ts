import { json } from '@sveltejs/kit'
import { config } from '$lib/config.js'
import {
	type AnalyticsEventInput,
	analyticsBatchSchema,
	recordAnalyticsEvents
} from '$lib/services/analytics.server'
import type { RequestHandler } from './$types'

const DISABLED_RESPONSE = new Response(null, { status: 204 })

export const POST: RequestHandler = async ({ request, locals, getClientAddress }) => {
	if (!config.analytics.enabled) {
		return DISABLED_RESPONSE
	}

	let payload: unknown
	try {
		payload = await request.json()
	} catch {
		return json({ error: 'Invalid JSON body' }, { status: 400 })
	}

	const parsed = analyticsBatchSchema.safeParse(payload)
	if (!parsed.success) {
		return json({ error: 'Invalid payload', details: parsed.error.flatten() }, { status: 422 })
	}

	const userId = locals.pb.authStore.isValid ? (locals.pb.authStore.model?.id ?? null) : null
	const events: AnalyticsEventInput[] = parsed.data.events.map((event) => ({
		...event,
		userId
	}))

	const ip = getClientAddress?.() || request.headers.get('x-forwarded-for') || undefined
	const accepted = await recordAnalyticsEvents(locals.pb, events, { ip })

	return json({ accepted })
}
