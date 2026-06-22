import { test } from "node:test";
import assert from "node:assert/strict";
import { validateLead } from "../lib/resend.js";

test("validateLead requires name, email and message", () => {
  assert.equal(validateLead({ name: "A", email: "a@b.com" }).ok, false);
  assert.equal(validateLead({ email: "a@b.com", message: "hi" }).ok, false);
  assert.equal(validateLead({ name: "A", message: "hi" }).ok, false);
  assert.equal(validateLead({}).ok, false);
});

test("validateLead rejects a malformed email", () => {
  assert.equal(validateLead({ name: "A", email: "not-an-email", message: "hi" }).ok, false);
  assert.equal(validateLead({ name: "A", email: "a@b", message: "hi" }).ok, false);
});

test("validateLead accepts a complete, valid lead", () => {
  assert.equal(validateLead({ name: "Ada", email: "ada@x.com", message: "Build me a widget" }).ok, true);
});

test("validateLead rejects an over-long name or message", () => {
  assert.equal(validateLead({ name: "x".repeat(200), email: "a@b.com", message: "hi" }).ok, false);
  assert.equal(validateLead({ name: "A", email: "a@b.com", message: "y".repeat(5000) }).ok, false);
});
