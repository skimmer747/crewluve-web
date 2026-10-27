// Static checks over src/ for the partner door guarantee (piece 5a §9): the site reaches Crewlu Cloud only through the
// four partner RPCs.
//
// The guarantee itself is src/partner/doorGuard.ts: every request src/partner/door.ts sends passes through it. These
// checks keep code from going around the door. In every file under src/ they flag:
//   - an import of a Supabase package, from a URL, or by a computed name;
//   - a string that names a Crewlu Cloud address, anywhere but src/cloud.ts, the door and its guard;
//   - a fetch with a body or a method other than GET and HEAD, and Request, XMLHttpRequest, WebSocket, EventSource,
//     importScripts and sendBeacon (the door module may fetch; tests/data/readOnly.test.ts pins what it sends);
//   - the members and attributes that turn text into markup (innerHTML and the like), and document.write.
// They parse with the TypeScript compiler instead of matching text, so a comment or a string can't fake a call, and line
// breaks, bracket access (`el['innerHTML']`) and spacing can't hide one.
//
// What they cannot see: an aliased fetch (`const f = fetch`), `fetch.call` or `Reflect.apply`, a computed member name
// (`el[name]`), an address built from pieces, and a third-party HTTP client. The browser is the backstop for those: the
// CSP's connect-src (vite.config.ts) lists the four partner RPC addresses, so the browser itself refuses any other
// request to Crewlu Cloud.
import { existsSync, readdirSync, statSync } from 'node:fs'
import { join, posix, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'

export const ROOT = fileURLToPath(new URL('../..', import.meta.url))
export const SRC = join(ROOT, 'src')
/** The one module that sends the partner door's POSTs, each through the door guard (piece 5a §9). */
export const DOOR_MODULE = 'src/partner/door.ts'
const CLOUD_MODULE = 'src/cloud.ts'
const GUARD_MODULE = 'src/partner/doorGuard.ts'
/** The modules that may name a Crewlu Cloud address: the project's own address, the door that calls it and the guard that judges every call. */
const CLOUD_ADDRESS_MODULES: ReadonlySet<string> = new Set([CLOUD_MODULE, DOOR_MODULE, GUARD_MODULE])

/** Every .ts and .tsx file under src/, as absolute paths. */
export function sourceFiles(dir: string = SRC): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) return sourceFiles(path)
    return /\.(ts|tsx)$/.test(name) ? [path] : []
  })
}

/** A project-relative path with forward slashes: src/partner/door.ts. */
export function rel(absolute: string): string {
  return relative(ROOT, absolute).split(sep).join('/')
}

export function parse(code: string, path: string): ts.SourceFile {
  return ts.createSourceFile(path, code, ts.ScriptTarget.ES2020, true, path.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS)
}

function walk(node: ts.Node, visit: (n: ts.Node) => void): void {
  visit(node)
  ts.forEachChild(node, (child) => walk(child, visit))
}

const lineOf = (sf: ts.SourceFile, node: ts.Node) => sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1
const literal = (node: ts.Node | undefined): string | null => (node && ts.isStringLiteralLike(node) ? node.text : null)

// ---------- imports ----------

export interface ImportRef {
  /** null when the module is named by an expression, so the import graph can't be followed. */
  specifier: string | null
  kind: 'static' | 'dynamic' | 'require'
  /** Erased at build time, so it can't load the module in the browser. */
  typeOnly: boolean
}

/** Every way a file can pull in a module: import, export-from, import(), require(), `import x = require()`, import types. */
export function importsOf(sf: ts.SourceFile): ImportRef[] {
  const refs: ImportRef[] = []
  walk(sf, (n) => {
    if (ts.isImportDeclaration(n)) {
      refs.push({ specifier: literal(n.moduleSpecifier), kind: 'static', typeOnly: n.importClause?.isTypeOnly === true })
    } else if (ts.isExportDeclaration(n) && n.moduleSpecifier) {
      refs.push({ specifier: literal(n.moduleSpecifier), kind: 'static', typeOnly: n.isTypeOnly })
    } else if (ts.isImportEqualsDeclaration(n) && ts.isExternalModuleReference(n.moduleReference)) {
      refs.push({ specifier: literal(n.moduleReference.expression), kind: 'require', typeOnly: n.isTypeOnly })
    } else if (ts.isImportTypeNode(n)) {
      refs.push({ specifier: ts.isLiteralTypeNode(n.argument) ? literal(n.argument.literal) : null, kind: 'dynamic', typeOnly: true })
    } else if (ts.isCallExpression(n)) {
      const callee = n.expression
      if (callee.kind === ts.SyntaxKind.ImportKeyword) {
        refs.push({ specifier: literal(n.arguments[0]), kind: 'dynamic', typeOnly: false })
      } else if (ts.isIdentifier(callee) && callee.text === 'require') {
        refs.push({ specifier: literal(n.arguments[0]), kind: 'require', typeOnly: false })
      } else if (ts.isPropertyAccessExpression(callee) && callee.name.text === 'glob' && ts.isMetaProperty(callee.expression)) {
        refs.push({ specifier: null, kind: 'dynamic', typeOnly: false }) // import.meta.glob names modules by pattern
      }
    }
  })
  return refs
}

const onDisk = (path: string) => existsSync(resolve(ROOT, path)) && statSync(resolve(ROOT, path)).isFile()

/** The project-relative .ts/.tsx module a relative specifier points at; null for packages and non-code files. */
export function resolveImport(from: string, specifier: string, exists: (path: string) => boolean = onDisk): string | null {
  if (!specifier.startsWith('.')) return null
  const target = posix.join(posix.dirname(from), specifier)
  const stem = target.replace(/\.jsx?$/, '')
  const candidates = [target, `${stem}.ts`, `${stem}.tsx`, `${target}/index.ts`, `${target}/index.tsx`]
  return candidates.find((c) => /\.tsx?$/.test(c) && exists(c)) ?? null
}

/** Files that import `target`, and how: statically (loaded at startup) or dynamically (loaded on demand). */
export function importersOf(target: string, sources: Record<string, string>): Array<{ path: string; kind: ImportRef['kind']; typeOnly: boolean }> {
  const exists = (p: string) => p in sources
  return Object.entries(sources).flatMap(([path, code]) =>
    importsOf(parse(code, path))
      .filter((ref) => ref.specifier !== null && resolveImport(path, ref.specifier, exists) === target)
      .map((ref) => ({ path, kind: ref.kind, typeOnly: ref.typeOnly })),
  )
}

// ---------- member references ----------

interface MemberRef {
  name: string
  /** The name just before the dot: `document` in `document.write`, `window.document.write` and `document['write']`. */
  receiver: string | null
  /** The member is called (`a.name(...)`), not just read (`a.name`). */
  isCall: boolean
  line: number
}

function receiverName(expression: ts.Expression): string | null {
  let e = expression
  while (ts.isParenthesizedExpression(e) || ts.isNonNullExpression(e) || ts.isAsExpression(e)) e = e.expression
  if (ts.isIdentifier(e)) return e.text
  if (ts.isPropertyAccessExpression(e)) return e.name.text
  return null
}

/** Every `.name` and `['name']` in the file, called or not, and every `{ name }` destructured from an object. */
function memberRefs(sf: ts.SourceFile): MemberRef[] {
  const refs: MemberRef[] = []
  const called = (n: ts.Node) => ts.isCallExpression(n.parent) && n.parent.expression === n
  walk(sf, (n) => {
    if (ts.isPropertyAccessExpression(n)) {
      refs.push({ name: n.name.text, receiver: receiverName(n.expression), isCall: called(n), line: lineOf(sf, n) })
    } else if (ts.isElementAccessExpression(n) && ts.isStringLiteralLike(n.argumentExpression)) {
      refs.push({ name: n.argumentExpression.text, receiver: receiverName(n.expression), isCall: called(n), line: lineOf(sf, n) })
    } else if (ts.isBindingElement(n) && ts.isObjectBindingPattern(n.parent)) {
      const key = n.propertyName ?? n.name
      if (ts.isIdentifier(key) || ts.isStringLiteralLike(key)) refs.push({ name: key.text, receiver: null, isCall: false, line: lineOf(sf, n) })
    }
  })
  return refs
}

// ---------- per-file facts ----------

interface Facts {
  sf: ts.SourceFile
  imports: ImportRef[]
  refs: MemberRef[]
}

function factsOf(path: string, code: string): Facts {
  const sf = parse(code, path)
  return { sf, imports: importsOf(sf), refs: memberRefs(sf) }
}

// ---------- Crewlu Cloud addresses ----------

/** The project's host, or a path only Crewlu Cloud serves: its tables (/rest/v1/), sign-in, functions, storage and realtime. */
const CLOUD_ADDRESS = /supabase\.co|\/(rest|auth|functions|storage|realtime)\/v1\b/

/** Every string in the file that names a Crewlu Cloud address, unless the file is one of the three that may. */
function cloudAddressProblems(path: string, { sf }: Facts): string[] {
  if (CLOUD_ADDRESS_MODULES.has(path)) return []
  const found: string[] = []
  walk(sf, (n) => {
    // A template's text comes in pieces around its ${} holes: a head, any number of middles, and a tail.
    const text = ts.isStringLiteralLike(n) || ts.isTemplateHead(n) || ts.isTemplateMiddle(n) || ts.isTemplateTail(n) ? n.text : null
    if (text !== null && CLOUD_ADDRESS.test(text)) {
      found.push(`${path}:${lineOf(sf, n)} names a Crewlu Cloud address; only ${CLOUD_MODULE}, ${DOOR_MODULE} and ${GUARD_MODULE} may`)
    }
  })
  return found
}

// ---------- raw network access ----------

const NETWORK_GLOBALS = new Set(['XMLHttpRequest', 'WebSocket', 'EventSource', 'importScripts'])

const isFetchCallee = (e: ts.Expression) => (ts.isIdentifier(e) && e.text === 'fetch') || (ts.isPropertyAccessExpression(e) && e.name.text === 'fetch') ||
  (ts.isElementAccessExpression(e) && literal(e.argumentExpression) === 'fetch')

/** Every call to fetch in a file: `fetch(…)`, or `.fetch(…)` on anything, as the rules judge them. */
export function fetchCalls(sf: ts.SourceFile): ts.CallExpression[] {
  const calls: ts.CallExpression[] = []
  walk(sf, (n) => {
    if (ts.isCallExpression(n) && isFetchCallee(n.expression)) calls.push(n)
  })
  return calls
}

/** The source text of every call to the plain function `name`, such as `doorFetch(send)`. */
export function callsTo(sf: ts.SourceFile, name: string): string[] {
  const calls: string[] = []
  walk(sf, (n) => {
    if (ts.isCallExpression(n) && ts.isIdentifier(n.expression) && n.expression.text === name) calls.push(n.getText(sf))
  })
  return calls
}

/** What makes a fetch() call more than a plain GET; null when it is one. */
function fetchProblem(call: ts.CallExpression): string | null {
  const problems: string[] = []
  const [, init] = call.arguments
  if (call.arguments.some((a) => ts.isSpreadElement(a))) problems.push('with spread arguments')
  else if (call.arguments.length > 2) problems.push('with more than two arguments')
  else if (init !== undefined && !ts.isObjectLiteralExpression(init)) problems.push('with options it cannot read (use an object literal)')
  else if (init !== undefined && ts.isObjectLiteralExpression(init)) {
    for (const p of init.properties) {
      const named = ts.isPropertyAssignment(p) || ts.isShorthandPropertyAssignment(p)
      const key = named && (ts.isIdentifier(p.name) || ts.isStringLiteralLike(p.name)) ? p.name.text : null
      if (key === null) problems.push('with options it cannot read (spread, method or computed name)')
      else if (key === 'body') problems.push('with a body')
      else if (key === 'method') {
        const value = ts.isPropertyAssignment(p) && ts.isStringLiteralLike(p.initializer) ? p.initializer.text.toUpperCase() : null
        if (value !== 'GET' && value !== 'HEAD') problems.push(`with method ${value ?? '(not a literal)'}`)
      }
    }
  }
  return problems.length ? problems.join(' and ') : null
}

function networkProblems(path: string, { sf, refs }: Facts): string[] {
  const found: string[] = []
  for (const r of refs) if (r.name === 'sendBeacon') found.push(`${path}:${r.line} uses sendBeacon, which POSTs`)
  walk(sf, (n) => {
    if (ts.isIdentifier(n) && NETWORK_GLOBALS.has(n.text)) found.push(`${path}:${lineOf(sf, n)} uses ${n.text}`)
    else if (ts.isNewExpression(n) && ts.isIdentifier(n.expression) && n.expression.text === 'Request') {
      found.push(`${path}:${lineOf(sf, n)} constructs a Request; the site's fetches are plain calls it can check`)
    } else if (ts.isCallExpression(n) && isFetchCallee(n.expression) && path !== DOOR_MODULE) {
      const problem = fetchProblem(n)
      // src/partner/door.ts passes the page's fetch to the door guard, which lets only the four partner RPCs through.
      if (problem) found.push(`${path}:${lineOf(sf, n)} calls fetch ${problem}; only ${DOOR_MODULE} may send more than a plain GET`)
    }
  })
  return found
}

// ---------- HTML injection ----------

/** Members and attributes that turn text into markup, which Preact would have escaped. */
const HTML_SINKS = new Set(['innerHTML', 'outerHTML', 'insertAdjacentHTML', 'dangerouslySetInnerHTML'])
const DOCUMENT_WRITES = new Set(['write', 'writeln'])

/** A use of a sink as a member of anything, as a key in an object literal or an attribute in JSX, and a call to document.write. */
function htmlProblems(path: string, { sf, refs }: Facts): string[] {
  const found: string[] = []
  const flag = (what: string, line: number) => found.push(`${path}:${line} injects HTML with ${what}; Preact escapes text, keep it that way`)
  for (const r of refs) {
    if (HTML_SINKS.has(r.name)) flag(r.name, r.line)
    else if (r.isCall && DOCUMENT_WRITES.has(r.name) && r.receiver === 'document') flag(`document.${r.name}`, r.line)
  }
  walk(sf, (n) => {
    // `Object.assign(el, { innerHTML: html })` and `<div innerHTML={html} />` set the same member as `el.innerHTML = html`.
    const key = ts.isPropertyAssignment(n) || ts.isShorthandPropertyAssignment(n) || ts.isJsxAttribute(n) ? n.name : null
    if (key && (ts.isIdentifier(key) || ts.isStringLiteralLike(key)) && HTML_SINKS.has(key.text)) flag(key.text, lineOf(sf, n))
  })
  return found
}

// ---------- the per-file rules ----------

/** Everything wrong with one source file under the source rules; an empty list means it passes. */
export function violations(path: string, code: string): string[] {
  const facts = factsOf(path, code)
  const found: string[] = []

  for (const ref of facts.imports) {
    if (ref.specifier === null) {
      found.push(`${path} imports a module by a computed name; use a string literal so the import graph can be checked`)
    } else if (/^[a-z][a-z0-9+.-]*:/i.test(ref.specifier)) {
      found.push(`${path} imports ${ref.specifier}; imports from URLs and schemes (https:, data:, node:) are not allowed`)
    } else if (ref.specifier.startsWith('@supabase/')) {
      found.push(`${path} imports ${ref.specifier}; the site has no Supabase client: it reaches Crewlu Cloud only through ${DOOR_MODULE}`)
    }
  }

  return [...found, ...cloudAddressProblems(path, facts), ...networkProblems(path, facts), ...htmlProblems(path, facts)]
}
