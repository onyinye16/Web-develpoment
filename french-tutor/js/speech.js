// Text-to-speech and speech recognition in French (built into the phone's browser).

import { store } from "./store.js";

let frVoice = null;
function pickVoice() {
  const voices = speechSynthesis.getVoices();
  frVoice =
    voices.find((v) => v.lang === "fr-FR" && /google|amélie|thomas|audrey|marie|natural|enhanced|premium/i.test(v.name)) ||
    voices.find((v) => v.lang === "fr-FR") ||
    voices.find((v) => v.lang.startsWith("fr")) || null;
}
if ("speechSynthesis" in window) {
  pickVoice();
  speechSynthesis.onvoiceschanged = pickVoice;
}

export const canSpeak = "speechSynthesis" in window;
export const canListen = !!(window.SpeechRecognition || window.webkitSpeechRecognition);

/** Speak French text. Returns a promise that resolves when finished. */
export function speak(text, { rate } = {}) {
  if (!canSpeak) return Promise.resolve();
  speechSynthesis.cancel();
  const clean = text
    .replace(/\*\*/g, "")
    .replace(/[✏️💡✅🎯👉]/gu, "")
    .replace(/\(([^)]*)\)/g, "") // drop translations in brackets
    .replace(/\[[^\]]*\]/g, "");
  return new Promise((resolve) => {
    const u = new SpeechSynthesisUtterance(clean);
    u.lang = "fr-FR";
    if (frVoice) u.voice = frVoice;
    u.rate = rate ?? store.settings.voiceRate;
    u.onend = resolve;
    u.onerror = resolve;
    speechSynthesis.speak(u);
  });
}

export function stopSpeaking() {
  if (canSpeak) speechSynthesis.cancel();
}

/**
 * Listen once in French. Calls onInterim with partial text.
 * Returns a controller { promise, stop }.
 */
export function listen({ onInterim } = {}) {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) return { promise: Promise.reject(new Error("Speech recognition isn't supported in this browser. Use Chrome on Android or Safari on iPhone.")), stop() {} };
  const rec = new SR();
  rec.lang = "fr-FR";
  rec.interimResults = true;
  rec.continuous = false;
  rec.maxAlternatives = 1;
  let finalText = "";
  const promise = new Promise((resolve, reject) => {
    rec.onresult = (e) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) finalText += t;
        else interim += t;
      }
      onInterim?.(finalText + interim);
    };
    rec.onerror = (e) => {
      if (e.error === "no-speech") resolve("");
      else if (e.error === "not-allowed") reject(new Error("Microphone permission denied. Allow the mic for this site."));
      else reject(new Error("Speech error: " + e.error));
    };
    rec.onend = () => resolve(finalText.trim());
  });
  rec.start();
  return { promise, stop: () => rec.stop() };
}

/** Rough similarity score (0-100) between expected and spoken text. */
export function similarity(a, b) {
  const norm = (s) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9 ]/g, " ").split(/\s+/).filter(Boolean);
  const A = norm(a), B = norm(b);
  if (!A.length) return 0;
  // word-level LCS
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
