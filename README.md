# ⚔️ ASCEND

**Level up to placement-ready.** A gamified, AI-mentored placement preparation RPG for engineering students — Duolingo's habit loop, LeetCode's substance, Chess.com's arena, wrapped in a progression system that makes the studying *be* the levelling.

Two language tracks, pointed at different goals:

| Track | Aimed at | What it drills |
|---|---|---|
| 🐍 **Python World** | **Development** | Syntax instincts, collections, OOP, and the shipping-code skills — exceptions, modules, virtualenvs, the GIL, logging |
| ⚡ **C++ Arena** | **Competitive programming** | Overflow, fast I/O, STL containers and algorithms, iterator invalidation, bitmasks, modular arithmetic, and what fits in the time limit |

…plus seven supporting worlds (DSA, SQL, OS, Networking, DBMS, Aptitude, HR) because placement rounds test all of it.

```bash
npm install
npm run dev      # → http://localhost:5173
npm run check    # typecheck + 99-check game-loop smoke suite
```

Fully playable with **no API key**. A key upgrades the mentor from authored coaching to a real conversational one (see [AI](#the-ai-layer)).

---

## The design problem

A quiz app asks "did you get it right?" and moves on. That produces a session, not a habit.

ASCEND is built around one question instead: **what makes a student open this tomorrow?** Every system below exists to answer it.

| Feeling | System that produces it |
|---|---|
| *"Just one more question."* | Combo multipliers that escalate to 3×, rising audio pitch per combo step, XP bursts that fly off correct answers |
| *"I unlocked a new skill."* | Skill trees where nodes light up at 35% prerequisite mastery — visible, always one node away |
| *"I'm levelling up."* | Quadratic XP curve tuned so the first session produces 2–3 level-ups, each dropping a chest |
| *"I'm getting interview-ready."* | Company boss interviews gated behind level, with real personas and a strike system |

The learning is not decoration on top of the game. **Getting a question wrong is what schedules it for revision**; mastery is what opens the next skill node; the difficulty engine is what keeps success near 75%.

---

## Systems

### Adaptive difficulty (`src/game/adaptive.ts`)

Every skill carries a latent ability estimate (`theta`) on the same 1–5 scale as question difficulty, updated Elo-style with a learning rate that decays as evidence accumulates. Question selection scores each candidate on four pulls:

- **Flow** — proximity to `theta + 0.45`, the offset that lands near a 75% success rate
- **Retention** — spaced-repetition due-ness, with repeatedly-failed cards pulled forward hard
- **Remediation** — inverse mastery, so weak skills surface more often
- **Variety** — a little noise, so consecutive sessions aren't scripted

A student sitting at 3.2 gets questions just above their reach. Not "hard mode", not a fixed ladder — the flow channel.

### Spaced repetition

SM-2 lite. A correct review pushes the interval out (1 → 3 → ×ease); a lapse resets it to **four hours**, so a mistake genuinely comes back the same day. Due cards feed the **Revision Dungeon**, which is the only run mode whose pool is built entirely from what you got wrong.

This is the mechanic that turns "every mistake becomes a learning opportunity" from a slogan into behaviour.

### Progression

- **XP curve** `80 + 42L + 5L²` — fast early, meaningful late
- **Ranks** Bronze → Silver → Gold → Platinum → Diamond → Master, with V–I divisions inside each
- **Combos** 3× cap at 20+, with named tiers (WARM → HOT → BLAZING → UNSTOPPABLE → LEGENDARY)
- **Chests** four rarities; drop luck scales with your daily streak
- **Streaks** 30-day login ladder with chest days at 3/7/30; freezes absorb exactly one missed day

### Content

**130 questions** across **9 worlds** and **47 skill nodes**, every one carrying four pieces of teaching payload:

- `explain` — why the right answer is right *and* why the tempting wrong one is tempting
- `hint` — a nudge that deliberately does not eliminate options
- `followUp` — the question a real interviewer would ask next
- `difficulty` — 1–5, feeding the adaptive engine

Worlds: 🐍 Python World · ⚡ C++ Arena · ⚔️ DSA Kingdom · 🗄️ SQL City · 🏔️ OS Mountain · 🌐 Networking Island · 💎 DBMS Depths · 🎯 Aptitude Arena · 🎙️ The HR Hall

### Never the same question twice — until the pool runs out

The selection engine strongly prefers material you have never been served: an unseen-question bonus that outweighs every other scoring term combined, plus a recency penalty that decays over 24 hours. Two back-to-back runs over the same world share **zero** questions, and once a pool is exhausted repeats are ordered least-recently-seen first.

**The honest limit is content, not the engine.** Python has 24 questions and a run serves 10, so around the third consecutive run in one world repeats become arithmetic rather than a bug. More questions is the only real fix — and adding one is appending an object to a file in `src/content/questions/`, which the smoke suite then validates.

### Learn, then practise

ASCEND started as test-only: you could be *quizzed* on a topic and read a post-mortem, but never actually **taught** it. Lessons close that gap.

Each lesson is paged one section at a time — concept, worked code, and a callout flagged as a **tip**, a **common trap**, or **in an interview**. The last page is a summary of key points plus a one-click *"Practise this now"* that starts a run on the same skill node with the material fresh. Finishing one pays XP and gems, once.

**13 lessons** cover both language tracks end to end — all 7 Python nodes and all 6 C++ nodes. The supporting worlds have questions but no lessons yet; the UI keys off that, so a node without one simply offers practice rather than advertising a page that doesn't exist. Adding a lesson is appending one object to a file in `src/content/lessons/`.

### Topics tracker

`Profile → Topics` answers the question a student actually has the week before a drive: **what have I not touched yet?** Coverage — questions seen out of questions available — is the headline metric, not skill. It breaks down per world and per skill node, filters by track (Development / Competitive / Fundamentals / Interview), and surfaces your least-covered unlocked topic with a one-click **Train it**.

### Boss interviews

Eight companies from `Seedling Labs` (level 2) to `Streamforge` (level 24), including `CodeClash Global` — a contest-round boss drawing on C++ and DSA, whose judge asks for your complexity before you have finished describing the approach. Each is an HP bar, a per-question timer, three strikes, and an interviewer persona that shapes how the AI behaves. The locked names with a visible level-progress bar underneath are, deliberately, the strongest pull in the game.

### Everything else

Daily missions (deterministic per day, so the board is stable across devices) · weekly challenges · 25 achievements across four tiers · avatar bases, colours, auras and earned titles · a simulated leaderboard whose rivals accrue XP as a function of how long you've been playing, so there is always someone just ahead.

---

## The AI layer

`src/ai/` — the mentor is **ARIA**, and its personality is a real design artifact, not a system prompt afterthought.

Rules baked into `prompts.ts`:

- Two to five sentences. This is a chat bubble in a game, not a textbook page.
- Tone adapts to a rolling confidence read: after a bad run it leads with what you got *right*; on a hot streak it skips reassurance and pushes harder.
- **A hint must never solve the question.** A hint that gives away the answer destroys the only thing that makes the next question feel earned.
- Never invents facts about a specific company's hiring process.

Technically: Claude **`claude-opus-5`** via `client.beta.messages.stream()`, with adaptive thinking at low effort for quick coaching and medium for interviews and debriefs. Streaming is not cosmetic — watching the mentor type is much of why it reads as a character rather than a database lookup. `stop_reason` is checked before content is trusted, and server-side fallbacks are enabled so a declined request is re-served rather than becoming an error.

**Without a key**, `offline.ts` composes coaching from each question's own teaching metadata plus your current state, typed out word-by-word through the identical code path. Components never know which one answered.

### ⚠️ API key security

ASCEND calls the Anthropic API **directly from the browser**, which needs `dangerouslyAllowBrowser` and means the key is visible to anyone with devtools access on that machine.

- **Fine:** you, running ASCEND locally, with your own key. It never leaves your browser's localStorage.
- **Not fine:** a deployed multi-user build with a key baked in.

For deployment, set **Proxy base URL** in AI Settings to a small backend you control that holds the key server-side; the SDK routes through it via `baseURL` and the key field can be left empty.

---

## Deploying

Deployed on **Vercel**. It auto-detects Vite, so no `vercel.json` is needed:

| Setting | Value |
|---|---|
| Framework preset | Vite |
| Build command | `npm run build` |
| Output directory | `dist` |
| Install command | `npm install` |

Every push to `main` triggers a redeploy.

**`base` must stay `/` in `vite.config.ts`.** Vercel serves from the domain root. A sub-path base (`'/repo-name/'`, which GitHub Pages needs) makes every asset request 404 and the page render blank with no console error to explain it — the HTML loads fine, it just points at URLs that do not exist.

**No environment variable is needed, and no API key should ever be added.** The mentor is bring-your-own-key, stored per visitor in their own browser. A static build cannot keep a secret: anything you put in an env var here is readable by every visitor in the shipped JavaScript. If you want visitors to get AI without their own key, that requires a serverless function holding the key server-side — a different architecture, not a config change.

## Verifying it

```bash
npm run check     # typecheck + full game-loop smoke test
```

`scripts/smoke.ts` drives the **real store** through a complete session — onboarding, a perfect run, a failing run, a won boss fight, a lost boss fight, quest claims, chest opens, purchases, reset — and asserts 99 invariants. It also validates the content (no duplicate ids, every answer index in range, every skill node reachable and populated, every question carrying an explanation and a hint) and the tuning that is easy to regress silently: back-to-back runs share no questions, a first-session player is never ranked last, playing sustains the streak without pressing Claim.

A green build says the types line up. This says the game plays.

```
PASS  99/99 checks passed
```

---

## Architecture

```
src/
  game/          pure logic, no React — progression, adaptive, quests,
                 achievements, avatar, leaderboard, types
  content/       worlds + skill trees, companies, questions/ (one file per domain)
  ai/            client (Claude, streaming) · prompts (personality) ·
                 offline (keyless coach) · mentor (unified façade)
  state/store.ts zustand + persist; the only place systems meet
  components/    shell (topbar, nav, celebration layer) + primitives
  screens/       map · world · battle · quests · arena · mentor · profile
  lib/sfx.ts     Web Audio synthesis — zero audio assets
  styles/        one handcrafted stylesheet; no UI framework
```

Two deliberate choices worth calling out:

**`src/game/` is React-free.** Every rule — XP curves, the Elo update, quest generation, achievement predicates — is a pure function testable without a renderer. That is why the smoke test can drive a full session headlessly.

**No CSS framework and no audio files.** The bundle is self-contained: the starfield, the aurora, the chest-opening light rays and every sound effect are generated. Sound in particular is doing real work — a rising pitch per combo step is the cheapest dopamine loop in game design, and it costs 0 bytes of assets.

### Extending it

Adding a question is appending one object to a file in `src/content/questions/` — the adaptive engine, revision scheduler, quests and mastery bars pick it up with no other changes. Adding a world is one entry in `worlds.ts` plus questions tagged to its skill ids. The smoke test will tell you if you've mis-wired either.

---

## Deliberate scope notes

- **Storage is `localStorage`, single-device.** No accounts, no sync. Clearing site data wipes the save, which the reset dialog says plainly.
- **The leaderboard is simulated** and labelled as such in the UI. Rivals are deterministic functions of elapsed play time, not real accounts — it exists to give a solo learner a race, not to imply a multiplayer service.
- **HR questions have judgement-call answers**, not factual ones. Their explanations teach the underlying principle rather than a rule.

## Licence

MIT.
