// @vitest-environment happy-dom
import { cleanup, render, screen } from '@testing-library/preact'
import { createRef } from 'preact'
import { afterEach, describe, expect, it } from 'vitest'
import { Title } from '../../src/ui/Title'

afterEach(cleanup)

describe('Title', () => {
  it('is the page’s heading, and takes focus from code only, for when a popup closes by itself', () => {
    const heading = createRef<HTMLHeadingElement>()
    render(<Title text="Where's Alex?" headingRef={heading} />)
    expect(heading.current).toBe(screen.getByRole('heading', { level: 1, name: "Where's Alex?" }))
    expect(heading.current!.getAttribute('tabindex')).toBe('-1')
  })
})
