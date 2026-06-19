// app.js — tiny front-end touches. Keep it light.

// Current year in the footer.
const yearEl = document.getElementById("year");
if (yearEl) yearEl.textContent = String(new Date().getFullYear());

// Live "backend online" indicator — proves the Express backend is actually serving.
(async function checkBackend() {
  const status = document.getElementById("status");
  if (!status) return;
  const text = status.querySelector(".status-text");
  try {
    const res = await fetch("/api/health", { cache: "no-store" });
    if (!res.ok) throw new Error("bad status");
    await res.json();
    status.classList.add("online");
    if (text) text.textContent = "backend online";
  } catch {
    status.classList.add("offline");
    if (text) text.textContent = "backend offline";
  }
})();
