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

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Pure validator (unit-tested). Returns { ok:true } or { ok:false, error }.
export function validateLead({ name, email, message } = {}) {
  if (!name || !email || !message) {
    return { ok: false, error: "name, email and message are required." };
  }
  if (typeof email !== "string" || !EMAIL_RE.test(email)) {
    return { ok: false, error: "Please provide a valid email address." };
  }
  return { ok: true };
}

// Emails a lead to CONTACT_TO. Throws on misconfig (.code set) or Resend error.
export async function sendLead({ name, email, message }) {
  const v = validateLead({ name, email, message });
  if (!v.ok) throw new Error(v.error);

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
    replyTo: email, // owner can reply straight to the prospect
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
