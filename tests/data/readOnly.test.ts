import { readdirSync, readFileSync, statSync } from 'node:fs'
import { basename, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) return sourceFiles(path)
    return /\.(ts|tsx)$/.test(name) ? [path] : []
  })
}

// Resolved from this file, so the guard scans src/ whatever directory the tests run from.
const files = sourceFiles(fileURLToPath(new URL('../../src', import.meta.url)))

describe('read-only guarantee (spec §9)', () => {
  it.each(files)('%s never writes to CrewLu Cloud or injects HTML', (file) => {
    const code = readFileSync(file, 'utf8')
    expect(code).not.toMatch(/\.(insert|update|upsert|delete|rpc)\s*\(/)
    expect(code).not.toMatch(/\.storage\b/)
    expect(code).not.toMatch(/innerHTML|dangerouslySetInnerHTML/)
  })

  it('keeps all database access in fetchSchedule.ts', () => {
    const callers = files.filter((f) => /\b(client|supabase)\.from\(/.test(readFileSync(f, 'utf8')))
    expect(callers.map((f) => basename(f))).toEqual(['fetchSchedule.ts'])
  })
})
