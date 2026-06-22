import { test } from "node:test";
import assert from "node:assert/strict";
import { sanitizeMessages, runGuide, MAX_MSG_CHARS, MAX_HISTORY } from "../lib/chat.js";

// Minimal fake of the SDK stream: emits all texts synchronously when the 'text' handler
// registers, then finalMessage() resolves to the supplied final Message.
function fakeStream({ texts = [], final }) {
  return {
    on(evt, cb) {
      if (evt === "text") for (const t of texts) cb(t);
      return this;
    },
    async finalMessage() {
      return final;
    },
    abort() {},
  };
}

// Returns a client whose messages.stream() yields the queued fake streams in order.
function fakeClient(streams) {
  let i = 0;
  return { messages: { stream: () => streams[i++] } };
}

test("sanitizeMessages caps length, trims history, rejects empty/garbage", () => {
  assert.equal(sanitizeMessages([]), null);
  assert.equal(sanitizeMessages("nope"), null);
  assert.equal(sanitizeMessages([{ role: "user", content: "" }]), null);

  const long = sanitizeMessages([{ role: "user", content: "x".repeat(MAX_MSG_CHARS + 500) }]);
  assert.equal(long[0].content.length, MAX_MSG_CHARS);

  const many = sanitizeMessages(
    Array.from({ length: MAX_HISTORY + 10 }, (_, k) => ({ role: "user", content: `m${k}` }))
  );
  assert.equal(many.length, MAX_HISTORY);
});

test("runGuide streams a plain answer and never calls the lead tool", async () => {
  const events = [];
  let leadCalls = 0;
  const client = fakeClient([
    fakeStream({
      texts: ["Hello ", "there"],
      final: { stop_reason: "end_turn", content: [{ type: "text", text: "Hello there" }] },
    }),
  ]);

  await runGuide({
    client,
    system: [{ type: "text", text: "sys" }],
    messages: [{ role: "user", content: "hi" }],
    sendLead: async () => {
      leadCalls++;
    },
    emit: (e) => events.push(e),
  });

  const text = events.filter((e) => e.type === "token").map((e) => e.text).join("");
  assert.equal(text, "Hello there");
  assert.equal(events.at(-1).type, "done");
  assert.equal(leadCalls, 0);
});

test("runGuide runs submit_project_lead exactly once, then streams the confirmation", async () => {
  const events = [];
  const leads = [];
  const lead = { name: "Ada", email: "ada@x.com", message: "Build a widget" };
  const client = fakeClient([
    fakeStream({
      texts: ["Let me record that. "],
      final: {
        stop_reason: "tool_use",
        content: [
          { type: "text", text: "Let me record that. " },
          { type: "tool_use", id: "t1", name: "submit_project_lead", input: lead },
        ],
      },
    }),
    fakeStream({
      texts: ["Shaquille will email you."],
      final: { stop_reason: "end_turn", content: [{ type: "text", text: "Shaquille will email you." }] },
    }),
  ]);

  await runGuide({
    client,
    system: [{ type: "text", text: "sys" }],
    messages: [{ role: "user", content: "Hire him. I'm Ada, ada@x.com, build a widget." }],
    sendLead: async (input) => {
      leads.push(input);
    },
    emit: (e) => events.push(e),
  });

  assert.equal(leads.length, 1);
  assert.deepEqual(leads[0], lead);
  const text = events.filter((e) => e.type === "token").map((e) => e.text).join("");
  assert.match(text, /record that.*email you/s);
  assert.equal(events.at(-1).type, "done");
});

test("runGuide reports a tool failure to the model but still completes", async () => {
  const events = [];
  const client = fakeClient([
    fakeStream({
      texts: [],
      final: {
        stop_reason: "tool_use",
        content: [{ type: "tool_use", id: "t1", name: "submit_project_lead", input: { name: "A", email: "a@x.com", message: "x" } }],
      },
    }),
    fakeStream({
      texts: ["Sorry, I couldn't send that right now."],
      final: { stop_reason: "end_turn", content: [{ type: "text", text: "Sorry" }] },
    }),
  ]);

  await runGuide({
    client,
    system: [{ type: "text", text: "sys" }],
    messages: [{ role: "user", content: "hire" }],
    sendLead: async () => {
      throw new Error("Resend down");
    },
    emit: (e) => events.push(e),
  });

  // It should not crash; it streams the model's follow-up and finishes with done.
  assert.equal(events.at(-1).type, "done");
  assert.ok(events.some((e) => e.type === "token"));
});

test("runGuide sends at most one lead per request even if the model calls the tool twice", async () => {
  const events = [];
  let leadCalls = 0;
  const lead = { name: "Ada", email: "ada@x.com", message: "Build a widget" };
  const client = fakeClient([
    fakeStream({
      texts: [],
      final: {
        stop_reason: "tool_use",
        content: [
          { type: "tool_use", id: "t1", name: "submit_project_lead", input: lead },
          { type: "tool_use", id: "t2", name: "submit_project_lead", input: lead },
        ],
      },
    }),
    fakeStream({
      texts: ["All set."],
      final: { stop_reason: "end_turn", content: [{ type: "text", text: "All set." }] },
    }),
  ]);

  await runGuide({
    client,
    system: [{ type: "text", text: "sys" }],
    messages: [{ role: "user", content: "hire" }],
    sendLead: async () => {
      leadCalls++;
    },
    emit: (e) => events.push(e),
  });

  assert.equal(leadCalls, 1);
  assert.equal(events.at(-1).type, "done");
});
