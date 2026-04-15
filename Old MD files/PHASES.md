# PHASES.md — Build Order & MVP Scope

## The Rule

Build the smallest thing that proves the core value proposition.
Core value: **A user can have a meaningful conversation about who they want to be,
and walk away with one concrete habit to start tomorrow.**

Everything else is Phase 2 or 3.

---

## Phase 1 — MVP (Build This First)

**Goal:** Working app, deployable, demonstrates the full core loop.
**Timeline estimate:** 3-5 weeks with Claude Code assistance.

### What to build:

```
✅ Auth (Supabase email + Google OAuth)
✅ Onboarding flow (5 screens, saves user profile)
✅ Constellation agent (chat interface + memory)
✅ Habit Builder / Architect (guided 6-step flow)
✅ Habit Dashboard (card view + swipe/tap logging + streaks)
✅ RAG knowledge base (seed atomic_habits + motivation categories)
✅ Agent guard layer (logging + assertions)
✅ Basic progress visualization (streak, 7-day dots, momentum score)
✅ Mobile-responsive design throughout
```

### What NOT to build yet:
```
❌ Habit Breaker (Phase 2)
❌ Google Calendar integration (Phase 2)
❌ Notion integration (Phase 2)
❌ Daily Planner / Navigator (Phase 2)
❌ Push notifications (Phase 2)
❌ Screen time / location data (Phase 3 — requires native app)
❌ Weekly insight emails (Phase 2)
```

### Definition of done for Phase 1:
A new user can:
1. Sign up and complete onboarding
2. Have a conversation with Constellation about their life
3. Use Architect to build their first habit
4. See that habit on their dashboard
5. Log it as complete
6. See their streak and progress

---

## Phase 2 — Full Web App

**Goal:** Complete feature set on web. Real integrations. Retention mechanics.

```
🔲 Habit Breaker / Analyst agent
🔲 Google Calendar integration (read + write)
🔲 Notion integration (read tasks)
🔲 Daily Planner / Navigator agent
🔲 Push notifications / daily nudge
🔲 Weekly insight summary
🔲 "Your Patterns" card (after 3 Constellation sessions)
🔲 Milestone celebrations (7, 30, 66, 100 days)
🔲 success_habits RAG category seeded
🔲 Eval suite running on CI
🔲 Built-in task list (fallback for users without Notion)
```

---

## Phase 3 — Native Mobile (React Native / Capacitor)

**Goal:** Mobile-native features that require OS-level access.

```
🔲 Screen time data (iOS Screen Time API / Android Digital Wellbeing)
🔲 Location data (patterns: where are you when you do/don't do habits)
🔲 Native push notifications with smart timing
🔲 Widget: today's habits on home screen
🔲 Apple Health / Google Fit integration
🔲 Offline support
```

---

## Build Order Within Phase 1

Start here, in this order:

1. **Project setup** — Next.js + Supabase + Tailwind + TypeScript
2. **Auth** — sign up, login, session handling
3. **Database schema** — run migrations for all Phase 1 tables
4. **Agent guard layer** — build this before any agent, not after
5. **RAG pipeline** — embed + seed documents, verify retrieval works
6. **Onboarding flow** — UI + data saving
7. **Constellation agent** — chat UI + memory system
8. **Habit Builder** — 6-step guided flow
9. **Habit Dashboard** — cards + logging
10. **Progress visualization** — streaks, dots, momentum score
11. **Polish + mobile responsive**
12. **Deploy to Vercel**

---

## Prompting Strategy for Claude Code (Phase 1)

Start each Claude Code session with the feature you're building.
Example openers:

```
"I'm building the onboarding flow. See docs/FEATURES.md Feature 1 for the spec.
Build the React components for the 5-screen flow and the API route to save the
user profile. Use Supabase for persistence."

"Build the agent guard layer described in docs/ARCHITECTURE.md.
Create /src/lib/agentGuard.ts with the wrapper function and
/src/lib/logger.ts for structured logging to the tool_logs table."

"Build the Constellation chat interface. The agent spec is in docs/AGENTS.md Agent 1.
System prompt lives in /src/lib/agents/constellation.ts.
Chat UI goes in /src/features/constellation/ConstellationChat.tsx."
```

Always reference the docs. Claude Code will read them and follow the spec.

---

## Updated Phase 1 MVP (Revised Scope)

Add these to Phase 1 based on new notes:

```
✅ OKR view — goal → habits mapping (simple version, no Notion yet)
✅ Color coding system — goal categories with color tags on all habit cards
✅ Morning ritual / launch pad screen
✅ Energy check-in on morning screen (1-5, informs suggestions)
✅ "What's working" weekly summary (AI-generated, end of week)
✅ Habit difficulty self-report on log ("How easy was this today?")
```

These add < 1 week of build time and dramatically improve the demo quality.

## Phase 2 Additions (from new notes)

```
🔲 Reflection agent — weekly check-in, pattern analysis
🔲 Analytics / Insights page — full OKR progress, hours per goal
🔲 Friend streaks (social, opt-in)
🔲 Calendar-aware busy week detection + habit simplification
🔲 Travel mode — auto-simplified habits when traveling
🔲 Widget (iOS + Android home screen) — requires native app shell
🔲 Notion task import + AI task scheduling
🔲 Time tracking per goal category
```

## Phase 3 (Native App Required)

```
🔲 App blocking / focus mode (iOS Screen Time, Android Digital Wellbeing)
🔲 Screen time analysis
🔲 Location patterns
🔲 Native push notifications with smart timing
🔲 Home screen widget (full native)
🔲 Apple Health / Google Fit integration
```
