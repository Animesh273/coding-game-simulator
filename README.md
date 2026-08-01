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

### Providers

Four modes, resolved automatically in this order:

| Mode | Key lives | Notes |
|---|---|---|
| **This site** | Server-side env var | Visitors need no key. Preferred when configured. |
| **Groq** | Visitor's browser | Free tier, very fast. `llama-3.3-70b-versatile` / `llama-3.1-8b-instant`. |
| **Anthropic** | Visitor's browser | `claude-opus-5`. Highest quality, paid. |
| **Built-in coach** | — | No AI. Authored explanations. Always the floor. |

### Server-side AI (`api/chat.ts`)

**Free by default. It cannot bill you unless you explicitly opt in.**

With no variable set the endpoint makes no upstream call at all — it returns 501 and the client uses the authored coach. The deployment costs nothing.

```
GROQ_API_KEY=gsk_...          # free tier, no card. Over quota it 429s. Cannot bill you.

ANTHROPIC_API_KEY=sk-ant-...  # billed per token, PER VISITOR, no natural ceiling
AI_ALLOW_PAID=true            # ...and ignored entirely without this second switch
```

The `AI_ALLOW_PAID` gate exists so a key pasted in by habit — or inherited from another project on the same Vercel account — can never start charging silently. If both keys are present, Groq wins: the deployment should never reach for the one that bills.

**A visitor's own key never costs you anything**, whichever provider they choose. Server-side is the only mode you pay for.

These are **not** `VITE_` prefixed, so they stay on the server and never reach the bundle. That is the whole point: it is the only way a static site can offer AI without shipping a spendable credential.

The function normalises Groq's OpenAI-style SSE and Anthropic's event stream into one plain-text stream, so the browser parses neither dialect and swapping providers needs no client change.

**Groq's free tier is 30 req/min, 6,000 tokens/min, 14,400/day — measured per *organisation*, not per user.** At roughly 800 tokens per mentor reply that is about seven replies a minute shared across every visitor. Fine for a class; not fine for a public link. The client treats a 429 as routine rather than an error and hands straight to the built-in coach, so the game never shows a failure the student can do nothing about.

### Keys pasted by a visitor

Stored in that browser's `localStorage` and sent only to the provider, never to this site's server. Still readable by anyone with devtools on that machine — fine for your own key, not for a shared one. The server-side option above exists precisely so visitors never need to paste anything.

---

## Accounts & progress sync (optional)

Without an account the game is entirely local — progress lives in that browser's `localStorage`. Connecting a Supabase project adds email/password sign-in and cross-device sync. **The app runs identically with no project connected**, so this is genuinely optional.

### Setup

1. **Create a project** at [supabase.com](https://supabase.com) (free tier is ample).
2. **Run the schema.** Dashboard → SQL Editor → New query → paste [`supabase/schema.sql`](supabase/schema.sql) → Run. This creates `profiles` and `saves` and — importantly — the row-level security policies.
3. **Copy the credentials.** Project Settings → API → *Project URL* and the **`anon` / public** key.
4. **Add them as environment variables** in Vercel (Settings → Environment Variables), and locally in a `.env` file:

   ```
   VITE_SUPABASE_URL=https://xxxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGci...
   ```
5. **Redeploy.** The account badge on the Profile screen becomes a sign-in.

### Why the anon key is safe in the browser, and the AI key is not

`VITE_` variables are inlined into the shipped JavaScript, so **the anon key is public**. That is how Supabase is designed: it identifies the project and nothing more, and every table is guarded by row-level security policies enforced by Postgres. A signed-in user can only read or write their own row no matter what the client asks for.

That is the opposite of an Anthropic API key, which grants spend and must never reach the browser. Never put a Supabase **`service_role`** key in a `VITE_` variable either — that one bypasses RLS and is a real secret.

### Merging, not overwriting

Signing in **merges** the local save with the account rather than replacing it. Monotonic values take the maximum, collections take the union, per-skill mastery keeps whichever side has more attempts, and each revision card keeps its most recent review. Someone who grinds offline on a phone and then signs in on a laptop never watches a level disappear. Fifteen checks in the smoke suite pin this down, including symmetry and the empty-account case.

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
