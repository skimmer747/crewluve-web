/**
 * The test suite's network guard, registered in vitest.config.ts. Any attempt to reach a host other than this machine
 * fails loudly, so no test can talk to the real CrewLu Cloud, even by mistake. Tests use fakes, and that is enforced here
 * rather than left to care.
 */
import http from 'node:http'
import https from 'node:https'
import net from 'node:net'
import tls from 'node:tls'

const LOCAL_HOST = /^(localhost|127\.0\.0\.1|::1|\[::1\])$/
const isLocal = (host: unknown) => host == null || host === '' || LOCAL_HOST.test(String(host))

type AnyFunction = (...args: unknown[]) => unknown

/** Wraps `target[name]` so that a call aimed at a non-local host throws instead of connecting. */
function guard(target: object, name: string, label: string, hostOf: (args: unknown[]) => unknown): void {
  const holder = target as Record<string, AnyFunction>
  const original = holder[name]
  holder[name] = function (this: unknown, ...args: unknown[]) {
    const host = hostOf(args)
    if (!isLocal(host)) throw new Error(`Tests may not use the network: blocked ${label} to ${String(host)}`)
    return original.apply(this, args)
  }
}

const field = (value: unknown, key: string): unknown =>
  typeof value === 'object' && value !== null ? (value as Record<string, unknown>)[key] : undefined

/** net.connect(options) / net.connect(port, host) / tls.connect(...); a Unix socket path counts as local. */
const socketHost = (args: unknown[]) =>
  typeof args[0] === 'object' ? (field(args[0], 'host') ?? field(args[0], 'hostname') ?? field(args[0], 'servername')) : typeof args[1] === 'string' ? args[1] : undefined

/** http.request(url | URL | options, ...). */
const requestHost = (args: unknown[]) => {
  const first = args[0]
  if (typeof first === 'string') return new URL(first).hostname
  if (first instanceof URL) return first.hostname
  return field(first, 'hostname') ?? field(first, 'host')
}

guard(net, 'connect', 'a socket', socketHost)
guard(net, 'createConnection', 'a socket', socketHost)
guard(tls, 'connect', 'a TLS socket', socketHost)
for (const module of [http, https]) {
  guard(module, 'request', 'an HTTP request', requestHost)
  guard(module, 'get', 'an HTTP request', requestHost)
}

const realFetch = globalThis.fetch
if (realFetch) {
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const address = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
    let host: string | undefined
    try {
      host = new URL(address, 'http://localhost/').hostname
    } catch {
      host = undefined
    }
    if (!isLocal(host)) throw new TypeError(`Tests may not use the network: blocked fetch to ${address}`)
    return realFetch(input, init)
  }) as typeof fetch
}
