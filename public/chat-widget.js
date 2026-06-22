// chat-widget.js — "the Guide" chat widget. Self-contained, zero-dependency, Shadow-DOM
// isolated, reusable across sites. Knows nothing about Claude: it POSTs { messages } to an
// endpoint and renders the SSE text that streams back. Configure with:
//   ChatWidget.init({ endpoint, launcher:'edge-tab', accent, title, greeting })
(function () {
  "use strict";

  const DEFAULTS = {
    endpoint: "/api/chat",
    launcher: "edge-tab",
    accent: "#2F6B4F",
    title: "Ask the guide",
    greeting:
      "Hi — I'm the Guide. Ask me anything about Shaquille's work, or tell me about a project you'd like built.",
  };

  let instance = null;

  // Tiny DOM helper. textContent / text-node only — NEVER innerHTML (model output is text).
  function el(tag, attrs, children) {
    const node = document.createElement(tag);
    if (attrs) for (const k in attrs) if (attrs[k] != null) node.setAttribute(k, attrs[k]);
    const kids = children == null ? [] : Array.isArray(children) ? children : [children];
    for (const c of kids) {
      if (c == null) continue;
      node.append(typeof c === "string" ? document.createTextNode(c) : c);
    }
    return node;
  }

  const STYLES = `
    :host { all: initial; }
    :host {
      font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
      --cw-accent: #2F6B4F;
      --cw-fg: #1b211d;
      --cw-muted: #6a746d;
      --cw-bg: #ffffff;
      --cw-soft: #f3f5f3;
      --cw-line: rgba(27,33,29,.12);
    }
    *, *::before, *::after { box-sizing: border-box; }

    .cw-tab {
      position: fixed; right: 0; top: 50%; transform: translateY(-50%);
      writing-mode: vertical-rl; text-orientation: mixed;
      padding: 16px 9px; border: 0; border-radius: 10px 0 0 10px;
      background: var(--cw-accent); color: #fff;
      font: 600 13px/1 inherit; letter-spacing: .03em; cursor: pointer;
      box-shadow: -2px 0 16px rgba(0,0,0,.14); z-index: 2147483000;
      transition: transform .18s ease, box-shadow .18s ease;
    }
    .cw-tab:hover { transform: translateY(-50%) translateX(-2px); }
    .cw-tab:focus-visible { outline: 2px solid var(--cw-accent); outline-offset: 3px; }
    .cw-tab.cw-busy { opacity: .8; }

    .cw-panel {
      position: fixed; right: 16px; bottom: 16px;
      width: min(380px, calc(100vw - 32px));
      height: min(560px, calc(100vh - 32px));
      display: flex; flex-direction: column;
      background: var(--cw-bg); color: var(--cw-fg);
      border: 1px solid var(--cw-line); border-radius: 16px;
      box-shadow: 0 14px 50px rgba(0,0,0,.22);
      opacity: 0; transform: translateY(10px) scale(.98); pointer-events: none;
      transition: opacity .2s ease, transform .2s ease; z-index: 2147483001; overflow: hidden;
    }
    .cw-panel[data-open="true"] { opacity: 1; transform: none; pointer-events: auto; }

    .cw-head {
      display: flex; align-items: center; justify-content: space-between;
      padding: 13px 14px; border-bottom: 1px solid var(--cw-line);
    }
    .cw-title { margin: 0; font-size: 15px; font-weight: 700; }
    .cw-close {
      border: 0; background: transparent; color: var(--cw-muted);
      font-size: 22px; line-height: 1; cursor: pointer; padding: 2px 6px; border-radius: 8px;
    }
    .cw-close:hover { background: var(--cw-soft); color: var(--cw-fg); }

    .cw-log { flex: 1; overflow-y: auto; padding: 14px; display: flex; flex-direction: column; gap: 10px; }
    .cw-msg {
      max-width: 85%; padding: 9px 12px; border-radius: 13px; font-size: 14px; line-height: 1.5;
      white-space: pre-wrap; overflow-wrap: anywhere;
    }
    .cw-msg--assistant { align-self: flex-start; background: var(--cw-soft); color: var(--cw-fg); border-bottom-left-radius: 4px; }
    .cw-msg--user { align-self: flex-end; background: var(--cw-accent); color: #fff; border-bottom-right-radius: 4px; }

    .cw-typing { display: inline-flex; gap: 4px; padding: 2px 0; }
    .cw-typing i { width: 6px; height: 6px; border-radius: 50%; background: var(--cw-muted); display: inline-block; animation: cwblink 1.2s infinite ease-in-out; }
    .cw-typing i:nth-child(2) { animation-delay: .2s; }
    .cw-typing i:nth-child(3) { animation-delay: .4s; }
    @keyframes cwblink { 0%, 80%, 100% { opacity: .3; } 40% { opacity: 1; } }

    .cw-form { display: flex; gap: 8px; padding: 12px; border-top: 1px solid var(--cw-line); align-items: flex-end; }
    .cw-input {
      flex: 1; resize: none; max-height: 120px; border: 1px solid var(--cw-line); border-radius: 10px;
      padding: 9px 11px; font: inherit; font-size: 14px; color: var(--cw-fg); background: var(--cw-bg);
    }
    .cw-input:focus-visible { outline: 2px solid var(--cw-accent); outline-offset: 1px; }
    .cw-send {
      border: 0; background: var(--cw-accent); color: #fff; font: 600 14px/1 inherit;
      padding: 0 14px; height: 38px; border-radius: 10px; cursor: pointer;
    }
    .cw-send:disabled { opacity: .5; cursor: default; }

    @media (prefers-reduced-motion: reduce) {
      .cw-tab, .cw-panel { transition: none; }
      .cw-typing i { animation: none; }
    }
  `;

  function init(userConfig) {
    if (instance) return instance; // idempotent
    const cfg = Object.assign({}, DEFAULTS, userConfig || {});
    if (!cfg.endpoint) throw new Error("[ChatWidget] init: 'endpoint' is required");
    if (cfg.launcher !== "edge-tab") {
      console.warn('[ChatWidget] launcher "' + cfg.launcher + '" not supported; using edge-tab');
    }

    // Host + shadow root (append last so a high z-index wins without !important).
    const host = el("div", { "data-chat-widget": "" });
    document.body.appendChild(host);
    const root = host.attachShadow({ mode: "open" });
    host.style.setProperty("--cw-accent", cfg.accent);
    const styleEl = document.createElement("style");
    styleEl.textContent = STYLES;
    root.append(styleEl);

    const tab = el("button", { class: "cw-tab", type: "button", "aria-expanded": "false", "aria-haspopup": "dialog" }, cfg.title);

    const titleEl = el("h2", { id: "cw-title", class: "cw-title" }, cfg.title);
    const closeBtn = el("button", { class: "cw-close", type: "button", "aria-label": "Close chat" }, "×");
    const log = el("div", { class: "cw-log", role: "log", "aria-live": "polite", "aria-atomic": "false" });
    const input = el("textarea", { class: "cw-input", rows: "1", "aria-label": "Your message", placeholder: "Type your message…" });
    const sendBtn = el("button", { class: "cw-send", type: "submit" }, "Send");
    const form = el("form", { class: "cw-form" }, [input, sendBtn]);
    const panel = el(
      "div",
      { class: "cw-panel", role: "dialog", "aria-modal": "false", "aria-labelledby": "cw-title", "data-open": "false" },
      [el("header", { class: "cw-head" }, [titleEl, closeBtn]), log, form]
    );
    root.append(tab, panel);

    const history = []; // [{ role, content }] sent to the server each turn
    let streaming = false;

    function addMessage(role, text) {
      const bubble = el("div", { class: "cw-msg cw-msg--" + role }, text || "");
      log.appendChild(bubble);
      log.scrollTop = log.scrollHeight;
      return bubble;
    }

    addMessage("assistant", cfg.greeting); // canned UI greeting (not part of model history)

    function open() {
      panel.dataset.open = "true";
      tab.setAttribute("aria-expanded", "true");
      input.focus();
    }
    function close() {
      panel.dataset.open = "false";
      tab.setAttribute("aria-expanded", "false");
      tab.focus();
    }
    function toggle() {
      panel.dataset.open === "true" ? close() : open();
    }

    tab.addEventListener("click", toggle);
    closeBtn.addEventListener("click", close);
    panel.addEventListener("keydown", function (e) {
      if (e.key === "Escape") { e.preventDefault(); close(); }
    });
    input.addEventListener("keydown", function (e) {
      if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); form.requestSubmit(); }
    });
    function autoGrow() {
      input.style.height = "auto";
      input.style.height = Math.min(input.scrollHeight, 120) + "px";
    }
    input.addEventListener("input", autoGrow);

    function setBusy(b) {
      streaming = b;
      sendBtn.disabled = b;
      tab.classList.toggle("cw-busy", b);
    }

    function errorText(status) {
      if (status === 429) return "You've sent a lot of messages — please wait a few minutes and try again.";
      if (status === 503) return "The Guide isn't available right now. You can email hi@shaquillegurung.com.";
      return "Sorry — something went wrong. Please try again.";
    }

    form.addEventListener("submit", async function (e) {
      e.preventDefault();
      const text = input.value.trim();
      if (!text || streaming) return;
      input.value = "";
      autoGrow();
      addMessage("user", text);
      history.push({ role: "user", content: text });
      await streamReply();
    });

    async function streamReply() {
      setBusy(true);
      const bubble = addMessage("assistant", "");
      const typing = el("span", { class: "cw-typing" }, [el("i"), el("i"), el("i")]);
      bubble.appendChild(typing);
      let textNode = null; // created on first token (replaces the typing dots)
      let acc = "";
      let errored = false;

      function ensureNode() {
        if (!textNode) {
          bubble.textContent = "";
          textNode = document.createTextNode("");
          bubble.appendChild(textNode);
        }
      }

      try {
        const res = await fetch(cfg.endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
          body: JSON.stringify({ messages: history }),
        });

        if (!res.ok || !res.body) {
          errored = true;
          ensureNode();
          textNode.appendData(errorText(res.status));
        } else {
          const reader = res.body.getReader();
          const decoder = new TextDecoder("utf-8");
          let buffer = "";
          let done = false;
          while (!done) {
            const chunk = await reader.read();
            if (chunk.done) break;
            buffer += decoder.decode(chunk.value, { stream: true });
            let sep;
            while ((sep = buffer.indexOf("\n\n")) !== -1) {
              const frame = buffer.slice(0, sep);
              buffer = buffer.slice(sep + 2);
              const lines = frame.split("\n");
              for (const line of lines) {
                if (!line.startsWith("data:")) continue; // skip ": comment" heartbeats
                const data = line.slice(5).trim();
                if (!data) continue;
                let msg;
                try { msg = JSON.parse(data); } catch (_) { continue; }
                if (msg.type === "token") {
                  ensureNode();
                  acc += msg.text;
                  textNode.appendData(msg.text);
                  log.scrollTop = log.scrollHeight;
                } else if (msg.type === "error") {
                  errored = true;
                  ensureNode();
                  textNode.appendData((acc ? "\n\n" : "") + "Sorry — something went wrong.");
                } else if (msg.type === "done") {
                  done = true;
                }
              }
            }
          }
        }
      } catch (_) {
        errored = true;
        ensureNode();
        if (!acc) textNode.appendData("I couldn't reach the Guide just now. Please try again, or email hi@shaquillegurung.com.");
      } finally {
        if (!textNode) {
          // No tokens and no error path hit a node — clear the typing dots.
          bubble.textContent = "";
        }
        if (acc && !errored) history.push({ role: "assistant", content: acc });
        setBusy(false);
        input.focus();
        log.scrollTop = log.scrollHeight;
      }
    }

    instance = {
      open: open,
      close: close,
      toggle: toggle,
      destroy: function () { host.remove(); instance = null; },
    };
    return instance;
  }

  window.ChatWidget = { init: init };
})();
