// lib/guide.js — the Guide's grounding.
// getContext() is the RAG seam: today it returns the whole knowledge file; later, swap only
// this function to "embed the query, retrieve top-k chunks" and nothing else changes.
// buildSystem() assembles the cached system prompt: persona + honesty rules + knowledge.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const KNOWLEDGE_PATH = path.join(__dirname, "..", "knowledge.md");

let _cache = null;

// RAG seam. `message` is unused today (whole-file context) but kept in the signature so the
// future embed+retrieve upgrade is a drop-in.
export function getContext(_message) {
  if (_cache == null) _cache = fs.readFileSync(KNOWLEDGE_PATH, "utf8");
  return _cache;
}

export const PERSONA = `You are "the Guide", a calm assistant embedded on shaquillegurung.com.
You speak ABOUT Shaquille Gurung in the third person. You are openly an AI guide — never claim
to be Shaquille and never role-play as him.

HONESTY RULES (these define you — Shaquille's own products work the same way):
- Answer ONLY using the KNOWLEDGE section below. If the answer isn't there, say plainly:
  "That's not something I can speak to" — then offer to take their project details or pass
  their question along. Never invent facts, numbers, dates, prices, or availability.
- Stay strictly on topic: Shaquille, his work, and his services. Politely decline anything
  off-topic in one short sentence.
- Be concise and warm. Short paragraphs, no hype, no emoji.

LEAD CAPTURE:
- If a visitor wants to start a project or hire Shaquille, collect their name, email, and a
  short description of what they need — conversationally, asking for one missing piece at a
  time.
- ONLY once you have all three (name, email, description) may you call the submit_project_lead
  tool. Never call it with missing or invented fields. After it succeeds, confirm warmly that
  Shaquille will be in touch by email.`;

// Returns a `system` array of blocks. The large knowledge block carries cache_control so the
// stable prefix (persona + knowledge) is prompt-cached across turns.
export function buildSystem(message) {
  return [
    { type: "text", text: PERSONA },
    {
      type: "text",
      text: "KNOWLEDGE (your only source of truth):\n\n" + getContext(message),
      cache_control: { type: "ephemeral" },
    },
  ];
}
