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
  /login                  → Email/password sign in + sign up

NEW USER ONBOARDING (6 screens)
  /welcome                → Redirect bridge: new_user = false → /onboarding
  /onboarding             → Welcome screen with mascot + "Get Started"
  /onboarding/profile     → Name, DOB, gender, address, permissions, T&C
  /onboarding/philosophy  → Brand story: identity-first habits, 1% better
  /onboarding/identity    → "How do you describe yourself today and in 1 year?"
  /onboarding/questionnaire → 3-page survey: focus, day structure, existing habits
  /onboarding/loading     → Saves data to DB, then redirects to /mode-select

MODE SELECTION + QUICK FLOW
  /mode-select            → Choose engagement mode: quick (2 min) / guided (7 min) / deep (20 min)
  /quick-habit            → 2-minute form for "I know what I want" mode → pre-generates habits → /architect

AGENTS
  /constellation          → Identity Gatherer — guided (5Q) or deep (15Q) mode based on sessionStorage
  /architect              → Habit builder — embla carousel, 5 habits, pick up to 2

CORE APP (bottom nav)
  /dashboard              → Morning greeting, motivational quote, progress bar,
                            SwipeCheckIn on first visit, habit checklist + streak
  /explore                → Floating bubble categories, Talk to agent CTA,
                            reflection textarea → POST /api/explore
  /social                 → Friends' habit completion, friend requests, add by email
  /profile                → User profile (Supabase data), identity, sign out

UNLOCKED AT STREAK
  /add-habit              → Proposed habits from Architect (unlocked at 7-day streak)
```

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
- **Styling:** Tailwind CSS 4 (CSS-first config via `@theme {}` in globals.css)
- **UI Library:** shadcn/ui (49 components in `components/ui/`) + framer-motion animations
- **Database:** Supabase (Postgres + Auth + RLS)
- **AI:** Anthropic Claude API (default: `claude-sonnet-4-6`) — OpenAI also supported
- **Model switching:** Set `AGENT_MODEL` env var to swap models without code changes
- **Evals / Tracing:** LangSmith (`langsmith`) — traces every agent call
- **Fonts:** Nunito (headings) + Quicksand (body) via Google Fonts
- **Hosting:** Vercel

**No Zustand.** All data comes from Supabase. Temporary onboarding state uses `sessionStorage` only.

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

- Supabase Auth handles all authentication (email/password only)
- Session stored via Supabase's built-in cookies (`@supabase/ssr`)
- `user.id` from Supabase session is used everywhere — never localStorage for identity
- `proxy.ts` at the root protects all routes except `/login`
- After signup → check `users.new_user`:
  - `true` → redirect to `/welcome` → which immediately redirects to `/onboarding`
  - `false` + has `identity_statement` → redirect to `/dashboard`
  - `false` + no `identity_statement` → redirect to `/onboarding`

---

## Components

```
components/
├── BottomNav.tsx         5-tab nav: Home / Explore / Coach (mascot) / Social / Profile
├── ChatInterface.tsx     Reusable chat for Constellation + Architect agents
├── HabitCard.tsx         Habit display: swipe gestures, survey sheet, streak dots
├── HabitLimitModal.tsx   Shown when user tries to add a habit past the limit
├── NavBar.tsx            Old 4-tab nav (kept for reference — BottomNav is now primary)
├── StreakDots.tsx         7-day dot visualization
├── SwipeCheckIn.tsx      Framer Motion swipe card stack for daily check-in
└── ui/                   49 shadcn/ui components (button, card, dialog, etc.)

hooks/
├── use-mobile.tsx        useIsMobile() breakpoint hook
└── use-toast.ts          Toast notification hook
```

---

## Coding Conventions

- TypeScript everywhere — avoid `any`, use it only for third-party library compatibility
- All Claude API calls go through `lib/claude.ts` only — never call the API directly
- Agent system prompts live in `lib/agents/constellation.ts` and `lib/agents/architect.ts`
- Log every tool call and its return value — not just errors — via `lib/logger.ts`
- Assert tool outputs before passing to model: empty = stop, never hallucinate
- All server-side Supabase calls use `adminClient()` from `lib/supabase.ts` — never the browser client in API routes
- Browser Supabase client (`supabase`) is for client components only (auth, reads with RLS)
- Add `'use client'` to any component that uses hooks, framer-motion, or browser APIs
- Env vars in `.env` only, never hardcoded

---

## Color Scheme

- **Base:** off-white `#F7F7F7` (`--background: 0 0% 97%`)
- **Cards:** pure white (`--card: 0 0% 100%`)
- **Primary accent:** teal (`--primary: 168 72% 48%`)
- **Secondary accent:** purple (`--secondary: 270 80% 65%`)
- **Muted:** light gray `#ECEEF2` (`--muted: 220 14% 93%`)
- **Screen gradients:**
  - Onboarding: `from-teal-50 to-purple-50`
  - Constellation: `from-teal-50 to-white`
  - Architect: `from-purple-50 to-white`
  - Welcome: `from-amber-50 via-white to-teal-50`
  - Dashboard / Explore / Social / Profile: flat `#F7F7F7`

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
- ❌ Push notifications / widgets
- ❌ App blocking
- ❌ OKR tracking
- ❌ Morning ritual screen
- ❌ Google OAuth (email/password only for now)
- ❌ Communities / group challenges (social screen shows it as "coming soon")

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
