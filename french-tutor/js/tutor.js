// AI tutor: talks to Claude through the official Anthropic TypeScript/JS SDK.
// The SDK is loaded lazily so the offline parts of the app work without network.

import { store } from "./store.js";
import { WEEKS } from "./curriculum.js";

const SDK_URL = "https://esm.sh/@anthropic-ai/sdk@1.2.0";
let AnthropicLib = null;
let client = null;
let clientKey = null;

async function getClient() {
  const key = store.settings.apiKey;
  if (!key) throw new TutorError("Add your Anthropic API key in Settings to use the AI tutor.");
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

export class TutorError extends Error {}

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

export function systemPrompt(extra = "") {
  const s = store.settings;
  const p = store.progress;
  return `You are "Madame Claire", an expert, warm and demanding French teacher (native speaker, DELF/DALF examiner, 20 years of experience).
Your mission: take this learner from ${p.level} to B2 in 60 days with an intensive method (spaced repetition, active recall, comprehensible input slightly above their level, lots of speaking output, and immediate correction).

Learner profile:
- Current estimated level: ${p.level}
- Day ${dayNumber()} of 60 — current week topic: ${currentWeek().title} (${currentWeek().grammar.join(", ")})
- Native/support language: ${s.supportLang}
- Known weak points: ${p.weakPoints.slice(-8).join("; ") || "none recorded yet"}

Teaching rules:
1. Speak mainly in French at a level just above the learner's (i+1). Use ${s.supportLang} only for short grammar explanations or when the learner is clearly lost.
2. ALWAYS correct mistakes. When the learner writes or says something in French, start with a short correction block:
   ✏️ Correction: <corrected sentence>
   💡 <one-line reason in ${s.supportLang}>
   If there was no mistake, write "✅ Parfait !" instead. Then continue the conversation.
3. Keep replies short and conversational (2–5 sentences) unless asked to explain or generate an exercise. End most replies with a question that pushes the learner to speak.
4. Introduce 1–2 useful new words or expressions per reply, in **bold**, with a translation in brackets.
5. Recycle grammar from the current week whenever natural.
6. Be encouraging but honest. Never fake praise.
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

/** Ask for JSON matching `schema` (structured outputs). */
export async function askJSON(prompt, schema, { system } = {}) {
  const c = await getClient();
  const model = store.settings.model;
  try {
    const res = await c.beta.messages.create({
      model,
      max_tokens: 16000,
      system: system || systemPrompt("When asked to produce an exercise, output ONLY the requested JSON."),
      output_config: { effort: store.settings.effort, format: { type: "json_schema", schema } },
      messages: [{ role: "user", content: prompt }],
      ...fallbackParams(model),
    });
    if (res.stop_reason === "refusal") throw new TutorError("The tutor couldn't create that exercise. Try again.");
    const text = res.content.filter((b) => b.type === "text").map((b) => b.text).join("");
    return JSON.parse(text);
  } catch (err) {
    throw friendlyError(err);
  }
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
