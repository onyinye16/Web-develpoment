# 🇫🇷 Madame Claire: AI French Tutor (A2 → B2 in 60 days)

A phone app (installable Progressive Web App) that works as a full French teacher:

| Feature | What it does |
|---|---|
| 🏠 **Daily mission** | A ~2.5 h/day plan: flashcards, lesson, quiz, speaking, reading, listening, writing, conversation. Tracks streak, XP and minutes. |
| 📚 **60-day curriculum** | 8 weeks, 32 grammar lessons (A2 present tense up to B2 subjunctive, si-clauses, reported speech, register, idioms). "Teach me more" gives a deep AI lesson with exercises. |
| 🧠 **Flashcards (spaced repetition)** | ~165 high-frequency A2–B2 words and phrases with native French audio. The SM-2 algorithm shows each card again just before you would forget it. |
| 📝 **Quizzes** | An offline grammar bank, plus unlimited AI quizzes on this week's grammar, any lesson, or **your own weak points** (recorded automatically from your mistakes). |
| 🗣️ **Speaking** | A pronunciation drill (listen, repeat, get a score and see which words you missed) and **voice role-plays**: café, apartment hunting, job interview, doctor, debate, and a full **DELF B2 oral simulation**. The tutor listens, corrects you and replies out loud. |
| 📖 **Reading** | Offline texts, plus AI-generated texts on any topic at your level, with a glossary, audio and comprehension questions. |
| 🎧 **Dictation** | Hear a sentence, type it, then see the accent-sensitive errors highlighted. |
| ✍️ **Writing** | DELF-style correction: every error with an explanation, a score out of 25, an estimated CEFR level and a **B2 rewrite** of your text. |
| 💬 **Free chat** | Talk about anything by text or voice. Every message gets a correction, and new words are taught in context. |
| 🎯 **Placement test** | 5 open questions, spoken or typed. The AI estimates your CEFR level and your weak points. |

Runs offline for flashcards, lessons, quizzes, reading library, dictation and pronunciation. The AI features need internet.

## Install it on your phone

1. **Host it** (free): in GitHub go to **Settings → Pages → Deploy from branch → `main` / root**.
   The app will be at `https://<your-username>.github.io/Web-develpoment/french-tutor/`.
   (Netlify or Vercel also work. Drag the `french-tutor` folder in.)
2. Open that URL on your phone:
   - **Android (Chrome):** menu ⋮ → **Install app / Add to Home screen**
   - **iPhone (Safari):** Share → **Add to Home Screen**
3. Open the app, paste your **Anthropic API key** (console.anthropic.com → API Keys) and take the placement test.

> The key is stored only on your phone and sent only to `api.anthropic.com`. Set a monthly spend limit in the Anthropic Console.
> For speech recognition, use **Chrome on Android** or **Safari on iPhone** and allow microphone access.

## AI model and cost

- The default is **Claude Opus 5.5** (best teaching quality). You can switch to Sonnet 5.5 or Haiku 5.5 in Settings for lower cost.
- "Response depth" defaults to *Quick* (`effort: low`), which suits conversation. Use *Thorough* for deep grammar lessons.
- Server-side refusal fallbacks are enabled for Opus and Sonnet, so if a request is ever declined it is retried automatically on a fallback model.

## Honest note on "A2 → B2 in 2 months"

B2 usually takes about **400–600 study hours from A2**. In 60 days that is roughly **3 hours every day, without skipping**, which is why the daily plan is ~2.5 h plus immersion: French podcasts, series with French subtitles, and your phone set to French. It is aggressive but doable for a committed learner. The app makes every one of those hours count by focusing on speaking output, immediate correction and spaced repetition. If life gets in the way, the same plan takes you to a solid B1+ and you can keep going.

## Tech

Plain HTML/CSS/JS with no build step. It uses the official Anthropic JS SDK (`@anthropic-ai/sdk`, loaded from esm.sh), the Web Speech API for French TTS and speech recognition, `localStorage` for progress, and a service worker for offline use.

```
french-tutor/
├── index.html            app shell + bottom tab bar
├── manifest.webmanifest  makes it installable
├── sw.js                 offline cache
├── css/styles.css        mobile-first UI, light/dark mode
└── js/
    ├── app.js            all screens
    ├── curriculum.js     8-week plan, grammar, vocab, quizzes, texts
    ├── tutor.js          Claude integration (streaming + structured outputs)
    ├── speech.js         French voice + speech recognition + scoring
    └── store.js          progress, streaks, spaced repetition
```

Run locally: `cd french-tutor && python3 -m http.server 8000` and open http://localhost:8000.
