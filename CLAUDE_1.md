# CLAUDE.md — Hab-Idy MVP

## What This Is

An AI habit coach that builds one real habit with the user using the Atomic Habits
framework. Target user: college students.

Opening line: **"How can I help you be the person you want to be?"**
Core moment: User walks away from first session with ONE concrete habit, a specific
cue, and a scheduled time. That's the whole product.

## The 4 Screens (This Is Everything)

```
1. ONBOARDING    → Who do you want to be? One goal. Takes < 3 min.
2. CONSTELLATION → Free chat AI explorer. Helps user understand themselves.
3. ARCHITECT     → Full chat AI that builds one habit using Atomic Habits.
4. DASHBOARD     → Habit card(s) + swipe to log + streak counter.
```

Nothing else gets built until these 4 work end-to-end.

## Docs

| File | Contents |
|------|----------|
| `docs/SCREENS.md` | Exact spec for all 4 screens |
| `docs/AGENTS.md` | Constellation + Architect system prompts and rules |
| `docs/DATA.md` | Database schema (minimal) + API routes |
| `docs/BUILD.md` | Tech stack, build order, prompting guide |

## Tech Stack

- **Framework:** Next.js 14 (App Router) + TypeScript
- **Styling:** Tailwind CSS
- **Database:** Supabase (Postgres + Auth)
- **AI:** Anthropic Claude API (`claude-sonnet-4-6`)
- **Hosting:** Vercel
- **Auth:** Supabase email + Google OAuth

## Conventions

- All Claude API calls go through `/src/lib/claude.ts` only
- Agent system prompts live in `/src/lib/agents/constellation.ts` and `architect.ts`
- Log every tool call and its return value — not just errors — via `/src/lib/logger.ts`
- Assert tool outputs before passing to model: empty = stop, never hallucinate
- No `any` types. Ever.
- Components stay under 100 lines — break up anything larger
- Env vars in `.env.local` only, never hardcoded

## What Is Explicitly OUT of Scope for MVP

Do not build these until all 4 screens are working and deployed:

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
- ❌ Multiple habits (user gets ONE habit in MVP)
