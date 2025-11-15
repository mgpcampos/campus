import { browser } from '$app/environment'
import { config } from '$lib/config.js'
import { currentUser } from '$lib/pocketbase.js'

type LayoutShift = PerformanceEntry & {
	value: number
	hadRecentInput: boolean
}

type LargestContentfulPaint = PerformanceEntry & {
	renderTime?: number
	loadTime?: number
	size?: number
	element?: Element
}

type PerformanceEventTiming = PerformanceEntry & {
	processingStart: number
	startTime: number
	name: string
}

const swallow = <T>(promise: Promise<T>): void => {
	promise.catch(() => undefined)
}

export type AnalyticsEventType = 'page' | 'event' | 'vital'

export interface AnalyticsEvent {
	type: AnalyticsEventType
	name: string
	page?: string
	value?: number
	metadata?: Record<string, unknown> | null
}

interface EnrichedEvent extends AnalyticsEvent {
	sessionId: string
	timestamp: string
	userId: string | null
	locale?: string
	referrer?: string | null
	userAgent?: string
	viewport?: {
		width?: number
		height?: number
	}
}

const { analytics } = config

let initialized = false
let sessionId: string | null = null
let userId: string | null = null
let userUnsubscribe: (() => void) | null = null
let navigationTrackingInitialized = false
let removeNavigationListener: (() => void) | null = null

class AnalyticsQueue {
	private queue: EnrichedEvent[] = []
	private flushTimer: ReturnType<typeof setTimeout> | null = null
	private readonly flushInterval: number

	constructor(intervalMs: number) {
		this.flushInterval = intervalMs
	}

	enqueue(event: AnalyticsEvent) {
		if (!browser || !analytics.enabled) return
		if (!this.shouldSample()) return
		const enriched = enrichEvent(event)
		this.queue.push(enriched)
		this.scheduleFlush()
	}

	async flush(immediate = false) {
		if (this.queue.length === 0) return
		if (this.flushTimer) {
			clearTimeout(this.flushTimer)
			this.flushTimer = null
		}

		const payload = { events: this.queue.splice(0, this.queue.length) }

		try {
			if (browser && navigator.sendBeacon && (immediate || document.visibilityState === 'hidden')) {
				const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' })
				navigator.sendBeacon(analytics.endpoint, blob)
				return
			}

			await fetch(analytics.endpoint, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(payload),
				keepalive: immediate
			})
		} catch (error) {
			console.warn('[analytics] failed to send events', error)
		}
	}

	clear() {
		if (this.flushTimer) {
			clearTimeout(this.flushTimer)
			this.flushTimer = null
		}
		this.queue.length = 0
	}

	private shouldSample() {
		if (!analytics.enabled) return false
		if (analytics.sampleRate >= 1) return true
		return Math.random() <= analytics.sampleRate
	}

	private scheduleFlush() {
		if (this.flushTimer) return
		this.flushTimer = setTimeout(() => {
			this.flushTimer = null
			swallow(this.flush())
		}, this.flushInterval)
	}
}

const analyticsQueue = new AnalyticsQueue(analytics.flushIntervalMs)

const SESSION_STORAGE_KEY = 'campus.analytics.session'

function ensureSessionId() {
	if (!browser) return 'server'
	if (sessionId) return sessionId
	try {
		const existing = window.sessionStorage.getItem(SESSION_STORAGE_KEY)
		if (existing) {
			sessionId = existing
			return sessionId
		}
		const generated = crypto.randomUUID()
		window.sessionStorage.setItem(SESSION_STORAGE_KEY, generated)
		sessionId = generated
	} catch {
		// sessionStorage may be unavailable (Safari private mode); fall back to in-memory id
		sessionId = crypto.randomUUID()
	}
	return sessionId
}

function enrichEvent(event: AnalyticsEvent): EnrichedEvent {
	const nowIso = new Date().toISOString()
	const page =
		event.page ?? (browser ? window.location.pathname + window.location.search : undefined)
	const viewport = browser
		? {
				width: window.innerWidth,
				height: window.innerHeight
			}
		: undefined

	return {
		...event,
		sessionId: ensureSessionId(),
		timestamp: nowIso,
		userId,
		locale: browser ? navigator.language : undefined,
		referrer: browser ? document.referrer || null : null,
		userAgent: browser ? navigator.userAgent : undefined,
		page,
		viewport
	}
}

function enqueue(event: AnalyticsEvent) {
	analyticsQueue.enqueue(event)
}

function handleVisibilityChange() {
	if (document.visibilityState === 'hidden') {
		swallow(analyticsQueue.flush(true))
	}
}

function setupUserSubscription() {
	if (!browser || userUnsubscribe) return
	userUnsubscribe = currentUser.subscribe((model) => {
		userId = model?.id ?? null
	})
}

function setupWebVitalsObservers() {
	if (!browser || typeof PerformanceObserver === 'undefined') return [] as Array<() => void>

	const disconnectors: Array<() => void> = []

	try {
		const lcpObserver = new PerformanceObserver((entryList) => {
			const entries = entryList.getEntries()
			const last = entries[entries.length - 1] as LargestContentfulPaint | undefined
			if (!last) return
			const value = last.renderTime ?? last.loadTime ?? undefined
			enqueue({
				type: 'vital',
				name: 'lcp',
				value,
				metadata: {
					size: last.size,
					element: last.element?.tagName ?? null
				}
			})
		})
		lcpObserver.observe({
			type: 'largest-contentful-paint',
			buffered: true
		} as PerformanceObserverInit)
		disconnectors.push(() => lcpObserver.disconnect())
	} catch (error) {
		console.debug('[analytics] LCP observer unavailable', error)
	}

	try {
		let clsValue = 0
		const clsObserver = new PerformanceObserver((entryList) => {
			for (const entry of entryList.getEntries() as LayoutShift[]) {
				if (entry.hadRecentInput) continue
				clsValue += entry.value
			}
			enqueue({ type: 'vital', name: 'cls', value: Number(clsValue.toFixed(4)) })
		})
		clsObserver.observe({ type: 'layout-shift', buffered: true } as PerformanceObserverInit)
		disconnectors.push(() => clsObserver.disconnect())
	} catch (error) {
		console.debug('[analytics] CLS observer unavailable', error)
	}

	try {
		const fidObserver = new PerformanceObserver((entryList) => {
			const entries = entryList.getEntries() as PerformanceEventTiming[]
			const first = entries[0]
			if (!first) return
			enqueue({
				type: 'vital',
				name: 'fid',
				value: first.processingStart - first.startTime,
				metadata: {
					name: first.name
				}
			})
		})
		fidObserver.observe({ type: 'first-input', buffered: true } as PerformanceObserverInit)
		disconnectors.push(() => fidObserver.disconnect())
	} catch (error) {
		console.debug('[analytics] FID observer unavailable', error)
	}

	return disconnectors
}

function setupNavigationTracking() {
	if (!browser || navigationTrackingInitialized) return
	navigationTrackingInitialized = true

	const listener: EventListener = (event) => {
		const nav = (event as CustomEvent<{ from?: { url?: URL }; to?: { url?: URL } }>).detail
		const destination = nav?.to?.url ?? window.location
		trackPageView(destination.pathname + destination.search, {
			referer: nav?.from?.url?.pathname ?? null
		})
	}

	window.addEventListener('sveltekit:navigation-end', listener)
	removeNavigationListener = () => {
		window.removeEventListener('sveltekit:navigation-end', listener)
		navigationTrackingInitialized = false
		removeNavigationListener = null
	}
}

export function trackEvent(name: string, metadata?: Record<string, unknown>) {
	enqueue({ type: 'event', name, metadata: metadata ?? null })
}

export function trackPageView(page?: string, metadata?: Record<string, unknown>) {
	enqueue({ type: 'page', name: 'page_view', page, metadata: metadata ?? null })
}

export function trackVital(name: string, value: number, metadata?: Record<string, unknown>) {
	enqueue({ type: 'vital', name, value, metadata: metadata ?? null })
}

/**
 * Track material view event
 * @param materialId - ID of the viewed material
 * @param metadata - Additional context (format, visibility, etc.)
 */
export function trackMaterialView(materialId: string, metadata?: Record<string, unknown>) {
	trackEvent('material_view', {
		materialId,
		...metadata
	})
}

/**
 * Track material download event
 * @param materialId - ID of the downloaded material
 * @param metadata - Additional context (format, fileSize, etc.)
 */
export function trackMaterialDownload(materialId: string, metadata?: Record<string, unknown>) {
	trackEvent('material_download', {
		materialId,
		...metadata
	})
}

export function initAnalytics() {
	if (!browser || initialized || !analytics.enabled) {
		return () => undefined
	}

	initialized = true
	setupUserSubscription()
	ensureSessionId()
	setupNavigationTracking()

	const disconnectors = setupWebVitalsObservers()

	// initial view
	queueMicrotask(() => {
		trackPageView()
	})

	if (browser) {
		document.addEventListener('visibilitychange', handleVisibilityChange)
		window.addEventListener('beforeunload', () => {
			swallow(analyticsQueue.flush(true))
		})
	}

	return () => {
		analyticsQueue.clear()
		swallow(analyticsQueue.flush(true))
		if (browser) {
			document.removeEventListener('visibilitychange', handleVisibilityChange)
		}
		disconnectors.forEach((disconnect) => {
			disconnect()
		})
		if (userUnsubscribe) {
			userUnsubscribe()
			userUnsubscribe = null
		}
		removeNavigationListener?.()
	}
}
