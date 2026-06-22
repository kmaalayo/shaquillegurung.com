// lib/chat.js — the Guide's core turn logic, kept transport-free so it's unit-testable with
// a mock Anthropic client and a mock sendLead. The Express route (server.js) is a thin SSE
// adapter that feeds `emit` into res.write() and passes the real client + sendLead.
import { CHAT_MODEL } from "./anthropic.js";

export const MAX_MSG_CHARS = 2000; // per-message input cap (abuse/cost)
export const MAX_HISTORY = 20; // turns kept from the client-sent history
export const MAX_HOPS = 5; // tool-loop ceiling; the LAST hop runs without tools so the model
// can always deliver a closing reply to a pending tool_result instead of ending on a call.

// The single tool the Guide may call. Shapes per the Anthropic tool-use contract.
export const submitTool = {
  name: "submit_project_lead",
  description:
    "Record a qualified project lead and email it to Shaquille. Only call this once you have " +
    "the visitor's name, email, and a description of what they need.",
  input_schema: {
    type: "object",
    properties: {
      name: { type: "string", description: "The visitor's name" },
      email: { type: "string", description: "The visitor's email address" },
      message: { type: "string", description: "What they want built, in their words" },
    },
    required: ["name", "email", "message"],
  },
};

// Coerce the client-sent history into a safe { role, content } array, or null if unusable.
export function sanitizeMessages(raw) {
  if (!Array.isArray(raw) || raw.length === 0) return null;
  const cleaned = raw
    .slice(-MAX_HISTORY)
    .map((m) => ({
      role: m && m.role === "assistant" ? "assistant" : "user",
      content: m && typeof m.content === "string" ? m.content.slice(0, MAX_MSG_CHARS) : "",
    }))
    .filter((m) => m.content.length > 0);
  return cleaned.length ? cleaned : null;
}

// Run one chat turn (which may internally loop through tool calls). Streams text via `emit`.
//   client   — an Anthropic-like client with messages.stream(...)
//   system   — system blocks from buildSystem()
//   messages — sanitized history
//   sendLead — async ({name,email,message}) => ...  (throws on failure)
//   emit     — (event) => void ; events: {type:'token',text} | {type:'done'} | {type:'error',message}
//   isClosed — () => boolean ; stop early if the client disconnected
//   signal   — optional AbortSignal; aborts the in-flight Anthropic stream on disconnect
export async function runGuide({ client, system, messages, sendLead, emit, isClosed = () => false, signal }) {
  const convo = messages.map((m) => ({ role: m.role, content: m.content }));
  let leadSent = false; // at most one lead email per request, however the model is steered

  for (let hop = 0; hop < MAX_HOPS && !isClosed(); hop++) {
    const lastHop = hop === MAX_HOPS - 1;
    const stream = client.messages.stream(
      {
        model: CHAT_MODEL,
        max_tokens: 1024,
        system,
        // Omit tools on the final hop so a pending tool_result always gets a closing reply.
        tools: lastHop ? [] : [submitTool],
        messages: convo,
      },
      signal ? { signal } : undefined
    );

    stream.on("text", (delta) => emit({ type: "token", text: delta }));
    // No SSE emit here: a stream error ALSO rejects finalMessage() below, which the caller
    // turns into a single error frame. This no-op listener only prevents an unhandled
    // 'error' event from crashing the process.
    stream.on("error", () => {});

    const msg = await stream.finalMessage();
    convo.push({ role: "assistant", content: msg.content });

    if (msg.stop_reason !== "tool_use") break;
    if (isClosed()) break; // visitor left while the tool turn resolved — don't act

    // Run every tool_use block; collect tool_result blocks (these must come FIRST in the
    // follow-up user message per the tool-use contract).
    const toolResults = [];
    for (const block of msg.content) {
      if (block.type !== "tool_use") continue;
      if (block.name === "submit_project_lead") {
        if (leadSent) {
          toolResults.push({
            type: "tool_result",
            tool_use_id: block.id,
            content: "A lead was already recorded for this conversation.",
            is_error: true,
          });
          continue;
        }
        try {
          await sendLead(block.input);
          leadSent = true;
          toolResults.push({
            type: "tool_result",
            tool_use_id: block.id,
            content: "Lead recorded and emailed to Shaquille.",
          });
        } catch (e) {
          // Log the real reason server-side only; don't feed internal detail back to the model.
          console.error("submit_project_lead failed:", e && e.message);
          toolResults.push({
            type: "tool_result",
            tool_use_id: block.id,
            content: "Could not record the lead right now.",
            is_error: true,
          });
        }
      } else {
        toolResults.push({
          type: "tool_result",
          tool_use_id: block.id,
          content: "Unknown tool.",
          is_error: true,
        });
      }
    }
    convo.push({ role: "user", content: toolResults });
  }

  if (!isClosed()) emit({ type: "done" });
}
