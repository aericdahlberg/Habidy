# CLAUDE.md — Hab-Idy

## What This Is

An AI habit coach that helps users build real habits using the Atomic Habits framework.
Target user: college students.

Opening line: **"How can I help you be the person you want to be?"**
Core framing: habits are votes for the person you want to become. Success is a lagging
indicator of daily actions. Identity-based habits outlast goal-based ones.

Core moment: User walks away from first session with concrete habits, specific cues,
and a clear identity they're building toward.

---

## The Screens

```
AUTH
  /login          → Email/password sign in + sign up

NEW USER FLOW
  /welcome        → Identity + habits philosophy, CTA to start onboarding
  /              → Identity input: "I want to be someone who..."
                    (also accessible via + button on dashboard for adding new identity)

AGENTS
  /constellation  → Insights agent (dynamic investigator, formerly Constellation)
  /architect      → Habit builder (outputs 2–3 habit suggestions)

CORE APP
  /dashboard      → Habit cards with identity banners, swipe right/left/up
  /add-habit      → Proposed habits + generate new suggestions (unlocked at 7-day streak)
  /explore        → Reflection input + profile context builder
  /profile        → User profile + sign out
```

Nothing else gets built until the auth and new user flow work end-to-end.

---

## Docs

| File | Contents |
|------|----------|
| `AGENTS.md` | Insights agent + Architect system prompts, rules, and behavior |
| `DATA.md` | Database schema (all tables) + API routes + file structure |
| `BUILD.md` | Tech stack, build order, prompting guide |
| `SCREENS.md` | Exact spec for all screens |

---

## Tech Stack

- **Framework:** Next.js 14 (App Router) + TypeScript
- **Styling:** Tailwind CSS
- **Database:** Supabase (Postgres + Auth)
- **AI:** Anthropic Claude API (`claude-sonnet-4-6`)
- **Hosting:** Vercel
- **Auth:** Supabase email/password (built-in Auth, no custom auth routes)

---

## Auth Model

- Supabase Auth handles all authentication
- Session is stored via Supabase's built-in mechanism (cookies)
- `user.id` from Supabase session is used everywhere — no localStorage for user identity
- `middleware.ts` at the root protects all routes except `/login`
- After signup → check `users.new_user`:
  - `true` → redirect to `/welcome`, then set `new_user = false`
  - `false` → redirect to `/dashboard`

---

## Conventions

- All Claude API calls go through `lib/claude.ts` only
- Agent system prompts live in `lib/agents/constellation.ts` and `lib/agents/architect.ts`
- Log every tool call and its return value — not just errors — via `lib/logger.ts`
- Assert tool outputs before passing to model: empty = stop, never hallucinate
- Use the existing `supabase` client from `lib/supabase.ts` — never create a new one
- No `any` types. Ever.
- Components stay under 100 lines — break up anything larger
- Env vars in `.env.local` only, never hardcoded

---

## What Is Explicitly OUT of Scope

Do not build these:

- ❌ Google Calendar integration
- ❌ Notion integration
- ❌ Habit Breaker agent
- ❌ Analytics / Insights page
- ❌ Social / friend streaks
- ❌ Widgets
- ❌ Push notifications
- ❌ App blocking
- ❌ RAG / vector database
- ❌ OKR tracking
- ❌ Morning ritual screen
- ❌ Google OAuth (email/password only for now)
