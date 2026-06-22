import { test } from "node:test";
import assert from "node:assert/strict";
import { getContext, buildSystem } from "../lib/guide.js";

test("getContext returns the knowledge base text (with the hi@ address)", () => {
  const ctx = getContext("anything");
  assert.match(ctx, /ClaimSarathi/);
  assert.match(ctx, /hi@shaquillegurung\.com/);
  assert.doesNotMatch(ctx, /hello@shaquillegurung\.com/);
});

test("buildSystem carries the honesty rules and a cached knowledge block", () => {
  const sys = buildSystem("hi");
  assert.ok(Array.isArray(sys));
  assert.match(sys[0].text, /HONESTY RULES/);
  const cached = sys.find((b) => b.cache_control);
  assert.ok(cached, "a system block should carry cache_control");
  assert.equal(cached.cache_control.type, "ephemeral");
  assert.match(cached.text, /ClaimSarathi/);
});
