// AI tutor. By default it runs on a free provider (see providers.js).
// Claude is optional: when chosen, it is called through the official Anthropic JS SDK, loaded lazily.

import { store } from "./store.js";
import { WEEKS } from "./curriculum.js";
import { getPersona } from "./personas.js";
import { TutorError, isClaude, chatStream, chatJSON } from "./providers.js";

export { TutorError };

const SDK_URL = "https://esm.sh/@anthropic-ai/sdk@1.2.0";
let AnthropicLib = null;
let client = null;
let clientKey = null;

async function getClient() {
  const key = store.settings.apiKey;
  if (!key) throw new TutorError("Add your Anthropic API key in Settings to use Claude.");
  if (!AnthropicLib) {
    try {
      AnthropicLib = (await import(SDK_URL)).default;
    } catch {
      throw new TutorError("Couldn't load the AI library — check your internet connection.");
    }
  }
  if (!client || clientKey !== key) {
    // The key stays on this device (localStorage) and is sent only to api.anthropic.com.
    client = new AnthropicLib({ apiKey: key, dangerouslyAllowBrowser: true });
    clientKey = key;
  }
  return client;
}


function friendlyError(err) {
  if (err instanceof TutorError) return err;
  const A = AnthropicLib;
  if (A) {
    if (err instanceof A.AuthenticationError) return new TutorError("Your API key was rejected. Check it in Settings.");
    if (err instanceof A.PermissionDeniedError) return new TutorError("This API key can't use the selected model. Try another model in Settings.");
    if (err instanceof A.RateLimitError) return new TutorError("Too many requests right now — wait a few seconds and try again.");
    if (err instanceof A.BadRequestError) return new TutorError("Request error: " + err.message);
    if (err instanceof A.APIConnectionError) return new TutorError("Network problem — are you online?");
    if (err instanceof A.APIError) return new TutorError(`AI service error (${err.status}). Please try again.`);
  }
  return new TutorError(err?.message || String(err));
}

// Server-side refusal fallbacks are available on Opus/Sonnet, not Haiku.
function fallbackParams(model) {
  if (model.startsWith("claude-haiku")) return {};
  return { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" };
}

export function systemPrompt(extra = "", { call = false } = {}) {
  const s = store.settings;
  const p = store.progress;
  const me = getPersona(s.persona);
  const correctAloud = s.correctionMode === "live";
  return `You are ${me.name}, ${me.age}, a real local from ${me.city}, France. You are NOT a classroom teacher or a robot: you are a French friend the learner talks to every day, who also happens to be an excellent French tutor (you've coached many foreigners and know the TCF exam well).

WHO YOU ARE (stay consistent, invent small everyday details that fit, remember what you've said):
${me.bio}

HOW YOU SPEAK:
${me.style}
Speak authentic, natural spoken French from ${me.city} — the French people really use in the street, at the café, with friends — but always adapted to the learner's level (comprehensible input: just a little above their level). When you use slang, a local word or an idiom, gloss it once in brackets in ${s.supportLang}, e.g. "c'est ouf [= amazing]".
Share your own life, opinions, little stories and local culture (food, habits, what's happening in your city, how French people really do things). Ask the learner about their life and react like a real friend would (surprise, humour, follow-up questions).
This is role-play for language practice: if the learner sincerely asks whether you are an AI, say yes honestly, then happily carry on as ${me.name}.

THE LEARNER:
- Current level: ${p.level}, goal B2 in 60 days (day ${dayNumber()} of 60)
- This week's grammar to recycle naturally: ${currentWeek().title} — ${currentWeek().grammar.join(", ")}
- Support language for explanations: ${s.supportLang}
- Known weak points: ${p.weakPoints.slice(-8).join("; ") || "none recorded yet"}

CORRECTIONS (always — that's why they talk to you):
When the learner's French has a mistake, put on the FIRST lines:
✏️ <their sentence, corrected>
💡 <very short reason in ${s.supportLang}>
These two lines are displayed on screen, never read aloud. If there's no mistake, don't write them.
${correctAloud
  ? `Then, in your spoken reply, also correct them out loud the way a French friend would — briefly and naturally, in French, e.g. "Ah, tu *es* allé à la plage ? Génial !" (recasting) or "Petite chose : on dit « je suis allé », pas « j'ai allé ». Bref, c'était bien ?". Only one spoken correction per reply, the most important one.`
  : `Do NOT mention the corrections in your spoken reply; just keep the conversation flowing naturally.`}

${call
  ? `THIS IS A LIVE PHONE CALL (your words are spoken by text-to-speech):
- Reply in 1 to 3 short spoken sentences, like a real phone conversation. No lists, no markdown, no emojis in the spoken part.
- Almost always end with a question or a prompt that makes the learner talk.
- If the learner's message is empty, unclear or clearly mis-heard by the microphone, say so naturally ("Pardon, ça a coupé, tu peux répéter ?").
- If the learner speaks ${s.supportLang} or seems lost, rephrase more simply in French, and only use a few words of ${s.supportLang} if really needed.`
  : `Keep replies conversational (2–5 sentences) unless asked to explain grammar or create an exercise. Introduce 1–2 useful new words or expressions per reply in **bold** with a translation in brackets.`}
${extra}`;
}

export function dayNumber() {
  const start = new Date(store.progress.startDate);
  const d = Math.floor((Date.now() - start.getTime()) / 86400000) + 1;
  return Math.max(1, Math.min(60, d));
}

export function currentWeek() {
  return WEEKS[Math.min(7, Math.floor((dayNumber() - 1) / 7.5))];
}

/**
 * Stream a reply. `messages` is an array of {role, content}.
 * onText receives each text chunk. Returns the full text.
 */
export async function streamReply(messages, { system, onText, maxTokens = 4000 } = {}) {
  if (!isClaude()) return chatStream(messages, { system: system || systemPrompt(), onText, maxTokens });
  const c = await getClient();
  const model = store.settings.model;
  try {
    const stream = c.beta.messages.stream({
      model,
      max_tokens: maxTokens,
      system: system || systemPrompt(),
      output_config: { effort: store.settings.effort },
      messages,
      ...fallbackParams(model),
    });
    for await (const event of stream) {
      if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
        onText?.(event.delta.text);
      }
    }
    const final = await stream.finalMessage();
    if (final.stop_reason === "refusal") {
      throw new TutorError("The tutor couldn't answer that one. Try rephrasing.");
    }
    return final.content.filter((b) => b.type === "text").map((b) => b.text).join("");
  } catch (err) {
    throw friendlyError(err);
  }
}

/** Ask for JSON matching `schema` (structured outputs).
 *  `web: "fetch"` lets Claude open URLs in the prompt; `web: "search"` lets it also search the web. */
export async function askJSON(prompt, schema, { system, web = null, domains = null } = {}) {
  const sys = system || systemPrompt("When asked to produce an exercise, output ONLY the requested JSON.");
  if (!isClaude()) return chatJSON(prompt, schema, { system: sys });
  const c = await getClient();
  const model = store.settings.model;
  const tools = web ? webTools(web, domains) : undefined;
  const base = {
    model,
    max_tokens: 16000,
    system: system || systemPrompt("When asked to produce an exercise, output ONLY the requested JSON."),
    ...(tools ? { tools } : {}),
    ...fallbackParams(model),
  };
  const run = async (withFormat) => {
    const user = withFormat ? prompt : `${prompt}\n\nReturn ONLY a JSON object (no markdown, no commentary) matching this JSON schema:\n${JSON.stringify(schema)}`;
    let messages = [{ role: "user", content: user }];
    let res;
    for (let i = 0; i < 4; i++) {
      res = await c.beta.messages.create({
        ...base,
        output_config: withFormat ? { effort: store.settings.effort, format: { type: "json_schema", schema } } : { effort: store.settings.effort },
        messages,
      });
      if (res.stop_reason !== "pause_turn") break;
      // Server tools paused mid-turn: send the turn back so the server resumes it.
      messages = [{ role: "user", content: user }, { role: "assistant", content: res.content }];
    }
    if (res.stop_reason === "refusal") throw new TutorError("The tutor couldn't create that exercise. Try another link or topic.");
    return parseJSON(res.content);
  };
  try {
    try {
      return await run(true);
    } catch (err) {
      // Some accounts don't allow structured outputs together with web tools: retry as plain JSON.
      if (tools && AnthropicLib && err instanceof AnthropicLib.BadRequestError && /format|output_config|structured/i.test(err.message)) return await run(false);
      throw err;
    }
  } catch (err) {
    if (tools && AnthropicLib && err instanceof AnthropicLib.BadRequestError && /web_(search|fetch)|tool/i.test(err.message)) {
      throw new TutorError("Web reading isn't enabled for your API key. In console.anthropic.com → Settings → Privacy, allow web search / web fetch, then try again. (" + err.message + ")");
    }
    throw friendlyError(err);
  }
}

// Trusted French-learning sites the tutor may search.
export const TRUSTED_SITES = [
  "formation-tcfcanada.com", "reussir-tcfcanada.com", "francaisfacile.rfi.fr", "rfi.fr", "apprendre.tv5monde.com", "tv5monde.com", "1jour1actu.com",
  "francetvinfo.fr", "lemonde.fr", "bonjourdefrance.com", "lepointdufle.net", "france-education-international.fr",
  "podcastfrancaisfacile.com", "francaisauthentique.com", "connexionfrancaise.com", "lefigaro.fr", "20minutes.fr",
];

function webTools(web, domains) {
  const t = [{ type: "web_fetch_20260209", name: "web_fetch", max_uses: 3, max_content_tokens: 30000 }];
  if (web === "search") t.unshift({ type: "web_search_20260209", name: "web_search", max_uses: 3, ...(domains ? { allowed_domains: domains } : {}) });
  return t;
}

function parseJSON(content) {
  // Use the text written after the last tool result (earlier text may be "let me fetch…").
  let lastTool = -1;
  content.forEach((b, i) => { if (/_tool_result$/.test(b.type)) lastTool = i; });
  const texts = content.slice(lastTool + 1).filter((b) => b.type === "text").map((b) => b.text).join("");
  const all = texts || content.filter((b) => b.type === "text").map((b) => b.text).join("");
  try { return JSON.parse(all); } catch { /* try to extract */ }
  const m = all.match(/\{[\s\S]*\}/);
  if (m) { try { return JSON.parse(m[0]); } catch { /* fall through */ } }
  throw new TutorError("The tutor's answer was incomplete. Please try again.");
}

// ---------- JSON schemas for generated exercises ----------
export const QUIZ_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["questions"],
  properties: {
    questions: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["question", "options", "answer", "explanation"],
        properties: {
          question: { type: "string" },
          options: { type: "array", items: { type: "string" } },
          answer: { type: "integer" },
          explanation: { type: "string" },
        },
      },
    },
  },
};

export const READING_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["title", "text", "glossary", "questions"],
  properties: {
    title: { type: "string" },
    text: { type: "string" },
    glossary: {
      type: "array",
      items: {
        type: "object", additionalProperties: false, required: ["fr", "en"],
        properties: { fr: { type: "string" }, en: { type: "string" } },
      },
    },
    questions: QUIZ_SCHEMA.properties.questions,
  },
};

export const PLACEMENT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["level", "summary", "weakPoints"],
  properties: {
    level: { type: "string", enum: ["A1", "A2", "A2+", "B1", "B1+", "B2-", "B2"] },
    summary: { type: "string" },
    weakPoints: { type: "array", items: { type: "string" } },
  },
};

export const WRITING_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["corrected", "errors", "score", "level", "feedback", "upgrade"],
  properties: {
    corrected: { type: "string" },
    errors: {
      type: "array",
      items: {
        type: "object", additionalProperties: false, required: ["original", "fix", "why"],
        properties: { original: { type: "string" }, fix: { type: "string" }, why: { type: "string" } },
      },
    },
    score: { type: "integer", description: "0-25, DELF style" },
    level: { type: "string" },
    feedback: { type: "string" },
    upgrade: { type: "string", description: "The same text rewritten at a solid B2 level" },
  },
};

export const PRONUN_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["score", "tips"],
  properties: {
    score: { type: "integer", description: "0-100" },
    tips: { type: "array", items: { type: "string" } },
  },
};
