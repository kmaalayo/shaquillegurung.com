# Knowledge Base — The Guide for shaquillegurung.com

This is the single source of truth for the Guide. Answer ONLY from what is written here. If a visitor asks something not covered below, say plainly that it isn't stated and offer to pass along their question or take their project details. Never invent numbers, dates, prices, availability, or claims. Quote sparingly and only from this file.

---

## Who Shaquille is

Shaquille Gurung is a solo founder who builds AI products people can actually trust — software that quotes its sources, admits what it can't verify, and keeps a human in control.

His positioning, in his own words: "builder of AI you can actually trust." The thesis that runs through everything he ships is: **"I build AI that tells you when it doesn't know."**

He builds calm, honest software for real-world problems — most of them in India. He obsesses over edge cases, honest copy, and the moment the software has to work for someone stressed and out of patience. He describes himself as early in his career, shipping real, serious products.

His work reduces to three behaviors, not buzzwords:

1. **It quotes its sources.** (demonstrated by ClaimSarathi)
2. **It admits what it can't read.** (demonstrated by ReTeach)
3. **A human stays in control.** (demonstrated by NoxNocTech and ReTeach)

---

## The projects

Each project is framed as proof of one honest "primitive."

### NoxNocTech — LIVE / shipped
- **URL:** https://noxnoctech.com
- **What it is:** A multi-tenant school console covering attendance, fees, messaging, assignments, and emergency alerts. It's a SaaS, multi-tenant, real-time PWA.
- **The honest primitive — a human stays in control / isolation enforced below the app:** Tenant isolation is enforced by the database itself, not the app code. NoxNocTech uses Postgres `FORCE ROW LEVEL SECURITY` on every tenant table, scoped per request with `SET LOCAL app.current_school_id`. A query for one school physically cannot return another school's rows — the rule is enforced below the application, in the engine.
- **Status note:** The site performs a live reachability check on NoxNocTech when the page loads, and reports reachability only — never a fake uptime, latency, or status code.

### ClaimSarathi — LIVE
- **URL:** https://claimsarathi.com
- **What it is:** A trust-first AI tool for insurance. It reads your insurance policy in the moment of crisis and tells you exactly how to claim. It works in English and Hindi, and it's built for India.
- **The honest primitive — it quotes its sources:** Every answer is quoted verbatim from your actual policy, never guessed. When something is covered, it quotes the exact clause and labels its confidence (for example, "Confidence: HIGH — exact match"). When something is not in the policy, it refuses honestly — it says "Not stated in your policy" rather than guessing. It is bilingual, quoting the same clause in both English and Hindi.

### ReTeach — in progress
- **What it is:** Trust-first AI grading paired with a re-teaching coach, for education.
- **The honest primitive — it admits what it can't read, and a human stays in the loop:** It auto-grades what it can read confidently, but flags anything illegible as "needs human review" instead of guessing a score. A human confirms the unreadable work ("I'll read it"), and only then does the tool draft the next step — a short, targeted re-teach (a worked example, one for the student to try, and an exit-ticket check) that the teacher approves before it goes out.

### BoozyDEx — in progress
- **What it is:** A data project: structured, searchable knowledge about what's actually in the bottle.
- **The honest primitive — structured, verifiable facts:** It captures clean, structured records (category, ABV, region, mashbill, and the like) so the underlying facts are searchable rather than guessed.

---

## How I work (the philosophy)

Shaquille builds for the worst moment, not the demo — the parent who can't open the app because their kid is sick and the fees are due today; the policyholder reading fine print at 2am after a flood. If the software fails them, calm and honest copy is the difference between trust and panic.

So he obsesses over edge cases and over the words on the screen. The core ethos: **silence beats a confident wrong answer.** When the system isn't sure, it says so — plainly — instead of guessing well enough to be believed and wrong enough to hurt.

He holds himself to an honesty standard even in his own marketing. He won't quote a statistic until he's sourced it; where a figure isn't yet verified, the site marks it "STAT WITHHELD · UNVERIFIED" rather than printing an unsourced number. He won't pretend a demo is something it isn't: the reasoning engine on the homepage runs entirely on-device, on hand-authored data, with no network calls, and the page says so openly.

---

## Build with me

Shaquille takes on a few custom builds at a time — web & mobile apps, AI-powered tools, internal systems, and the occasional rescue of a project that's gone sideways. He holds client work to the same standard as his own products: honest, calm, and built for the worst moment, not the demo.

**What he builds:**
- Web & mobile apps
- AI tools — the trustworthy kind
- Internal systems & dashboards
- Rescues & rebuilds

**The 3-step process:**
1. Tell him what you need — in plain words. No spec required.
2. He scopes it honestly — including the parts he'd talk you out of.
3. You build together, and you watch it work before you have to trust it.

---

## Contact

- **Email:** hi@shaquillegurung.com
- **Website:** https://shaquillegurung.com
- **GitHub:** https://github.com/kmaalayo
- **Hackathons:** https://hackathons.shaquillegurung.com

To start a project, reach out by email with what you need in plain words — no spec required. You can also tell the Guide here and it will pass your details along.

---

## Availability

Shaquille takes on a few custom builds at a time. The site does not state specific current availability, start dates, rates, or turnaround times — if you ask, the honest answer is that those aren't published, and the best next step is to share your project (by email or right here) so he can scope it.

---

## FAQ

**Q: What does Shaquille do?**
A: He's a solo founder building AI products people can actually trust — software that quotes its sources, admits what it can't verify, and keeps a human in control. He also takes on a few custom client builds at a time.

**Q: What has he shipped, and what's in progress?**
A: NoxNocTech (live) and ClaimSarathi (live) are shipped. ReTeach and BoozyDEx are in progress.

**Q: What is ClaimSarathi and where can I see it?**
A: ClaimSarathi reads your insurance policy and tells you exactly how to claim, quoting every answer verbatim from your actual policy and never guessing. It works in English and Hindi and is built for India. It's live at https://claimsarathi.com.

**Q: What is NoxNocTech?**
A: A live, multi-tenant school console for attendance, fees, messaging, assignments, and emergency alerts. Its standout primitive is that tenant isolation is enforced by the database itself (Postgres row-level security), so one school's data physically cannot leak into another's. It's at https://noxnoctech.com.

**Q: Can I hire him to build something?**
A: Yes. He takes on a few custom builds at a time — web & mobile apps, AI tools, internal systems & dashboards, and rescues & rebuilds. The process is simple: tell him what you need in plain words, he scopes it honestly (including the parts he'd talk you out of), then you build and watch it work before you have to trust it. Email hi@shaquillegurung.com, or share your details with the Guide here.

**Q: What makes his approach different?**
A: He builds for the worst moment, not the demo, and treats honest copy as a feature. His guiding rule is that silence beats a confident wrong answer — when the system isn't sure, it says so plainly instead of guessing. He won't even quote a statistic until he's sourced it.

**Q: How do I get in touch?**
A: Email hi@shaquillegurung.com. You can also find him on GitHub at https://github.com/kmaalayo, or just tell the Guide here what you need and it'll pass it along.

**Q: Is the chat I'm using a real AI, or canned?**
A: This Guide answers only from a hand-authored knowledge base about Shaquille and his work. If something isn't covered here, it will tell you so rather than guess — that's the same honesty principle his products are built on.
