// AI providers. The app runs on a FREE provider by default (your own free key,
// no Claude subscription or Anthropic credits needed). Claude stays available as an option.
// All free providers speak the same "OpenAI-compatible" chat API, so one code path serves them all.

import { store, save } from "./store.js";

export const PROVIDERS = {
  gemini: {
    name: "Google Gemini (free)",
    base: "https://generativelanguage.googleapis.com/v1beta/openai",
    keyUrl: "https://aistudio.google.com/apikey",
    keyHint: "AIza…",
    defaultModel: "gemini-2.5-flash-lite",
    prefer: [/flash-lite/i, /flash/i],
    note: "Free key from Google AI Studio, no bank card. Use a Flash-Lite model: it has the largest free daily allowance.",
  },
  groq: {
    name: "Groq (free)",
    base: "https://api.groq.com/openai/v1",
    keyUrl: "https://console.groq.com/keys",
    keyHint: "gsk_…",
    defaultModel: "llama-3.3-70b-versatile",
    prefer: [/llama-3\.3-70b/i, /70b/i, /llama/i],
    note: "Free key, no bank card. Very fast answers, which is good for voice calls.",
  },
  openrouter: {
    name: "OpenRouter (free models)",
    base: "https://openrouter.ai/api/v1",
    keyUrl: "https://openrouter.ai/keys",
    keyHint: "sk-or-…",
    defaultModel: "meta-llama/llama-3.3-70b-instruct:free",
    prefer: [/llama-3\.3-70b.*:free$/i, /gemini.*:free$/i, /mistral.*:free$/i, /:free$/i],
    note: "Free key. Only models ending in “:free” cost nothing; the daily allowance is small.",
  },
  custom: {
    name: "Other (OpenAI-compatible)",
    base: "",
    keyUrl: "",
    keyHint: "API key",
    defaultModel: "",
    prefer: [/.*/],
    note: "Any service with an OpenAI-compatible API (for example a model running on your own computer).",
  },
  claude: {
    name: "Claude (paid, optional)",
    base: "",
    keyUrl: "https://console.anthropic.com/settings/keys",
    keyHint: "sk-ant-…",
    defaultModel: "claude-opus-5-5",
    prefer: [],
    note: "Best quality, but every request is billed to your Anthropic API account. Not needed.",
  },
};

const NOT_CHAT = /embed|tts|image|imagen|veo|audio|live|whisper|guard|aqa|robotics|computer-use|moderation|rerank|transcribe|speech/i;

export class TutorError extends Error {}

export const providerId = () => (PROVIDERS[store.settings.provider] ? store.settings.provider : "gemini");
export const provider = () => PROVIDERS[providerId()];
export const isClaude = () => providerId() === "claude";

export function activeKey(id = providerId()) {
  if (id === "claude") return store.settings.apiKey || "";
  return (store.settings.keys || {})[id] || "";
}
export function activeModel(id = providerId()) {
  if (id === "claude") return store.settings.model || PROVIDERS.claude.defaultModel;
  return (store.settings.models || {})[id] || PROVIDERS[id].defaultModel;
}
function baseUrl(id = providerId()) {
  const b = id === "custom" ? store.settings.customBase || "" : PROVIDERS[id].base;
  return b.replace(/\/+$/, "");
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function request(path, body, { id = providerId(), key = activeKey(id) } = {}) {
  if (!key) throw new TutorError("Add your free AI key in Settings to use the tutor.");
  const base = baseUrl(id);
  if (!base) throw new TutorError("Set the service address in Settings.");
  let res;
  for (let attempt = 0; ; attempt++) {
    try {
      res = await fetch(base + path, {
        method: body ? "POST" : "GET",
        headers: { Authorization: `Bearer ${key}`, ...(body ? { "Content-Type": "application/json" } : {}) },
        body: body ? JSON.stringify(body) : undefined,
      });
    } catch {
      throw new TutorError("Network problem: are you online?");
    }
    if (res.status !== 429 || attempt >= 2) break;
    // Free plans limit requests per minute: wait and retry.
    const text = await res.text().catch(() => "");
    const hinted = +res.headers.get("retry-after") || +(text.match(/retry in ([\d.]+)s/i) || [])[1] || 15;
    if (hinted > 50 || /per ?day|daily|quota.*day/i.test(text)) { res = { status: 429, daily: true, ok: false, text: async () => text }; break; }
    await sleep((hinted + 1) * 1000);
  }
  if (res.ok) return res;
  const text = await res.text().catch(() => "");
  let msg = "";
  try { const j = JSON.parse(text); msg = (Array.isArray(j) ? j[0] : j)?.error?.message || ""; } catch { msg = text.slice(0, 200); }
  if (res.status === 401 || res.status === 403) throw new TutorError("Your AI key was rejected. Check it in Settings.");
  if (res.status === 404) throw new TutorError("This AI model isn't available. Open Settings and tap “Find models”.");
  if (res.status === 429) throw new TutorError(res.daily || /day|daily/i.test(msg)
    ? "Today's free allowance is used up. It resets tomorrow, or switch to another free provider in Settings."
    : "The free plan is busy (too many requests per minute). Wait a minute and try again.");
  throw new TutorError(`AI service error (${res.status}). ${msg}`);
}

function toMessages(messages, system) {
  return [{ role: "system", content: system }, ...messages.map((m) => ({ role: m.role, content: m.content }))];
}

/** Streamed chat reply. Returns the full text. */
export async function chatStream(messages, { system, onText, maxTokens = 4000 }) {
  const res = await request("/chat/completions", { model: activeModel(), messages: toMessages(messages, system), max_tokens: maxTokens, stream: true });
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = "", full = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    let nl;
    while ((nl = buf.indexOf("\n")) !== -1) {
      const line = buf.slice(0, nl).trim();
      buf = buf.slice(nl + 1);
      if (!line.startsWith("data:")) continue;
      const data = line.slice(5).trim();
      if (data === "[DONE]") continue;
      try {
        const t = JSON.parse(data).choices?.[0]?.delta?.content;
        if (t) { full += t; onText?.(t); }
      } catch { /* partial line */ }
    }
  }
  if (!full.trim()) throw new TutorError("The tutor gave an empty answer. Try again.");
  return full;
}

/** One-shot JSON answer following `schema`. */
export async function chatJSON(prompt, schema, { system }) {
  const user = `${prompt}\n\nReturn ONLY one JSON object (no markdown fences, no commentary) that matches this JSON schema exactly:\n${JSON.stringify(schema)}`;
  const body = { model: activeModel(), messages: toMessages([{ role: "user", content: user }], system), max_tokens: 8000, response_format: { type: "json_object" } };
  let res;
  try {
    res = await request("/chat/completions", body);
  } catch (e) {
    // Some models don't support JSON mode: retry without it.
    if (!/error \(400\)/.test(e.message)) throw e;
    delete body.response_format;
    res = await request("/chat/completions", body);
  }
  const j = await res.json();
  return extractJSON(j.choices?.[0]?.message?.content || "");
}

export function extractJSON(text) {
  const t = text.replace(/^\s*```(?:json)?/i, "").replace(/```\s*$/, "").trim();
  try { return JSON.parse(t); } catch { /* try to find the object */ }
  const m = t.match(/\{[\s\S]*\}/);
  if (m) { try { return JSON.parse(m[0]); } catch { /* fall through */ } }
  throw new TutorError("The tutor's answer was incomplete. Please try again.");
}

/** Lists chat models for a provider and returns them best-first. */
export async function findModels(id, key, customBase) {
  if (id === "custom" && customBase != null) store.settings.customBase = customBase;
  const res = await request("/models", null, { id, key });
  const j = await res.json();
  const ids = (j.data || j.models || []).map((m) => String(m.id || m.name || "").replace(/^models\//, "")).filter((x) => x && !NOT_CHAT.test(x));
  const rank = (m) => { const i = PROVIDERS[id].prefer.findIndex((re) => re.test(m)); return i === -1 ? 99 : i; };
  // Best match first; among equals, newest version first and stable before preview.
  return ids.sort((a, b) => rank(a) - rank(b) || /preview|exp/i.test(a) - /preview|exp/i.test(b) || b.localeCompare(a, undefined, { numeric: true }));
}

export function saveProvider({ id, key, model, customBase }) {
  const s = store.settings;
  s.provider = id;
  if (id === "claude") { s.apiKey = key; if (model) s.model = model; }
  else {
    (s.keys ||= {})[id] = key;
    if (model) (s.models ||= {})[id] = model;
    if (id === "custom") s.customBase = customBase || "";
  }
  save();
}

// ---------- reading web pages without any AI credits ----------
/** Returns the readable text of a web page (through a free reader service). */
export async function readPage(url, maxChars = 16000) {
  const tries = [
    async () => {
      const r = await fetch("https://r.jina.ai/" + url, { headers: { Accept: "text/plain" } });
      if (!r.ok) throw new Error(String(r.status));
      return r.text();
    },
    async () => {
      const r = await fetch("https://api.allorigins.win/raw?url=" + encodeURIComponent(url));
      if (!r.ok) throw new Error(String(r.status));
      const doc = new DOMParser().parseFromString(await r.text(), "text/html");
      doc.querySelectorAll("script,style,nav,footer,header,noscript,svg,form").forEach((n) => n.remove());
      const links = [...doc.querySelectorAll("a[href]")].slice(0, 80).map((a) => `[${a.textContent.trim()}](${new URL(a.getAttribute("href"), url).href})`).join("\n");
      return `Title: ${doc.title}\n\n${doc.body?.innerText || doc.body?.textContent || ""}\n\nLinks:\n${links}`;
    },
  ];
  for (const t of tries) {
    try {
      const text = (await t()).replace(/\n{3,}/g, "\n\n").trim();
      if (text.length > 200 && !/access denied|captcha|unusual (traffic|behaviou?r)|ERR-BOT/i.test(text.slice(0, 600))) return text.slice(0, maxChars);
    } catch { /* try the next reader */ }
  }
  throw new TutorError("This page can't be read automatically (it blocks readers or needs a login). Try another page, or copy its text into the Chat.");
}
