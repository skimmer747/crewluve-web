// @vitest-environment happy-dom
import { cleanup, render, waitFor } from '@testing-library/preact'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Celebration } from '../../src/ui/Celebration'

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('Celebration', () => {
  it('plays the waving figure', async () => {
    const { container } = render(<Celebration playKey={0} />)
    await waitFor(() => expect(container.querySelector('.celebration svg')).not.toBeNull())
  })

  it('stays still for people who prefer reduced motion', async () => {
    vi.stubGlobal('matchMedia', (query: string) => ({ matches: query.includes('reduce'), media: query }))
    const { container } = render(<Celebration playKey={0} />)
    await new Promise((resolve) => setTimeout(resolve, 50))
    expect(container.querySelector('.celebration')).toBeNull()
  })
})
