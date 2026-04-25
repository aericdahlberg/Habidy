# CLAUDE.md — Hab-Idy

## What This Is

**Hab-Idy: Designing a Habit & Identity System for Students.**

An AI mentor that helps users align their daily habits with the person they want to become.
Core belief: **"Life is a lagging measure of your habits."**
Opening question to every new user: **"How can I help you be the person you want to be?"**

Target user: College students. Initial launch at Boston University, then all universities.

Key insight from user research: Most students don't have a productivity problem —
**they have a direction problem.** Goals feel possible only in a future with a "better"
schedule, never today. Hab-Idy fixes that.

**This is not a productivity tool. It is an identity tool.** Every feature should reinforce
that the user is *becoming* someone — habits are the proof of that identity, not tasks.
Grounded in *Atomic Habits* (James Clear): identity → cue → craving → action → reward.

---

## Pain Points We Solve

1. Goals feel unclear and hard to start — vague identity, no exploration framework
2. Can't break goals into habits — missing the psychological framework (Atomic Habits)
3. Implementation breaks down — habits feel generic, no connection to real life
4. Tracking feels like work — reminders get annoying, manual logging gets abandoned
5. Life disrupts streaks — no flexibility for low-energy days, schedule shifts
6. No visible progress — users quit when they can't see movement

Competitive advantage: No existing product makes **identity the core of habit formation**.
Most tools manage tasks — they don't guide who you're becoming.

---

## The Screens

```
AUTH
  /login          → Email/password sign in + sign up

NEW USER FLOW
  /welcome        → Identity + habits philosophy, CTA to start onboarding
  /               → Identity input: "I want to be someone who..."
                    (also accessible via + button on dashboard for new identity)

AGENTS
  /constellation  → Identity Gatherer (dynamic investigator)
  /architect      → Habit builder (outputs 2–3 habit suggestions)

CORE APP
  /dashboard      → Habit cards with identity banners, swipe right/left/up
  /add-habit      → Proposed habits + generate new suggestions (unlocked at 7-day streak)
  /explore        → Reflection input + profile context builder
  /profile        → User profile + sign out
```

Nothing else gets built until auth and the new user flow work end-to-end.

---

## Docs

| File | Contents |
|------|----------|
| `docs/AGENTS.md` | All agents — personas, system prompts, rules, evals |
| `docs/SCREENS.md` | Exact spec for every screen |
| `docs/DATA.md` | Database schema, API routes, file structure |
| `docs/BUILD.md` | Build order, tech stack, prompting guide |
| `docs/ARCHITECTURE.md` | System architecture diagram and data flow |

---

## Tech Stack

- **Framework:** Next.js 16 (App Router) + TypeScript
- **Styling:** Tailwind CSS 4
- **Database:** Supabase (Postgres + Auth + RLS)
- **AI:** Anthropic Claude API (default: `claude-sonnet-4-6`) — OpenAI also supported
- **Model switching:** Set `AGENT_MODEL` env var to swap models without code changes
- **Evals / Tracing:** LangSmith (`langsmith`) — traces every agent call
- **Hosting:** Vercel

---

## Environment Variables

| Variable | Required | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | ✓ | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✓ | Supabase publishable key |
| `SUPABASE_SERVICE_ROLE_KEY` | ✓ | Server-side admin key (bypasses RLS) |
| `ANTHROPIC_API_KEY` | ✓ | Claude API key |
| `OPENAI_API_KEY` | optional | Only needed if AGENT_MODEL is an OpenAI model |
| `AGENT_MODEL` | optional | Defaults to `claude-sonnet-4-6`. Supports claude-haiku-4-5-20251001, claude-sonnet-4-6, claude-opus-4-6, gpt-4o, gpt-4o-mini |
| `LANGCHAIN_TRACING_V2` | optional | Set to `true` to enable LangSmith tracing |
| `LANGCHAIN_API_KEY` | optional | LangSmith API key |
| `LANGCHAIN_PROJECT` | optional | LangSmith project name (e.g. `Habidy-Prompt-Eval`) |

---

## Auth Model

- Supabase Auth handles all authentication
- Session stored via Supabase's built-in cookies
- `user.id` from Supabase session is used everywhere — never localStorage for identity
- `proxy.ts` at the root protects all routes except `/login`
- After signup → check `users.new_user`:
  - `true` → redirect to `/welcome`, then set `new_user = false`
  - `false` → redirect to `/dashboard`

---

## Coding Conventions

- TypeScript everywhere — no `any` types, ever
- All Claude API calls go through `lib/claude.ts` only — never call the API directly
- Agent system prompts live in `lib/agents/constellation.ts` and `lib/agents/architect.ts`
- Log every tool call and its return value — not just errors — via `lib/logger.ts`
- Assert tool outputs before passing to model: empty = stop, never hallucinate
- All server-side Supabase calls use `adminClient()` from `lib/supabase.ts` — never the browser client in API routes
- Browser Supabase client (`supabase`) is for client components only (auth, reads with RLS)
- Components stay under 100 lines — break up anything larger
- Env vars in `.env` only, never hardcoded

---

## Design Principles

1. **Friction-free** — logging a habit should take under 3 seconds
2. **Identity over action** — always tie habits to who the user is becoming
3. **Show progress constantly** — users quit when they don't see movement
4. **One thing at a time** — never overwhelm; single habit, single win per session
5. **Warm, not clinical** — supportive friend, not a productivity dashboard
6. **Purposeful AI** — always make clear to the user *why* the AI is involved

---

## What Is Explicitly Out of Scope (for now)

- ❌ Google Calendar / Notion integration
- ❌ RAG / vector database
- ❌ Analytics / Insights page
- ❌ Social / friend streaks
- ❌ Push notifications / widgets
- ❌ App blocking
- ❌ OKR tracking
- ❌ Morning ritual screen
- ❌ Google OAuth (email/password only for now)

---

## Working With Claude Code on This Project

Always run from the project root: `cd habidy`.
Claude Code reads `CLAUDE.md` automatically — no need to re-explain the project each session.

**Starting a session:**
```
"Today I'm building [feature]. The spec is in docs/[FILE].md.
Follow the existing patterns in [related file].
Before you start, tell me your plan."
```

**Rules for prompting:**
- One feature at a time. Scope tightly.
- Reference the relevant doc file, not the whole repo.
- If it touches the DB, reference `docs/DATA.md`.
- If it touches an agent, reference `docs/AGENTS.md`.
- Ask Claude to state its plan before writing any code.
- Review diffs before approving — Claude moves fast.
