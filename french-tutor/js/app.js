import { WEEKS, GRAMMAR, VOCAB, QUIZ, READINGS, SENTENCES, DAILY_PLAN } from "./curriculum.js";
import { store, save, today, addXP, markDaily, addMinutes, addWeakPoint, resetAll, cardState, reviewCard } from "./store.js";
import { streamReply, askJSON, dayNumber, currentWeek, systemPrompt, QUIZ_SCHEMA, READING_SCHEMA, PLACEMENT_SCHEMA, WRITING_SCHEMA } from "./tutor.js";
import { speak, stopSpeaking, listen, canListen, canSpeak, similarity, missedWords } from "./speech.js";

const $ = (s, el = document) => el.querySelector(s);
const view = $("#view");

// ---------- helpers ----------
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
function md(s) {
  return esc(s)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[^*])\*(?!\s)(.+?)\*(?!\*)/g, "$1<em>$2</em>")
    .replace(/^#{1,3} (.+)$/gm, "<h4>$1</h4>")
    .replace(/^[-•] (.+)$/gm, "<li>$1</li>")
    .replace(/\n/g, "<br>");
}
function toast(msg) {
  const t = $("#toast");
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(t._h);
  t._h = setTimeout(() => t.classList.remove("show"), 2600);
}
const speakBtn = (text) => canSpeak ? `<button class="icon-btn say" data-say="${esc(text)}" aria-label="Listen">🔊</button>` : "";
const level = () => store.progress.level;
const levelBucket = () => (level().startsWith("B2") ? "B2" : level().startsWith("B1") ? "B1" : "A2");
const shuffle = (a) => a.map((v) => [Math.random(), v]).sort((x, y) => x[0] - y[0]).map((x) => x[1]);
const needsKey = () => !store.settings.apiKey;
const keyNotice = () => `<div class="notice">🔑 The AI tutor needs your Anthropic API key. <a href="#settings">Add it in Settings</a>. Offline exercises still work.</div>`;

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
  progress: renderProgress, settings: renderSettings, placement: renderPlacement, more: renderMore,
};
function route() {
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
    <p>I'm <b>Madame Claire</b>, your personal French teacher. Our goal: <b>A2 → B2 in 60 days</b>.</p>
  </section>
  <div class="card">
    <h3>How it works</h3>
    <ul class="checks">
      <li>📅 A 60-day plan: 8 weeks of grammar, vocabulary and themes</li>
      <li>🧠 Flashcards that repeat words right before you'd forget them</li>
      <li>🗣️ Spoken conversations — I listen, correct and answer out loud</li>
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
  const due = VOCAB.filter(([fr]) => { const c = store.cards[fr]; return c && c.due <= Date.now(); }).length;
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
  <div class="card accent">
    <p class="muted">This week · ${esc(wk.level)}</p>
    <h3>${esc(wk.title)}</h3>
    <p>${esc(wk.goal)}</p>
    <p class="muted">🎤 Speaking challenge: ${esc(wk.speaking)}</p>
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
}

const TIPS = [
  "Speak out loud every day, even alone. Fluency is a physical skill.",
  "Change your phone language to French — free immersion all day.",
  "Learn words in chunks: not 'besoin' but 'j'ai besoin de…'.",
  "Shadowing: play a sentence, then repeat it immediately copying the rhythm.",
  "Watch French series with French subtitles (try 'Lupin', 'Dix pour cent', 'Call My Agent').",
  "Podcasts: 'InnerFrench', 'Français Authentique', 'Journal en français facile' (RFI).",
  "Think in French: describe what you're doing in your head.",
  "Mistakes are data. Every correction from Madame Claire is a free lesson.",
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
  const due = VOCAB.filter(([fr]) => store.cards[fr] && store.cards[fr].due <= now);
  const newToday = Object.values(store.cards).filter((c) => c.firstSeen === today()).length;
  const allowedLevels = ["A2", "B1", "B2"].slice(0, ["A2", "B1", "B2"].indexOf(levelBucket()) + 2);
  const fresh = VOCAB.filter(([fr, , lv]) => !store.cards[fr] && allowedLevels.includes(lv)).slice(0, Math.max(0, 20 - newToday));
  const queue = shuffle([...due, ...fresh]);
  const learned = Object.values(store.cards).filter((c) => c.interval >= 7).length;
  let i = 0, flipped = false, reviewed = 0;

  const show = () => {
    if (i >= queue.length) {
      if (reviewed) { markDaily("srs"); addXP(reviewed); }
      view.innerHTML = `<h2>🧠 Flashcards</h2>
        <div class="card center"><div class="big-emoji">🎉</div><h3>All done for now!</h3>
        <p>${reviewed} cards reviewed · ${learned} words in long-term memory · ${VOCAB.length} in deck</p>
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
    $("#quiz").innerHTML = `<div class="card center"><div class="typing"></div><p class="muted">Madame Claire is writing your quiz…</p></div>`;
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
const SCENARIOS = [
  ["☕ Au café", "You are a waiter in a Parisian café. Take my order, make small talk, and handle a small problem (wrong order)."],
  ["🏠 Chercher un appartement", "You are a landlord. I am calling to visit an apartment. Ask and answer realistic questions."],
  ["💼 Entretien d'embauche", "You are a recruiter conducting a job interview in French. Ask one question at a time, B1–B2 level."],
  ["🩺 Chez le médecin", "You are a doctor. I'm a patient explaining symptoms. Ask follow-up questions."],
  ["🗣️ Débat", "Lead a friendly debate with me on a current social topic of your choice. Challenge my arguments and make me justify them."],
  ["🎓 DELF B2 oral", "Simulate the DELF B2 oral exam: give me a short article summary prompt, let me present my point of view, then ask probing examiner questions. At the end, grade me /25 with specific feedback."],
  ["🧳 Raconter un voyage", "Ask me about my last trip and make me use passé composé and imparfait correctly."],
  ["🎤 Défi de la semaine", null],
];

function renderSpeak() {
  view.innerHTML = `
  <h2>🗣️ Speaking</h2>
  ${!canListen ? `<div class="notice">Your browser doesn't support speech recognition. Use Chrome (Android) or Safari (iPhone). You can still type.</div>` : ""}
  <div class="card">
    <h3>Pronunciation drill</h3>
    <p class="muted">Listen, repeat, get a score.</p>
    <button class="btn full" id="drill">Start drill (${levelBucket()})</button>
  </div>
  <div class="card">
    <h3>Role-play conversation</h3>
    <p class="muted">Talk with Madame Claire by voice. She corrects you and answers out loud.</p>
    <div class="scenarios">${SCENARIOS.map(([t], k) => `<button class="chip" data-s="${k}">${esc(t)}</button>`).join("")}</div>
  </div>
  <div id="speak-area"></div>`;
  $("#drill").onclick = pronunciationDrill;
  view.querySelectorAll("[data-s]").forEach((b) => (b.onclick = () => {
    const [title, prompt] = SCENARIOS[+b.dataset.s];
    voiceConversation(title, prompt || `Help me complete this week's speaking challenge: "${currentWeek().speaking}". Guide me step by step, ask questions to keep me talking, and give feedback at the end.`);
  }));
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

function voiceConversation(title, scenario) {
  if (needsKey()) { $("#speak-area").innerHTML = keyNotice(); return; }
  const msgs = [];
  const sys = systemPrompt(`\nYou are now in a spoken role-play: ${scenario}\nThis is SPOKEN conversation: keep each reply to 1–3 short sentences, natural spoken French, no markdown headings. Put the correction block first (short), then your in-character reply.`);
  const area = $("#speak-area");
  area.innerHTML = `<div class="card">
    <div class="row between"><h3>${esc(title)}</h3><button class="btn ghost small" id="end">End</button></div>
    <div class="convo" id="convo"></div>
    <div class="mic-row">
      <input id="typed" placeholder="…or type here">
      <button class="mic" id="mic" aria-label="Speak">🎙️</button>
    </div></div>`;
  area.scrollIntoView({ behavior: "smooth" });
  const convo = $("#convo");
  const bubble = (role, html) => { const d = document.createElement("div"); d.className = "bubble " + role; d.innerHTML = html; convo.appendChild(d); d.scrollIntoView({ block: "end" }); return d; };

  const send = async (text) => {
    if (text) { bubble("user", esc(text)); msgs.push({ role: "user", content: text }); store.progress.speakingTurns++; }
    else msgs.push({ role: "user", content: "Start the role-play now. Greet me and ask the first question." });
    const b = bubble("ai", `<div class="typing"></div>`);
    let out = "";
    try {
      const full = await streamReply(msgs, { system: sys, onText: (t) => { out += t; b.innerHTML = md(out); }, maxTokens: 2000 });
      msgs.push({ role: "assistant", content: full });
      b.insertAdjacentHTML("beforeend", speakBtn(full));
      addXP(3); markDaily("speak");
      await speak(spokenPart(full));
    } catch (e) { b.innerHTML = `<span class="error">${esc(e.message)}</span>`; msgs.pop(); }
  };

  let rec = null;
  $("#mic").onclick = async () => {
    if (rec) { rec.stop(); return; }
    stopSpeaking();
    const mic = $("#mic");
    mic.classList.add("on");
    const live = bubble("user live", "…");
    rec = listen({ onInterim: (t) => (live.textContent = t) });
    try {
      const said = await rec.promise;
      live.remove();
      if (said) await send(said);
    } catch (e) { live.innerHTML = `<span class="error">${esc(e.message)}</span>`; }
    rec = null; mic.classList.remove("on");
  };
  $("#typed").onkeydown = (e) => { if (e.key === "Enter" && e.target.value.trim()) { const v = e.target.value.trim(); e.target.value = ""; send(v); } };
  $("#end").onclick = async () => {
    if (msgs.length < 2) { area.innerHTML = ""; return; }
    const b = bubble("ai", `<div class="typing"></div>`);
    let out = "";
    try {
      await streamReply([...msgs, { role: "user", content: `End of role-play. In ${store.settings.supportLang}, give me feedback: overall level estimate, my 3 most important recurring mistakes with corrections, 5 useful expressions I should have used, and one sentence of encouragement. Then on the last line write "WEAK:" followed by my weak grammar points separated by semicolons.` }],
        { system: sys, onText: (t) => { out += t; b.innerHTML = md(out.replace(/WEAK:.*$/s, "")); }, maxTokens: 3000 });
      const weak = out.match(/WEAK:(.*)$/s);
      if (weak) weak[1].split(";").map((s) => s.trim()).filter(Boolean).forEach(addWeakPoint);
      addXP(15);
    } catch (e) { b.innerHTML = `<span class="error">${esc(e.message)}</span>`; }
  };
  send(null);
}

// Speak the in-character reply, not the correction notes in the support language.
function spokenPart(text) {
  const lines = text.split("\n").filter((l) => !/^\s*(✏️|💡)/.test(l));
  return lines.join(" ").replace(/✅\s*Parfait\s*!?/i, "Parfait !");
}

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

// ---------- free chat ----------
function renderChat() {
  view.innerHTML = `
  <div class="row between"><h2>💬 Madame Claire</h2><button class="btn ghost small" id="clear">New chat</button></div>
  ${needsKey() ? keyNotice() : ""}
  <div class="convo chat" id="convo"></div>
  <div class="composer">
    <label class="toggle"><input type="checkbox" id="autospeak" ${store.settings.autoSpeak ? "checked" : ""}> 🔊</label>
    <textarea id="msg" rows="1" placeholder="Écris en français… (or ask anything)"></textarea>
    ${canListen ? `<button class="mic" id="mic">🎙️</button>` : ""}
    <button class="send" id="send">➤</button>
  </div>`;
  const convo = $("#convo");
  const bubble = (role, html) => { const d = document.createElement("div"); d.className = "bubble " + role; d.innerHTML = html; convo.appendChild(d); d.scrollIntoView({ block: "end" }); return d; };
  if (!store.chat.length) bubble("ai", md("Bonjour ! 😊 Je suis **Madame Claire**. On peut parler de tout : ta journée, tes passions, ou une question de grammaire. **Alors, comment ça va aujourd'hui ?**"));
  store.chat.forEach((m) => bubble(m.role === "user" ? "user" : "ai", m.role === "user" ? esc(m.content) : md(m.content) + speakBtn(m.content)));
  $("#autospeak").onchange = (e) => { store.settings.autoSpeak = e.target.checked; save(); };
  $("#clear").onclick = () => { store.chat = []; save(); renderChat(); };
  const send = async (text) => {
    if (!text || needsKey()) return;
    bubble("user", esc(text));
    store.chat.push({ role: "user", content: text });
    const b = bubble("ai", `<div class="typing"></div>`);
    let out = "";
    try {
      const history = store.chat.slice(-30);
      while (history[0]?.role !== "user") history.shift();
      const full = await streamReply(history, { onText: (t) => { out += t; b.innerHTML = md(out); b.scrollIntoView({ block: "end" }); } });
      store.chat.push({ role: "assistant", content: full });
      b.insertAdjacentHTML("beforeend", speakBtn(full));
      save(); addXP(2); markDaily("chat");
      if (store.settings.autoSpeak) speak(spokenPart(full));
    } catch (e) { b.innerHTML = `<span class="error">${esc(e.message)}</span>`; store.chat.pop(); }
  };
  const ta = $("#msg");
  ta.oninput = () => { ta.style.height = "auto"; ta.style.height = Math.min(120, ta.scrollHeight) + "px"; };
  ta.onkeydown = (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); $("#send").click(); } };
  $("#send").onclick = () => { const v = ta.value.trim(); ta.value = ""; ta.style.height = "auto"; send(v); };
  if ($("#mic")) {
    let rec = null;
    $("#mic").onclick = async () => {
      if (rec) return rec.stop();
      $("#mic").classList.add("on");
      rec = listen({ onInterim: (t) => (ta.value = t) });
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
    ${[["cards", "🧠", "Flashcards"], ["quiz", "📝", "Quiz"], ["read", "📖", "Reading"], ["listen", "🎧", "Dictation"], ["write", "✍️", "Writing"], ["progress", "📈", "Progress"], ["placement", "🎯", "Level test"], ["settings", "⚙️", "Settings"]]
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
    <h3>Data</h3>
    <button class="btn ghost" id="s-export">Export progress</button>
    <button class="btn bad" id="s-reset">Reset everything</button>
  </div>`;
  $("#s-rate").oninput = (e) => ($("#rate-v").textContent = e.target.value);
  $("#s-test").onclick = () => speak("Bonjour ! Je suis Madame Claire, ta professeure de français.", { rate: +$("#s-rate").value });
  $("#s-save").onclick = () => {
    Object.assign(s, { apiKey: $("#s-key").value.trim(), model: $("#s-model").value, effort: $("#s-effort").value, supportLang: $("#s-lang").value, voiceRate: +$("#s-rate").value, onboarded: true });
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
