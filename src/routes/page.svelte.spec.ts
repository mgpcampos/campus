import { render, screen } from '@testing-library/svelte'
import { describe, expect, it } from 'vitest'
import Page from './+page.svelte'

describe('/+page.svelte', () => {
	it('renders primary heading', () => {
		render(Page)
		expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument()
	})
})
