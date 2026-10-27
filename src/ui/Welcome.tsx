import { useState } from 'preact/hooks'
import { bareCode, bareInvite, CODE_LENGTH, codeFrom, linkFromText, type PartnerLink } from '../partner/link'
import { NO_LINK_YET, NOT_AN_INVITE_LINK, PASSWORD_SIGN_IN_ENDED, type JoinMessage } from '../partner/messages'

/**
 * Root shows `Connecting` between attempts. That remounts this screen, which is what empties the boxes after a failure.
 */
export interface WelcomeProps {
  /** Why the last link or code didn't connect, when that's what brought this screen back. */
  message: JoinMessage | null
  /** The pilot whose sharing just ended, as this partner saw them, when that's why this shows (piece 5a §5). */
  ended: string | null
  /** This browser used the password sign-in until this page loaded: it's told that has ended (piece 5a §8). */
  passwordEnded?: boolean
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
 * Keeps typing on the end of the code. The boxes show the code from its start, so a caret left anywhere else, by a tap
 * or an arrow key, would put the next letter in the middle. It waits a frame, for the browser to place the caret first.
 * On focus the caret always goes to the end, as input-otp's does: a Tab into a part-typed code would otherwise select
 * it all. After a click or a key, a selection that reaches the end is left alone: a select-all, a double-click or
 * Shift+Left is the person's own, and the next paste or letter should replace it. A caret or a selection that stops
 * short of the end goes to the end. A caret already at the end is left alone too, so a keyboard that is mid-word (on
 * Android) gets no selection change it didn't need.
 */
function caretToEnd(e: { currentTarget: HTMLInputElement; type: string }) {
  const input = e.currentTarget // taken now: it's null once the event has finished
  const keepSelection = e.type !== 'focus' // a select-all, a double-click or Shift+Left the person made
  requestAnimationFrame(() => {
    const end = input.value.length
    if (input.selectionEnd !== end || (!keepSelection && input.selectionStart !== end)) input.setSelectionRange(end, end)
  })
}

/**
 * The screen of a browser that follows no one (piece 5a §8). The invite link, opened on this device, connects by
 * itself; here the partner can paste it instead, or type the code Crewluve's Use on Another Device shows.
 */
export function Welcome({ message, ended, passwordEnded = false, onJoin }: WelcomeProps) {
  const [pasted, setPasted] = useState('')
  const [problem, setProblem] = useState<JoinMessage | null>(message)
  // How many problems this screen has shown. It keys the alert, so every problem is a new alert, which a screen reader
  // announces even when it is the same as the last one.
  const [shown, setShown] = useState(0)
  const [code, setCode] = useState('')

  /** Every problem goes through here. Typing hides it again with setProblem(null), so a stale reason doesn't linger. */
  const showProblem = (next: JoinMessage) => {
    setProblem(next)
    setShown((count) => count + 1)
  }

  const connect = (event: Event) => {
    event.preventDefault()
    // A link, or else an invite's bare token, which only the website takes, or a bare code, which Crewluve's paste box
    // takes too.
    const link = linkFromText(pasted) ?? bareInvite(pasted) ?? bareCode(pasted)
    if (link) onJoin(link)
    else showProblem(NOT_AN_INVITE_LINK)
  }
  const typeCode = (input: HTMLInputElement) => {
    setProblem(null)
    const typed = input.value
    // Any link that can be read, an invite link or a code link, connects as the link would, not as its first six
    // letters. So does an invite's bare token, whose first six letters would go as a wrong code, a failure toward the
    // door's pause. Only a paste brings one here: typing sends a code at its sixth letter.
    const link = linkFromText(typed) ?? bareInvite(typed)
    if (link) {
      setCode('')
      input.value = ''
      onJoin(link)
      return
    }
    // No link, yet a "/", a "#" or an "=": the debris of one, which is never part of a code. Its letters aren't taken
    // for a code's. The boxes and the field are emptied, and nothing joins.
    if (/[/#=]/.test(typed)) {
      setCode('')
      input.value = ''
      showProblem(NOT_AN_INVITE_LINK)
      return
    }
    const next = codeFrom(typed)
    setCode(next)
    // The field holds what the boxes show, so a Backspace takes away a letter the boxes show: a space, a dash or a
    // dropped letter is written back out. It's compared in upper case, so lower-case typing isn't rewritten mid-word
    // (Gboard can double letters when a field is rewritten under it).
    if (input.value.toUpperCase() !== next) input.value = next
    if (next.length === CODE_LENGTH) onJoin({ kind: 'code', code: next })
  }

  return (
    <main class="screen signin">
      <Heading title="Welcome to CrewLuve" />
      <p class="signin-sub">Stay connected with your pilot</p>
      {ended && <p class="signin-note">Sharing with {ended} has ended.</p>}
      {passwordEnded && <p class="signin-note">{PASSWORD_SIGN_IN_ENDED}</p>}
      <p class="welcome-step">Open the invite link your pilot sent you, on this device.</p>
      <p class="signin-note">{NO_LINK_YET}</p>
      {problem && (
        <p key={shown} class="signin-error" role="alert">
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
          autocorrect="off"
          spellcheck={false}
          placeholder="Paste the invite link your pilot sent you."
          value={pasted}
          onInput={(e) => {
            setProblem(null)
            setPasted(e.currentTarget.value)
          }}
        />
        <button class="primary" type="submit" disabled={pasted.trim() === ''}>Connect</button>
      </form>
      <div class="welcome-code">
        <p id="code-hint" class="welcome-label">or type the code from CrewLuve on another device</p>
        {/* One field drawn as six boxes, so typing, pasting and the keyboard's suggestions all work. */}
        <div class="code">
          {/* The field is uncontrolled, with no value prop, on purpose: typeCode rewrites it only when a character is
              dropped, never for case. A field rewritten mid-word makes Android keyboards double letters. */}
          <input
            class="code-input"
            type="text"
            aria-label="Code"
            aria-describedby="code-hint"
            autocomplete="one-time-code"
            autocapitalize="characters"
            autocorrect="off"
            spellcheck={false}
            onInput={(e) => typeCode(e.currentTarget)}
            onFocus={caretToEnd}
            onClick={caretToEnd}
            onKeyUp={caretToEnd}
          />
          <div class="code-boxes" aria-hidden="true">
            {Array.from({ length: CODE_LENGTH }, (_, i) => (
              <span key={i} class={i === code.length ? 'field code-box next' : 'field code-box'}>{code[i] ?? ''}</span>
            ))}
          </div>
        </div>
      </div>
      <a class="signin-demo" href="?demo=1">Try Demo</a>
    </main>
  )
}

/**
 * While a link or a code connects (piece 5a §4.3, step 1). Its line isn't a live region: Root's, which is on the page
 * before this screen, reads "Connecting…", so it isn't read twice.
 */
export function Connecting() {
  return (
    <main class="screen signin">
      <Heading title="CrewLuve" />
      <p class="signin-sub">Connecting…</p>
    </main>
  )
}
