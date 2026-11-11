// Shared UI helpers used by every screen.

import { store } from "./store.js";
import { getPersona } from "./personas.js";
import { canSpeak } from "./speech.js";

export const $ = (s, el = document) => el.querySelector(s);
export const view = document.getElementById("view");

export const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

export function md(s) {
  return esc(s)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[^*])\*(?!\s)(.+?)\*(?!\*)/g, "$1<em>$2</em>")
    .replace(/^#{1,3} (.+)$/gm, "<h4>$1</h4>")
    .replace(/^[-•] (.+)$/gm, "<li>$1</li>")
    .replace(/\n/g, "<br>");
}

export function toast(msg) {
  const t = $("#toast");
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(t._h);
  t._h = setTimeout(() => t.classList.remove("show"), 2600);
}

export const speakBtn = (text) => canSpeak ? `<button class="icon-btn say" data-say="${esc(text)}" aria-label="Listen">🔊</button>` : "";
export const level = () => store.progress.level;
export const levelBucket = () => (level().startsWith("B2") ? "B2" : level().startsWith("B1") ? "B1" : "A2");
export const shuffle = (a) => a.map((v) => [Math.random(), v]).sort((x, y) => x[0] - y[0]).map((x) => x[1]);
export const needsKey = () => !store.settings.apiKey;
export const keyNotice = () => `<div class="notice">🔑 The AI tutor needs your Anthropic API key. <a href="#settings">Add it in Settings</a>. Offline exercises still work.</div>`;
export const me = () => getPersona(store.settings.persona);
export const isCorr = (l) => /^\s*(✏️|💡)/u.test(l);

// AI message: corrections in a highlighted box, the rest as text.
export function renderAI(text) {
  const lines = text.split("\n");
  const corr = lines.filter(isCorr);
  const rest = lines.filter((l) => !isCorr(l)).join("\n").trim();
  return (corr.length ? `<div class="corr">${corr.map(esc).join("<br>")}</div>` : "") + md(rest);
}

export const fmtTime = (sec) => `${String(Math.floor(Math.max(0, sec) / 60)).padStart(2, "0")}:${String(Math.max(0, sec) % 60).padStart(2, "0")}`;

// A call configured by another screen (e.g. a TCF oral task) before opening #call/custom.
export const bus = { pendingCall: null };
