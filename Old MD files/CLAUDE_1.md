# CLAUDE.md — Hab-Idy

## What This App Is

**Hab-Idy: Designing a Habit & Identity System for Students.**

An AI mentor that helps users align their daily habits with the person they want to become.
Core belief: **"Life is a lagging measure of your habits."**
Opening question to every new user: **"How can I help you be the person you want to be?"**

Target user: College students (initial launch at Boston University, then all universities).
Key insight from user research: Most students don't have a productivity problem —
**they have a direction problem.** Goals feel possible only in a future with a "better"
schedule, never today. Hab-Idy fixes this.

Pain points we are solving:
1. Goals feel unclear and hard to start — vague identity, no exploration framework
2. Can't break goals into habits — missing psychological frameworks (Atomic Habits)
3. Implementation breaks down — habits feel unpersonalized, no connection to life/goals
4. Tracking feels like work — reminders get annoying, manual logging gets abandoned
5. Life disrupts streaks — no flexibility for vacations, low-energy days, schedule shifts
6. No visible progress — users quit when they can't see movement

Competitive advantage: No existing product makes **identity the core of habit formation**.
Most tools manage tasks — they don't guide who you're becoming.

This is not a productivity tool. It is an identity tool. Every feature should reinforce
that the user is *becoming* someone — habits are the proof of that identity, not just tasks.

Grounded in *Atomic Habits* (James Clear): identity → cue → craving → action → reward.

---

## Docs Index

All detailed documentation lives in `/docs/`. Read these before building any feature:

| File | What It Covers |
|------|---------------|
| `docs/ARCHITECTURE.md` | Full system architecture, data model, API routes |
| `docs/AGENTS.md` | All AI agents — personas, system prompts, guard rules |
| `docs/FEATURES.md` | Every feature spec in detail |
| `docs/RAG.md` | Knowledge base content and retrieval strategy |
| `docs/PHASES.md` | Build order, MVP scope, what to defer |
| `docs/PROMPTING.md` | How to prompt Claude Code effectively for this project |
| `docs/POSITIONING.md` | Product positioning, pain points, competitive landscape, revenue model |
| `docs/UX.md` | User flow, engagement hooks, widget specs, color coding, adaptive scheduling |

---

## Tech Stack

- **Frontend:** React + TypeScript + Tailwind CSS (Vite)
- **Backend:** Next.js (App Router, API routes)
- **Database:** Supabase (Postgres + Auth + Realtime + Storage)
- **AI:** Anthropic Claude API — model: `claude-sonnet-4-6`
- **RAG:** Supabase pgvector for embeddings + retrieval
- **Integrations (Phase 2):** Google Calendar API, Notion API
- **Hosting:** Vercel

---

## Coding Conventions

- TypeScript everywhere — no `any` types, ever
- Every Claude API call goes through `/src/lib/claude.ts` — never call the API directly in components
- All agent system prompts are named exports in `/src/lib/agents/[agentName].ts`
- **Log every tool call and its return value** — not just errors. Use `/src/lib/logger.ts`
- **Assert on tool outputs before passing to the model** — if retrieved text is empty, stop and handle gracefully
- Components: `/src/components/`, feature logic: `/src/features/[name]/`
- Keep components under 150 lines — break up anything larger
- All env vars in `.env.local`, never hardcoded

---

## Design Principles

1. **Friction-free** — logging a habit should take under 3 seconds
2. **Identity over action** — always tie habits to who the user is becoming
3. **Show progress constantly** — users quit when they don't see movement
4. **One thing at a time** — never overwhelm; single habit, single win per session
5. **Warm, not clinical** — supportive friend, not a productivity dashboard
6. **Purposeful AI** — always make clear to the user *why* the AI is involved and how it helps them

---

## Known Issues / Active TODO

- [ ] Initialize Next.js + Supabase project
- [ ] Set up auth (email + Google OAuth)
- [ ] Onboarding flow
- [ ] Constellation agent chat UI
- [ ] Habit dashboard + swipe logging
- [ ] Habit Builder guided flow
- [ ] RAG knowledge base + embeddings pipeline
- [ ] Agent guard layer (logging, assertions, evals)
