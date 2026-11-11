// Local persistence (everything stays on the phone).

const KEY = "french-tutor-v1";

const defaults = () => ({
  settings: {
    provider: "gemini",       // free by default; "claude" is optional and paid
    keys: {},                 // { gemini: "...", groq: "...", openrouter: "...", custom: "..." }
    models: {},               // chosen model per provider
    customBase: "",
    apiKey: "",               // Anthropic key, only used if provider is "claude"
    model: "claude-opus-5-5",
    effort: "low",
    supportLang: "English",
    voiceRate: 0.95,
    onboarded: false,
    persona: "claire",
    correctionMode: "live",   // live = corrected out loud; screen = only on screen
    patience: "medium",       // how long a pause ends your turn in a call
    voiceName: "",            // override the auto-picked French voice
    autoSpeak: true,
    tcfVariant: "canada",     // "canada" | "tp" (tout public)
  },
  progress: {
    startDate: new Date().toISOString().slice(0, 10),
    level: "A2",
    xp: 0,
    streak: 0,
    lastActive: null,
    lessonsDone: [],
    daily: {},          // { "2026-11-11": ["srs", "quiz", ...] }
    minutes: {},        // { "2026-11-11": 42 }
    weakPoints: [],
    quiz: { right: 0, total: 0 },
    speakingTurns: 0,
    wordsWritten: 0,
  },
  cards: {},            // { french: { ease, interval, due, reps } }
  chat: [],             // free conversation history
});

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaults();
    const data = JSON.parse(raw);
    const d = defaults();
    return {
      ...d, ...data,
      settings: { ...d.settings, ...data.settings },
      progress: { ...d.progress, ...data.progress },
    };
  } catch {
    return defaults();
  }
}

export const store = load();

export function save() {
  try { localStorage.setItem(KEY, JSON.stringify(store)); } catch { /* storage unavailable */ }
}

export function today() {
  return new Date().toISOString().slice(0, 10);
}

export function addXP(n) {
  store.progress.xp += n;
  touchStreak();
  save();
}

export function markDaily(id) {
  const t = today();
  const list = store.progress.daily[t] || (store.progress.daily[t] = []);
  if (!list.includes(id)) list.push(id);
  touchStreak();
  save();
}

export function addMinutes(m) {
  const t = today();
  store.progress.minutes[t] = (store.progress.minutes[t] || 0) + m;
  save();
}

export function addWeakPoint(p) {
  if (!p) return;
  const w = store.progress.weakPoints;
  if (!w.includes(p)) w.push(p);
  if (w.length > 30) w.shift();
  save();
}

function touchStreak() {
  const t = today();
  const p = store.progress;
  if (p.lastActive === t) return;
  const y = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  p.streak = p.lastActive === y ? p.streak + 1 : 1;
  p.lastActive = t;
}

export function resetAll() {
  try { localStorage.removeItem(KEY); } catch { /* ignore */ }
  location.reload();
}

// ---------- Spaced repetition (SM-2 variant) ----------
export function cardState(fr) {
  return store.cards[fr] || { ease: 2.5, interval: 0, due: 0, reps: 0 };
}

/** grade: 0 = again, 1 = hard, 2 = good, 3 = easy */
export function reviewCard(fr, grade) {
  const c = { ...cardState(fr) };
  if (grade === 0) {
    c.reps = 0;
    c.interval = 0;
    c.due = Date.now() + 60 * 1000; // see again in a minute
    c.ease = Math.max(1.3, c.ease - 0.2);
  } else {
    c.reps += 1;
    if (c.reps === 1) c.interval = grade === 3 ? 3 : 1;
    else if (c.reps === 2) c.interval = grade === 3 ? 7 : 3;
    else c.interval = Math.round(c.interval * c.ease * (grade === 1 ? 0.6 : grade === 3 ? 1.3 : 1));
    c.ease = Math.max(1.3, c.ease + (grade === 1 ? -0.15 : grade === 3 ? 0.15 : 0));
    c.due = Date.now() + c.interval * 86400000;
  }
  store.cards[fr] = c;
  save();
}
