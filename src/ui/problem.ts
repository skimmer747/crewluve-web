/** Why the footer shows a warning instead of the freshness rows. */
export type Problem = { kind: 'offline' } | { kind: 'unreachable' } | null
