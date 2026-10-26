import { useState } from 'preact/hooks'
import { CODE_LENGTH, codeFrom, linkFromText, type PartnerLink } from '../partner/link'
import { NOT_AN_INVITE_LINK, type JoinMessage } from '../partner/messages'

export interface WelcomeProps {
  /** Why the last link or code didn't connect, when that's what brought this screen back. */
  message: JoinMessage | null
  /** The pilot whose sharing just ended, as this partner saw them, when that's why this shows (piece 5a §5). */
  ended: string | null
  onJoin: (link: PartnerLink) => void
}

/** The heart over a title: the welcome and "Connecting…" keep the old sign-in screen's layout. */
function Heading({ title }: { title: string }) {
  return (
    <>
      <div class="signin-mark">
        <img src="/icons/heart-256.png" alt="" width={88} height={88} />
      </div>
      <h1 class="title">{title}</h1>
    </>
  )
}

/**
 * The screen of a browser that follows no one (piece 5a §8). The invite link, opened on this device, connects by
 * itself; here the partner can paste it instead, or type the code Crewluve's Use on Another Device shows.
 */
export function Welcome({ message, ended, onJoin }: WelcomeProps) {
  const [pasted, setPasted] = useState('')
  const [problem, setProblem] = useState<JoinMessage | null>(message)
  const [code, setCode] = useState('')

  const connect = (event: Event) => {
    event.preventDefault()
    const link = linkFromText(pasted)
    if (link) onJoin(link)
    else setProblem(NOT_AN_INVITE_LINK)
  }
  const typeCode = (typed: string) => {
    // A whole code link pasted into the boxes connects as the link would, not as its first six letters.
    const link = linkFromText(typed)
    if (link) {
      setCode('')
      onJoin(link)
      return
    }
    const next = codeFrom(typed)
    setCode(next)
    if (next.length === CODE_LENGTH) onJoin({ kind: 'code', code: next })
  }

  return (
    <main class="screen signin">
      <Heading title="Welcome to CrewLuve" />
      <p class="signin-sub">Stay connected with your pilot</p>
      {ended && <p class="signin-note">Sharing with {ended} has ended.</p>}
      <p class="welcome-step">Open the invite link your pilot sent you, on this device.</p>
      {problem && (
        <p class="signin-error" role="alert">
          <strong>{problem.title}</strong> {problem.text}
        </p>
      )}
      <form class="signin-form" onSubmit={connect}>
        <label class="welcome-label" for="invite">Paste Invite Link</label>
        <input
          id="invite"
          class="field"
          type="text"
          inputMode="url"
          autocomplete="off"
          autocapitalize="off"
          spellcheck={false}
          placeholder="Paste the invite link your pilot sent you."
          value={pasted}
          onInput={(e) => setPasted(e.currentTarget.value)}
        />
        <button class="primary" type="submit" disabled={pasted.trim() === ''}>Connect</button>
      </form>
      <p class="welcome-label">or type the code from CrewLuve on another device</p>
      {/* One field drawn as six boxes, so typing, pasting and the keyboard's suggestions all work. */}
      <div class="code">
        <input
          class="code-input"
          type="text"
          aria-label="Code"
          autocomplete="one-time-code"
          autocapitalize="characters"
          spellcheck={false}
          value={code}
          onInput={(e) => typeCode(e.currentTarget.value)}
        />
        <div class="code-boxes" aria-hidden="true">
          {Array.from({ length: CODE_LENGTH }, (_, i) => (
            <span key={i} class="field code-box">{code[i] ?? ''}</span>
          ))}
        </div>
      </div>
      <a class="signin-demo" href="?demo=1">Try Demo</a>
    </main>
  )
}

/** While a link or a code connects (piece 5a §4.3, step 1). */
export function Connecting() {
  return (
    <main class="screen signin" aria-busy="true">
      <Heading title="CrewLuve" />
      <p class="signin-sub" role="status">Connecting…</p>
    </main>
  )
}
