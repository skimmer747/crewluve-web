import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

// Partner links piece 1b: the file that tells iPhones /join links belong to Crewluve
// (docs/superpowers/specs/2026-10-15-partner-links-piece1b-app-link-design.md).
const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')

describe('the app-link file', () => {
  it('hands /join links to the Crewluve app, and nothing else', () => {
    expect(JSON.parse(read('public/.well-known/apple-app-site-association'))).toEqual({
      applinks: {
        details: [
          {
            appIDs: ['UV96Z83C7B.com.ToddAnderson.Crewluv'],
            components: [{ '/': '/join', comment: expect.any(String) }],
          },
        ],
      },
    })
  })

  it('is published, because the deploy uploads dot-folders', () => {
    const workflow = read('.github/workflows/deploy-pages.yml')
    const upload = workflow.slice(workflow.indexOf('actions/upload-pages-artifact'), workflow.indexOf('\n  deploy:'))
    expect(upload).toMatch(/^\s+include-hidden-files: true$/m)
  })
})
