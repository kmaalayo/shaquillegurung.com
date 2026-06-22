// lib/anthropic.js — the shared Anthropic client for the Guide.
// Lazy on purpose: this is a portfolio site first, the chat is an add-on. If the API key
// isn't set, the static site must still boot — only /api/chat should fail (cleanly). So we
// throw on first USE, not at import.
import Anthropic from "@anthropic-ai/sdk";

let _client = null;

export function getAnthropic() {
  if (!process.env.ANTHROPIC_API_KEY) {
    const e = new Error("ANTHROPIC_API_KEY is not configured.");
    e.code = "NO_API_KEY";
    throw e;
  }
  if (!_client) _client = new Anthropic(); // reads ANTHROPIC_API_KEY from env
  return _client;
}

// Sonnet 4.6 — best speed/intelligence balance; grounded short answers. (Verified model id.)
export const CHAT_MODEL = "claude-sonnet-4-6";
