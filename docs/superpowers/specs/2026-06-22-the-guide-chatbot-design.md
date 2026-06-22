# "The Guide" — site chatbot for shaquillegurung.com — Design Spec

**Status:** approved design, pending spec review → implementation plan
**Date:** 2026-06-22
**Working name:** "the Guide" (no fixed persona name in v1)

## Goal

A calm, on-brand, **honest** chat guide embedded on shaquillegurung.com that answers
visitor questions about Shaquille and his work — strictly from a hand-authored knowledge
base, never invented — and conversationally captures project leads, emailing them to
Shaquille. Built as a **reusable widget + per-site backend** so ClaimSarathi (and other
sites) can reuse the widget verbatim later.

## Architecture (two halves, one tiny contract)

```
VISITOR'S BROWSER                         server.js (shaquillegurung.com)
┌───────────────────────────┐            ┌──────────────────────────────┐
│ public/chat-widget.js     │  POST      │ POST /api/chat (SSE stream)   │
│ • edge tab "Ask the guide"│ {messages} │  • holds ANTHROPIC_API_KEY    │
│ • calm panel (Shadow DOM) │ ─────────► │  • system = persona + honesty │
│ • renders + streams reply │            │    rules + knowledge.md       │
│ • themed to site palette  │ ◄───────── │  • streams Sonnet 4.6 reply   │
│ • knows nothing of Claude │  SSE text  │  • submit_project_lead tool   │
└───────────────────────────┘            │      → lib/resend → your Gmail│
      reusable, write once               │ POST /api/contact (wired too) │
                                         └──────────────────────────────┘
```

**The reusable asset is the contract:** widget sends `{ messages:[{role,content}] }`,
server streams plain text back as SSE. Tool-use (lead capture) is handled **entirely
server-side** and is invisible to the widget — it only ever sends messages and renders
streamed text. Later, ClaimSarathi reuses `chat-widget.js` byte-for-byte and only writes
its own `/api/chat` prompt + theme.

## Locked decisions (this session)

| Decision | Choice |
|---|---|
| Model | **Claude Sonnet 4.6** (`claude-sonnet-4-6`) — sharper honesty/refusals; traffic is tiny so cost is cents/month |
| v1 scope | **Chat + intake together** |
| Lead destination | **Shaquille's Gmail** (`CONTACT_TO`), reliable immediately; `hi@shaquillegurung.com` shown publicly |
| Public contact address | **hi@shaquillegurung.com** (was hello@) |
| Rate limiting | **express-rate-limit** (reuse the pattern just shipped for ClaimSarathi), not hand-rolled |
| Extended thinking | **Off** for v1 (omit `thinking`) — short grounded answers, latency matters; can enable adaptive later if quality needs it |

## Components

### 1. `public/chat-widget.js` (new — reusable, zero-dependency)
- Renders inside a **Shadow DOM** so host-page CSS can't break it and its styles can't leak.
- Config API: `ChatWidget.init({ endpoint, launcher:'edge-tab', accent, title, greeting })`.
- Launcher = a vertical **"Ask the guide" edge tab** (Placement C, locked).
- Streams the reply **token-by-token** (the single biggest "this feels real" detail).
- Holds conversation history client-side; sends the running `messages` array each turn.
- Accessibility: `role="dialog"`, `aria-live="polite"` on the streamed answer region,
  Enter to send, Esc to close, visible focus states.
- Knows nothing about Claude or about Shaquille — "POST messages, render what streams back."

### 2. `POST /api/chat` (new — streaming)
- Slots in **before** the existing `app.use("/api", …)` 404 catch-all in `server.js`.
- Validates body: `messages` array, each message `content` ≤ **2000 chars**, history
  trimmed to the last **~20** messages (cost/abuse cap).
- Builds the system prompt = persona + honesty rules + `getContext(message)` knowledge,
  with the knowledge block wrapped in `cache_control: { type: "ephemeral" }` (prompt
  caching — same trick as ClaimSarathi).
- Calls `claude-sonnet-4-6` via the SDK's `messages.stream()` with `max_tokens` ≤ **1024**
  and `tools: [submit_project_lead]`. Streams text deltas to the browser as SSE
  (`text/event-stream`): `{type:"text",value}` … `{type:"done"}` / `{type:"error"}`.
- **Tool loop (server-side, invisible to widget):** if the model emits a `submit_project_lead`
  tool_use, the server executes it (validate → `lib/resend` → email), appends the
  `tool_result`, and continues the stream so the Guide's confirmation text streams back.

### 3. `knowledge.md` (new — the Guide's single source of truth)
- Hand-authored: bio; the four projects + the honest "primitive" each demonstrates;
  "how I work" philosophy; "build with me" services & process; contact; availability;
  short FAQ. **I draft it from existing site copy; Shaquille edits.**
- **RAG seam:** today `getContext(message)` returns the whole file. Later (a learning
  exercise) swap only that function to embed-the-query + retrieve-top-k. Nothing else changes.

### 4. `lib/anthropic.js`, `lib/resend.js` (new — tiny clients)
- `lib/anthropic.js`: wraps `@anthropic-ai/sdk`, throws at import if `ANTHROPIC_API_KEY`
  is missing (mirrors ClaimSarathi `client.js`).
- `lib/resend.js`: wraps `resend`; `sendLead({name, contact, summary})` emails `CONTACT_TO`.
  v1 sends **from `onboarding@resend.dev`** (works with no domain verification, since it's
  going to Shaquille's own Gmail). Later polish: verify the domain and send from
  `guide@shaquillegurung.com`.

### 5. `POST /api/contact` (edit — wire the 501 stub)
- Replace the 501 with real delivery via the same `lib/resend` `sendLead`. Keeps the
  existing name/email/message validation + regex. The chat tool and this endpoint share
  one delivery path.

### 6. `public/index.html` (edit — small)
- Two `<script>` lines: load `chat-widget.js` + `ChatWidget.init({...})`.
- **Brand-integrity fix:** the footer currently implies "no live model / no network calls."
  The Guide *is* a live model. Scope that disclosure to the **on-device hero demo** and add
  a one-line honest note that the Guide (chat) is a live AI. The site stays self-consistent.

### 7. `package.json` / `.env.example` (edit)
- Add deps: `@anthropic-ai/sdk`, `resend`, `express-rate-limit`.
- `.env.example` new keys: `ANTHROPIC_API_KEY`, `RESEND_API_KEY`, `CONTACT_TO`
  (+ optional `LEAD_FROM` for the later domain-verified sender).

## Honesty behavior (the on-brand core)
Baked into the system prompt, mirroring ClaimSarathi's "Not stated in your policy":
- Answers **only** from `knowledge.md`. Not in there → "That's not something I can speak
  to" — never invents.
- Openly an **AI guide speaking about Shaquille (third person)** — never pretends to be him.
- **Scope-limited** to Shaquille + his work + his services; politely declines off-topic
  (this doubles as cost/abuse protection).

## Guardrails & cost control
- **express-rate-limit**, per-IP: `/api/chat` ≈ 20 requests / 10 min; `/api/contact` ≈ 5 / hour.
- Input length cap (2000 chars/message), history cap (~20 messages), `max_tokens` ≤ 1024.
- **Anthropic monthly spend cap** in the console (Shaquille sets it — the hard backstop,
  same as the ClaimSarathi discussion).
- Secrets in `.env` (gitignored) + Railway env vars; documented in `.env.example`.

## Testing (light — personal site, not ShedTech's 90% bar)
`node --test` (matching ClaimSarathi):
- `getContext()` returns the knowledge content.
- Lead validation: requires all three fields + valid email; never sends on incomplete data.
- Rate limiter: trips after the configured limit (reuse the ClaimSarathi test shape).
- `/api/chat` smoke test with a **mocked** Anthropic client: asserts text streams as SSE.
- Tool path with a **mocked** Resend: `submit_project_lead` triggers exactly one send.

## Explicitly NOT in v1
Vector DB / embeddings (later learning exercise), the 3D avatar, rollout to other sites,
server-side chat history storage, analytics, a fixed persona name, and **domain-verified
sending** (from `@shaquillegurung.com` — deferred; v1 sends from `resend.dev` to Gmail).

## Dependencies / user actions (not code)
1. Add `ANTHROPIC_API_KEY` to Railway (the site doesn't use Anthropic yet).
2. Create `RESEND_API_KEY` in Resend → add to Railway. (Shaquille does this; I can't.)
3. Set `CONTACT_TO` = Shaquille's Gmail.
4. Set the Anthropic monthly spend cap.
5. **Later polish (optional):** verify the domain in Resend (Porkbun DNS) to send from
   `guide@shaquillegurung.com`; set up `hi@` → Gmail forwarding (ImprovMX) so the public
   address has a real inbox.
