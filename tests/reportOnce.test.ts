import { afterEach, describe, expect, it, vi } from 'vitest'

afterEach(() => {
  vi.restoreAllMocks()
})

/** The module afresh, so what it remembers about the failures it already logged starts empty. */
async function freshReportOnce() {
  vi.resetModules()
  return (await import('../src/reportOnce')).reportOnce
}
const quiet = () => vi.spyOn(console, 'error').mockImplementation(() => {})

describe('reportOnce', () => {
  it('logs the message and the error, once for a failure that repeats', async () => {
    const error = quiet()
    const reportOnce = await freshReportOnce()
    for (let i = 0; i < 5; i++) reportOnce('Something failed', new Error('boom'))
    expect(error).toHaveBeenCalledTimes(1)
    expect(error).toHaveBeenCalledWith('Something failed', expect.objectContaining({ message: 'boom' }))
  })

  it('logs a different failure, and the same failure from another place, separately', async () => {
    const error = quiet()
    const reportOnce = await freshReportOnce()
    reportOnce('Engine failed', new Error('a'))
    reportOnce('Engine failed', new Error('b'))
    reportOnce('Sentence failed', new Error('a'))
    reportOnce('Engine failed', new Error('a'))
    expect(error).toHaveBeenCalledTimes(3)
  })

  it('tells thrown values that are not errors apart by their type', async () => {
    const error = quiet()
    const reportOnce = await freshReportOnce()
    reportOnce('Failed', 'oops')
    reportOnce('Failed', 'oops again')
    reportOnce('Failed', 42)
    expect(error).toHaveBeenCalledTimes(2)
  })

  it('stops after ten different failures', async () => {
    const error = quiet()
    const reportOnce = await freshReportOnce()
    for (let i = 0; i < 30; i++) reportOnce('Failed', new Error(`failure ${i}`))
    expect(error).toHaveBeenCalledTimes(10)
  })
})
