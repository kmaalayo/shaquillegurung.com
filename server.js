// server.js — shaquillegurung.com
// A small Express backend that serves the static site and a tiny JSON API.
// Designed to run anywhere Node runs; on Railway, PORT is injected automatically.

import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

app.disable("x-powered-by");
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

// Contact endpoint (scaffold). Validates input now; real delivery (Resend) is the
// next increment — see README. Returns 501 until wired so a message is never
// silently dropped. The v1 site uses a mailto: link, so this isn't called yet.
app.post("/api/contact", (req, res) => {
  const { name, email, message } = req.body || {};
  if (!name || !email || !message) {
    return res.status(400).json({ error: "name, email and message are required." });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: "Please provide a valid email address." });
  }
  // TODO: wire Resend (RESEND_API_KEY + CONTACT_TO) to actually deliver this.
  return res.status(501).json({ error: "Contact delivery isn't wired up yet." });
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
