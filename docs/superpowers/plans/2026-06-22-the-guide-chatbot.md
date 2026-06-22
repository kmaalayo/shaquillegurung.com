# "The Guide" — Implementation Plan

> Executes the spec at `docs/superpowers/specs/2026-06-22-the-guide-chatbot-design.md`.
> Built task-by-task with a commit per task. Patterns below are grounded against official
> docs (Anthropic SDK, Resend, SSE/Express, Shadow DOM) — not guessed.

**Goal:** A reusable Shadow-DOM chat widget + a streaming `/api/chat` (Claude Sonnet 4.6,
grounded in `knowledge.md`, honest refusals) with conversational lead capture via tool use
→ Resend → owner's Gmail, guarded by `express-rate-limit`.

## Global constraints
- Node 20+, **ESM**, **Express 4.21.2** (already installed). No compression middleware.
- Model id: **`claude-sonnet-4-6`**; `thinking` omitted (low-latency chat).
- Email everywhere: **`hi@shaquillegurung.com`** (update the site's current `hello@` too).
- Secrets via env only: `ANTHROPIC_API_KEY`, `RESEND_API_KEY`, `CONTACT_TO`, optional `LEAD_FROM`.
- No `innerHTML` of model output anywhere (XSS). No `Content-Length` on the SSE route.
- `POST /api/chat` MUST be registered **above** the `app.use("/api", …)` 404 (server.js:42).

## Grounded patterns (from research, w9kqczvve)
- **Stream:** `client.messages.stream({model,max_tokens,system,messages,tools})`; `stream.on('text', d => …)`; `await stream.finalMessage()`.
- **Tool loop:** if `msg.stop_reason==='tool_use'` → push `{role:'assistant',content:msg.content}`, run each `tool_use` block, push `{role:'user',content:[{type:'tool_result',tool_use_id,content}]}` (tool_result FIRST), re-stream until not tool_use.
- **Caching:** `system:[{type:'text',text:KNOWLEDGE,cache_control:{type:'ephemeral'}}]` (≥1024 tok to cache).
- **Resend:** `const {data,error}=await resend.emails.send({from,to,subject,text,reply_to})` — does NOT throw; check `error`. `from:'The Guide <onboarding@resend.dev>'` works unverified (delivers to the account owner's email — our case).
- **SSE headers:** `text/event-stream; charset=utf-8`, `Cache-Control:no-cache, no-transform`, `Connection:keep-alive`, `X-Accel-Buffering:no`; `res.flushHeaders()`; frames `data: <json>\n\n`; `req.on('close')`→abort upstream; `res.end()`. No `res.flush()` (no compression).
- **Client read:** `fetch` + `res.body.getReader()` + `TextDecoder({stream:true})`; accumulate, split on `\n\n`, carry the trailing partial.
- **Widget:** host `<div>`→`attachShadow({mode:'open'})`→`<style>` + `:host{all:initial}`; theme via `--cw-accent`; edge-tab (`writing-mode:vertical-rl`); `role="dialog"`+`aria-labelledby`, transcript `role="log" aria-live="polite"`; Enter send / Shift+Enter newline / Esc close; stream into one text node via `appendData`.

---

## Task 1 — Dependencies & env scaffolding
**Files:** `package.json` (add `@anthropic-ai/sdk`, `resend`, `express-rate-limit`; add `"test":"node --test"`), `.env.example` (add the 4 keys with comments).
- `npm install @anthropic-ai/sdk resend express-rate-limit`.
- Verify `npm ls` resolves; commit.

## Task 2 — Tiny clients (`lib/`)
**Files:** `lib/anthropic.js` (default-export-wrapped client; throws at import if `ANTHROPIC_API_KEY` missing — mirrors ClaimSarathi `client.js`), `lib/resend.js` (`sendLead({name,email,message})` → `resend.emails.send`, `from` = `LEAD_FROM || 'The Guide <onboarding@resend.dev>'`, `to` = `CONTACT_TO`, `reply_to` = lead email; returns `{ok}` / throws on `error`).
**Test:** `test/lead.test.js` — `validateLead()` (pure helper in lib/resend.js) requires all 3 fields + valid email; rejects bad email. Commit.

## Task 3 — Knowledge + system prompt
**Files:** `knowledge.md` (the grounded draft, **email→`hi@`**), `lib/guide.js` (`getContext()` reads+caches `knowledge.md` — the RAG seam; `buildSystem()` = persona + honesty rules + knowledge as a cached system block).
- Honesty rules in the prompt: answer ONLY from knowledge; not covered → "that's not something I can speak to"; openly an AI guide speaking in third person about Shaquille; scope-limited to him/his work/services; never invent.
**Test:** `test/guide.test.js` — `getContext()` returns knowledge text; `buildSystem()` includes the honesty directive + `cache_control`. Commit.

## Task 4 — `POST /api/chat` (streaming + tool loop + guardrails)
**Files:** `server.js` (new route above line 42), reuse `lib/anthropic.js`, `lib/guide.js`, `lib/resend.js`.
- Validate body: `messages` array; each `content` ≤2000 chars; trim to last ~20.
- `express-rate-limit`: `/api/chat` 20 req / 10 min per IP (`trust proxy` set for Railway).
- SSE per grounded pattern; tool `submit_project_lead` → `sendLead` → continue stream.
- Abort upstream on `req.on('close')`.
**Test:** `test/chat.test.js` — with a **mocked** Anthropic stream + mocked `sendLead`: (a) plain answer streams `data:` frames then `[DONE]`; (b) a `tool_use` turn triggers exactly one `sendLead` and a follow-up stream; (c) over-long input → 400. Commit.

## Task 5 — Wire `/api/contact`
**Files:** `server.js` — replace the 501 with `sendLead` (shares lib/resend); keep existing validation. Commit.

## Task 6 — `public/chat-widget.js` (reusable widget)
**Files:** `public/chat-widget.js` (new) — Shadow DOM, edge-tab launcher, accessible dialog, streaming fetch reader, `ChatWidget.init({endpoint,launcher,accent,title,greeting})`, idempotent + `destroy()`. No external deps. Commit.

## Task 7 — Wire into the site + honesty fixes
**Files:** `public/index.html` — add `<script src="/chat-widget.js" defer>` + `ChatWidget.init({...})` (accent = site green, title "Ask the guide"); **footer brand-integrity fix** (scope "no live model / no network calls" to the on-device hero demo + one honest line that the Guide is a live AI); **`hello@`→`hi@`** in the email button + clipboard handler. Commit.

## Task 8 — Verify
- `npm test` green. Serve `public/` (static preview) + a stub SSE endpoint to smoke the widget (open/stream/escape/keyboard). Adversarial review pass (security: key exposure, prompt-injection scope, XSS in render, abuse/cost; correctness: tool loop, SSE framing, disconnect). Fix findings. Report + deploy/env handoff.

## Out of scope (v1)
Vector RAG, 3D avatar, multi-site rollout, chat history storage, analytics, persona name,
domain-verified sending (from `@shaquillegurung.com` — later; v1 sends from `resend.dev`).

## User actions to go live (not code)
Add `ANTHROPIC_API_KEY`, `RESEND_API_KEY`, `CONTACT_TO`(=Gmail) to Railway; set an Anthropic
monthly spend cap. Optional later: verify domain in Resend; set up `hi@`→Gmail forwarding.
