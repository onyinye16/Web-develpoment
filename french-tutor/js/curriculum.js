// Curriculum: an 8-week (60-day) intensive path from A2 to B2.
// Built-in content works offline; the AI tutor expands on every topic on demand.

export const WEEKS = [
  {
    week: 1, level: "A2", title: "Solid foundations",
    goal: "Lock in the present tense, articles, and everyday conversation.",
    grammar: ["present-tense", "articles-gender", "negation", "questions"],
    themes: ["Introductions & personal life", "Daily routine", "Food & shopping"],
    speaking: "Introduce yourself for 2 minutes without stopping.",
    tcf: "Discover the TCF format: CO/CE A1–A2 items · EE task 1 (message) · EO task 1 (guided interview)",
  },
  {
    week: 2, level: "A2+", title: "Talking about the past",
    goal: "Master passé composé vs. imparfait and tell short stories.",
    grammar: ["passe-compose", "imparfait", "pc-vs-imparfait", "reflexive-verbs"],
    themes: ["Childhood memories", "Weekend & holidays", "Travel"],
    speaking: "Tell the story of your last holiday in 3 minutes.",
    tcf: "CO/CE A2–B1 practice daily · EE task 1 + task 2 (story with passé composé/imparfait) · EO task 1",
  },
  {
    week: 3, level: "B1", title: "Future & pronouns",
    goal: "Speak about plans and replace nouns with pronouns naturally.",
    grammar: ["futur-proche-simple", "object-pronouns", "y-en", "comparatives"],
    themes: ["Work & studies", "Plans & ambitions", "Health"],
    speaking: "Explain your 5-year plan and justify your choices.",
    tcf: "CO/CE B1 · EE task 2 · EO task 2 (asking questions politely)",
  },
  {
    week: 4, level: "B1", title: "Hypotheses & opinions",
    goal: "Use the conditional, express opinions, agree and disagree.",
    grammar: ["conditionnel", "si-clauses-1-2", "relative-pronouns", "opinion-phrases"],
    themes: ["Environment", "Technology", "Media"],
    speaking: "Give your opinion on social media for 3 minutes, with examples.",
    tcf: "First full mock exam (diagnostic) · EE task 3 introduction · EO task 3 (opinion)",
  },
  {
    week: 5, level: "B1+", title: "The subjunctive",
    goal: "Understand and use the subjunctive after key triggers.",
    grammar: ["subjonctif-present", "subjonctif-triggers", "plus-que-parfait", "connectors"],
    themes: ["Society & culture", "Feelings & relationships", "Education"],
    speaking: "Give advice to a friend using 'il faut que' and 'je te conseille de'.",
    tcf: "CO/CE B1–B2 · EE task 3 (summarise two opinions + yours) · EO tasks 2–3",
  },
  {
    week: 6, level: "B2-", title: "Complex sentences",
    goal: "Build longer, connected sentences and narrate with precision.",
    grammar: ["si-clause-3", "conditionnel-passe", "gerondif", "passive-voice"],
    themes: ["Economy & work world", "Politics (basics)", "Cities & housing"],
    speaking: "Describe a regret: 'Si j'avais su, j'aurais…' – 3 minutes.",
    tcf: "CO/CE B2 items + timing strategy · EE full 60-min mock · EO task 3 with counter-arguments",
  },
  {
    week: 7, level: "B2", title: "Argue & persuade",
    goal: "Structure an argument (thèse / antithèse / synthèse) orally and in writing.",
    grammar: ["reported-speech", "concession", "cause-consequence", "advanced-relatives"],
    themes: ["Debates", "Science", "Globalisation"],
    speaking: "Debate: 'Le télétravail est-il l'avenir ?' – defend both sides.",
    tcf: "B2–C1 stretch items · second full mock (all tests) · fix the weak points it shows",
  },
  {
    week: 8, level: "B2", title: "Fluency & exam readiness",
    goal: "Polish fluency, idioms and register, and take full TCF mock exams.",
    grammar: ["register-formal-informal", "idioms", "nuance-adverbs", "review-all"],
    themes: ["TCF mock exams", "Current events", "Free conversation"],
    speaking: "Full TCF oral (3 tasks, 12 min) with the examiner.",
    tcf: "Two full TCF mocks in exam conditions · review every error · EO all 3 tasks timed",
  },
];

// Grammar lessons (concise built-in explanations + examples).
export const GRAMMAR = {
  "present-tense": {
    title: "Le présent (regular & key irregular verbs)",
    explain: "Regular -ER verbs: drop -er, add -e, -es, -e, -ons, -ez, -ent. -IR (finir): -is, -is, -it, -issons, -issez, -issent. -RE (vendre): -s, -s, -, -ons, -ez, -ent. Learn the big irregulars by heart: être, avoir, aller, faire, pouvoir, vouloir, devoir, savoir, prendre, venir.",
    examples: [["Je parle français tous les jours.", "I speak French every day."], ["Nous finissons à 18h.", "We finish at 6pm."], ["Ils font du sport le week-end.", "They do sport at the weekend."]],
  },
  "articles-gender": {
    title: "Articles & gender",
    explain: "Definite: le, la, l', les. Indefinite: un, une, des. Partitive (some): du, de la, de l', des. After a negation, un/une/du/de la/des become DE: Je n'ai pas DE voiture. Tip: learn every noun WITH its article.",
    examples: [["Je bois du café le matin.", "I drink (some) coffee in the morning."], ["Elle n'a pas de frères.", "She has no brothers."], ["J'adore la musique.", "I love music."]],
  },
  "negation": {
    title: "La négation",
    explain: "ne … pas (not), ne … jamais (never), ne … plus (no longer), ne … rien (nothing), ne … personne (nobody), ne … que (only). In spoken French, 'ne' is often dropped: 'Je sais pas'.",
    examples: [["Je ne fume plus.", "I don't smoke anymore."], ["Il ne mange que des légumes.", "He only eats vegetables."], ["Personne n'est venu.", "Nobody came."]],
  },
  "questions": {
    title: "Asking questions",
    explain: "3 registers: intonation (Tu viens ?), est-ce que (Est-ce que tu viens ?), inversion (Viens-tu ?). Question words: qui, que/quoi, où, quand, comment, pourquoi, combien, quel(le)(s).",
    examples: [["Où est-ce que tu habites ?", "Where do you live?"], ["Pourquoi apprends-tu le français ?", "Why are you learning French?"], ["Quelle heure est-il ?", "What time is it?"]],
  },
  "passe-compose": {
    title: "Le passé composé",
    explain: "avoir/être (present) + past participle. Use ÊTRE with movement verbs (DR & MRS VANDERTRAMP: devenir, revenir, monter, rester, sortir, venir, aller, naître, descendre, entrer, rentrer, tomber, retourner, arriver, mourir, partir) and all reflexive verbs. With être, the participle agrees with the subject.",
    examples: [["J'ai mangé une pizza.", "I ate a pizza."], ["Elle est partie hier.", "She left yesterday."], ["Nous nous sommes levés tôt.", "We got up early."]],
  },
  "imparfait": {
    title: "L'imparfait",
    explain: "Stem = 'nous' form of present minus -ons, + -ais, -ais, -ait, -ions, -iez, -aient. Only irregular stem: être → ét-. Used for descriptions, habits, ongoing background actions in the past.",
    examples: [["Quand j'étais petit, je jouais au foot.", "When I was little, I used to play football."], ["Il faisait beau.", "The weather was nice."], ["Nous habitions à Lyon.", "We lived in Lyon."]],
  },
  "pc-vs-imparfait": {
    title: "Passé composé vs. imparfait",
    explain: "Imparfait = the background / the scene / habits (what WAS happening). Passé composé = the events / completed actions (what HAPPENED). Classic pattern: 'Je dormais quand le téléphone a sonné.'",
    examples: [["Je lisais quand tu as appelé.", "I was reading when you called."], ["Il pleuvait, alors nous sommes restés.", "It was raining, so we stayed."], ["Tous les étés, on allait à la mer.", "Every summer, we used to go to the sea."]],
  },
  "reflexive-verbs": {
    title: "Les verbes pronominaux",
    explain: "Reflexive pronoun matches the subject: me, te, se, nous, vous, se. Se lever, se coucher, s'habiller, se souvenir de, s'intéresser à. Passé composé always with être.",
    examples: [["Je me réveille à 7h.", "I wake up at 7."], ["Tu te souviens de lui ?", "Do you remember him?"], ["Elles se sont amusées.", "They had fun."]],
  },
  "futur-proche-simple": {
    title: "Futur proche & futur simple",
    explain: "Futur proche: aller + infinitive (near/sure future). Futur simple: infinitive + -ai, -as, -a, -ons, -ez, -ont. Irregular stems: ser- (être), aur- (avoir), ir- (aller), fer- (faire), pourr-, voudr-, devr-, saur-, viendr-, verr-.",
    examples: [["Je vais partir demain.", "I'm going to leave tomorrow."], ["Un jour, je parlerai couramment.", "One day I will speak fluently."], ["Quand tu seras là, on mangera.", "When you are here, we'll eat."]],
  },
  "object-pronouns": {
    title: "COD & COI pronouns",
    explain: "Direct (COD): me, te, le/la/l', nous, vous, les. Indirect (COI, after 'à'): me, te, lui, nous, vous, leur. Placed before the conjugated verb (or before the infinitive). Order: me/te/se/nous/vous > le/la/les > lui/leur > y > en.",
    examples: [["Je le vois.", "I see him/it."], ["Je lui parle.", "I speak to him/her."], ["Je vais te l'envoyer.", "I'm going to send it to you."]],
  },
  "y-en": {
    title: "Les pronoms Y et EN",
    explain: "Y replaces à + thing/place (J'y vais). EN replaces de + noun, partitives and quantities (J'en veux deux). Il y a, ça m'en fait…",
    examples: [["Tu vas à Paris ? Oui, j'y vais.", "Going to Paris? Yes, I'm going there."], ["Du pain ? J'en achète.", "Bread? I buy some."], ["J'en ai besoin.", "I need it."]],
  },
  "comparatives": {
    title: "Comparatifs & superlatifs",
    explain: "plus/moins/aussi + adj + que. Superlative: le/la/les plus/moins + adj. Irregular: bon → meilleur → le meilleur; bien → mieux → le mieux; mauvais → pire.",
    examples: [["Paris est plus grand que Lyon.", "Paris is bigger than Lyon."], ["C'est le meilleur restaurant.", "It's the best restaurant."], ["Elle chante mieux que moi.", "She sings better than me."]],
  },
  "conditionnel": {
    title: "Le conditionnel présent",
    explain: "Future stem + imperfect endings (-ais, -ais, -ait, -ions, -iez, -aient). Uses: politeness (Je voudrais), wishes, advice (Tu devrais), hypotheses.",
    examples: [["Je voudrais un café, s'il vous plaît.", "I would like a coffee, please."], ["Tu devrais te reposer.", "You should rest."], ["J'aimerais vivre en France.", "I'd love to live in France."]],
  },
  "si-clauses-1-2": {
    title: "Phrases avec SI (types 1 & 2)",
    explain: "Type 1 (real): si + présent → futur/présent/impératif. Type 2 (unreal present): si + imparfait → conditionnel. NEVER 'si + conditionnel'.",
    examples: [["S'il pleut, je resterai à la maison.", "If it rains, I'll stay home."], ["Si j'avais de l'argent, je voyagerais.", "If I had money, I would travel."], ["Si tu veux, viens !", "If you want, come!"]],
  },
  "relative-pronouns": {
    title: "Pronoms relatifs: qui, que, où, dont",
    explain: "QUI = subject. QUE = direct object. OÙ = place or time. DONT = replaces de + noun (parler de, avoir besoin de).",
    examples: [["Le livre que je lis est génial.", "The book I'm reading is great."], ["La ville où je suis né.", "The city where I was born."], ["Le film dont je t'ai parlé.", "The film I told you about."]],
  },
  "opinion-phrases": {
    title: "Exprimer son opinion",
    explain: "À mon avis, Selon moi, Je pense/crois que + indicatif, Je ne pense pas que + subjonctif, Il me semble que, D'un côté… de l'autre…, Je suis d'accord / pas d'accord avec…",
    examples: [["À mon avis, c'est une bonne idée.", "In my opinion, it's a good idea."], ["Je ne pense pas que ce soit vrai.", "I don't think it's true."], ["D'un côté c'est pratique, de l'autre c'est cher.", "On one hand it's practical, on the other it's expensive."]],
  },
  "subjonctif-present": {
    title: "Le subjonctif présent (formation)",
    explain: "Stem: 'ils' form of present minus -ent, + -e, -es, -e, -ions, -iez, -ent. Irregulars: être (sois), avoir (aie), aller (aille), faire (fasse), pouvoir (puisse), savoir (sache), vouloir (veuille).",
    examples: [["Il faut que tu viennes.", "You have to come."], ["Je veux que vous soyez heureux.", "I want you to be happy."], ["Bien qu'il fasse froid, je sors.", "Although it's cold, I'm going out."]],
  },
  "subjonctif-triggers": {
    title: "Quand utiliser le subjonctif",
    explain: "After expressions of necessity (il faut que), will (vouloir que), emotion (être content que), doubt (douter que), and conjunctions: bien que, pour que, avant que, à condition que, sans que. NOT after: espérer que, après que, penser que (affirmative).",
    examples: [["Je suis content que tu sois là.", "I'm happy you're here."], ["Je parle lentement pour que tu comprennes.", "I speak slowly so you understand."], ["J'espère que tu vas bien.", "I hope you're well. (indicative!)"]],
  },
  "plus-que-parfait": {
    title: "Le plus-que-parfait",
    explain: "avoir/être in imparfait + past participle. An action that happened BEFORE another past action.",
    examples: [["Quand je suis arrivé, le film avait commencé.", "When I arrived, the film had started."], ["Elle était déjà partie.", "She had already left."], ["Je n'avais jamais vu ça.", "I had never seen that."]],
  },
  "connectors": {
    title: "Connecteurs logiques",
    explain: "Addition: de plus, en outre. Opposition: cependant, pourtant, en revanche. Cause: parce que, puisque, car, grâce à, à cause de. Consequence: donc, c'est pourquoi, par conséquent. Conclusion: en somme, pour conclure.",
    examples: [["Il est fatigué ; pourtant, il continue.", "He's tired; yet he continues."], ["Grâce à toi, j'ai réussi.", "Thanks to you, I succeeded."], ["Par conséquent, nous devons agir.", "Consequently, we must act."]],
  },
  "si-clause-3": {
    title: "SI type 3 (regrets)",
    explain: "si + plus-que-parfait → conditionnel passé. Unreal past.",
    examples: [["Si j'avais su, je serais venu.", "If I had known, I would have come."], ["S'il avait étudié, il aurait réussi.", "If he had studied, he would have passed."], ["Si on était partis plus tôt, on n'aurait pas raté le train.", "If we had left earlier, we wouldn't have missed the train."]],
  },
  "conditionnel-passe": {
    title: "Le conditionnel passé",
    explain: "avoir/être in conditionnel + past participle. Regrets, reproaches (Tu aurais dû…), unconfirmed information in news (Le président aurait démissionné).",
    examples: [["J'aurais aimé te voir.", "I would have liked to see you."], ["Tu aurais dû me le dire.", "You should have told me."], ["Il y aurait eu dix blessés.", "There were reportedly ten injured."]],
  },
  "gerondif": {
    title: "Le gérondif",
    explain: "en + present participle (nous-stem + -ant). Simultaneity, manner, condition. Irregulars: étant, ayant, sachant.",
    examples: [["J'écoute de la musique en travaillant.", "I listen to music while working."], ["C'est en forgeant qu'on devient forgeron.", "Practice makes perfect."], ["En partant maintenant, tu arriveras à l'heure.", "If you leave now, you'll arrive on time."]],
  },
  "passive-voice": {
    title: "La voix passive",
    explain: "être (any tense) + past participle (agrees) + par. Often replaced in speech by 'on' or 'se faire'.",
    examples: [["La maison a été construite en 1900.", "The house was built in 1900."], ["Le projet sera présenté par Marie.", "The project will be presented by Marie."], ["Ça se fait souvent.", "That's often done."]],
  },
  "reported-speech": {
    title: "Le discours indirect",
    explain: "Tense shifts after a past reporting verb: présent → imparfait, passé composé → plus-que-parfait, futur → conditionnel. Pronouns and time words change (demain → le lendemain).",
    examples: [["Il a dit qu'il était fatigué.", "He said he was tired."], ["Elle m'a demandé si je viendrais.", "She asked me if I would come."], ["Ils ont expliqué qu'ils avaient perdu les clés.", "They explained they had lost the keys."]],
  },
  "concession": {
    title: "La concession",
    explain: "bien que / quoique + subjonctif; même si + indicatif; malgré + nom; avoir beau + infinitif; quand même, tout de même.",
    examples: [["Bien qu'il soit riche, il est malheureux.", "Although he's rich, he's unhappy."], ["Malgré la pluie, on est sortis.", "Despite the rain, we went out."], ["J'ai beau essayer, je n'y arrive pas.", "No matter how hard I try, I can't do it."]],
  },
  "cause-consequence": {
    title: "Cause & conséquence (avancé)",
    explain: "Cause: étant donné que, vu que, du fait que, faute de. Consequence: si bien que, de sorte que, tellement… que, d'où, entraîner, provoquer.",
    examples: [["Vu qu'il pleut, on reste.", "Given that it's raining, we're staying."], ["Il a tellement travaillé qu'il est épuisé.", "He worked so much that he's exhausted."], ["Faute de temps, je n'ai pas fini.", "For lack of time, I didn't finish."]],
  },
  "advanced-relatives": {
    title: "Lequel, auquel, duquel",
    explain: "After prepositions for things: avec lequel, dans laquelle, grâce auquel, à côté duquel. Ce qui / ce que / ce dont = 'what'.",
    examples: [["L'outil avec lequel je travaille.", "The tool I work with."], ["Ce qui m'intéresse, c'est la culture.", "What interests me is culture."], ["Ce dont j'ai besoin, c'est du repos.", "What I need is rest."]],
  },
  "register-formal-informal": {
    title: "Registres de langue",
    explain: "Soutenu (formal writing), courant (standard), familier (everyday speech). Familier: ouais, bouquin, boulot, bagnole, ça marche, t'inquiète. Formal letter: 'Je vous prie d'agréer, Madame, Monsieur, l'expression de mes salutations distinguées.'",
    examples: [["J'ai pas le temps. (familier)", "I don't have time."], ["Je n'ai pas le temps. (courant)", "I don't have time."], ["Je ne dispose pas du temps nécessaire. (soutenu)", "I do not have the necessary time."]],
  },
  "idioms": {
    title: "Expressions idiomatiques",
    explain: "Idioms make you sound natural. Learn them in context and reuse them in conversation.",
    examples: [["Avoir le cafard.", "To feel down."], ["Coûter les yeux de la tête.", "To cost an arm and a leg."], ["Poser un lapin à quelqu'un.", "To stand someone up."], ["Être dans la lune.", "To be daydreaming."], ["Avoir du pain sur la planche.", "To have a lot of work to do."]],
  },
  "nuance-adverbs": {
    title: "Nuancer son discours",
    explain: "plutôt, assez, vraiment, carrément, à peine, sans doute (=probably!), sans aucun doute (=certainly), en effet, d'ailleurs, quant à, en fait.",
    examples: [["C'est plutôt intéressant.", "It's rather interesting."], ["Il viendra sans doute.", "He'll probably come."], ["D'ailleurs, je l'avais dit.", "Besides, I had said so."]],
  },
  "review-all": {
    title: "Révision générale",
    explain: "Mix all tenses and structures. Ask the AI tutor for a mixed B2 review quiz and a mock DELF B2 written task.",
    examples: [["Si j'avais su que tu viendrais, j'aurais préparé un gâteau.", "If I had known you'd come, I'd have made a cake."], ["Bien qu'il ait plu, nous avons passé une excellente journée.", "Although it rained, we had a great day."]],
  },
};

// Built-in vocabulary deck (high-frequency A2→B2 words & phrases).
// [french, english, level]
export const VOCAB = [
  ["bonjour", "hello", "A2"], ["merci beaucoup", "thank you very much", "A2"], ["s'il vous plaît", "please (formal)", "A2"],
  ["d'accord", "okay / agreed", "A2"], ["le travail", "work", "A2"], ["la maison", "house / home", "A2"],
  ["la voiture", "car", "A2"], ["le repas", "meal", "A2"], ["le petit-déjeuner", "breakfast", "A2"],
  ["le déjeuner", "lunch", "A2"], ["le dîner", "dinner", "A2"], ["la semaine", "week", "A2"],
  ["le week-end", "weekend", "A2"], ["l'année (f)", "year", "A2"], ["aujourd'hui", "today", "A2"],
  ["demain", "tomorrow", "A2"], ["hier", "yesterday", "A2"], ["souvent", "often", "A2"],
  ["parfois", "sometimes", "A2"], ["toujours", "always / still", "A2"], ["jamais", "never", "A2"],
  ["déjà", "already", "A2"], ["encore", "again / still", "A2"], ["beaucoup", "a lot", "A2"],
  ["un peu", "a little", "A2"], ["vite", "quickly", "A2"], ["lentement", "slowly", "A2"],
  ["acheter", "to buy", "A2"], ["vendre", "to sell", "A2"], ["payer", "to pay", "A2"],
  ["chercher", "to look for", "A2"], ["trouver", "to find", "A2"], ["attendre", "to wait", "A2"],
  ["comprendre", "to understand", "A2"], ["apprendre", "to learn", "A2"], ["oublier", "to forget", "A2"],
  ["se souvenir de", "to remember", "A2"], ["se lever", "to get up", "A2"], ["se coucher", "to go to bed", "A2"],
  ["se dépêcher", "to hurry", "A2"], ["avoir besoin de", "to need", "A2"], ["avoir envie de", "to feel like", "A2"],
  ["avoir raison", "to be right", "A2"], ["avoir tort", "to be wrong", "A2"], ["avoir faim / soif", "to be hungry / thirsty", "A2"],
  ["le voyage", "trip", "B1"], ["la gare", "train station", "B1"], ["l'aéroport (m)", "airport", "B1"],
  ["le billet", "ticket", "B1"], ["réserver", "to book", "B1"], ["louer", "to rent", "B1"],
  ["le loyer", "rent", "B1"], ["le quartier", "neighbourhood", "B1"], ["le métier", "profession", "B1"],
  ["l'entreprise (f)", "company", "B1"], ["le salaire", "salary", "B1"], ["un entretien", "an interview", "B1"],
  ["le chômage", "unemployment", "B1"], ["les études (f)", "studies", "B1"], ["réussir", "to succeed / pass", "B1"],
  ["échouer", "to fail", "B1"], ["la santé", "health", "B1"], ["le médecin", "doctor", "B1"],
  ["avoir mal à", "to have a pain in", "B1"], ["guérir", "to heal / cure", "B1"], ["l'environnement (m)", "environment", "B1"],
  ["le réchauffement climatique", "global warming", "B1"], ["recycler", "to recycle", "B1"], ["les déchets (m)", "waste", "B1"],
  ["la pollution", "pollution", "B1"], ["un ordinateur", "computer", "B1"], ["un réseau social", "social network", "B1"],
  ["télécharger", "to download", "B1"], ["les actualités (f)", "news", "B1"], ["un journal", "newspaper", "B1"],
  ["à mon avis", "in my opinion", "B1"], ["selon moi", "according to me", "B1"], ["je suis d'accord", "I agree", "B1"],
  ["en revanche", "on the other hand", "B1"], ["pourtant", "yet / however", "B1"], ["donc", "so / therefore", "B1"],
  ["grâce à", "thanks to", "B1"], ["à cause de", "because of", "B1"], ["au lieu de", "instead of", "B1"],
  ["il s'agit de", "it's about", "B1"], ["se rendre compte", "to realise", "B1"], ["se plaindre", "to complain", "B1"],
  ["s'inquiéter", "to worry", "B1"], ["se débrouiller", "to manage / get by", "B1"], ["profiter de", "to make the most of", "B1"],
  ["éviter", "to avoid", "B1"], ["empêcher", "to prevent", "B1"], ["améliorer", "to improve", "B1"],
  ["augmenter", "to increase", "B1"], ["diminuer", "to decrease", "B1"], ["le bonheur", "happiness", "B1"],
  ["la confiance", "trust / confidence", "B1"], ["un souvenir", "a memory / souvenir", "B1"], ["un rêve", "a dream", "B1"],
  ["cependant", "however", "B2"], ["néanmoins", "nevertheless", "B2"], ["toutefois", "however", "B2"],
  ["par conséquent", "consequently", "B2"], ["en outre", "furthermore", "B2"], ["d'ailleurs", "besides / moreover", "B2"],
  ["quant à", "as for", "B2"], ["à condition que", "provided that (+subj)", "B2"], ["bien que", "although (+subj)", "B2"],
  ["afin que", "so that (+subj)", "B2"], ["malgré", "despite", "B2"], ["étant donné que", "given that", "B2"],
  ["un enjeu", "a stake / issue", "B2"], ["un défi", "a challenge", "B2"], ["une mesure", "a measure", "B2"],
  ["la croissance", "growth", "B2"], ["les inégalités (f)", "inequalities", "B2"], ["le pouvoir d'achat", "purchasing power", "B2"],
  ["la mondialisation", "globalisation", "B2"], ["le télétravail", "remote work", "B2"], ["un débat", "a debate", "B2"],
  ["soutenir", "to support / argue", "B2"], ["prétendre", "to claim", "B2"], ["remettre en question", "to call into question", "B2"],
  ["mettre en place", "to set up / implement", "B2"], ["tenir compte de", "to take into account", "B2"], ["faire face à", "to face", "B2"],
  ["entraîner", "to lead to / cause", "B2"], ["susciter", "to arouse / provoke", "B2"], ["s'avérer", "to turn out to be", "B2"],
  ["davantage", "more", "B2"], ["désormais", "from now on", "B2"], ["autrefois", "in the past / formerly", "B2"],
  ["actuellement", "currently (not 'actually'!)", "B2"], ["éventuellement", "possibly (not 'eventually'!)", "B2"], ["en fait", "in fact / actually", "B2"],
  ["avoir le cafard", "to feel down", "B2"], ["poser un lapin", "to stand someone up", "B2"], ["coûter les yeux de la tête", "to cost a fortune", "B2"],
  ["avoir du pain sur la planche", "to have a lot on one's plate", "B2"], ["tomber dans les pommes", "to faint", "B2"], ["être dans la lune", "to daydream", "B2"],
  ["ça vaut le coup", "it's worth it", "B2"], ["j'en ai marre", "I'm fed up", "B2"], ["c'est pas la peine", "it's not worth it / no need", "B2"],
];

// Built-in grammar quiz bank (offline). [question, options, answerIndex, explanation, topic]
export const QUIZ = [
  ["Hier, je ___ au cinéma.", ["vais", "suis allé", "allais", "irai"], 1, "A completed action yesterday → passé composé with être (aller).", "passe-compose"],
  ["Quand j'étais petit, je ___ au foot tous les jours.", ["ai joué", "jouerai", "jouais", "joue"], 2, "Repeated habit in the past → imparfait.", "imparfait"],
  ["Je n'ai pas ___ voiture.", ["une", "de", "la", "du"], 1, "After negation, un/une/des → de.", "articles-gender"],
  ["Il faut que tu ___ tes devoirs.", ["fais", "feras", "fasses", "faisais"], 2, "'Il faut que' triggers the subjunctive: que tu fasses.", "subjonctif-triggers"],
  ["Si j'avais le temps, je ___ plus.", ["lis", "lirai", "lirais", "lisais"], 2, "Si + imparfait → conditionnel.", "si-clauses-1-2"],
  ["Si j'avais su, je ___ venu.", ["serais", "suis", "étais", "aurais"], 0, "Si + plus-que-parfait → conditionnel passé; venir uses être: je serais venu.", "si-clause-3"],
  ["Le film ___ je t'ai parlé est génial.", ["que", "qui", "dont", "où"], 2, "Parler DE quelque chose → dont.", "relative-pronouns"],
  ["Tu vas à la boulangerie ? Oui, j'___ vais.", ["en", "y", "le", "lui"], 1, "Y replaces a place (à la boulangerie).", "y-en"],
  ["Tu veux du café ? Oui, j'___ veux.", ["y", "le", "en", "la"], 2, "EN replaces du/de la/des + noun.", "y-en"],
  ["Je parle à Marie → Je ___ parle.", ["la", "le", "lui", "leur"], 2, "Parler À quelqu'un → indirect pronoun lui.", "object-pronouns"],
  ["Elle est ___ intelligente ___ son frère.", ["plus / que", "plus / de", "autant / que", "très / que"], 0, "Comparative: plus + adj + que.", "comparatives"],
  ["C'est le ___ restaurant de la ville.", ["plus bon", "meilleur", "mieux", "bien"], 1, "Bon → meilleur (irregular).", "comparatives"],
  ["Je ___ un café, s'il vous plaît.", ["veux", "voudrais", "voulais", "voudrai"], 1, "Polite request → conditionnel: je voudrais.", "conditionnel"],
  ["Bien qu'il ___ fatigué, il travaille.", ["est", "soit", "était", "sera"], 1, "Bien que + subjonctif.", "concession"],
  ["J'espère que tu ___ bien.", ["ailles", "vas", "allais", "irais"], 1, "Espérer que + indicative (NOT subjunctive).", "subjonctif-triggers"],
  ["Quand je suis arrivé, il ___ déjà parti.", ["est", "était", "a", "avait"], 1, "Action before another past action → plus-que-parfait (était parti).", "plus-que-parfait"],
  ["J'écoute la radio ___ cuisinant.", ["pendant", "en", "par", "à"], 1, "Gérondif: en + participe présent.", "gerondif"],
  ["La lettre ___ écrite par Paul.", ["a", "est", "avait", "fait"], 1, "Passive: être + past participle.", "passive-voice"],
  ["Il a dit qu'il ___ le lendemain.", ["viendra", "viendrait", "vient", "venait"], 1, "Reported speech: futur → conditionnel.", "reported-speech"],
  ["___ la pluie, nous sommes sortis.", ["Bien que", "Malgré", "Même si", "Pourtant"], 1, "Malgré + noun.", "concession"],
  ["Nous nous sommes ___ tôt.", ["levé", "levés", "lever", "levons"], 1, "Reflexive in passé composé → être, participle agrees: levés.", "reflexive-verbs"],
  ["Demain, il ___ beau.", ["fera", "fait", "faisait", "ferait"], 0, "Future: faire → fer- → il fera.", "futur-proche-simple"],
  ["Je ne pense pas que ce ___ vrai.", ["est", "soit", "était", "sera"], 1, "Negative opinion verbs trigger the subjunctive.", "opinion-phrases"],
  ["Tu ___ dû me prévenir !", ["aurais", "avais", "auras", "as"], 0, "Reproach → conditionnel passé: tu aurais dû.", "conditionnel-passe"],
  ["Il a ___ travaillé qu'il est épuisé.", ["si", "tellement", "tant de", "très"], 1, "tellement + verb … que = so much that.", "cause-consequence"],
  ["L'outil avec ___ je travaille est cassé.", ["que", "qui", "lequel", "dont"], 2, "Preposition + thing → lequel.", "advanced-relatives"],
  ["'Actuellement' means…", ["actually", "currently", "eventually", "finally"], 1, "False friend! Actuellement = currently.", "nuance-adverbs"],
  ["'Il viendra sans doute' means…", ["He will definitely come", "He will probably come", "He won't come", "He came"], 1, "Sans doute = probably. Sans aucun doute = certainly.", "nuance-adverbs"],
];

// Short offline reading texts with questions.
export const READINGS = [
  {
    level: "A2", title: "Le marché du samedi",
    text: "Tous les samedis matin, Claire va au marché de son quartier. Elle aime l'ambiance : les vendeurs crient leurs prix et l'odeur du pain frais remplit la rue. D'habitude, elle achète des fruits, des légumes et du fromage. Aujourd'hui, elle a aussi acheté des fleurs pour sa mère, parce que c'est son anniversaire. Après le marché, Claire boit toujours un café avec son amie Inès.",
    questions: [
      ["Quand Claire va-t-elle au marché ?", ["Le dimanche soir", "Le samedi matin", "Tous les jours", "Le vendredi"], 1],
      ["Pourquoi a-t-elle acheté des fleurs ?", ["Pour sa maison", "Pour Inès", "Pour l'anniversaire de sa mère", "Elle aime les fleurs"], 2],
      ["Que fait-elle après le marché ?", ["Elle rentre dormir", "Elle boit un café avec une amie", "Elle va travailler", "Elle cuisine"], 1],
    ],
  },
  {
    level: "B1", title: "Le télétravail",
    text: "Depuis quelques années, de plus en plus de Français travaillent depuis chez eux. Selon une étude récente, près d'un salarié sur trois pratique le télétravail au moins un jour par semaine. Les avantages sont nombreux : moins de temps passé dans les transports, plus de flexibilité et parfois une meilleure concentration. Cependant, certains se sentent isolés et ont du mal à séparer vie professionnelle et vie privée. Beaucoup d'entreprises choisissent donc un modèle hybride.",
    questions: [
      ["Combien de salariés pratiquent le télétravail ?", ["Presque un sur trois", "La moitié", "Un sur dix", "Tous"], 0],
      ["Quel est un inconvénient mentionné ?", ["Le salaire baisse", "L'isolement", "Les transports", "Trop de réunions"], 1],
      ["Que choisissent beaucoup d'entreprises ?", ["Le bureau à 100 %", "Le télétravail total", "Un modèle hybride", "La semaine de 3 jours"], 2],
    ],
  },
  {
    level: "B2", title: "La sobriété numérique",
    text: "Alors que le numérique est souvent présenté comme une solution « immatérielle », son empreinte environnementale ne cesse de croître. La fabrication des appareils, bien plus que leur utilisation, représente l'essentiel de cet impact. C'est pourquoi les experts recommandent avant tout de prolonger la durée de vie de nos smartphones et ordinateurs. Bien que cette démarche suscite un intérêt croissant, elle se heurte à des habitudes de consommation profondément ancrées, encouragées par un marketing qui valorise sans cesse la nouveauté.",
    questions: [
      ["Selon le texte, qu'est-ce qui pèse le plus sur l'environnement ?", ["L'utilisation des appareils", "La fabrication des appareils", "Internet", "Le marketing"], 1],
      ["Que recommandent les experts ?", ["Acheter plus souvent", "Utiliser moins Internet", "Prolonger la durée de vie des appareils", "Recycler immédiatement"], 2],
      ["Quel obstacle est mentionné ?", ["Le prix", "Les habitudes de consommation", "Le manque d'experts", "La loi"], 1],
    ],
  },
];

// Sentences for pronunciation & dictation drills, by level.
export const SENTENCES = {
  A2: [
    "Je m'appelle Paul et j'habite à Paris.",
    "Le week-end, j'aime me promener au parc.",
    "Je voudrais un croissant et un café, s'il vous plaît.",
    "Hier soir, nous avons regardé un film.",
    "Il fait très beau aujourd'hui.",
    "Où se trouve la gare, s'il vous plaît ?",
  ],
  B1: [
    "Quand j'étais enfant, je passais mes vacances chez mes grands-parents.",
    "Si j'avais plus de temps, j'apprendrais à jouer du piano.",
    "À mon avis, les réseaux sociaux ont changé notre façon de communiquer.",
    "Je pense que nous devrions protéger davantage l'environnement.",
    "Le livre dont je t'ai parlé est vraiment passionnant.",
  ],
  B2: [
    "Bien que la situation soit compliquée, je reste optimiste quant à l'avenir.",
    "Si j'avais su que tu viendrais, j'aurais préparé un repas plus copieux.",
    "Il est essentiel que chacun prenne conscience des enjeux climatiques.",
    "Étant donné les circonstances, il vaudrait mieux reporter la réunion.",
    "Néanmoins, cette mesure a suscité de vives critiques de la part des syndicats.",
  ],
};

// The daily routine that makes the 60-day goal possible.
export const DAILY_PLAN = [
  { id: "srs", label: "Flashcards (spaced repetition)", minutes: 15, view: "cards" },
  { id: "lesson", label: "Today's grammar lesson", minutes: 20, view: "learn" },
  { id: "tcf-co", label: "TCF · Compréhension orale", minutes: 20, view: "tcf/co" },
  { id: "tcf-ce", label: "TCF · Compréhension écrite", minutes: 20, view: "tcf/ce" },
  { id: "tcf-ee", label: "TCF · Expression écrite", minutes: 25, view: "tcf/ee" },
  { id: "tcf-eo", label: "TCF · Expression orale (examiner)", minutes: 15, view: "tcf/eo" },
  { id: "speak", label: "Call your French local", minutes: 30, view: "speak" },
  { id: "quiz", label: "Grammar & structures quiz", minutes: 10, view: "quiz" },
];
