import { WEEKS, GRAMMAR, VOCAB, QUIZ, READINGS, SENTENCES, DAILY_PLAN } from "./curriculum.js";
import { store, save, today, addXP, markDaily, addMinutes, addWeakPoint, resetAll, cardState, reviewCard } from "./store.js";
import { streamReply, askJSON, dayNumber, currentWeek, systemPrompt, QUIZ_SCHEMA, READING_SCHEMA, PLACEMENT_SCHEMA, WRITING_SCHEMA } from "./tutor.js";
import { speak, stopSpeaking, listen, canListen, canSpeak, similarity, missedWords, createSpeaker, unlockAudio, frenchVoices } from "./speech.js";
import { PERSONAS, getPersona } from "./personas.js";

import { $, view, esc, md, toast, speakBtn, level, levelBucket, shuffle, needsKey, keyNotice, me, renderAI, fmtTime, bus } from "./ui.js";
import { renderTCF } from "./tcf.js";


document.addEventListener("click", (e) => {
  const b = e.target.closest("[data-say]");
  if (b) { e.preventDefault(); speak(b.dataset.say); }
});

// Track study time while the app is visible.
let lastTick = Date.now();
setInterval(() => {
  if (document.visibilityState === "visible") {
    const mins = (Date.now() - lastTick) / 60000;
    if (mins >= 1) { addMinutes(Math.round(mins)); lastTick = Date.now(); }
  } else lastTick = Date.now();
}, 30000);

// ---------- router ----------
const routes = {
  home: renderHome, learn: renderLearn, lesson: renderLesson, cards: renderCards, quiz: renderQuiz,
  speak: renderSpeak, read: renderRead, listen: renderListen, write: renderWrite, chat: renderChat,
  progress: renderProgress, settings: renderSettings, placement: renderPlacement, more: renderMore, call: renderCall, tcf: renderTCF,
};
let cleanup = null;
function route() {
  cleanup?.(); cleanup = null;
  document.body.classList.remove("in-call");
  stopSpeaking();
  const [name, arg] = (location.hash.slice(1) || "home").split("/");
  if (!store.settings.onboarded && name !== "settings" && name !== "placement") return renderWelcome();
  (routes[name] || renderHome)(arg ? decodeURIComponent(arg) : undefined);
  document.querySelectorAll(".tabbar a").forEach((a) => a.classList.toggle("active", a.getAttribute("href") === "#" + name));
  window.scrollTo(0, 0);
}
window.addEventListener("hashchange", route);

// ---------- welcome / onboarding ----------
function renderWelcome() {
  view.innerHTML = `
  <section class="hero">
    <div class="flag">🇫🇷</div>
    <h1>Bonjour !</h1>
    <p>Learn French by <b>talking every day with real French locals</b>: Claire from Paris, Marius from Marseille, Léa from Lyon or Antoine from Bordeaux. Our goal: <b>A2 → B2 in 60 days</b>.</p>
  </section>
  <div class="card">
    <h3>How it works</h3>
    <ul class="checks">
      <li>🎯 Built on the <b>TCF exam</b>: listening, reading, writing and speaking, with timed mock exams and scores</li>
      <li>🌐 Paste any French web page and get TCF questions and a lesson from it</li>
      <li>📅 A 60-day plan: 8 weeks of grammar, vocabulary and themes</li>
      <li>🧠 Flashcards that repeat words right before you'd forget them</li>
      <li>📞 Hands-free phone calls with a French local who listens, corrects you and answers out loud</li>
      <li>📖 Reading, 🎧 dictation and ✍️ writing with detailed corrections</li>
      <li>⏱️ About <b>2.5 hours a day</b> — that's what the fast track takes</li>
    </ul>
  </div>
  <div class="card">
    <h3>1. Connect the AI tutor</h3>
    <p class="muted">Paste your Anthropic API key (get one at console.anthropic.com). It stays only on this phone.</p>
    <input id="wk-key" type="password" placeholder="sk-ant-..." autocomplete="off" value="${esc(store.settings.apiKey)}">
    <h3 style="margin-top:16px">2. Your current level</h3>
    <select id="wk-level">${["A1", "A2", "A2+", "B1", "B1+", "B2-"].map((l) => `<option ${l === level() ? "selected" : ""}>${l}</option>`).join("")}</select>
    <div class="row">
      <button class="btn" id="wk-start">Start learning</button>
      <button class="btn ghost" id="wk-test">Take placement test</button>
    </div>
  </div>`;
  const commit = () => {
    store.settings.apiKey = $("#wk-key").value.trim();
    store.progress.level = $("#wk-level").value;
    store.settings.onboarded = true;
    store.progress.startDate = today();
    save();
  };
  $("#wk-start").onclick = () => { commit(); location.hash = "home"; route(); };
  $("#wk-test").onclick = () => { commit(); location.hash = "placement"; };
}

// ---------- home ----------
function renderHome() {
  const p = store.progress;
  const day = dayNumber();
  const wk = currentWeek();
  const done = p.daily[today()] || [];
  const mins = p.minutes[today()] || 0;
  const due = [...VOCAB, ...(p.extraVocab || [])].filter(([fr]) => { const c = store.cards[fr]; return c && c.due <= Date.now(); }).length;
  view.innerHTML = `
  <section class="hero small">
    <div>
      <p class="muted">Jour ${day} / 60 · Semaine ${wk.week}</p>
      <h1>Salut ! 👋</h1>
    </div>
    <div class="pill big">${esc(p.level)} → B2</div>
  </section>
  <div class="stats">
    <div><b>🔥 ${p.streak}</b><span>day streak</span></div>
    <div><b>⭐ ${p.xp}</b><span>XP</span></div>
    <div><b>⏱️ ${mins}</b><span>min today</span></div>
  </div>
  <div class="progressbar"><div style="width:${Math.round((day / 60) * 100)}%"></div></div>
  <a class="card tcf-card" href="#tcf"><span class="big-ico">🎯</span><div><b>TCF exam prep</b><br><span class="muted small">Listening · Reading · Writing · Speaking · Mock exams · Learn from websites</span></div></a>
  <a class="card call-card" href="#call" id="home-call">
    <div class="avatar sm">${me().emoji}</div>
    <div><b>📞 Call ${esc(me().name)}</b><br><span class="muted">${esc(me().tagline)} · ${esc(me().city)}</span></div>
  </a>
  <div class="card accent">
    <p class="muted">This week · ${esc(wk.level)}</p>
    <h3>${esc(wk.title)}</h3>
    <p>${esc(wk.goal)}</p>
    <p class="muted">🎤 Speaking challenge: ${esc(wk.speaking)}</p>
    <p class="muted">🎯 TCF focus: ${esc(wk.tcf || "")}</p>
    <a class="btn" href="#learn">Open this week's lessons</a>
  </div>
  <div class="card">
    <h3>Today's mission (${done.length}/${DAILY_PLAN.length})</h3>
    <ul class="mission">
      ${DAILY_PLAN.map((t) => `<li class="${done.includes(t.id) ? "done" : ""}"><a href="#${t.view}"><span>${done.includes(t.id) ? "✅" : "⬜"} ${esc(t.label)}${t.id === "srs" && due ? ` <span class="pill">${due} due</span>` : ""}</span><span class="muted">${t.minutes} min</span></a></li>`).join("")}
    </ul>
  </div>
  ${needsKey() ? keyNotice() : ""}
  <div class="card tip"><b>💡 Astuce du jour :</b> ${esc(TIPS[day % TIPS.length])}</div>`;
  $("#home-call").onclick = () => unlockAudio();
}

const TIPS = [
  "Speak out loud every day, even alone. Fluency is a physical skill.",
  "Change your phone language to French — free immersion all day.",
  "Learn words in chunks: not 'besoin' but 'j'ai besoin de…'.",
  "Shadowing: play a sentence, then repeat it immediately copying the rhythm.",
  "Watch French series with French subtitles (try 'Lupin', 'Dix pour cent', 'Call My Agent').",
  "Podcasts: 'InnerFrench', 'Français Authentique', 'Journal en français facile' (RFI).",
  "Think in French: describe what you're doing in your head.",
  "Mistakes are data. Every correction during your calls is a free lesson.",
  "Read news at your level: '1jour1actu' (easy), 'Le Monde' (B2).",
  "Write 5 sentences about your day every evening — then get them corrected.",
];

// ---------- learn: curriculum ----------
function renderLearn() {
  const wk = currentWeek();
  view.innerHTML = `
  <h2>📚 60-day curriculum</h2>
  ${WEEKS.map((w) => `
    <details class="card week" ${w.week === wk.week ? "open" : ""}>
      <summary><span class="pill">${esc(w.level)}</span> Week ${w.week} — ${esc(w.title)}</summary>
      <p>${esc(w.goal)}</p>
      <ul class="topics">
        ${w.grammar.map((g) => `<li><a href="#lesson/${g}">${store.progress.lessonsDone.includes(g) ? "✅" : "📘"} ${esc(GRAMMAR[g]?.title || g)}</a></li>`).join("")}
      </ul>
      <p class="muted">Themes: ${w.themes.map(esc).join(" · ")}</p>
      <p class="muted">🎤 ${esc(w.speaking)}</p>
      <p class="muted">🎯 TCF: ${esc(w.tcf || "")}</p>
    </details>`).join("")}`;
}

function renderLesson(id) {
  const g = GRAMMAR[id];
  if (!g) { location.hash = "learn"; return; }
  view.innerHTML = `
  <a href="#learn" class="back">← Curriculum</a>
  <h2>${esc(g.title)}</h2>
  <div class="card"><p>${esc(g.explain)}</p></div>
  <div class="card">
    <h3>Examples</h3>
    ${g.examples.map(([fr, en]) => `<div class="example">${speakBtn(fr)}<div><b>${esc(fr)}</b><br><span class="muted">${esc(en)}</span></div></div>`).join("")}
  </div>
  <div class="row wrap">
    <button class="btn" id="deep">🎓 Teach me more</button>
    <button class="btn ghost" id="practice">📝 Practice quiz</button>
    <button class="btn ghost" id="done">${store.progress.lessonsDone.includes(id) ? "✅ Done" : "Mark as done"}</button>
  </div>
  <div id="ai-out"></div>`;
  $("#done").onclick = () => {
    if (!store.progress.lessonsDone.includes(id)) { store.progress.lessonsDone.push(id); addXP(20); }
    markDaily("lesson");
    toast("Leçon terminée ! +20 XP");
    $("#done").textContent = "✅ Done";
  };
  $("#deep").onclick = async () => {
    if (needsKey()) return ($("#ai-out").innerHTML = keyNotice());
    const out = $("#ai-out");
    out.innerHTML = `<div class="card ai"><div class="typing"></div></div>`;
    const box = $(".ai", out);
    let text = "";
    try {
      await streamReply([{ role: "user", content: `Teach me "${g.title}" in depth for my level. Structure: 1) clear rule explanation in ${store.settings.supportLang}, 2) the most common mistakes learners make, 3) 6 natural example sentences (French + translation), 4) a memory trick, 5) 5 short fill-in-the-blank exercises with the answers hidden at the very end under "Réponses". Use simple markdown.` }],
        { onText: (t) => { text += t; box.innerHTML = md(text); }, maxTokens: 8000 });
      markDaily("lesson");
      addXP(10);
    } catch (e) { box.innerHTML = `<p class="error">${esc(e.message)}</p>`; }
  };
  $("#practice").onclick = () => { location.hash = "quiz/" + id; };
}

// ---------- flashcards (SRS) ----------
function renderCards() {
  const now = Date.now();
  const DECK = [...VOCAB, ...(store.progress.extraVocab || [])];
  const due = DECK.filter(([fr]) => store.cards[fr] && store.cards[fr].due <= now);
  const newToday = Object.values(store.cards).filter((c) => c.firstSeen === today()).length;
  const allowedLevels = ["A2", "B1", "B2"].slice(0, ["A2", "B1", "B2"].indexOf(levelBucket()) + 2);
  const fresh = DECK.filter(([fr, , lv]) => !store.cards[fr] && allowedLevels.includes(lv)).slice(0, Math.max(0, 20 - newToday));
  const queue = shuffle([...due, ...fresh]);
  const learned = Object.values(store.cards).filter((c) => c.interval >= 7).length;
  let i = 0, flipped = false, reviewed = 0;

  const show = () => {
    if (i >= queue.length) {
      if (reviewed) { markDaily("srs"); addXP(reviewed); }
      view.innerHTML = `<h2>🧠 Flashcards</h2>
        <div class="card center"><div class="big-emoji">🎉</div><h3>All done for now!</h3>
        <p>${reviewed} cards reviewed · ${learned} words in long-term memory · ${DECK.length} in deck</p>
        <a class="btn" href="#home">Back home</a></div>`;
      return;
    }
    const [fr, en, lv] = queue[i];
    view.innerHTML = `<h2>🧠 Flashcards <span class="muted small">${i + 1}/${queue.length}</span></h2>
      <div class="flash ${flipped ? "flipped" : ""}" id="flash">
        <div class="pill">${lv}${store.cards[fr] ? "" : " · new"}</div>
        <div class="fr">${esc(fr)}</div>
        ${flipped ? `<div class="en">${esc(en)}</div>` : `<p class="muted">Say it out loud, guess the meaning, then tap</p>`}
      </div>
      <div class="row center">${speakBtn(fr)}</div>
      ${flipped ? `<div class="grades">
        <button class="btn bad" data-g="0">Again</button>
        <button class="btn warn" data-g="1">Hard</button>
        <button class="btn good" data-g="2">Good</button>
        <button class="btn easy" data-g="3">Easy</button></div>` : `<button class="btn full" id="flip">Show answer</button>`}`;
    const flip = () => { flipped = true; show(); speak(fr); };
    $("#flash").onclick = () => !flipped && flip();
    $("#flip") && ($("#flip").onclick = flip);
    view.querySelectorAll("[data-g]").forEach((b) => (b.onclick = () => {
      if (!store.cards[fr]) store.cards[fr] = { ...cardState(fr), firstSeen: today() };
      const g = +b.dataset.g;
      reviewCard(fr, g);
      store.cards[fr].firstSeen ??= today();
      if (g === 0) queue.push(queue[i]);
      reviewed++; i++; flipped = false; show();
    }));
  };
  show();
}

// ---------- quiz ----------
function renderQuiz(topic) {
  view.innerHTML = `
  <h2>📝 Quiz</h2>
  <div class="card">
    <button class="btn full" id="q-offline">Quick mixed quiz (offline)</button>
    <button class="btn full ghost" id="q-week">AI quiz: this week's grammar</button>
    ${topic ? `<button class="btn full ghost" id="q-topic">AI quiz: ${esc(GRAMMAR[topic]?.title || topic)}</button>` : ""}
    <button class="btn full ghost" id="q-weak">AI quiz: my weak points</button>
  </div>
  <div id="quiz"></div>`;
  $("#q-offline").onclick = () => {
    const pool = topic ? QUIZ.filter((q) => q[4] === topic) : QUIZ;
    runQuiz(shuffle(pool.length >= 3 ? pool : QUIZ).slice(0, 10).map(([question, options, answer, explanation, t]) => ({ question, options, answer, explanation, topic: t })));
  };
  const ai = async (what) => {
    if (needsKey()) return ($("#quiz").innerHTML = keyNotice());
    $("#quiz").innerHTML = `<div class="card center"><div class="typing"></div><p class="muted">Writing your quiz…</p></div>`;
    try {
      const data = await askJSON(`Create a 10-question multiple-choice French quiz about: ${what}. Level: ${level()} moving toward B2. Each question: a French sentence with a blank (___) or a short question, exactly 4 options, "answer" = index (0-3) of the correct option, and a one-sentence explanation in ${store.settings.supportLang}. Vary difficulty and include common learner traps.`, QUIZ_SCHEMA);
      runQuiz(data.questions.map((q) => ({ ...q, topic: what })));
    } catch (e) { $("#quiz").innerHTML = `<p class="error">${esc(e.message)}</p>`; }
  };
  $("#q-week").onclick = () => ai(currentWeek().grammar.map((g) => GRAMMAR[g]?.title || g).join(", "));
  $("#q-topic") && ($("#q-topic").onclick = () => ai(GRAMMAR[topic]?.title || topic));
  $("#q-weak").onclick = () => ai(store.progress.weakPoints.length ? store.progress.weakPoints.slice(-10).join("; ") : "the most common A2–B1 grammar mistakes");
}

function runQuiz(questions) {
  let i = 0, score = 0;
  const box = $("#quiz");
  const show = () => {
    if (i >= questions.length) {
      const pct = Math.round((score / questions.length) * 100);
      store.progress.quiz.right += score; store.progress.quiz.total += questions.length;
      addXP(score * 5); markDaily("quiz");
      box.innerHTML = `<div class="card center"><div class="big-emoji">${pct >= 80 ? "🏆" : pct >= 50 ? "👍" : "💪"}</div>
        <h3>${score}/${questions.length} (${pct}%)</h3><p>${pct >= 80 ? "Excellent travail !" : pct >= 50 ? "Pas mal ! Review the explanations." : "Keep going — repetition is the key."}</p></div>`;
      return;
    }
    const q = questions[i];
    box.innerHTML = `<div class="card">
      <p class="muted">Question ${i + 1}/${questions.length}</p>
      <h3>${esc(q.question)}</h3>
      <div class="options">${q.options.map((o, k) => `<button class="opt" data-k="${k}">${esc(o)}</button>`).join("")}</div>
      <div id="expl"></div></div>`;
    box.querySelectorAll(".opt").forEach((b) => (b.onclick = () => {
      const k = +b.dataset.k;
      box.querySelectorAll(".opt").forEach((x, j) => { x.disabled = true; if (j === q.answer) x.classList.add("right"); });
      if (k === q.answer) score++;
      else { b.classList.add("wrong"); addWeakPoint(q.topic && GRAMMAR[q.topic] ? GRAMMAR[q.topic].title : q.question.slice(0, 60)); }
      const full = q.question.replace(/_{2,}/, q.options[q.answer]);
      $("#expl").innerHTML = `<p class="${k === q.answer ? "ok" : "error"}">${k === q.answer ? "✅ Correct !" : "❌ Not quite."}</p>
        <div class="example">${speakBtn(full)}<span>${esc(q.explanation)}</span></div>
        <button class="btn full" id="next">Next →</button>`;
      $("#next").onclick = () => { i++; show(); };
    }));
  };
  show();
}

// ---------- speaking ----------
// Topics for a call. `null` prompt = just chat as friends.
const TOPICS = [
  ["💬 Just chat", null],
  ["🏙️ Life in their city", "Tell me about real everyday life in your city (prices, habits, neighbourhoods, food, what locals love and complain about) and compare with where I live. Teach me 2–3 local expressions."],
  ["📅 My day", "Ask me about my day in detail and make me use the passé composé and imparfait correctly."],
  ["☕ At the café", "Role-play: you are the waiter in your favourite café in your city. Take my order, make small talk, then there is a small problem with my order."],
  ["🏠 Flat hunting", "Role-play: you are renting out a flat in your city. I'm calling to visit it. Ask and answer realistic questions (rent, charges, deposit, neighbourhood)."],
  ["💼 Job interview", "Role-play: you are a recruiter in your city doing a job interview with me in French. One question at a time, B1–B2 level."],
  ["🩺 At the doctor", "Role-play: I'm at the doctor (you play the doctor). I explain symptoms, you ask follow-up questions and give advice."],
  ["🗣️ Debate", "Start a friendly debate on a current French social topic you care about. Give your real opinion as a local, challenge my arguments and make me justify them with connectors."],
  ["🎓 DELF B2 oral", "Simulate the DELF B2 oral exam: present a short article topic in 2–3 sentences, let me give my point of view, then ask probing examiner questions. Stay friendly but rigorous. Keep each turn short (it's a call)."],
  ["🎤 Weekly challenge", "WEEKLY"],
];

function renderSpeak() {
  const p = me();
  view.innerHTML = `
  <h2>🗣️ Speak</h2>
  ${!canListen ? `<div class="notice">Your browser can't recognise speech. Use <b>Chrome on Android</b> or <b>Safari on iPhone</b>. You can still type in the Chat tab.</div>` : ""}
  <div class="card call-hero">
    <div class="avatar">${p.emoji}</div>
    <h3>${esc(p.name)}, ${p.age} · ${esc(p.city)}</h3>
    <p class="muted">${esc(p.tagline)}</p>
    <a class="btn call-btn" href="#call/0" data-call>📞 Call ${esc(p.name)}</a>
    <p class="muted small">Hands-free: just talk. ${esc(p.name)} listens, answers out loud and corrects you.</p>
    <div class="persona-switch">${PERSONAS.map((x) => `<button class="chip ${x.id === p.id ? "on" : ""}" data-p="${x.id}">${x.emoji} ${esc(x.name)} · ${esc(x.city)}</button>`).join("")}</div>
  </div>
  <div class="card">
    <h3>Call about…</h3>
    <div class="scenarios">${TOPICS.map(([t], k) => `<a class="chip" href="#call/${k}" data-call>${esc(t)}</a>`).join("")}</div>
  </div>
  <div class="card">
    <h3>Pronunciation drill</h3>
    <p class="muted">Listen, repeat, get a score.</p>
    <button class="btn full ghost" id="drill">Start drill (${levelBucket()})</button>
  </div>
  <div id="speak-area"></div>`;
  view.querySelectorAll("[data-call]").forEach((a) => (a.onclick = () => unlockAudio()));
  view.querySelectorAll("[data-p]").forEach((b) => (b.onclick = () => {
    if (store.settings.persona !== b.dataset.p) store.chat = [];
    store.settings.persona = b.dataset.p; save(); renderSpeak();
    speak(me().greeting.split(/(?<=[.!?])\s/)[0]);
  }));
  $("#drill").onclick = pronunciationDrill;
}

function pronunciationDrill() {
  const list = shuffle(SENTENCES[levelBucket()]);
  let i = 0;
  const area = $("#speak-area");
  const show = () => {
    const s = list[i % list.length];
    area.innerHTML = `<div class="card">
      <p class="muted">Sentence ${(i % list.length) + 1}/${list.length}</p>
      <h3 class="fr-sentence">${esc(s)}</h3>
      <div class="row">
        <button class="btn ghost" id="hear">🔊 Listen</button>
        <button class="btn ghost" id="slow">🐢 Slow</button>
        <button class="btn" id="rec">🎙️ Repeat</button>
      </div>
      <div id="res"></div></div>`;
    $("#hear").onclick = () => speak(s);
    $("#slow").onclick = () => speak(s, { rate: 0.6 });
    $("#rec").onclick = async () => {
      $("#res").innerHTML = `<p class="muted">🎙️ Listening… speak now</p>`;
      try {
        const said = await listen({ onInterim: (t) => ($("#res").innerHTML = `<p class="muted">🎙️ ${esc(t)}</p>`) }).promise;
        const score = similarity(s, said);
        const missed = missedWords(s, said);
        addXP(Math.round(score / 20));
        markDaily("speak");
        $("#res").innerHTML = `<div class="score ${score >= 85 ? "good" : score >= 60 ? "mid" : "low"}">${score}%</div>
          <p><b>You said:</b> ${esc(said || "(nothing heard)")}</p>
          ${missed.length ? `<p class="muted">Words to practise: ${missed.map((w) => `<span class="chip small">${esc(w)}</span>`).join(" ")}</p>` : ""}
          <p>${score >= 85 ? "Très bien ! 🎉" : score >= 60 ? "Pas mal — listen again and copy the rhythm." : "Try again slowly — use the 🐢 button."}</p>
          <button class="btn full" id="nxt">Next sentence →</button>`;
        $("#nxt").onclick = () => { i++; show(); };
      } catch (e) { $("#res").innerHTML = `<p class="error">${esc(e.message)}</p>`; }
    };
  };
  show();
  area.scrollIntoView({ behavior: "smooth" });
}

// ---------- the phone call (hands-free conversation) ----------
// arg = topic index (call with your local) or "custom" (configured by another screen, e.g. a TCF oral task).
function renderCall(arg) {
  if (needsKey()) { view.innerHTML = `<h2>📞 Call</h2>${keyNotice()}`; return; }
  let cfg;
  if (arg === "custom") {
    cfg = bus.pendingCall;
    if (!cfg) { location.hash = "speak"; return; }
  } else {
    const p = me();
    const [title, topicPrompt] = TOPICS[+arg] || TOPICS[0];
    const scenario = topicPrompt === "WEEKLY"
      ? `Help me with this week's speaking challenge: "${currentWeek().speaking}". Guide me, keep me talking, and give me feedback at the end.`
      : topicPrompt;
    cfg = {
      persona: p, title,
      system: systemPrompt(scenario ? `\nTOPIC OF THIS CALL: ${scenario}` : "\nTOPIC OF THIS CALL: just a friendly catch-up. Talk about anything — your life, the learner's life, plans, news, culture.", { call: true }),
      greeting: scenario ? null : p.greeting,
      opening: scenario ? "[The phone call starts. Greet me in character and start the topic of this call.]" : null,
      bye: BYES[p.id] || "Allez, à bientôt !",
      againHref: `#call/${+arg || 0}`,
    };
  }
  if (cfg.prep) return renderPrep(cfg, () => startCall(cfg));
  startCall(cfg);
}

function renderPrep(cfg, go) {
  document.body.classList.add("in-call");
  let left = cfg.prep.seconds;
  view.innerHTML = `<div class="call">
    <div class="call-top"><span>📝 Préparation</span><span id="pt">${fmtTime(left)}</span></div>
    <div class="card prep">${cfg.prep.html}<textarea rows="5" placeholder="Notes (not graded)"></textarea></div>
    <button class="btn full" id="prep-go">I'm ready, start now</button>
  </div>`;
  const t = setInterval(() => {
    left--; $("#pt") && ($("#pt").textContent = fmtTime(left));
    if (left <= 0) { clearInterval(t); go(); }
  }, 1000);
  cleanup = () => { clearInterval(t); document.body.classList.remove("in-call"); };
  $("#prep-go").onclick = () => { unlockAudio(); clearInterval(t); go(); };
}

function startCall(cfg) {
  const p = cfg.persona;
  document.body.classList.add("in-call");
  view.innerHTML = `
  <div class="call">
    <div class="call-top"><span>${cfg.timeLimit ? "⏱️" : "📞"} <span id="timer">${cfg.timeLimit ? fmtTime(cfg.timeLimit) : "00:00"}</span></span><span>${esc(cfg.title)}</span></div>
    <div class="avatar xl" id="avatar">${p.emoji}</div>
    <h2 class="center">${esc(p.name)}</h2>
    <p class="muted center">${esc(p.city)}</p>
    ${cfg.taskHtml || ""}
    <p class="status" id="status">Calling…</p>
    <div class="live-text" id="live"></div>
    <div class="convo call-convo" id="convo"></div>
    <div class="call-controls">
      <button class="ctl" id="c-repeat"><span>🔁</span>Repeat</button>
      <button class="ctl" id="c-slow"><span>🐢</span>Slower</button>
      <button class="mic big" id="c-mic" aria-label="Talk">🎙️</button>
      ${cfg.noCorrections ? "" : `<button class="ctl" id="c-help"><span>🆘</span>Help</button>`}
      <button class="ctl hang" id="c-end"><span>📵</span>${cfg.timeLimit ? "Finish" : "Hang up"}</button>
    </div>
  </div>`;

  const convo = $("#convo"), live = $("#live"), status = $("#status"), avatar = $("#avatar"), mic = $("#c-mic");
  const bubble = (role, html) => { const d = document.createElement("div"); d.className = "bubble " + role; d.innerHTML = html; convo.appendChild(d); d.scrollIntoView({ block: "end", behavior: "smooth" }); return d; };
  const msgs = [];
  let active = true, state = "idle", rec = null, speaker = null, misses = 0, skipResult = false, turns = 0, streaming = null;
  const t0 = Date.now();
  const timer = setInterval(() => {
    const sec = Math.floor((Date.now() - t0) / 1000);
    const el = $("#timer"); if (!el) return;
    if (cfg.timeLimit) {
      const left = cfg.timeLimit - sec;
      el.textContent = fmtTime(left);
      el.classList.toggle("late", left <= 30);
      if (left <= 0) { toast("⏱️ Time's up!"); endCall(); }
    } else el.textContent = fmtTime(sec);
  }, 1000);

  const STATUS = {
    thinking: `${p.name} réfléchit…`,
    speaking: `${p.name} parle… (tap 🎙️ to interrupt)`,
    listening: "À vous ! Je vous écoute… 🎙️",
    paused: "Tap 🎙️ to talk",
  };
  const setState = (st, msg) => {
    state = st;
    avatar.className = "avatar xl " + st;
    mic.classList.toggle("on", st === "listening");
    status.textContent = msg || STATUS[st] || "";
  };

  const stopListening = () => { if (rec) { skipResult = true; rec.stop(); } };

  async function aiTurn(userText) {
    if (!active) return;
    if (userText) { bubble("user", esc(userText)); msgs.push({ role: "user", content: userText }); turns++; store.progress.speakingTurns++; }
    setState("thinking");
    speaker = createSpeaker({ gender: p.gender });
    const b = bubble("ai", `<div class="typing"></div>`);
    let out = "";
    try {
      streaming = streamReply(msgs, {
        system: cfg.system, maxTokens: 1500,
        onText: (t) => {
          out += t;
          b.innerHTML = renderAI(out);
          if (!active) return;
          speaker.push(t);
          if (state === "thinking" && speaker.speaking) setState("speaking");
        },
      });
      const full = await streaming;
      msgs.push({ role: "assistant", content: full });
      addXP(3); markDaily("speak");
      if (!active || rec) return; // learner already interrupted and is talking
      setState("speaking");
      await speaker.end();
    } catch (e) {
      b.innerHTML = `<span class="error">${esc(e.message)}</span>`;
      if (msgs[msgs.length - 1]?.role === "user") msgs.pop();
      setState("paused", e.message + " — tap 🎙️ to try again");
      return;
    }
    if (active) listenTurn();
  }

  async function listenTurn() {
    if (!active || rec) return;
    setState("listening");
    live.textContent = "";
    rec = listen({ patient: true, onInterim: (t) => (live.textContent = t) });
    let said = "";
    try { said = await rec.promise; }
    catch (e) { rec = null; setState("paused", e.message); return; }
    rec = null;
    live.textContent = "";
    if (skipResult) { skipResult = false; return; }
    if (!active) return;
    if (!said) {
      if (++misses >= 2) { misses = 0; setState("paused", `${p.name} attend… tap 🎙️ when you're ready`); return; }
      return listenTurn();
    }
    misses = 0;
    if (streaming) await streaming.catch(() => {}); // keep turns in order
    aiTurn(said);
  }

  mic.onclick = () => {
    unlockAudio();
    if (state === "speaking") {                                           // interrupt and talk
      stopSpeaking();
      setTimeout(() => { if (state === "speaking") listenTurn(); }, 300);
    }
    else if (state === "listening") rec?.stop();                          // "I'm done talking"
    else if (state === "paused" || state === "idle") {
      if (msgs[msgs.length - 1]?.role === "user") aiTurn(null); else listenTurn();
    }
  };
  const lastAI = () => [...msgs].reverse().find((m) => m.role === "assistant")?.content || "";
  const replay = async (rate) => {
    if (state === "thinking") return;
    stopListening(); speaker?.cancel();
    setState("speaking");
    await speak(lastAI(), { gender: p.gender, rate });
    if (active) listenTurn();
  };
  $("#c-repeat").onclick = () => replay();
  $("#c-slow").onclick = () => {
    store.settings.voiceRate = Math.max(0.6, +(store.settings.voiceRate - 0.1).toFixed(2)); save();
    toast(`Voice speed ${store.settings.voiceRate}`);
    replay();
  };
  $("#c-help") && ($("#c-help").onclick = () => {
    if (state === "thinking") return;
    stopListening(); speaker?.cancel();
    msgs.push({ role: "user", content: `[I pressed HELP — I'm lost. Very briefly explain in ${store.settings.supportLang} what you just said, give me 2 simple French sentences I could answer with, then ask your question again in simpler French.]` });
    bubble("user", "🆘 Help!");
    aiTurn(null);
  });

  const hangUp = () => {
    active = false;
    clearInterval(timer);
    stopListening(); speaker?.cancel(); stopSpeaking();
    document.body.classList.remove("in-call");
  };
  cleanup = hangUp;

  async function endCall() {
    if (!active) return;
    hangUp();
    cleanup = null;
    const mins = Math.max(1, Math.round((Date.now() - t0) / 60000));
    const report = document.createElement("div");
    view.innerHTML = `<h2>📵 ${esc(cfg.title)} · ${mins} min</h2>`;
    view.appendChild(report);
    speak(cfg.bye || "À bientôt !", { gender: p.gender });
    if (turns < 2) {
      report.innerHTML = `<div class="card"><p>Very short! Next time try to keep talking until the end.</p><a class="btn" href="${cfg.againHref}">Try again</a></div>`;
      return;
    }
    report.innerHTML = `<div class="card"><h3>Your feedback</h3><div id="fb"><div class="typing"></div></div></div>
      <div class="row"><a class="btn" href="${cfg.againHref}">Again</a><a class="btn ghost" href="#home">Home</a></div>`;
    let out = "";
    const prompt = cfg.feedbackPrompt || `[The call is over. Out of character as a tutor, in ${store.settings.supportLang}, give me feedback: estimated level in this call, what I did well, my 3 most important recurring mistakes (wrong → right), 5 natural expressions a local would have used, and one line of encouragement from you. Then on the very last line write "WEAK:" followed by my weak grammar points separated by semicolons.]`;
    try {
      await streamReply([...msgs, { role: "user", content: prompt }],
        { system: systemPrompt(), maxTokens: 3000, onText: (t) => { out += t; $("#fb").innerHTML = md(out.replace(/WEAK:[\s\S]*$/, "")); } });
      const weak = out.match(/WEAK:([\s\S]*)$/);
      if (weak) weak[1].split(";").map((x) => x.trim()).filter(Boolean).forEach(addWeakPoint);
      cfg.onFeedback?.(out);
      addXP(10 + mins * 2);
    } catch (e) { $("#fb").innerHTML = `<p class="error">${esc(e.message)}</p>`; }
  }
  $("#c-end").onclick = endCall;

  // Start the call.
  if (cfg.greeting) {
    msgs.push({ role: "user", content: "[The phone call starts. Greet me.]" }, { role: "assistant", content: cfg.greeting });
    bubble("ai", renderAI(cfg.greeting));
    setState("speaking");
    speak(cfg.greeting, { gender: p.gender }).then(() => active && listenTurn());
  } else {
    msgs.push({ role: "user", content: cfg.opening || "[Start.]" });
    aiTurn(null);
  }
}

const BYES = {
  claire: "Allez, je file ! Bisous, à demain !",
  marius: "Allez, à la prochaine, hein ! Passe me voir à Marseille !",
  lea: "Super conversation ! Bisous, à très vite !",
  antoine: "Ce fut un plaisir. À bientôt, mon ami !",
};

// ---------- reading ----------
function renderRead() {
  view.innerHTML = `
  <h2>📖 Reading</h2>
  <div class="card">
    <h3>Generate a new text</h3>
    <input id="r-topic" placeholder="Topic (e.g. football, cuisine, travail…)" value="${esc(currentWeek().themes[0])}">
    <button class="btn full" id="r-gen">✨ Create a ${esc(level())}+ text</button>
  </div>
  <div class="card"><h3>Library (offline)</h3>
    ${READINGS.map((r, k) => `<button class="list-btn" data-r="${k}"><span class="pill">${r.level}</span> ${esc(r.title)}</button>`).join("")}
  </div>
  <div id="reading"></div>`;
  view.querySelectorAll("[data-r]").forEach((b) => (b.onclick = () => {
    const r = READINGS[+b.dataset.r];
    showReading({ title: r.title, text: r.text, glossary: [], questions: r.questions.map(([question, options, answer]) => ({ question, options, answer, explanation: "" })) });
  }));
  $("#r-gen").onclick = async () => {
    if (needsKey()) return ($("#reading").innerHTML = keyNotice());
    $("#reading").innerHTML = `<div class="card center"><div class="typing"></div><p class="muted">Writing your text…</p></div>`;
    try {
      const r = await askJSON(`Write an engaging, authentic-style French text (180–280 words) about "${$("#r-topic").value || "la vie en France"}" at level ${level()} (slightly above, i+1, toward B2). Reuse this week's grammar: ${currentWeek().grammar.join(", ")}. Include a glossary of 8 harder words (fr → ${store.settings.supportLang}) and 5 comprehension multiple-choice questions in French, 4 options each, answer = correct index, explanation in ${store.settings.supportLang}.`, READING_SCHEMA);
      showReading(r);
    } catch (e) { $("#reading").innerHTML = `<p class="error">${esc(e.message)}</p>`; }
  };
}

function showReading(r) {
  const box = $("#reading");
  box.innerHTML = `<div class="card reading">
    <div class="row between"><h3>${esc(r.title)}</h3>${speakBtn(r.text)}</div>
    <p class="text">${esc(r.text).replace(/\n/g, "<br>")}</p>
    ${r.glossary.length ? `<details><summary>📒 Glossary</summary><ul>${r.glossary.map((g) => `<li><b>${esc(g.fr)}</b> — ${esc(g.en)}</li>`).join("")}</ul></details>` : ""}
    <p class="muted">Tip: read it once silently, once out loud, then answer.</p>
  </div><div id="quiz"></div>`;
  box.scrollIntoView({ behavior: "smooth" });
  runQuiz(r.questions.map((q) => ({ ...q, topic: "reading" })));
  markDaily("read");
}

// ---------- listening / dictation ----------
function renderListen() {
  const list = shuffle([...SENTENCES[levelBucket()], ...(levelBucket() !== "A2" ? SENTENCES.A2.slice(0, 2) : [])]);
  let i = 0, total = 0;
  const show = () => {
    const s = list[i % list.length];
    view.innerHTML = `<h2>🎧 Dictation</h2>
    <div class="card">
      <p class="muted">Listen and type exactly what you hear. Accents count!</p>
      <div class="row"><button class="btn" id="play">▶️ Play</button><button class="btn ghost" id="slow">🐢 Slow</button></div>
      <textarea id="ans" rows="3" placeholder="Écris ici…" autocapitalize="sentences"></textarea>
      <button class="btn full" id="check">Check</button>
      <div id="res"></div>
    </div>
    ${needsKey() ? "" : `<button class="btn full ghost" id="ai-dict">✨ New AI sentences for my level</button>`}`;
    $("#play").onclick = () => speak(s);
    $("#slow").onclick = () => speak(s, { rate: 0.6 });
    setTimeout(() => speak(s), 300);
    $("#check").onclick = () => {
      const a = $("#ans").value;
      const sc = similarity(s, a);
      const exact = a.trim().replace(/\s+/g, " ") === s;
      total += sc;
      addXP(Math.round(sc / 25)); markDaily("listen");
      $("#res").innerHTML = `<div class="score ${sc >= 90 ? "good" : sc >= 60 ? "mid" : "low"}">${exact ? "100" : sc}%</div>
        <p><b>Correct:</b> ${esc(s)}</p>${diffWords(s, a)}
        <button class="btn full" id="nxt">Next →</button>`;
      $("#nxt").onclick = () => { i++; show(); };
    };
    $("#ai-dict") && ($("#ai-dict").onclick = async () => {
      $("#ai-dict").textContent = "…";
      try {
        const d = await askJSON(`Give 8 natural French dictation sentences for level ${level()} (toward B2), each 8–18 words, using: ${currentWeek().grammar.join(", ")}. Put each sentence in "question", leave options empty, answer 0, explanation = English translation.`, QUIZ_SCHEMA);
        list.splice(0, list.length, ...d.questions.map((q) => q.question));
        i = 0; show();
      } catch (e) { toast(e.message); }
    });
  };
  show();
}

function diffWords(expected, got) {
  const norm = (w) => w.toLowerCase().replace(/[.,!?;:«»"]/g, "");
  const g = new Set(got.split(/\s+/).map(norm));
  return `<p class="diff">${expected.split(/\s+/).map((w) => g.has(norm(w)) ? `<span class="okw">${esc(w)}</span>` : `<span class="badw">${esc(w)}</span>`).join(" ")}</p>`;
}

// ---------- writing ----------
const WRITING_PROMPTS = {
  A2: ["Décrivez votre journée typique (60–80 mots).", "Écrivez un message à un ami pour l'inviter à votre anniversaire.", "Racontez votre dernier week-end."],
  B1: ["Racontez un souvenir d'enfance important (120–150 mots).", "Donnez votre opinion : faut-il interdire les voitures en centre-ville ?", "Écrivez un e-mail pour vous plaindre d'un produit défectueux."],
  B2: ["Essai argumenté (250 mots) : Le télétravail est-il un progrès ?", "Lettre formelle au maire pour proposer un projet écologique.", "Article de blog : Les réseaux sociaux rendent-ils plus seul ?"],
};
function renderWrite() {
  const prompts = WRITING_PROMPTS[levelBucket()];
  view.innerHTML = `
  <h2>✍️ Writing</h2>
  <div class="card">
    <select id="w-prompt">${prompts.map((p) => `<option>${esc(p)}</option>`).join("")}<option value="free">Free topic</option></select>
    <textarea id="w-text" rows="9" placeholder="Écrivez votre texte en français…">${esc(sessionDraft())}</textarea>
    <p class="muted" id="w-count">0 words</p>
    <button class="btn full" id="w-send">Correct my text</button>
  </div>
  <div id="w-out"></div>`;
  const ta = $("#w-text");
  const count = () => ($("#w-count").textContent = (ta.value.trim().split(/\s+/).filter(Boolean).length) + " words");
  ta.oninput = () => { count(); try { sessionStorage.setItem("draft", ta.value); } catch { /* ignore */ } };
  count();
  $("#w-send").onclick = async () => {
    if (needsKey()) return ($("#w-out").innerHTML = keyNotice());
    const text = ta.value.trim();
    if (text.split(/\s+/).length < 10) return toast("Write at least 10 words.");
    $("#w-out").innerHTML = `<div class="card center"><div class="typing"></div><p class="muted">Correcting like a DELF examiner…</p></div>`;
    try {
      const r = await askJSON(`Task: "${$("#w-prompt").value}"\n\nMy text:\n${text}\n\nCorrect it like a DELF examiner. "corrected" = my text with every error fixed (keep my ideas). "errors" = each mistake: original fragment, fix, short reason in ${store.settings.supportLang}. "score" = 0-25 DELF-style grade for my target level. "level" = estimated CEFR level of this text. "feedback" = 3-4 sentences in ${store.settings.supportLang} on what to improve to reach B2. "upgrade" = the same text rewritten at a strong B2 level.`, WRITING_SCHEMA);
      store.progress.wordsWritten += text.split(/\s+/).length;
      r.errors.slice(0, 5).forEach((e) => addWeakPoint(e.why.slice(0, 70)));
      addXP(25); markDaily("write");
      $("#w-out").innerHTML = `
      <div class="card"><div class="row between"><h3>Score</h3><div class="pill big">${r.score}/25 · ${esc(r.level)}</div></div><p>${esc(r.feedback)}</p></div>
      <div class="card"><h3>Mistakes (${r.errors.length})</h3>${r.errors.map((e) => `<div class="err"><s>${esc(e.original)}</s> → <b>${esc(e.fix)}</b><br><span class="muted">${esc(e.why)}</span></div>`).join("") || "<p>✅ No mistakes!</p>"}</div>
      <div class="card"><div class="row between"><h3>Corrected</h3>${speakBtn(r.corrected)}</div><p>${esc(r.corrected)}</p></div>
      <div class="card accent"><div class="row between"><h3>B2 version</h3>${speakBtn(r.upgrade)}</div><p>${esc(r.upgrade)}</p></div>`;
    } catch (e) { $("#w-out").innerHTML = `<p class="error">${esc(e.message)}</p>`; }
  };
}
function sessionDraft() { try { return sessionStorage.getItem("draft") || ""; } catch { return ""; } }

// ---------- free chat (text or voice messages) ----------
function renderChat() {
  const p = me();
  view.innerHTML = `
  <div class="row between">
    <div class="row"><span class="avatar sm">${p.emoji}</span><div><b>${esc(p.name)}</b><br><span class="muted small">${esc(p.city)}</span></div></div>
    <div class="row"><a class="btn small" href="#call" id="chat-call">📞</a><button class="btn ghost small" id="clear">New chat</button></div>
  </div>
  ${needsKey() ? keyNotice() : ""}
  <div class="convo chat" id="convo"></div>
  <div class="composer">
    <label class="toggle"><input type="checkbox" id="autospeak" ${store.settings.autoSpeak ? "checked" : ""}> 🔊</label>
    <textarea id="msg" rows="1" placeholder="Écris en français… (or ask anything)"></textarea>
    ${canListen ? `<button class="mic" id="mic">🎙️</button>` : ""}
    <button class="send" id="send">➤</button>
  </div>`;
  $("#chat-call").onclick = () => unlockAudio();
  const convo = $("#convo");
  const bubble = (role, html) => { const d = document.createElement("div"); d.className = "bubble " + role; d.innerHTML = html; convo.appendChild(d); d.scrollIntoView({ block: "end" }); return d; };
  if (!store.chat.length) bubble("ai", renderAI(p.greeting) + speakBtn(p.greeting));
  store.chat.forEach((m) => bubble(m.role === "user" ? "user" : "ai", m.role === "user" ? esc(m.content) : renderAI(m.content) + speakBtn(m.content)));
  $("#autospeak").onchange = (e) => { store.settings.autoSpeak = e.target.checked; save(); };
  $("#clear").onclick = () => { store.chat = []; save(); renderChat(); };
  const send = async (text) => {
    if (!text || needsKey()) return;
    unlockAudio();
    bubble("user", esc(text));
    if (!store.chat.length) store.chat.push({ role: "user", content: "[Chat starts.]" }, { role: "assistant", content: p.greeting });
    store.chat.push({ role: "user", content: text });
    const b = bubble("ai", `<div class="typing"></div>`);
    const speaker = store.settings.autoSpeak ? createSpeaker({ gender: p.gender }) : null;
    let out = "";
    try {
      const history = store.chat.slice(-30);
      while (history[0]?.role !== "user") history.shift();
      const full = await streamReply(history, { onText: (t) => { out += t; speaker?.push(t); b.innerHTML = renderAI(out); b.scrollIntoView({ block: "end" }); } });
      speaker?.end();
      store.chat.push({ role: "assistant", content: full });
      b.insertAdjacentHTML("beforeend", speakBtn(full));
      save(); addXP(2); markDaily("chat");
    } catch (e) { speaker?.cancel(); b.innerHTML = `<span class="error">${esc(e.message)}</span>`; store.chat.pop(); }
  };
  const ta = $("#msg");
  ta.oninput = () => { ta.style.height = "auto"; ta.style.height = Math.min(120, ta.scrollHeight) + "px"; };
  ta.onkeydown = (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); $("#send").click(); } };
  $("#send").onclick = () => { const v = ta.value.trim(); ta.value = ""; ta.style.height = "auto"; send(v); };
  if ($("#mic")) {
    let rec = null;
    $("#mic").onclick = async () => {
      if (rec) return rec.stop();
      stopSpeaking();
      $("#mic").classList.add("on");
      rec = listen({ patient: true, onInterim: (t) => (ta.value = t) });
      try { const said = await rec.promise; if (said) { ta.value = ""; await send(said); } } catch (e) { toast(e.message); }
      rec = null; $("#mic")?.classList.remove("on");
    };
  }
}

// ---------- placement test ----------
const PLACEMENT_QS = [
  "Présente-toi : qui es-tu, que fais-tu dans la vie ?",
  "Raconte ce que tu as fait le week-end dernier.",
  "Que ferais-tu si tu gagnais un million d'euros ?",
  "Quel est ton avis sur les réseaux sociaux ? Justifie.",
  "Qu'est-ce que tu aurais fait différemment dans ta vie, si tu avais pu ?",
];
function renderPlacement() {
  if (needsKey()) { view.innerHTML = `<h2>🎯 Placement test</h2>${keyNotice()}<a class="btn" href="#home">Skip</a>`; return; }
  view.innerHTML = `<h2>🎯 Placement test</h2>
  <p class="muted">Answer in French as well as you can (type or 🎙️ speak). Don't use a translator — it's fine to make mistakes!</p>
  ${PLACEMENT_QS.map((q, k) => `<div class="card"><p><b>${k + 1}. ${esc(q)}</b> ${speakBtn(q)}</p>
    <div class="mic-row"><textarea data-pq="${k}" rows="3"></textarea>${canListen ? `<button class="mic" data-pm="${k}">🎙️</button>` : ""}</div></div>`).join("")}
  <button class="btn full" id="eval">Evaluate my level</button>
  <div id="p-out"></div>`;
  view.querySelectorAll("[data-pm]").forEach((b) => (b.onclick = async () => {
    const ta = view.querySelector(`[data-pq="${b.dataset.pm}"]`);
    b.classList.add("on");
    try { const s = await listen({ onInterim: (t) => (ta.value = t) }).promise; ta.value = s; } catch (e) { toast(e.message); }
    b.classList.remove("on");
  }));
  $("#eval").onclick = async () => {
    const answers = PLACEMENT_QS.map((q, k) => `Q: ${q}\nA: ${view.querySelector(`[data-pq="${k}"]`).value.trim() || "(no answer)"}`).join("\n\n");
    $("#p-out").innerHTML = `<div class="card center"><div class="typing"></div></div>`;
    try {
      const r = await askJSON(`Placement test. Evaluate the CEFR level of these answers precisely (grammar range & accuracy, vocabulary, coherence). Questions get progressively harder (present, past, conditional, opinion, si-clause type 3).\n\n${answers}\n\nReturn level, a 3-sentence summary in ${store.settings.supportLang}, and up to 6 specific weak grammar points.`, PLACEMENT_SCHEMA);
      store.progress.level = r.level;
      r.weakPoints.forEach(addWeakPoint);
      store.settings.onboarded = true; save();
      $("#p-out").innerHTML = `<div class="card accent center"><p class="muted">Your level</p><div class="big-emoji">${esc(r.level)}</div><p>${esc(r.summary)}</p>
        <p class="muted">Focus: ${r.weakPoints.map(esc).join(" · ")}</p><a class="btn" href="#home">Start my plan</a></div>`;
    } catch (e) { $("#p-out").innerHTML = `<p class="error">${esc(e.message)}</p>`; }
  };
}

// ---------- progress ----------
function renderProgress() {
  const p = store.progress;
  const days = Object.keys(p.minutes).sort().slice(-14);
  const max = Math.max(60, ...days.map((d) => p.minutes[d]));
  const known = Object.values(store.cards).filter((c) => c.interval >= 7).length;
  const total = Object.values(p.minutes).reduce((a, b) => a + b, 0);
  view.innerHTML = `
  <h2>📈 Progress</h2>
  <div class="stats">
    <div><b>${esc(p.level)}</b><span>level</span></div>
    <div><b>${p.streak}</b><span>streak</span></div>
    <div><b>${Math.round(total / 60)}h</b><span>studied</span></div>
  </div>
  <div class="stats">
    <div><b>${known}</b><span>words mastered</span></div>
    <div><b>${p.quiz.total ? Math.round((p.quiz.right / p.quiz.total) * 100) : 0}%</b><span>quiz accuracy</span></div>
    <div><b>${p.lessonsDone.length}/${Object.keys(GRAMMAR).length}</b><span>lessons</span></div>
  </div>
  <div class="card"><h3>Minutes per day (last 14)</h3>
    <div class="bars">${days.map((d) => `<div title="${d}: ${p.minutes[d]} min" style="height:${(p.minutes[d] / max) * 100}%"></div>`).join("") || "<p class='muted'>No data yet</p>"}</div>
    <p class="muted">Target: 150 min/day for the 60-day fast track.</p>
  </div>
  <div class="card"><h3>Weak points to review</h3>${p.weakPoints.length ? `<ul>${p.weakPoints.slice(-12).reverse().map((w) => `<li>${esc(w)}</li>`).join("")}</ul><a class="btn ghost" href="#quiz">Quiz my weak points</a>` : "<p class='muted'>None yet — keep practising!</p>"}</div>
  <div class="card"><h3>Change level</h3>
    <select id="lvl">${["A1", "A2", "A2+", "B1", "B1+", "B2-", "B2"].map((l) => `<option ${l === p.level ? "selected" : ""}>${l}</option>`).join("")}</select>
    <a class="btn ghost" href="#placement">Retake placement test</a>
  </div>`;
  $("#lvl").onchange = (e) => { p.level = e.target.value; save(); toast("Level updated"); };
}

// ---------- more / settings ----------
function renderMore() {
  view.innerHTML = `<h2>More</h2>
  <div class="grid">
    ${[["tcf", "🎯", "TCF prep"], ["learn", "📚", "Curriculum"], ["tcf/link", "🌐", "Learn from a link"], ["cards", "🧠", "Flashcards"], ["quiz", "📝", "Quiz"], ["read", "📖", "Reading"], ["listen", "🎧", "Dictation"], ["write", "✍️", "Writing"], ["progress", "📈", "Progress"], ["placement", "🎯", "Level test"], ["settings", "⚙️", "Settings"]]
      .map(([h, i, t]) => `<a class="tile" href="#${h}"><span>${i}</span>${t}</a>`).join("")}
  </div>`;
}

function renderSettings() {
  const s = store.settings;
  view.innerHTML = `<h2>⚙️ Settings</h2>
  <div class="card">
    <label>Anthropic API key</label>
    <input id="s-key" type="password" value="${esc(s.apiKey)}" placeholder="sk-ant-..." autocomplete="off">
    <p class="muted small">Stored only on this device. Get one at console.anthropic.com → API Keys. Set a monthly spend limit there.</p>
    <label>AI model</label>
    <select id="s-model">
      ${[["claude-opus-5-5", "Claude Opus 5.5 — best teacher"], ["claude-sonnet-5-5", "Claude Sonnet 5.5 — faster, cheaper"], ["claude-haiku-5-5", "Claude Haiku 5.5 — fastest, cheapest"]].map(([v, l]) => `<option value="${v}" ${s.model === v ? "selected" : ""}>${l}</option>`).join("")}
    </select>
    <label>Response depth</label>
    <select id="s-effort">${[["low", "Quick (best for conversation)"], ["medium", "Balanced"], ["high", "Thorough"]].map(([v, l]) => `<option value="${v}" ${s.effort === v ? "selected" : ""}>${l}</option>`).join("")}</select>
    <label>Explanations in</label>
    <select id="s-lang">${["English", "Spanish", "Portuguese", "German", "Italian", "Arabic", "Chinese", "Hindi"].map((l) => `<option ${s.supportLang === l ? "selected" : ""}>${l}</option>`).join("")}</select>
    <label>Voice speed: <span id="rate-v">${s.voiceRate}</span></label>
    <input id="s-rate" type="range" min="0.5" max="1.2" step="0.05" value="${s.voiceRate}">
    <div class="row"><button class="btn" id="s-save">Save</button><button class="btn ghost" id="s-test">🔊 Test voice</button></div>
  </div>
  <div class="card">
    <h3>Your French local</h3>
    <div class="personas">${PERSONAS.map((x) => `<label class="persona ${x.id === s.persona ? "sel" : ""}"><input type="radio" name="s-persona" value="${x.id}" ${x.id === s.persona ? "checked" : ""}><span class="avatar sm">${x.emoji}</span><span><b>${esc(x.name)}</b> · ${esc(x.city)}<br><span class="muted small">${esc(x.tagline)}</span></span></label>`).join("")}</div>
    <label>Corrections during calls</label>
    <select id="s-corr">${[["live", "Out loud, like a friend would (recommended)"], ["screen", "On screen only — don't interrupt me"]].map(([v, l]) => `<option value="${v}" ${s.correctionMode === v ? "selected" : ""}>${l}</option>`).join("")}</select>
    <label>Pause before it's their turn to talk</label>
    <select id="s-pat">${[["short", "Short (1 s)"], ["medium", "Medium (2 s)"], ["long", "Long (3.5 s) — I need time to think"]].map(([v, l]) => `<option value="${v}" ${s.patience === v ? "selected" : ""}>${l}</option>`).join("")}</select>
    <label>Voice</label>
    <select id="s-voice"><option value="">Auto (best French voice for the person)</option>${frenchVoices().map((v) => `<option ${s.voiceName === v.name ? "selected" : ""}>${esc(v.name)}</option>`).join("")}</select>
    <p class="muted small">Robotic voice? iPhone: Settings → Accessibility → Spoken Content → Voices → French → download an "Enhanced" or "Premium" voice. Android: install "Speech Services by Google" and download French (France).</p>
  </div>
  <div class="card">
    <h3>Data</h3>
    <button class="btn ghost" id="s-export">Export progress</button>
    <button class="btn bad" id="s-reset">Reset everything</button>
  </div>`;
  $("#s-rate").oninput = (e) => ($("#rate-v").textContent = e.target.value);
  const pickedPersona = () => getPersona(view.querySelector("[name=s-persona]:checked")?.value);
  view.querySelectorAll("[name=s-persona]").forEach((r) => (r.onchange = () => {
    view.querySelectorAll(".persona").forEach((l) => l.classList.toggle("sel", l.contains(r) && r.checked));
  }));
  $("#s-test").onclick = () => {
    const prev = s.voiceName; s.voiceName = $("#s-voice").value;
    speak(pickedPersona().greeting, { rate: +$("#s-rate").value, gender: pickedPersona().gender });
    s.voiceName = prev;
  };
  $("#s-save").onclick = () => {
    if (pickedPersona().id !== s.persona) store.chat = [];
    Object.assign(s, { apiKey: $("#s-key").value.trim(), model: $("#s-model").value, effort: $("#s-effort").value, supportLang: $("#s-lang").value, voiceRate: +$("#s-rate").value, onboarded: true,
      persona: pickedPersona().id, correctionMode: $("#s-corr").value, patience: $("#s-pat").value, voiceName: $("#s-voice").value });
    save(); toast("Saved ✔");
  };
  $("#s-export").onclick = () => {
    const data = { ...store, settings: { ...store.settings, apiKey: "" } };
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
    a.download = `french-progress-${today()}.json`; a.click();
  };
  $("#s-reset").onclick = () => confirm("Delete all progress and settings?") && resetAll();
}

// ---------- boot ----------
if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => {});
route();
