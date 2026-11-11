// TCF exam preparation: format, practice, timed mock exams, scoring, and learning from websites.

import { store, save, today, addXP, markDaily, addWeakPoint } from "./store.js";
import { askJSON, streamReply, currentWeek, TRUSTED_SITES } from "./tutor.js";
import { speak, stopSpeaking, unlockAudio } from "./speech.js";
import { $, view, esc, md, toast, speakBtn, level, needsKey, keyNotice, fmtTime, bus } from "./ui.js";

// ---------- official format ----------
// Source: France Éducation International (TCF Canada & TCF tout public pages).
export const VARIANTS = {
  canada: {
    name: "TCF Canada",
    tests: { CO: { n: 39, min: 35 }, CE: { n: 39, min: 60 }, EE: { min: 60 }, EO: { min: 12 } },
  },
  tp: {
    name: "TCF tout public",
    tests: { CO: { n: 29, min: 25 }, ST: { n: 18, min: 15 }, CE: { n: 29, min: 45 }, EE: { min: 60 }, EO: { min: 12 } },
  },
};
export const variant = () => VARIANTS[store.settings.tcfVariant] || VARIANTS.canada;

const TESTS = {
  CO: { name: "Compréhension orale", en: "Listening", icon: "🎧", kind: "mcq" },
  ST: { name: "Maîtrise des structures de la langue", en: "Grammar & vocabulary", icon: "🧩", kind: "mcq" },
  CE: { name: "Compréhension écrite", en: "Reading", icon: "📖", kind: "mcq" },
  EE: { name: "Expression écrite", en: "Writing", icon: "✍️", kind: "ee" },
  EO: { name: "Expression orale", en: "Speaking", icon: "🗣️", kind: "eo" },
};

const LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"];
const WEIGHT = { A1: 3, A2: 9, B1: 15, B2: 21, C1: 26, C2: 33 }; // harder questions are worth more

// Level mix of a full test (questions get harder as the test goes on).
function fullMix(n) {
  const base = n >= 39 ? [4, 6, 10, 10, 5, 4] : n >= 29 ? [3, 5, 7, 7, 4, 3] : [2, 3, 4, 4, 3, 2];
  return LEVELS.flatMap((l, i) => Array(base[i]).fill(l));
}
// Practice set centred on the learner's level, pushing toward B2.
function practiceMix(n = 10) {
  const l = level();
  const mix = l.startsWith("B2") ? [0, 1, 3, 4, 2, 0] : l.startsWith("B1") ? [0, 2, 4, 3, 1, 0] : [1, 4, 3, 2, 0, 0];
  const out = LEVELS.flatMap((lv, i) => Array(mix[i]).fill(lv));
  return out.slice(0, n);
}

export function score699(items, answers) {
  const max = items.reduce((a, it) => a + (WEIGHT[it.level] || 0), 0) || 1;
  const got = items.reduce((a, it, i) => a + (answers[i] === it.answer ? WEIGHT[it.level] || 0 : 0), 0);
  return Math.round((got / max) * 699);
}
export function cefr699(s) {
  return s <= 100 ? "A1 non atteint" : s < 200 ? "A1" : s < 300 ? "A2" : s < 400 ? "B1" : s < 500 ? "B2" : s < 600 ? "C1" : "C2";
}
export function cefr20(n) {
  return n <= 0 ? "A1 non atteint" : n === 1 ? "A1" : n <= 5 ? "A2" : n <= 9 ? "B1" : n <= 13 ? "B2" : n <= 17 ? "C1" : "C2";
}

function results() {
  return (store.progress.tcf ||= { CO: [], CE: [], ST: [], EE: [], EO: [] });
}
function record(test, entry) {
  const r = results();
  (r[test] ||= []).push({ date: today(), ...entry });
  if (r[test].length > 50) r[test].shift();
  save();
}
function latest(test) {
  const r = results()[test] || [];
  return r[r.length - 1];
}

// ---------- writing & speaking task formats ----------
export const EE_TASKS = [
  { id: 1, title: "Tâche 1 : rédiger un message", min: 60, max: 120, desc: "Write a message (e-mail, note, post) to describe, tell or explain something to one or more people." },
  { id: 2, title: "Tâche 2 : rédiger un article / un récit", min: 120, max: 150, desc: "Write an article, blog post or letter for readers, telling about an experience or event and giving your impressions." },
  { id: 3, title: "Tâche 3 : comparer deux points de vue", min: 120, max: 180, desc: "Read two short documents with opposite opinions. Part 1: sum up both points of view (40–60 words). Part 2: give and justify your own opinion (80–120 words)." },
];

const EE_BANK = [
  {
    1: "Vous venez d'emménager dans un nouvel appartement. Écrivez un message à un ami pour lui décrire votre logement et votre quartier, et l'inviter à venir vous voir.",
    2: "Vous avez participé à un événement culturel (festival, concert, exposition). Écrivez un article pour le blog de votre ville : racontez cette expérience et donnez vos impressions.",
    3: { theme: "Le télétravail", docA: "« Depuis que je travaille de chez moi trois jours par semaine, je gagne deux heures par jour et je suis beaucoup moins stressée. Mon entreprise y gagne aussi : je suis plus productive. » — Sarah, 34 ans", docB: "« Le télétravail isole les salariés. On perd l'esprit d'équipe, les échanges spontanés, et la frontière entre vie privée et vie professionnelle disparaît. » — Marc, 47 ans" },
  },
  {
    1: "Vous ne pouvez pas aller au rendez-vous prévu avec votre collègue demain. Écrivez-lui un message pour vous excuser, expliquer pourquoi et proposer une autre date.",
    2: "Vous avez fait un voyage qui vous a marqué. Écrivez un article pour un magazine de voyage : racontez votre séjour et dites ce que vous avez appris.",
    3: { theme: "Les écrans et les enfants", docA: "« Les tablettes permettent aux enfants d'apprendre en s'amusant. Bien utilisées, elles développent la curiosité et préparent au monde de demain. » — Julie, enseignante", docB: "« Trop d'écrans nuit au sommeil, à la concentration et aux relations. Avant 10 ans, les enfants ont surtout besoin de jouer dehors et de parler avec des adultes. » — Dr Bernard, pédiatre" },
  },
  {
    1: "Vous organisez une fête pour l'anniversaire d'un ami. Écrivez un message aux invités pour donner les informations (date, lieu, programme) et leur demander de participer au cadeau.",
    2: "Votre ville a ouvert un nouveau lieu (parc, médiathèque, salle de sport). Écrivez un article pour le journal local : décrivez ce lieu, votre première visite et votre avis.",
    3: { theme: "Interdire la voiture en centre-ville", docA: "« Sans voitures, le centre-ville devient plus calme, moins pollué et plus agréable pour les piétons et les commerces. » — Association Ville Verte", docB: "« Interdire la voiture pénalise les personnes âgées, les familles et ceux qui habitent loin, mal desservis par les transports en commun. » — Collectif des habitants de banlieue" },
  },
];

export const EO_TASKS = [
  { id: 1, title: "Tâche 1 : entretien dirigé", time: 120, prep: 0, desc: "No preparation · 2 min. The examiner asks you about yourself: family, work or studies, hobbies, city, plans." },
  { id: 2, title: "Tâche 2 : exercice en interaction", time: 210, prep: 120, desc: "2 min preparation + 3 min 30. You get a situation and YOU must ask the examiner questions to get information." },
  { id: 3, title: "Tâche 3 : expression d'un point de vue", time: 270, prep: 0, desc: "No preparation · 4 min 30. You give and defend your opinion on a subject; the examiner may push back." },
];

const EO_BANK = {
  2: [
    { situation: "Vous voulez vous inscrire dans une salle de sport près de chez vous. Vous posez des questions à l'employé (horaires, prix, activités, conditions d'inscription…).", role: "l'employé(e) de l'accueil de la salle de sport Forme+ (tarifs : 35 €/mois sans engagement, 29 €/mois avec un an d'engagement ; ouvert de 6 h à 23 h ; cours collectifs de yoga, boxe, pilates, natation ; frais d'inscription 20 € ; certificat médical conseillé)" },
    { situation: "Vous cherchez une colocation. Vous appelez la personne qui a publié l'annonce pour avoir des informations sur l'appartement et les colocataires.", role: "une personne qui propose une chambre en colocation à Lyon (550 € charges comprises, 3 colocataires étudiants et jeunes actifs, appartement de 90 m², près du métro, disponible le 1er du mois, pas d'animaux)" },
    { situation: "Vous voulez partir en week-end. Vous êtes dans une agence de voyages et vous posez des questions sur une offre « 3 jours à Bordeaux ».", role: "un(e) conseiller(ère) d'une agence de voyages qui vend un week-end de 3 jours à Bordeaux (train + hôtel 3 étoiles + visite d'un château viticole, 320 € par personne, départ le vendredi, petit-déjeuner inclus, annulation gratuite jusqu'à 7 jours avant)" },
  ],
  3: [
    "« Les réseaux sociaux rapprochent les gens. » Qu'en pensez-vous ?",
    "« Il vaut mieux vivre à la campagne qu'en ville. » Êtes-vous d'accord ?",
    "« Apprendre une langue étrangère est indispensable aujourd'hui. » Qu'en pensez-vous ?",
    "« Le travail est la chose la plus importante dans la vie. » Partagez-vous cette opinion ?",
    "« Les voyages forment la jeunesse. » Êtes-vous d'accord ?",
  ],
};

// ---------- built-in method lessons ----------
const METHOD = {
  CO: `**Format:** multiple choice (4 options, 1 correct). Short recordings: announcements, messages, conversations, interviews, radio excerpts. Questions get harder as you go (A1 → C2), and harder questions are worth more points.

**Strategy**
- Read the question and options BEFORE the recording starts, and predict what you'll hear.
- First listen for the general idea: who is speaking, where, why.
- Watch out for distractors: words that are heard in the recording are often in the WRONG options.
- Numbers, times and prices: write them down as you hear them.
- Don't stay stuck: if you missed it, choose, move on, and save your concentration for the high-value questions.
- Every day: 15 min of RFI "Journal en français facile" plus a dictation.`,
  CE: `**Format:** multiple choice (4 options). Documents get longer and harder: signs and ads → e-mails → press articles → opinion pieces and literary excerpts. Harder questions are worth more points.

**Strategy**
- Read the question first, then scan the text for the answer (skimming and scanning).
- The correct option usually PARAPHRASES the text (synonyms); options that copy the text's words are often traps.
- Pay attention to connectors (cependant, pourtant, donc, en revanche) and negations.
- Time management: about 1 min per easy question and 2–3 min for B2–C2 texts. Never leave a blank, because there's no penalty.
- Every day: one article on 1jour1actu (A2–B1) or franceinfo (B2).`,
  ST: `**Format (TCF tout public only):** 18 multiple-choice questions in 15 min on grammar and vocabulary in context.

**Strategy**
- Look at the whole sentence: agreement, tense, mood (subjunctive after "il faut que", "bien que").
- Check the connector logic (cause, opposition, consequence).
- Trust your ear: say the sentence in your head with each option.`,
  EE: `**Format:** 3 tasks in 60 min. Respect the word counts: **if the minimum isn't reached, the task gets "A1 non atteint"**.
- **Task 1** (60–120 words): a message. Use the right register (tu/vous), greeting, sign-off, and answer ALL the points in the instructions.
- **Task 2** (120–150 words): an article or story. Narration with passé composé and imparfait, impressions, a catchy title.
- **Task 3** (120–180 words): part 1 sums up the TWO points of view neutrally (40–60 words), part 2 gives YOUR opinion with arguments and an example (80–120 words).

**Graded on:** completing the task, coherence (connectors), range and accuracy of vocabulary, grammar.
**Timing:** about 10 min for T1, 20 min for T2, 25 min for T3, and 5 min to proofread (agreements, accents, tenses).`,
  EO: `**Format:** face-to-face with an examiner, 12 minutes, 3 tasks.
- **Task 1, guided interview (no preparation):** talk about yourself and develop your answers (don't just say "oui", explain and give examples).
- **Task 2, interaction (with 2 min preparation):** YOU ask the questions. Prepare 8–10 varied questions: Quel est… ? Est-ce que… ? Combien… ? Pourriez-vous… ? Use the polite form (vous) and react to the answers.
- **Task 3, point of view:** give a clear opinion, 2–3 arguments with connectors (d'abord, ensuite, de plus, cependant, en conclusion), a personal example, and nuance.

**Graded on:** task completion, fluency, coherence, vocabulary, grammar, pronunciation.
**Train with:** daily calls with your local friend plus a timed TCF task.`,
};

// ---------- trusted resources ----------
export const RESOURCES = [
  { name: "France Éducation International: TCF official", url: "https://www.france-education-international.fr/test/tcf-canada", what: "Official format and sample tests (the site may block automatic reading; open it yourself)", skills: "all" },
  { name: "RFI: Français facile / Journal en français facile", url: "https://francaisfacile.rfi.fr/fr/", what: "News in simple French with transcripts and exercises", skills: "CO · CE" },
  { name: "TV5Monde: Apprendre le français", url: "https://apprendre.tv5monde.com/fr", what: "Videos and exercises by level, A1 to C1", skills: "CO · CE" },
  { name: "1jour1actu", url: "https://www.1jour1actu.com/", what: "Easy news articles (A2–B1)", skills: "CE · EO" },
  { name: "franceinfo", url: "https://www.francetvinfo.fr/", what: "Real French news (B2+)", skills: "CE · EE · EO" },
  { name: "Podcast Français Facile", url: "https://www.podcastfrancaisfacile.com/", what: "Dialogues, dictations and TCF/DELF-style practice", skills: "CO · CE" },
  { name: "Bonjour de France", url: "https://www.bonjourdefrance.com/", what: "Graded exercises and tests", skills: "CE · ST" },
  { name: "Le Point du FLE", url: "https://www.lepointdufle.net/", what: "Thousands of grammar and vocabulary exercises", skills: "ST" },
];

// ---------- JSON schemas ----------
const opt4 = { type: "array", items: { type: "string" } };
const ITEM_BASE = {
  level: { type: "string", enum: LEVELS },
  question: { type: "string" },
  options: opt4,
  answer: { type: "integer" },
  explanation: { type: "string" },
};
const CE_ITEM = {
  type: "object", additionalProperties: false,
  required: ["level", "doc_type", "document", "question", "options", "answer", "explanation"],
  properties: { ...ITEM_BASE, doc_type: { type: "string" }, document: { type: "string" } },
};
const CO_ITEM = {
  type: "object", additionalProperties: false,
  required: ["level", "context", "script", "question", "options", "answer", "explanation"],
  properties: {
    ...ITEM_BASE,
    context: { type: "string" },
    script: {
      type: "array",
      items: {
        type: "object", additionalProperties: false, required: ["speaker", "gender", "text"],
        properties: { speaker: { type: "string" }, gender: { type: "string", enum: ["male", "female"] }, text: { type: "string" } },
      },
    },
  },
};
const ST_ITEM = { type: "object", additionalProperties: false, required: ["level", "question", "options", "answer", "explanation"], properties: ITEM_BASE };
const ITEM_SCHEMA = { CE: CE_ITEM, CO: CO_ITEM, ST: ST_ITEM };
const itemsSchema = (test) => ({ type: "object", additionalProperties: false, required: ["items"], properties: { items: { type: "array", items: ITEM_SCHEMA[test] } } });

const SOURCE = {
  type: "object", additionalProperties: false, required: ["ok", "title", "url", "note"],
  properties: { ok: { type: "boolean" }, title: { type: "string" }, url: { type: "string" }, note: { type: "string" } },
};
const LESSON = {
  type: "object", additionalProperties: false, required: ["summary", "vocabulary", "grammar", "tcf_tip"],
  properties: {
    summary: { type: "string" },
    vocabulary: { type: "array", items: { type: "object", additionalProperties: false, required: ["fr", "en"], properties: { fr: { type: "string" }, en: { type: "string" } } } },
    grammar: { type: "array", items: { type: "string" } },
    tcf_tip: { type: "string" },
  },
};
const EE3_SUBJECT = {
  type: "object", additionalProperties: false, required: ["t1", "t2", "t3"],
  properties: {
    t1: { type: "string" }, t2: { type: "string" },
    t3: { type: "object", additionalProperties: false, required: ["theme", "docA", "docB"], properties: { theme: { type: "string" }, docA: { type: "string" }, docB: { type: "string" } } },
  },
};
const EO_SUBJECT = {
  type: "object", additionalProperties: false, required: ["situation", "role", "statement"],
  properties: { situation: { type: "string" }, role: { type: "string" }, statement: { type: "string" } },
};
const EE_GRADE = {
  type: "object", additionalProperties: false, required: ["tasks", "score20", "advice"],
  properties: {
    tasks: {
      type: "array",
      items: {
        type: "object", additionalProperties: false,
        required: ["task", "score20", "level", "strengths", "errors", "model"],
        properties: {
          task: { type: "integer" }, score20: { type: "integer" }, level: { type: "string" },
          strengths: { type: "string" },
          errors: { type: "array", items: { type: "object", additionalProperties: false, required: ["original", "fix", "why"], properties: { original: { type: "string" }, fix: { type: "string" }, why: { type: "string" } } } },
          model: { type: "string" },
        },
      },
    },
    score20: { type: "integer" },
    advice: { type: "string" },
  },
};

// ---------- item generation ----------
const GEN_RULES = {
  CE: `TCF "compréhension écrite" items. Document length/type must match the level: A1–A2 = notice, sign, SMS, short ad, timetable (20–60 words); B1 = e-mail, short article, practical text (80–150 words); B2 = press article or opinion text (150–220 words); C1–C2 = dense argumentative, literary or specialised text (180–250 words) with implicit meaning. One question per document, in French, testing global meaning, detail, the author's intent or implicit meaning (higher levels). The correct option paraphrases the text; distractors reuse words from the text but are wrong.`,
  CO: `TCF "compréhension orale" items. The audio will be read aloud by text-to-speech, so write the "script" as spoken turns. A1–A2 = public announcement, voicemail, short everyday dialogue (20–60 words); B1 = conversation, practical interview (60–120 words); B2 = radio interview, report or discussion (120–180 words); C1–C2 = debate, lecture extract or radio programme with nuance, irony or implicit meaning (150–220 words). Use natural spoken French (hesitations like "euh", "bon", "en fait" at higher levels). The "context" is the short instruction shown before listening (e.g. "Vous entendez ce message sur votre répondeur."). One question in French with 4 options; distractors mention things heard in the audio.`,
  ST: `TCF "maîtrise des structures de la langue" items: a French sentence or short exchange with a gap (___), testing grammar (tenses, moods, pronouns, prepositions, agreement, connectors) and vocabulary in context, increasing in difficulty with the level.`,
};

async function generateItems(test, levels, { topic = "" } = {}) {
  const batches = [];
  for (let i = 0; i < levels.length; i += 10) batches.push(levels.slice(i, i + 10));
  const parts = await Promise.all(batches.map((lv) => askJSON(
    `Create ${lv.length} ORIGINAL ${GEN_RULES[test]}
Levels, in this exact order: ${lv.join(", ")}.
${topic ? `Topics: around "${topic}".` : "Vary everyday, work, society, culture, environment and science topics (the kind found in the TCF)."}
Each item: exactly 4 options, "answer" = index 0-3 of the only correct option (vary the position), "explanation" in ${store.settings.supportLang} saying why, quoting the key words.`,
    itemsSchema(test),
  )));
  return parts.flatMap((p) => p.items).map((it, i) => ({ ...it, level: LEVELS.includes(it.level) ? it.level : levels[i] }));
}

// ---------- rendering: hub ----------
export function renderTCF(arg) {
  const [sub, extra] = (arg || "").split(":");
  if (sub === "method") return renderMethod(extra);
  if (sub === "co" || sub === "ce" || sub === "st") return renderMCQHome(sub.toUpperCase());
  if (sub === "ee") return renderEE();
  if (sub === "eo") return renderEO();
  if (sub === "link") return renderLink();
  return renderHub();
}

function renderHub() {
  const v = variant();
  const tests = Object.keys(v.tests);
  view.innerHTML = `
  <h2>🎯 TCF preparation</h2>
  <div class="row wrap">${Object.entries(VARIANTS).map(([k, x]) => `<button class="chip ${v === x ? "on" : ""}" data-v="${k}">${x.name}</button>`).join("")}</div>
  <div class="card accent">
    <h3>Your target: B2</h3>
    <p class="muted small">B2 = <b>400–499 / 699</b> in the multiple-choice tests · <b>10–13 / 20</b> in writing and speaking</p>
    <div class="tcf-scores">${tests.map((t) => {
      const l = latest(t);
      const val = l ? (l.score20 != null ? `${l.score20}/20` : `${l.score}/699`) : "—";
      const lv = l ? l.level : "not tested";
      const ok = l && ["B2", "C1", "C2"].includes(l.level);
      return `<a href="#tcf/${t.toLowerCase()}" class="tcf-score ${ok ? "ok" : ""}"><span>${TESTS[t].icon} ${t}</span><b>${val}</b><span class="small">${esc(lv)}</span></a>`;
    }).join("")}</div>
  </div>
  ${tests.map((t) => {
    const f = v.tests[t];
    const fmt = f.n ? `${f.n} questions · ${f.min} min · QCM` : t === "EE" ? "3 tâches · 60 min" : "3 tâches · 12 min · face à face";
    return `<div class="card">
      <div class="row between"><h3>${TESTS[t].icon} ${TESTS[t].name}</h3><span class="pill">${t}</span></div>
      <p class="muted small">${TESTS[t].en} · ${fmt}</p>
      <div class="row wrap">
        <a class="btn ghost small" href="#tcf/method:${t}">📘 Method</a>
        <a class="btn small" href="#tcf/${t.toLowerCase()}">Practice & mock exam</a>
      </div></div>`;
  }).join("")}
  <div class="card web-card">
    <h3>🌐 Learn from a website</h3>
    <p class="muted">Paste a link (article, podcast transcript, practice test). Your tutor reads the page and turns it into TCF questions and a lesson. Or let it find fresh material on trusted French sites.</p>
    <a class="btn" href="#tcf/link">Open</a>
  </div>
  <div class="card">
    <h3>📚 Recommended sites</h3>
    ${RESOURCES.map((r) => `<div class="res"><div><a href="${esc(r.url)}" target="_blank" rel="noopener"><b>${esc(r.name)}</b></a><br><span class="muted small">${esc(r.what)} · ${esc(r.skills)}</span></div><a class="btn ghost small" href="#tcf/link" data-use="${esc(r.url)}">Use</a></div>`).join("")}
  </div>`;
  view.querySelectorAll("[data-v]").forEach((b) => (b.onclick = () => { store.settings.tcfVariant = b.dataset.v; save(); renderHub(); }));
  view.querySelectorAll("[data-use]").forEach((a) => (a.onclick = () => { bus.linkPrefill = a.dataset.use; }));
}

function renderMethod(t) {
  if (!METHOD[t]) { location.hash = "tcf"; return; }
  view.innerHTML = `<a href="#tcf" class="back">← TCF</a>
  <h2>${TESTS[t].icon} ${TESTS[t].name}: method</h2>
  <div class="card">${md(METHOD[t])}</div>
  <div class="row wrap"><button class="btn" id="m-ai">🎓 Full lesson with examples</button><a class="btn ghost" href="#tcf/${t.toLowerCase()}">Practice now</a></div>
  <div id="m-out"></div>`;
  $("#m-ai").onclick = async () => {
    if (needsKey()) return ($("#m-out").innerHTML = keyNotice());
    const box = document.createElement("div"); box.className = "card ai";
    $("#m-out").replaceChildren(box);
    box.innerHTML = `<div class="typing"></div>`;
    let out = "";
    try {
      await streamReply([{ role: "user", content: `Act as my TCF coach. Give me a complete lesson on the TCF "${TESTS[t].name}" (${variant().name}) for my level (${level()}, target B2): exactly how it works, how it is scored, the 5 most common traps with concrete French examples, a step-by-step method, the key vocabulary/structures examiners expect at B2, and one fully worked example ${t === "EE" || t === "EO" ? "with a B2 model answer" : "question with the reasoning to find the answer"}. Explanations in ${store.settings.supportLang}, examples in French. Use simple markdown.` }],
        { onText: (x) => { out += x; box.innerHTML = md(out); }, maxTokens: 8000 });
      addXP(10);
    } catch (e) { box.innerHTML = `<p class="error">${esc(e.message)}</p>`; }
  };
}

// ---------- multiple-choice tests (CO / CE / ST) ----------
function renderMCQHome(t) {
  const f = variant().tests[t];
  if (!f) { location.hash = "tcf"; return; }
  view.innerHTML = `<a href="#tcf" class="back">← TCF</a>
  <h2>${TESTS[t].icon} ${TESTS[t].name}</h2>
  <p class="muted">${variant().name}: ${f.n} questions in ${f.min} min · 4 options · harder questions are worth more points.</p>
  ${needsKey() ? keyNotice() : ""}
  <div class="card">
    <h3>Practice</h3>
    <p class="muted small">10 questions around your level, with instant correction${t === "CO" ? " and the transcript" : ""}.</p>
    <input id="topic" placeholder="Optional topic (e.g. travail, santé, environnement)">
    <button class="btn full" id="practice">Start practice</button>
  </div>
  <div class="card">
    <h3>⏱️ Full mock exam</h3>
    <p class="muted small">${f.n} questions, A1 → C2, ${f.min}-minute timer${t === "CO" ? ", each recording plays once" : ""}, estimated score out of 699 at the end. Takes about 1 minute to prepare.</p>
    <button class="btn full ghost" id="mock">Start mock exam</button>
  </div>
  <a class="btn ghost full" href="#tcf/method:${t}">📘 Method & tips</a>
  <div id="mcq"></div>`;
  const go = async (mode) => {
    if (needsKey()) return;
    unlockAudio();
    const levels = mode === "exam" ? fullMix(f.n) : practiceMix(10);
    $("#mcq").innerHTML = `<div class="card center"><div class="typing"></div><p class="muted">Preparing ${levels.length} TCF questions…</p></div>`;
    $("#mcq").scrollIntoView({ behavior: "smooth" });
    try {
      const items = await generateItems(t, levels, { topic: $("#topic")?.value || "" });
      runMCQ(t, items, { mode, minutes: mode === "exam" ? f.min : null });
    } catch (e) { $("#mcq").innerHTML = `<p class="error">${esc(e.message)}</p>`; }
  };
  $("#practice").onclick = () => go("practice");
  $("#mock").onclick = () => go("exam");
}

async function playScript(script, rate) {
  for (const line of script) {
    await speak(line.text, { gender: line.gender, rate });
    await new Promise((r) => setTimeout(r, 350));
  }
}

/** Runs a set of TCF multiple-choice items. mode: "practice" | "exam". */
export function runMCQ(t, items, { mode = "practice", minutes = null, container = null, source = null } = {}) {
  const exam = mode === "exam";
  const answers = [];
  let i = 0, timer = null, deadline = minutes ? Date.now() + minutes * 60000 : null, finished = false;
  const root = container || view;
  if (exam) {
    view.innerHTML = `<div class="exam-bar"><span>${TESTS[t].icon} ${esc(TESTS[t].name)}</span><span id="clock">${fmtTime(minutes * 60)}</span></div><div id="q"></div>`;
  } else if (!container) {
    root.innerHTML = `<a href="#tcf" class="back">← TCF</a><div id="q"></div>`;
  }
  const box = exam ? $("#q") : (container ? root : $("#q"));
  if (container) box.innerHTML = "";
  if (deadline) {
    timer = setInterval(() => {
      if (!document.body.contains(box)) { clearInterval(timer); finished = true; return; } // left the exam
      const left = Math.round((deadline - Date.now()) / 1000);
      const c = $("#clock"); if (c) { c.textContent = fmtTime(left); c.classList.toggle("late", left < 120); }
      if (left <= 0) { clearInterval(timer); toast("⏱️ Time's up!"); finish(); }
    }, 1000);
  }

  const show = () => {
    if (finished) return;
    if (i >= items.length) return finish();
    const it = items[i];
    stopSpeaking();
    box.innerHTML = `<div class="card">
      <div class="row between"><span class="muted">Question ${i + 1}/${items.length}</span><span class="pill">${it.level}</span></div>
      ${t === "CE" ? `<div class="doc"><span class="muted small">${esc(it.doc_type)}</span><p>${esc(it.document).replace(/\n/g, "<br>")}</p></div>` : ""}
      ${t === "CO" ? `<p class="muted">${esc(it.context)}</p>
        <div class="row"><button class="btn" id="play">▶️ ${exam ? "Écouter (une fois)" : "Écouter"}</button>${exam ? "" : `<button class="btn ghost" id="slow">🐢 Lent</button>`}</div>` : ""}
      <h3 class="q">${esc(it.question)}</h3>
      <div class="options">${it.options.map((o, k) => `<button class="opt" data-k="${k}">${String.fromCharCode(65 + k)}. ${esc(o)}</button>`).join("")}</div>
      <div id="fb"></div>
      ${exam ? `<button class="btn ghost small" id="skip">Skip →</button>` : ""}
    </div>`;
    if (t === "CO") {
      let played = false;
      $("#play").onclick = async () => {
        if (exam && played) return;
        played = true;
        if (exam) $("#play").disabled = true;
        await playScript(it.script);
      };
      $("#slow") && ($("#slow").onclick = () => playScript(it.script, 0.7));
      if (exam) setTimeout(() => $("#play")?.click(), 400);
    }
    $("#skip") && ($("#skip").onclick = () => { answers[i] = -1; i++; show(); });
    box.querySelectorAll(".opt").forEach((b) => (b.onclick = () => {
      const k = +b.dataset.k;
      answers[i] = k;
      if (exam) { i++; show(); return; }
      box.querySelectorAll(".opt").forEach((x, j) => { x.disabled = true; if (j === it.answer) x.classList.add("right"); });
      if (k !== it.answer) { b.classList.add("wrong"); addWeakPoint(`TCF ${t} ${it.level}: ${it.question.slice(0, 50)}`); }
      $("#fb").innerHTML = `<p class="${k === it.answer ? "ok" : "error"}">${k === it.answer ? "✅ Correct !" : "❌ Not quite."}</p>
        <p>${esc(it.explanation)}</p>
        ${t === "CO" ? `<details><summary>📜 Transcript</summary>${it.script.map((l) => `<p><b>${esc(l.speaker)} :</b> ${esc(l.text)}</p>`).join("")}</details>` : ""}
        <button class="btn full" id="next">${i + 1 < items.length ? "Next →" : "See my score"}</button>`;
      $("#next").onclick = () => { i++; show(); };
    }));
  };

  const finish = () => {
    if (finished) return;
    finished = true;
    clearInterval(timer);
    stopSpeaking();
    const score = score699(items, answers);
    const lv = cefr699(score);
    const right = items.filter((it, k) => answers[k] === it.answer).length;
    record(t, { score, level: lv, mode, n: items.length, right });
    addXP(right * 4 + (exam ? 30 : 0));
    markDaily("tcf-" + t.toLowerCase());
    const byLevel = LEVELS.map((l) => {
      const idx = items.map((it, k) => [it, k]).filter(([it]) => it.level === l);
      return idx.length ? `<div><b>${l}</b><span>${idx.filter(([it, k]) => answers[k] === it.answer).length}/${idx.length}</span></div>` : "";
    }).join("");
    const target = score >= 400;
    (exam ? view : box).innerHTML = `
      ${exam ? `<a href="#tcf" class="back">← TCF</a>` : ""}
      <div class="card center accent">
        <p class="muted">${exam ? "Mock exam" : "Practice"} · ${esc(TESTS[t].name)}${source ? ` · ${esc(source)}` : ""}</p>
        <div class="big-emoji">${score}<span class="small muted">/699</span></div>
        <h3>Level ${esc(lv)}</h3>
        <p>${right}/${items.length} correct · ${target ? "🎉 B2 target reached!" : `${400 - score} points to B2 (400)`}</p>
        <p class="muted small">Estimate based on the TCF scale (0–699); the official weighting isn't public.</p>
      </div>
      <div class="card"><h3>By level</h3><div class="lvl-grid">${byLevel}</div></div>
      <div class="card"><h3>Review</h3>${items.map((it, k) => `
        <details class="rev ${answers[k] === it.answer ? "good" : "bad"}"><summary>${answers[k] === it.answer ? "✅" : "❌"} Q${k + 1} · ${it.level} · ${esc(it.question.slice(0, 70))}</summary>
          ${t === "CE" ? `<p class="doc small">${esc(it.document)}</p>` : ""}
          ${t === "CO" ? `<div class="doc small">${it.script.map((l) => `<b>${esc(l.speaker)} :</b> ${esc(l.text)}`).join("<br>")}</div>` : ""}
          <p>Your answer: ${answers[k] >= 0 && answers[k] != null ? esc(it.options[answers[k]]) : "—"}<br>Correct: <b>${esc(it.options[it.answer])}</b></p>
          <p class="muted">${esc(it.explanation)}</p>
        </details>`).join("")}</div>
      <a class="btn full" href="#tcf/${t.toLowerCase()}">Again</a>`;
  };
  show();
  return { finish };
}

// ---------- expression écrite ----------
function renderEE(subjects) {
  if (!subjects && bus.eeSubjects) { subjects = bus.eeSubjects; bus.eeSubjects = null; }
  const subj = subjects || EE_BANK[Math.floor(Math.random() * EE_BANK.length)];
  view.innerHTML = `<a href="#tcf" class="back">← TCF</a>
  <h2>✍️ Expression écrite</h2>
  <p class="muted">3 tasks · 60 min. If you write fewer words than the minimum, the task is scored "A1 non atteint".</p>
  <div class="row wrap">
    <button class="btn small" id="ee-mock">⏱️ Start 60-min mock</button>
    <button class="btn ghost small" id="ee-new">✨ New subjects</button>
    <a class="btn ghost small" href="#tcf/method:EE">📘 Method</a>
  </div>
  <div class="exam-bar hidden" id="ee-bar"><span>✍️ Expression écrite</span><span id="clock">60:00</span></div>
  ${EE_TASKS.map((tk) => `<div class="card">
    <h3>${tk.title}</h3>
    <p class="muted small">${tk.min}–${tk.max} words · ${tk.desc}</p>
    ${tk.id === 3
      ? `<p><b>Thème : ${esc(subj[3].theme)}</b></p><div class="doc"><b>Document 1</b><p>${esc(subj[3].docA)}</p></div><div class="doc"><b>Document 2</b><p>${esc(subj[3].docB)}</p></div>
         <p class="small">Consigne : présentez les deux points de vue (40–60 mots), puis donnez votre opinion en la justifiant (80–120 mots).</p>`
      : `<p class="consigne">${esc(subj[tk.id])}</p>`}
    <textarea id="ee${tk.id}" rows="${tk.id === 1 ? 6 : 9}" placeholder="Écrivez ici…">${esc(draft(tk.id))}</textarea>
    <p class="wc" id="wc${tk.id}"></p>
  </div>`).join("")}
  <button class="btn full" id="ee-send">Submit for TCF grading</button>
  <div id="ee-out"></div>`;
  const count = (id) => {
    const tk = EE_TASKS[id - 1];
    const n = $(`#ee${id}`).value.trim().split(/\s+/).filter(Boolean).length;
    const el = $(`#wc${id}`);
    el.textContent = `${n} words (${tk.min}–${tk.max})`;
    el.className = "wc " + (n === 0 ? "" : n < tk.min ? "low" : n > tk.max ? "high" : "okc");
    return n;
  };
  EE_TASKS.forEach((tk) => {
    const ta = $(`#ee${tk.id}`);
    ta.oninput = () => { count(tk.id); try { sessionStorage.setItem("ee" + tk.id, ta.value); } catch { /* ignore */ } };
    count(tk.id);
  });
  $("#ee-new").onclick = async () => {
    if (needsKey()) return toast("Add your API key in Settings");
    $("#ee-new").textContent = "…";
    try {
      const s = await askJSON(`Create a new, original set of 3 TCF expression écrite subjects (${variant().name}), in French, realistic and similar to the official exam. t1: a message to write to one or more people (describe/tell/explain, with 2–3 points to cover). t2: an article/blog/story about an experience for readers. t3: a theme plus two short opposite opinion documents (40–70 words each, signed with a first name and role). Suitable for a ${level()} learner aiming at B2.`, EE3_SUBJECT);
      renderEE({ 1: s.t1, 2: s.t2, 3: s.t3 });
    } catch (e) { toast(e.message); $("#ee-new").textContent = "✨ New subjects"; }
  };
  let timer = null;
  $("#ee-mock").onclick = () => {
    const bar = $("#ee-bar"); bar.classList.remove("hidden");
    const end = Date.now() + 60 * 60000;
    clearInterval(timer);
    timer = setInterval(() => {
      const left = Math.round((end - Date.now()) / 1000);
      $("#clock") ? ($("#clock").textContent = fmtTime(left)) : clearInterval(timer);
      if (left <= 0) { clearInterval(timer); toast("⏱️ Time's up! Submitting…"); $("#ee-send")?.click(); }
    }, 1000);
    $("#ee-mock").disabled = true;
    toast("60 minutes, c'est parti !");
  };
  $("#ee-send").onclick = async () => {
    if (needsKey()) return ($("#ee-out").innerHTML = keyNotice());
    clearInterval(timer);
    const texts = EE_TASKS.map((tk) => ({ tk, text: $(`#ee${tk.id}`).value.trim(), n: count(tk.id) }));
    if (texts.every((x) => !x.n)) return toast("Write at least one task.");
    $("#ee-out").innerHTML = `<div class="card center"><div class="typing"></div><p class="muted">Grading like a TCF examiner…</p></div>`;
    const consignes = { 1: subj[1], 2: subj[2], 3: `Thème : ${subj[3].theme}\nDocument 1 : ${subj[3].docA}\nDocument 2 : ${subj[3].docB}\nConsigne : présentez les deux points de vue (40–60 mots) puis donnez votre opinion (80–120 mots).` };
    try {
      const g = await askJSON(`You are a certified TCF expression écrite examiner. Grade this candidate (${variant().name}) using the official criteria: task completion (respect of the instructions, register, word count), coherence and cohesion, lexical range and accuracy, grammatical range and accuracy. Score each submitted task out of 20 and give a CEFR level (TCF scale: 0 = A1 non atteint, 1 = A1, 2–5 = A2, 6–9 = B1, 10–13 = B2, 14–17 = C1, 18–20 = C2). A task below its minimum word count, or empty, gets 0 ("A1 non atteint"). Give the global score out of 20 (holistic, weighted toward tasks 2 and 3).
For each task: strengths (1–2 sentences, ${store.settings.supportLang}), every important error (original → fix → short reason in ${store.settings.supportLang}), and "model" = a B2 model answer for that task in French, respecting the word count.
"advice" = the 3 priorities to reach B2, in ${store.settings.supportLang}.

${texts.map(({ tk, text, n }) => `=== Task ${tk.id} (${tk.min}–${tk.max} words; candidate wrote ${n}) ===\nInstructions: ${consignes[tk.id]}\nCandidate's text:\n${text || "(empty)"}`).join("\n\n")}`, EE_GRADE);
      g.tasks.forEach((tk) => { const t = texts[tk.task - 1]; if (t && t.n < t.tk.min) { tk.score20 = 0; tk.level = "A1 non atteint"; } });
      const lv = cefr20(g.score20);
      record("EE", { score20: g.score20, level: lv, mode: timer ? "exam" : "practice" });
      g.tasks.forEach((tk) => tk.errors.slice(0, 3).forEach((e) => addWeakPoint(e.why.slice(0, 70))));
      addXP(40); markDaily("tcf-ee");
      EE_TASKS.forEach((tk) => { try { sessionStorage.removeItem("ee" + tk.id); } catch { /* ignore */ } });
      $("#ee-out").innerHTML = `
      <div class="card center accent"><p class="muted">Expression écrite</p><div class="big-emoji">${g.score20}<span class="small muted">/20</span></div><h3>${esc(lv)}</h3><p>${esc(g.advice)}</p></div>
      ${g.tasks.map((tk) => `<div class="card">
        <div class="row between"><h3>Task ${tk.task}</h3><span class="pill big">${tk.score20}/20 · ${esc(tk.level)}</span></div>
        <p>${esc(tk.strengths)}</p>
        ${tk.errors.map((e) => `<div class="err"><s>${esc(e.original)}</s> → <b>${esc(e.fix)}</b><br><span class="muted">${esc(e.why)}</span></div>`).join("")}
        <details><summary>📝 B2 model answer</summary><p>${esc(tk.model)}</p></details>
      </div>`).join("")}`;
      $("#ee-out").scrollIntoView({ behavior: "smooth" });
    } catch (e) { $("#ee-out").innerHTML = `<p class="error">${esc(e.message)}</p>`; }
  };
}
function draft(id) { try { return sessionStorage.getItem("ee" + id) || ""; } catch { return ""; } }

// ---------- expression orale ----------
const EXAMINER = { id: "examiner", name: "Examinatrice", age: "", city: "Centre d'examen TCF", emoji: "🧑🏻‍💼", gender: "female", tagline: "TCF oral examiner" };

function examinerPrompt(task, subj) {
  const common = `You are a certified TCF oral examiner (examinatrice) conducting the expression orale test of the ${variant().name} with a candidate, face to face (here: a voice call; your words are read by text-to-speech).
Speak clear, standard French, use "vous", stay neutral, polite and encouraging. Each turn: 1–3 short spoken sentences, no markdown, no emojis, no lists.
NEVER correct the candidate and never switch to another language during the test, exactly like the real exam. If the transcription seems garbled, say "Pardon, pouvez-vous répéter ?".`;
  if (task.id === 1) return `${common}
TASK 1: ENTRETIEN DIRIGÉ (2 minutes, no preparation). Ask personal questions one at a time: identity, family, studies/work, city, hobbies, routine, past experiences, plans for the future. Follow up on what the candidate says so they develop longer answers (Pourquoi ? Depuis quand ? Pouvez-vous me décrire… ?). Start with: "Bonjour. Nous commençons la première tâche, l'entretien dirigé. Pouvez-vous vous présenter, s'il vous plaît ?"`;
  if (task.id === 2) return `${common}
TASK 2: EXERCICE EN INTERACTION (3 min 30, the candidate prepared for 2 minutes).
Situation given to the candidate: "${subj.situation}"
You play this role: ${subj.role}.
The CANDIDATE must ask YOU questions to get information. Answer each question realistically and briefly, invent plausible details when needed, don't give all the information at once. If the candidate stops, prompt: "Avez-vous d'autres questions ?". Start by greeting in role, e.g. "Bonjour, je vous écoute." (one sentence).`;
  return `${common}
TASK 3: EXPRESSION D'UN POINT DE VUE (4 min 30, no preparation).
Subject: ${subj.statement}
Start by reading the subject and asking for the candidate's opinion. Then mostly listen: short reactions, and 1–2 follow-up or counter-argument questions to push the candidate to justify and nuance ("Pourtant, certains pensent que… Qu'en pensez-vous ?", "Pouvez-vous donner un exemple ?").`;
}

function eoFeedbackPrompt(task) {
  return `[End of the task. Now step out of the examiner role. As a TCF expression orale examiner, evaluate the candidate's performance in "${task.title}" (the transcript comes from speech recognition, so ignore obvious transcription glitches and don't judge pronunciation precisely).
The FIRST line must be exactly: SCORE: X/20 (TCF scale: 2–5 A2, 6–9 B1, 10–13 B2, 14–17 C1).
Then, in ${store.settings.supportLang}: CEFR level, task completion, fluency and coherence, vocabulary range, grammar accuracy (3 errors from the transcript: wrong → right), 3 priorities to reach B2, and a short B2 model of what the candidate could have said (in French).
On the very last line write "WEAK:" followed by weak grammar points separated by semicolons.]`;
}

function renderEO() {
  view.innerHTML = `<a href="#tcf" class="back">← TCF</a>
  <h2>🗣️ Expression orale</h2>
  <p class="muted">Face to face with an examiner · 12 min · 3 tasks. Here the examiner speaks with you by voice, then gives you a score out of 20.</p>
  ${needsKey() ? keyNotice() : ""}
  ${EO_TASKS.map((tk) => {
    const l = (results().EO || []).filter((r) => r.task === tk.id).pop();
    return `<div class="card">
      <div class="row between"><h3>${tk.title}</h3>${l ? `<span class="pill">${l.score20}/20 · ${esc(l.level)}</span>` : ""}</div>
      <p class="muted small">${tk.desc}</p>
      <div class="row wrap"><button class="btn" data-eo="${tk.id}">▶️ Start</button>${tk.id > 1 ? `<button class="btn ghost" data-eo-ai="${tk.id}">✨ New AI subject</button>` : ""}</div>
    </div>`;
  }).join("")}
  <a class="btn ghost full" href="#tcf/method:EO">📘 Method & useful phrases</a>`;
  view.querySelectorAll("[data-eo]").forEach((b) => (b.onclick = () => { unlockAudio(); startEO(+b.dataset.eo); }));
  view.querySelectorAll("[data-eo-ai]").forEach((b) => (b.onclick = async () => {
    if (needsKey()) return;
    unlockAudio();
    b.textContent = "…";
    try {
      const s = await askJSON(`Create one original TCF expression orale subject set (${variant().name}), in French: "situation" = a task-2 situation card for the candidate (they must ask questions to get information), "role" = the role and the concrete facts the examiner will use to answer (prices, times, conditions…), "statement" = a task-3 debatable statement followed by a question ("« … » Qu'en pensez-vous ?"). Topic: everyday life, work, society or culture, B1–B2.`, EO_SUBJECT);
      startEO(+b.dataset.eoAi, s);
    } catch (e) { toast(e.message); b.textContent = "✨ New AI subject"; }
  }));
}

export function startEO(taskId, custom = null) {
  if (needsKey()) return;
  const task = EO_TASKS[taskId - 1];
  const subj = custom
    ? { situation: custom.situation, role: custom.role, statement: custom.statement }
    : { ...EO_BANK[2][Math.floor(Math.random() * EO_BANK[2].length)], statement: EO_BANK[3][Math.floor(Math.random() * EO_BANK[3].length)] };
  bus.pendingCall = {
    persona: EXAMINER,
    title: task.title,
    system: examinerPrompt(task, subj),
    opening: "[L'épreuve commence. Commencez la tâche.]",
    timeLimit: task.time,
    prep: task.prep ? { seconds: task.prep, html: `<h3>${esc(task.title)}</h3><p class="consigne">${esc(subj.situation)}</p><p class="muted small">Prepare 8–10 questions: prix ? horaires ? conditions ? Use "Est-ce que…", "Quel/Quelle…", "Pourriez-vous…".</p>` } : null,
    taskHtml: task.id === 2 ? `<p class="consigne small">${esc(subj.situation)}</p>` : task.id === 3 ? `<p class="consigne small">${esc(subj.statement)}</p>` : "",
    feedbackPrompt: eoFeedbackPrompt(task),
    onFeedback: (text) => {
      const m = text.match(/SCORE:\s*(\d{1,2})\s*\/\s*20/i);
      if (m) {
        const sc = Math.min(20, +m[1]);
        record("EO", { score20: sc, level: cefr20(sc), task: task.id, mode: "exam" });
        markDaily("tcf-eo");
      }
    },
    bye: "Merci, c'est terminé pour cette tâche.",
    againHref: "#tcf/eo",
    noCorrections: true,
  };
  location.hash = "call/custom";
}

// ---------- learn from a website ----------
const LINK_KINDS = {
  CE: { label: "📖 Reading questions (CE)" },
  CO: { label: "🎧 Listening questions (CO)" },
  EE: { label: "✍️ Writing subject (EE)" },
  EO: { label: "🗣️ Speaking subject (EO)" },
  LESSON: { label: "🎓 Just teach me this page" },
};

function linkSchema(kind) {
  const props = { source: SOURCE, lesson: LESSON };
  const req = ["source", "lesson"];
  if (kind === "CE" || kind === "CO" || kind === "LESSON") { props.items = { type: "array", items: kind === "CO" ? CO_ITEM : CE_ITEM }; req.push("items"); }
  if (kind === "EE") { props.ee = EE3_SUBJECT; req.push("ee"); }
  if (kind === "EO") { props.eo = EO_SUBJECT; req.push("eo"); }
  return { type: "object", additionalProperties: false, required: req, properties: props };
}

function linkTask(kind) {
  return {
    CE: `Then create 6 TCF compréhension écrite items based on the page. If the page itself contains practice questions (QCM), reuse them faithfully (fix the answer key if needed) and add your own to reach 6; otherwise write original items. For items you write yourself, "document" must be an excerpt or a faithful adaptation of the page content (A2 → C1, increasing). ${GEN_RULES.CE}`,
    CO: `Then create 5 TCF compréhension orale items from the page: turn its content into realistic spoken scripts (radio report, interview, dialogue, announcement) read by text-to-speech, from A2 to C1, increasing. If the page is an audio/video page with a transcript, base the scripts on the transcript. ${GEN_RULES.CO}`,
    EE: `Then create a TCF expression écrite subject set inspired by the page's topic: t1 (message), t2 (article/story), t3 (theme + two short opposite opinion documents, 40–70 words each, signed).`,
    EO: `Then create a TCF expression orale subject inspired by the page's topic: "situation" (task 2 card for the candidate), "role" (the examiner's role with concrete facts), "statement" (a task 3 debatable statement + question).`,
    LESSON: `Then create 4 reading-comprehension check questions (TCF compréhension écrite format, the "document" being a short excerpt of the page).`,
  }[kind];
}

function renderLink() {
  const pre = bus.linkPrefill || ""; bus.linkPrefill = null;
  view.innerHTML = `<a href="#tcf" class="back">← TCF</a>
  <h2>🌐 Learn from a website</h2>
  ${needsKey() ? keyNotice() : ""}
  <div class="card">
    <h3>1. Paste a link</h3>
    <input id="url" type="url" inputmode="url" placeholder="https://…" value="${esc(pre)}">
    <h3>2. What do you want?</h3>
    <div class="scenarios" id="kinds">${Object.entries(LINK_KINDS).map(([k, v], i) => `<button class="chip ${i === 0 ? "on" : ""}" data-k="${k}">${v.label}</button>`).join("")}</div>
    <button class="btn full" id="go">Read the page & build my exercise</button>
    <p class="muted small">Your tutor opens the page itself (Claude web fetch). Pages behind a login or anti-bot protection can't be read. In that case try another page, or paste its text into the Chat.</p>
  </div>
  <div class="card">
    <h3>🔎 Or find fresh material for me</h3>
    <input id="topic" placeholder="Topic (e.g. environnement, travail, santé, logement)" value="${esc(currentWeek().themes[0])}">
    <button class="btn ghost full" id="find">Search trusted French sites</button>
    <p class="muted small">Searches RFI, TV5Monde, 1jour1actu, franceinfo, Le Monde and other learning sites for a current article at your level.</p>
  </div>
  ${(store.progress.myLinks || []).length ? `<div class="card"><h3>⭐ My saved links</h3>${store.progress.myLinks.map((u) => `<button class="list-btn" data-url="${esc(u)}">${esc(u)}</button>`).join("")}</div>` : ""}
  <div id="link-out"></div>`;
  let kind = "CE";
  view.querySelectorAll("#kinds [data-k]").forEach((b) => (b.onclick = () => {
    kind = b.dataset.k;
    view.querySelectorAll("#kinds .chip").forEach((c) => c.classList.toggle("on", c === b));
  }));
  view.querySelectorAll("[data-url]").forEach((b) => (b.onclick = () => { $("#url").value = b.dataset.url; }));

  const build = async (mode) => {
    if (needsKey()) return;
    unlockAudio();
    const out = $("#link-out");
    let prompt;
    if (mode === "fetch") {
      const url = $("#url").value.trim();
      if (!/^https?:\/\/\S+\.\S+/.test(url)) return toast("Paste a full link starting with https://");
      const links = (store.progress.myLinks ||= []);
      if (!links.includes(url)) { links.unshift(url); links.splice(8); save(); }
      prompt = `Use the web_fetch tool to open this page: ${url}
Read it carefully. Fill "source" (ok = false if the page couldn't be read or has no usable French content, with the reason in "note"; title; url).
Then fill "lesson" for a ${level()} learner aiming at TCF B2: summary (3–4 sentences, in simple French), 10 useful words/expressions from the page (fr + ${store.settings.supportLang}), 2–3 grammar points that appear in the page with an example from it, and one TCF tip linked to this kind of document.
${linkTask(kind)}`;
    } else {
      prompt = `Use web_search (then web_fetch) to find ONE recent, good-quality French article or audio page with a transcript about "${$("#topic").value || "la vie en France"}" on a trusted French-learning or news site, suitable for a ${level()} learner aiming at B2. Read it.
Fill "source" with the page you used (ok, title, url, note = why it's a good document).
Then fill "lesson": summary (3–4 sentences in simple French), 10 useful words/expressions (fr + ${store.settings.supportLang}), 2–3 grammar points from the text, and a TCF tip.
${linkTask(kind)}`;
    }
    out.innerHTML = `<div class="card center"><div class="typing"></div><p class="muted">${mode === "fetch" ? "Reading the page…" : "Searching French sites…"} (20–60 s)</p></div>`;
    out.scrollIntoView({ behavior: "smooth" });
    try {
      const r = await askJSON(prompt, linkSchema(kind), { web: mode === "fetch" ? "fetch" : "search", domains: mode === "search" ? TRUSTED_SITES : null });
      showLinkResult(r, kind);
    } catch (e) { out.innerHTML = `<div class="card"><p class="error">${esc(e.message)}</p></div>`; }
  };
  $("#go").onclick = () => build("fetch");
  $("#find").onclick = () => build("search");
}

function showLinkResult(r, kind) {
  const out = $("#link-out");
  const L = r.lesson;
  out.innerHTML = `
  <div class="card ${r.source.ok ? "" : "warn-card"}">
    <p class="muted small">${r.source.ok ? "✅ Source" : "⚠️ Couldn't fully use this page"}</p>
    <h3>${esc(r.source.title || "Page")}</h3>
    ${r.source.url ? `<a href="${esc(r.source.url)}" target="_blank" rel="noopener" class="small">${esc(r.source.url)}</a>` : ""}
    ${r.source.note ? `<p class="muted small">${esc(r.source.note)}</p>` : ""}
  </div>
  <div class="card">
    <div class="row between"><h3>🎓 Lesson</h3>${speakBtn(L.summary)}</div>
    <p>${esc(L.summary)}</p>
    <h4>Vocabulary</h4>
    <ul class="vocab">${L.vocabulary.map((v) => `<li>${speakBtn(v.fr)}<span><b>${esc(v.fr)}</b><br><span class="muted">${esc(v.en)}</span></span></li>`).join("")}</ul>
    ${L.grammar.length ? `<h4>Grammar in this page</h4><ul>${L.grammar.map((g) => `<li>${esc(g)}</li>`).join("")}</ul>` : ""}
    <p class="tip-line">💡 ${esc(L.tcf_tip)}</p>
    ${L.vocabulary.length ? `<button class="btn ghost small" id="to-cards">➕ Add words to my flashcards</button>` : ""}
  </div>
  <div id="link-ex"></div>`;
  $("#to-cards") && ($("#to-cards").onclick = () => {
    const extra = (store.progress.extraVocab ||= []);
    L.vocabulary.forEach((v) => { if (!extra.some((x) => x[0] === v.fr)) extra.push([v.fr, v.en, "B1"]); });
    save(); toast(`${L.vocabulary.length} words added to flashcards`); $("#to-cards").disabled = true;
  });
  addXP(10);
  const ex = $("#link-ex");
  if (r.items?.length) {
    const t = kind === "CO" ? "CO" : "CE";
    ex.innerHTML = `<h3>${TESTS[t].icon} TCF ${t} practice from this page</h3><div id="lx"></div>`;
    runMCQ(t, r.items, { mode: "practice", container: $("#lx"), source: r.source.title });
  } else if (r.ee) {
    ex.innerHTML = `<div class="card"><h3>✍️ Writing subjects ready</h3><p>${esc(r.ee.t3.theme)}</p><button class="btn" id="go-ee">Write now</button></div>`;
    $("#go-ee").onclick = () => { bus.eeSubjects = { 1: r.ee.t1, 2: r.ee.t2, 3: r.ee.t3 }; location.hash = "tcf/ee"; };
  } else if (r.eo) {
    ex.innerHTML = `<div class="card"><h3>🗣️ Speaking subjects ready</h3>
      <p><b>Task 2:</b> ${esc(r.eo.situation)}</p><p><b>Task 3:</b> ${esc(r.eo.statement)}</p>
      <div class="row wrap"><button class="btn" data-t="2">▶️ Task 2</button><button class="btn" data-t="3">▶️ Task 3</button></div></div>`;
    ex.querySelectorAll("[data-t]").forEach((b) => (b.onclick = () => { unlockAudio(); startEO(+b.dataset.t, r.eo); }));
  }
}
