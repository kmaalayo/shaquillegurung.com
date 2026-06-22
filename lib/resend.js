// lib/resend.js — lead delivery via Resend, shared by /api/contact and the Guide's
// submit_project_lead tool. Lazy client (the static site must boot even when email isn't
// configured). The Resend SDK does NOT throw on API errors — it returns { data, error } —
// so we check `error` and convert it to a throw for the caller.
import { Resend } from "resend";

let _resend = null;

function client() {
  if (!process.env.RESEND_API_KEY) {
    const e = new Error("RESEND_API_KEY is not configured.");
    e.code = "NO_RESEND_KEY";
    throw e;
  }
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY);
  return _resend;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export const MAX_NAME = 120;
export const MAX_MESSAGE = 4000;

const str = (v) => (typeof v === "string" ? v.trim() : "");

// Pure validator (unit-tested). Returns { ok:true } or { ok:false, error }.
// Length caps stop a single lead from carrying ~100kb of attacker text.
export function validateLead({ name, email, message } = {}) {
  name = str(name);
  email = str(email);
  message = str(message);
  if (!name || !email || !message) {
    return { ok: false, error: "name, email and message are required." };
  }
  if (!EMAIL_RE.test(email)) {
    return { ok: false, error: "Please provide a valid email address." };
  }
  if (name.length > MAX_NAME || message.length > MAX_MESSAGE) {
    return { ok: false, error: "That's a bit long — please shorten your name or message." };
  }
  return { ok: true };
}

// Emails a lead to CONTACT_TO. Throws on misconfig (.code set) or Resend error.
export async function sendLead({ name, email, message }) {
  const v = validateLead({ name, email, message });
  if (!v.ok) throw new Error(v.error);

  // Use trimmed values; collapse any whitespace/newlines in name (it lands in the subject).
  name = String(name).trim().replace(/\s+/g, " ").slice(0, MAX_NAME);
  email = String(email).trim();
  message = String(message).trim().slice(0, MAX_MESSAGE);

  const to = process.env.CONTACT_TO;
  if (!to) {
    const e = new Error("CONTACT_TO is not configured.");
    e.code = "NO_CONTACT_TO";
    throw e;
  }
  // Default to Resend's test sender (works with no domain verification; delivers to the
  // account owner's email — i.e. CONTACT_TO=your Gmail). Swap LEAD_FROM in once the domain
  // is verified in Resend.
  const from = process.env.LEAD_FROM || "The Guide <onboarding@resend.dev>";

  const { data, error } = await client().emails.send({
    from,
    to,
    replyTo: email,
    subject: `New project lead — ${name}`,
    text:
      `Name: ${name}\n` +
      `Email: ${email}\n\n` +
      `What they need:\n${message}\n\n` +
      `— sent by the Guide on shaquillegurung.com`,
  });

  if (error) {
    throw new Error(typeof error === "string" ? error : error.message || "Email send failed.");
  }
  return { ok: true, id: data?.id };
}
