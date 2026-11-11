// Voice engine: French text-to-speech + speech recognition, built into the phone's browser.

import { store } from "./store.js";
import { getPersona } from "./personas.js";

export const canSpeak = "speechSynthesis" in window;
export const canListen = !!(window.SpeechRecognition || window.webkitSpeechRecognition);

// ---------- voices ----------
const FEMALE = /amélie|amelie|audrey|aurélie|aurelie|marie|julie|céline|celine|denise|eloise|hortense|virginie|chantal|léa|lea|google français|female|femme/i;
const MALE = /thomas|daniel|nicolas|henri|paul|claude|jacques|remi|rémi|antoine|guillaume|mathieu|male|homme/i;
const QUALITY = /premium|enhanced|amélioré|natural|neural|online|google/i;

export function frenchVoices() {
  if (!canSpeak) return [];
  return speechSynthesis.getVoices().filter((v) => v.lang.toLowerCase().startsWith("fr"));
}

function pickVoice(gender) {
  const all = frenchVoices();
  if (!all.length) return null;
  if (store.settings.voiceName) {
    const v = all.find((x) => x.name === store.settings.voiceName);
    if (v) return v;
  }
  const france = all.filter((v) => /fr[-_]fr/i.test(v.lang));
  const pool = france.length ? france : all;
  const want = gender === "male" ? MALE : FEMALE;
  const avoid = gender === "male" ? FEMALE : MALE;
  const score = (v) => (want.test(v.name) ? 4 : avoid.test(v.name) ? -4 : 0) + (QUALITY.test(v.name) ? 2 : 0) + (v.localService ? 0 : 1);
  return [...pool].sort((a, b) => score(b) - score(a))[0];
}
if (canSpeak) speechSynthesis.onvoiceschanged = () => {};

/** iOS only allows speech after a tap: call this inside a click handler. */
export function unlockAudio() {
  if (!canSpeak) return;
  const u = new SpeechSynthesisUtterance(" ");
  u.volume = 0;
  speechSynthesis.speak(u);
}

function cleanForSpeech(text) {
  return text
    .split("\n").filter((l) => !/^\s*(✏️|💡|📝)/u.test(l)).join(" ")
    .replace(/\*+|__|#+ /g, "")
    .replace(/\[[^\]]*\]/g, "")
    .replace(/\((?:=|en anglais|in english|translation)[^)]*\)/gi, "")
    .replace(/[✏️💡✅🎯👉😊😄😉🙂👍🎉☀️🌞⚽🍷]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

function makeUtterance(text, { gender, rate } = {}) {
  gender ??= getPersona(store.settings.persona).gender;
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "fr-FR";
  const v = pickVoice(gender);
  if (v) {
    u.voice = v;
    // If we only found a voice of the other gender, shift the pitch a little.
    if (gender === "male" && FEMALE.test(v.name) && !store.settings.voiceName) u.pitch = 0.75;
  }
  u.rate = rate ?? store.settings.voiceRate;
  return u;
}

/** Speak French text. Resolves when finished. */
export function speak(text, opts = {}) {
  if (!canSpeak) return Promise.resolve();
  speechSynthesis.cancel();
  const s = createSpeaker(opts);
  s.push(text);
  return s.end();
}

const activeSpeakers = new Set();
export function stopSpeaking() {
  [...activeSpeakers].forEach((sp) => sp.cancel());
  if (canSpeak) speechSynthesis.cancel();
}

/**
 * Streaming speaker: push text chunks as they arrive from the AI and it speaks
 * each complete sentence right away. Lines starting with ✏️ / 💡 are shown on
 * screen but never spoken.
 */
export function createSpeaker(opts = {}) {
  let buffer = "";
  let lineSkip = null; // null = undecided for the current line
  let pending = 0;
  let ended = false;
  let cancelled = false;
  let resolveDone;
  const done = new Promise((r) => (resolveDone = r));
  const check = () => { if (ended && pending === 0) { activeSpeakers.delete(api); resolveDone(); } };

  const say = (sentence) => {
    const t = cleanForSpeech(sentence);
    if (!t || cancelled || !canSpeak) return;
    pending++;
    const u = makeUtterance(t, opts);
    let finished = false;
    const fin = () => { if (finished || cancelled) return; finished = true; pending--; check(); };
    u.onend = fin;
    u.onerror = fin;
    // Watchdog: some browsers never fire onend; give up after the expected duration.
    u.onstart = () => setTimeout(fin, (t.length * 85) / (u.rate || 1) + 2500);
    speechSynthesis.speak(u);
  };

  const process = (final) => {
    for (;;) {
      if (lineSkip === null) {
        const lead = buffer.replace(/^\s+/, "");
        if (lead.length < 2 && !final) return;
        lineSkip = /^(✏️|💡|📝)/u.test(lead);
      }
      const nl = buffer.indexOf("\n");
      if (lineSkip) {
        if (nl === -1) { if (final) buffer = ""; return; }
        buffer = buffer.slice(nl + 1); lineSkip = null; continue;
      }
      const m = buffer.match(/^([\s\S]*?[.!?…]+["»]?)(\s+)/);
      if (m && (nl === -1 || m[1].length < nl)) { say(m[1]); buffer = buffer.slice(m[0].length); continue; }
      if (nl !== -1) { say(buffer.slice(0, nl)); buffer = buffer.slice(nl + 1); lineSkip = null; continue; }
      if (final) { say(buffer); buffer = ""; }
      return;
    }
  };

  const api = {
    push(chunk) { buffer += chunk; process(false); },
    end() { process(true); ended = true; check(); return done; },
    cancel() {
      if (cancelled) return;
      cancelled = true; buffer = ""; pending = 0; ended = true;
      activeSpeakers.delete(api);
      if (canSpeak) speechSynthesis.cancel();
      resolveDone();
    },
    get speaking() { return pending > 0; },
  };
  activeSpeakers.add(api);
  return api;
}

// ---------- listening ----------
const PATIENCE = { short: 1200, medium: 2200, long: 3500 };

/**
 * Listen in French. With `patient: true` it keeps listening through short
 * pauses and ends your turn after the silence set in Settings.
 * Returns { promise, stop }.
 */
export function listen({ onInterim, patient = false } = {}) {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) return { promise: Promise.reject(new Error("Speech recognition isn't supported here. Use Chrome on Android or Safari on iPhone.")), stop() {} };
  const rec = new SR();
  rec.lang = "fr-FR";
  rec.interimResults = true;
  rec.continuous = patient;
  rec.maxAlternatives = 1;
  const silenceMs = PATIENCE[store.settings.patience] || PATIENCE.medium;
  let finalText = "";
  let silenceTimer = null;
  let hardStop = null;

  const promise = new Promise((resolve, reject) => {
    rec.onresult = (e) => {
      // Rebuild from all results (avoids duplicated text on some Android builds).
      const finals = [];
      let interim = "";
      for (let i = 0; i < e.results.length; i++) {
        const t = e.results[i][0].transcript.trim();
        if (e.results[i].isFinal) { if (t && finals[finals.length - 1] !== t) finals.push(t); }
        else interim += " " + t;
      }
      finalText = finals.join(" ");
      onInterim?.((finalText + interim).trim());
      if (patient) {
        clearTimeout(silenceTimer);
        silenceTimer = setTimeout(() => rec.stop(), silenceMs);
      }
    };
    rec.onerror = (e) => {
      clearTimeout(silenceTimer); clearTimeout(hardStop);
      if (e.error === "no-speech" || e.error === "aborted") resolve(finalText.trim());
      else if (e.error === "not-allowed" || e.error === "service-not-allowed") reject(new Error("Microphone blocked. Allow microphone access for this app in your browser settings."));
      else reject(new Error("Speech error: " + e.error));
    };
    rec.onend = () => { clearTimeout(silenceTimer); clearTimeout(hardStop); resolve(finalText.trim()); };
  });
  try { rec.start(); } catch (err) { return { promise: Promise.reject(err), stop() {} }; }
  hardStop = setTimeout(() => rec.stop(), 60000);
  return { promise, stop: () => rec.stop() };
}

// ---------- scoring ----------
/** Rough similarity score (0-100) between expected and spoken text. */
export function similarity(a, b) {
  const norm = (s) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9 ]/g, " ").split(/\s+/).filter(Boolean);
  const A = norm(a), B = norm(b);
  if (!A.length) return 0;
  const dp = Array.from({ length: A.length + 1 }, () => new Array(B.length + 1).fill(0));
  for (let i = 1; i <= A.length; i++)
    for (let j = 1; j <= B.length; j++)
      dp[i][j] = A[i - 1] === B[j - 1] ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1]);
  const lcs = dp[A.length][B.length];
  return Math.round((2 * lcs / (A.length + B.length)) * 100);
}

/** Words from `expected` missing in `spoken` (accent-insensitive). */
export function missedWords(expected, spoken) {
  const norm = (s) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  const said = new Set(norm(spoken).replace(/[^a-z0-9' ]/g, " ").split(/\s+/));
  return expected.split(/\s+/).filter((w) => {
    const k = norm(w).replace(/[^a-z0-9']/g, "");
    return k && !said.has(k);
  });
}
