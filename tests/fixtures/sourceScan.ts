// Static checks over src/ for the partner door guarantee (piece 5a §9): the site reaches Crewlu Cloud only through the
// four partner RPCs.
//
// The guarantee itself is src/partner/doorGuard.ts: every request src/partner/door.ts sends passes through it. These
// checks keep it from being bypassed (a Supabase client, a raw POST from another file) and catch a write call before it
// ships. They parse with the TypeScript compiler instead of matching text, so comments, strings, line breaks, bracket
// access (`client['from']`) and spacing (`client.from (`) can neither hide a call nor fake one.
import { existsSync, readdirSync, statSync } from 'node:fs'
import { join, posix, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'

export const ROOT = fileURLToPath(new URL('../..', import.meta.url))
export const SRC = join(ROOT, 'src')
/** The one module that sends the partner door's POSTs, each through the door guard (piece 5a §9). */
export const DOOR_MODULE = 'src/partner/door.ts'

/** Every .ts and .tsx file under src/, as absolute paths. */
export function sourceFiles(dir: string = SRC): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) return sourceFiles(path)
    return /\.(ts|tsx)$/.test(name) ? [path] : []
  })
}

/** A project-relative path with forward slashes: src/auth/session.ts. */
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

/** The modules the browser loads before any user action: static imports reachable from `entry`, type-only ones ignored. */
export function staticClosure(entry: string, sources: Record<string, string>): Set<string> {
  const exists = (p: string) => p in sources
  const seen = new Set<string>()
  const pending = [entry]
  for (let path = pending.pop(); path !== undefined; path = pending.pop()) {
    if (seen.has(path) || !(path in sources)) continue
    seen.add(path)
    for (const ref of importsOf(parse(sources[path], path))) {
      if (ref.kind !== 'static' || ref.typeOnly || ref.specifier === null) continue
      const next = resolveImport(path, ref.specifier, exists)
      if (next) pending.push(next)
    }
  }
  return seen
}

// ---------- member references ----------

interface MemberRef {
  name: string
  /** The name just before the dot: `Array` in `Array.from`, `client` in `client.from`. */
  receiver: string | null
  /** The member is called (`a.name(...)`), not just read (`a.name`): a leg's `leg.from` is data, `client.from('x')` is a query. */
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

/** Built-ins with a static `from`, which are not the CrewLu Cloud client. */
const BUILTIN_RECEIVERS = new Set([
  'Array', 'Buffer', 'Int8Array', 'Uint8Array', 'Uint8ClampedArray', 'Int16Array', 'Uint16Array',
  'Int32Array', 'Uint32Array', 'Float32Array', 'Float64Array', 'BigInt64Array', 'BigUint64Array',
])
/** A query: `x.from(...)` or `x['from'](...)`. Reading a `leg.from` field is not one. */
const isClientFrom = (r: MemberRef) => r.isCall && r.name === 'from' && !(r.receiver && BUILTIN_RECEIVERS.has(r.receiver))

/** Names that only a Supabase client has. Any use of one is refused anywhere in src/. */
const CLIENT_ONLY = new Set([
  'rpc', 'updateUser', 'invoke', 'signUp', 'resetPasswordForEmail', 'signInWithOtp', 'linkIdentity', 'unlinkIdentity',
  'reauthenticate', 'storage', 'functions', 'admin',
])
/** Methods a Set, Map or URLSearchParams has too, so calling them is refused only in files that work with the client. */
const GENERIC_WRITES = new Set(['insert', 'update', 'upsert', 'delete'])

// ---------- per-file facts ----------

interface Facts {
  sf: ts.SourceFile
  imports: ImportRef[]
  refs: MemberRef[]
  /** The file imports a Supabase package or calls `.from(`: it would work with a Crewlu Cloud client. */
  touchesClient: boolean
}

function factsOf(path: string, code: string): Facts {
  const sf = parse(code, path)
  const imports = importsOf(sf)
  const refs = memberRefs(sf)
  const importsClient = imports.some((i) => i.specifier?.startsWith('@supabase/') === true)
  return { sf, imports, refs, touchesClient: importsClient || refs.some(isClientFrom) }
}

/** Files whose code reads `.from` on something that isn't a built-in: the ones that query the database. */
export function fromCallers(sources: Record<string, string>): string[] {
  return Object.entries(sources)
    .filter(([path, code]) => memberRefs(parse(code, path)).some(isClientFrom))
    .map(([path]) => path)
}

export function touchesClient(path: string, code: string): boolean {
  return factsOf(path, code).touchesClient
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

// ---------- the per-file rules ----------

/** Everything wrong with one source file under the read-only rules; an empty list means it passes. */
export function violations(path: string, code: string): string[] {
  const facts = factsOf(path, code)
  const found: string[] = []

  if (/innerHTML|dangerouslySetInnerHTML/.test(code)) found.push(`${path} injects HTML (innerHTML or dangerouslySetInnerHTML); Preact escapes text, keep it that way`)

  for (const ref of facts.imports) {
    if (ref.specifier === null) {
      found.push(`${path} imports a module by a computed name; use a string literal so the import graph can be checked`)
    } else if (/^[a-z][a-z0-9+.-]*:/i.test(ref.specifier)) {
      found.push(`${path} imports ${ref.specifier}; imports from URLs and schemes (https:, data:, node:) are not allowed`)
    } else if (ref.specifier.startsWith('@supabase/')) {
      found.push(`${path} imports ${ref.specifier}; the site has no Supabase client: it reaches Crewlu Cloud only through ${DOOR_MODULE}`)
    }
  }

  for (const r of facts.refs) {
    if (CLIENT_ONLY.has(r.name)) {
      found.push(`${path}:${r.line} uses .${r.name}, which only a Supabase client has; the site reaches Crewlu Cloud only through the partner door`)
    } else if (facts.touchesClient && r.isCall && GENERIC_WRITES.has(r.name)) {
      found.push(`${path}:${r.line} calls .${r.name} in a file that queries tables; the site never writes`)
    }
  }

  return [...found, ...networkProblems(path, facts)]
}
