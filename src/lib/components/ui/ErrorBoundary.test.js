import { cleanup, render, screen } from '@testing-library/svelte'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import ErrorBoundary from './ErrorBoundary.svelte'

// Mock the errors utility
vi.mock('$lib/utils/errors.ts', () => ({
	normalizeError: vi.fn((error) => ({
		__normalized: true,
		type: 'SERVER',
		code: 'server_error',
		status: 500,
		retryable: true,
		userMessage: 'Something went wrong. Please try again.',
		devMessage: error?.message || 'Unknown error',
		cause: error
	}))
}))

afterEach(() => {
	cleanup()
	vi.restoreAllMocks()
})

describe('ErrorBoundary', () => {
	it('renders nothing when no error', () => {
		render(ErrorBoundary, { props: { error: null } })
		expect(screen.queryByRole('alert')).toBeNull()
	})

	it('displays error message with retry button when retryable', () => {
		const error = new Error('Test error')
		render(ErrorBoundary, { props: { error } })

		expect(screen.getByText('Something went wrong. Please try again.')).toBeInTheDocument()
		expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument()
	})

	it('shows details when requested', async () => {
		const error = new Error('Test error')
		render(ErrorBoundary, { props: { error, showDetails: true } })

		expect(screen.getByText('Details')).toBeInTheDocument()
		expect(screen.getByText(/code: server_error/)).toBeInTheDocument()
	})

	it('calls retry function when retry button is clicked', async () => {
		const user = userEvent.setup()
		const retry = vi.fn()
		const error = new Error('Test error')

		render(ErrorBoundary, { props: { error, retry } })

		const retryButton = screen.getByRole('button', { name: /try again/i })
		await user.click(retryButton)

		expect(retry).toHaveBeenCalledOnce()
	})

	it('has proper ARIA attributes', () => {
		const error = new Error('Test error')
		render(ErrorBoundary, { props: { error } })

		const errorContainer = screen.getByRole('alert')
		expect(errorContainer).toHaveAttribute('aria-live', 'assertive')
	})
})
