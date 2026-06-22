// server.js — shaquillegurung.com
// A small Express backend that serves the static site and a tiny JSON API.
// Designed to run anywhere Node runs; on Railway, PORT is injected automatically.

import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { rateLimit } from "express-rate-limit";
import { getAnthropic } from "./lib/anthropic.js";
import { buildSystem } from "./lib/guide.js";
import { runGuide, sanitizeMessages } from "./lib/chat.js";
import { sendLead, validateLead } from "./lib/resend.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

app.disable("x-powered-by");
app.set("trust proxy", 1); // behind Railway's proxy → real client IP for rate limiting
app.use(express.json({ limit: "100kb" }));

// ---- API -------------------------------------------------------------------

// Health check — also used by the site footer to show a live "backend online" dot.
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    service: "shaquillegurung.com",
    time: new Date().toISOString(),
  });
});

// ---- The Guide (chat) ------------------------------------------------------
// Per-IP rate limit (this endpoint spends Anthropic tokens). trust proxy is set above so
// each visitor is bucketed by real IP behind Railway.
const chatLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) =>
    res.status(429).json({ error: "Too many messages. Please wait a few minutes and try again." }),
});

// POST /api/chat — streams Claude's reply as SSE and handles the submit_project_lead tool
// loop. Registered ABOVE the /api 404 + SPA fallback below so it isn't swallowed.
app.post("/api/chat", chatLimiter, async (req, res) => {
  const messages = sanitizeMessages(req.body && req.body.messages);
  if (!messages) {
    return res.status(400).json({ error: "messages must be a non-empty array of text turns." });
  }

  let client;
  try {
    client = getAnthropic();
  } catch {
    return res.status(503).json({ error: "The Guide isn't available right now." });
  }

  // SSE: never set Content-Length (keeps chunked encoding so tokens stream); no compression
  // is mounted on this app, so res.flush() is neither needed nor available.
  res.writeHead(200, {
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });
  res.flushHeaders();
  res.write(": connected\n\n");

  let closed = false;
  const ac = new AbortController();
  // res (NOT req) 'close' is the correct disconnect signal: req 'close' fires as soon as
  // the request body is consumed, which would abort the stream immediately. res 'close'
  // fires only when the client actually disconnects (or after we finish).
  res.on("close", () => {
    closed = true;
    ac.abort(); // stop the in-flight Anthropic stream so we don't bill into a dead socket
  });
  const emit = (event) => {
    if (!closed) res.write(`data: ${JSON.stringify(event)}\n\n`);
  };

  try {
    await runGuide({
      client,
      system: buildSystem(messages[messages.length - 1].content),
      messages,
      sendLead,
      emit,
      isClosed: () => closed,
      signal: ac.signal,
    });
  } catch {
    emit({ type: "error", message: "Something went wrong. Please try again." });
  } finally {
    if (!closed) res.end();
  }
});

// Contact endpoint — real delivery via Resend (shares lib/resend with the Guide's tool).
// Stricter than chat: every call sends a real email, so cap it hard per IP (mail-bomb guard).
const contactLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) =>
    res.status(429).json({ error: "Too many messages. Please try again later." }),
});
app.post("/api/contact", contactLimiter, async (req, res) => {
  const { name, email, message } = req.body || {};
  const v = validateLead({ name, email, message });
  if (!v.ok) return res.status(400).json({ error: v.error });
  try {
    await sendLead({ name, email, message });
    return res.json({ ok: true });
  } catch (e) {
    if (e.code === "NO_RESEND_KEY" || e.code === "NO_CONTACT_TO") {
      return res.status(503).json({ error: "Contact delivery isn't configured yet." });
    }
    return res.status(502).json({ error: "Couldn't send your message — please email directly." });
  }
});

// Unknown /api/* routes -> JSON 404 (don't fall through to the page).
app.use("/api", (req, res) => res.status(404).json({ error: "Not found." }));

// ---- Static site -----------------------------------------------------------

app.use(express.static(path.join(__dirname, "public"), { extensions: ["html"] }));

// Everything else -> the landing page (single-page site).
app.get("*", (req, res) => res.sendFile(path.join(__dirname, "public", "index.html")));

const PORT = process.env.PORT || 5050;
app.listen(PORT, () => {
  console.log(`shaquillegurung.com running on http://localhost:${PORT}`);
});
