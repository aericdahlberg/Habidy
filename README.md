# Hab-Idy

**An AI-powered identity and habit system for college students.**

> *"Life is a lagging measure of your habits."* — James Clear

Hab-Idy is not a to-do app. It's an identity tool. Most students don't have a productivity problem — they have a direction problem. Goals feel possible only in a future with a "better" schedule, never today. Hab-Idy fixes that by helping users define who they want to become, then building habits around that identity using the Atomic Habits framework.

Initial launch at Boston University, then expanding to all universities.

---

## How It Works

1. **Onboarding** — The user answers questions about their identity, focus area, daily structure, and existing routines
2. **Identity Gatherer** — An AI coach investigates their real life: what gets in the way, what existing anchors they have, what would make a habit actually stick
3. **Architect** — A second AI agent designs exactly 2 habit proposals, each with a cue, a two-minute version, and an identity label
4. **Dashboard** — Daily check-in via swipe cards, streak tracking, and habit logging in under 3 seconds
5. **Explore** — Reflection summaries powered by a third agent that builds a running user profile over time

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) + TypeScript |
| Styling | Tailwind CSS 4 (CSS-first `@theme` config) + shadcn/ui |
| Animations | Framer Motion |
| Database | Supabase (Postgres + Auth + Row Level Security) |
| AI | Anthropic Claude API (`claude-sonnet-4-6` by default) |
| Tracing | LangSmith — every agent call is traced |
| Hosting | Vercel |

---

## Screens

```
/login                      Email/password auth
/onboarding                 6-screen onboarding flow
  /onboarding/profile       Name, DOB, permissions
  /onboarding/philosophy    Identity-first brand story
  /onboarding/identity      "Who do you want to become?"
  /onboarding/questionnaire Daily structure + existing habits survey
  /onboarding/loading       Saves to DB, redirects to Identity Gatherer

/constellation              Identity Gatherer agent (conversational)
/architect                  Architect agent — outputs 2 habit cards

/dashboard                  Greeting, streak, SwipeCheckIn, habit checklist
/explore                    Reflection + Explore agent
/social                     Friends' habit completions, friend requests
/profile                    Identity, settings, sign out
```

---

## Agent Architecture

### Identity Gatherer (`/constellation`)
Investigates the user's real life through a focused conversation. Tracks 7 internal fields: who they want to be, what that person does, what would make it enjoyable, their environment, a specific cue, a two-minute version, and their barriers. Produces an `IDENTITY_GATHERER_SUMMARY:` JSON blob that is handed off to Architect.

### Architect (`/architect`)
Receives the Identity Gatherer summary and designs exactly 2 habits using the `HABITS_READY:[...]` output format. Each habit has an identity label, habit name, cue (in "After I X, I will Y at Z" format), two-minute version, and category.

### Explore Agent (`/api/explore`)
Reads the user's reflection, previous logs, and habit history to produce a motivational summary and update the user's running profile context.

---

## Getting Started

### Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) project
- An [Anthropic](https://console.anthropic.com) API key
- A [LangSmith](https://smith.langchain.com) account (optional, for tracing)

### 1. Clone and install

```bash
git clone <repo-url>
cd habidy
npm install
```

### 2. Configure environment variables

Create a `.env.local` file at the project root:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Anthropic
ANTHROPIC_API_KEY=your_anthropic_api_key

# Model (optional — defaults to claude-sonnet-4-6)
# Supports: claude-haiku-4-5-20251001, claude-sonnet-4-6, claude-opus-4-6, gpt-4o, gpt-4o-mini
AGENT_MODEL=claude-sonnet-4-6

# LangSmith tracing (optional)
LANGCHAIN_TRACING_V2=true
LANGCHAIN_API_KEY=your_langsmith_api_key
LANGCHAIN_PROJECT=Habidy-Prompt-Eval
```

### 3. Run the development server

```bash
cd habidy
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Database Setup

Run migrations in order via the Supabase SQL editor (`supabase/migrations/`). The schema includes:

- `users` — profile, identity statement, onboarding state
- `habits` — user habits with cue, two-minute version, category, streak
- `habit_logs` — daily completion records
- `habit_survey_responses` — end-of-day reflection per habit
- `proposed_habits` — Architect suggestions not yet accepted
- `friendships` — social graph
- `tool_logs` — per-agent-call logging (model, input, output, duration)

---

## Evals

The `evals/` directory contains two evaluation scripts for testing AI quality.

### Prompt Quality Eval
Tests whether the agent **prompts themselves** are producing good behavior. Fixed model, variable conversation. Scores 7 criteria across both agents.

```bash
npm run eval:prompts
```

Fetches examples from the `Habidy-Identity-Investigator-Agent` LangSmith dataset, runs a vague user simulation against each, and prints a PASS/FAIL report:

```
IDENTITY GATHERER PROMPT
  SPECIFICITY              0.84     ✅ PASS
  ATOMIC_HABITS_COVERAGE   0.67     ✅ PASS
  VAGUE_USER_RECOVERY      0.71     ✅ PASS
  EFFICIENCY               0.88     ✅ PASS

ARCHITECT PROMPT
  HABIT_SPECIFICITY        0.91     ✅ PASS
  IDENTITY_ALIGNMENT       0.78     ✅ PASS
  CONTEXT_UTILIZATION      0.82     ✅ PASS

  OVERALL PROMPT QUALITY: 0.80  ✅ PASS
```

See [`evals/PROMPT_EVAL_GUIDE.md`](evals/PROMPT_EVAL_GUIDE.md) for interpretation and how to act on failing criteria.

### Model Comparison Eval
Tests the same prompts across multiple models to measure which performs best on habit quality metrics.

```bash
npm run eval:models
```

---

## Project Structure

```
habidy/
├── app/
│   ├── api/                    API routes (habits, agents, auth, social)
│   ├── architect/              Architect agent page
│   ├── constellation/          Identity Gatherer agent page
│   ├── dashboard/              Main app dashboard
│   ├── explore/                Explore + reflection page
│   ├── onboarding/             6-screen onboarding flow
│   └── social/                 Friends and social features
├── components/
│   ├── ChatInterface.tsx        Reusable agent chat UI
│   ├── HabitCard.tsx            Swipe-to-log habit card
│   ├── SwipeCheckIn.tsx         Daily check-in card stack
│   ├── StreakDots.tsx            7-day streak visualization
│   └── ui/                     49 shadcn/ui components
├── lib/
│   ├── agents/
│   │   ├── constellation.ts    Identity Gatherer system prompt + types
│   │   └── architect.ts        Architect system prompt + habit parser
│   ├── claude.ts               Anthropic API client
│   ├── supabase.ts             Browser + admin Supabase clients
│   ├── supabaseServer.ts       Server-side auth helpers
│   ├── langsmith.ts            LangSmith tracing client
│   └── logger.ts               Tool call logger → tool_logs table
├── evals/
│   ├── promptEvaluator.ts      7-criteria prompt quality eval
│   ├── runModelComparison.ts   Multi-model comparison eval
│   └── PROMPT_EVAL_GUIDE.md    How to read and act on eval results
├── docs/
│   ├── AGENTS.md               Agent specs, prompts, rules
│   ├── SCREENS.md              Full screen specifications
│   ├── DATA.md                 Database schema + API routes
│   ├── BUILD.md                Build order and progress tracker
│   └── ARCHITECTURE.md         System architecture diagram
└── supabase/
    └── migrations/             SQL migrations in chronological order
```

---

## Design Principles

- **Identity over action** — every feature reinforces that the user is *becoming* someone
- **Friction-free** — logging a habit takes under 3 seconds
- **One thing at a time** — never overwhelm; single habit, single win per session
- **Warm, not clinical** — supportive friend, not a productivity dashboard
- **Show progress constantly** — users quit when they can't see movement

---

## Documentation

Full internal docs live in the [`docs/`](docs/) directory:

| File | Contents |
|---|---|
| [`AGENTS.md`](docs/AGENTS.md) | Agent personas, system prompts, conversation rules, eval criteria |
| [`SCREENS.md`](docs/SCREENS.md) | Exact spec for every screen and interaction |
| [`DATA.md`](docs/DATA.md) | Complete database schema and all API routes |
| [`BUILD.md`](docs/BUILD.md) | Build order, tech stack decisions, implementation log |
| [`ARCHITECTURE.md`](docs/ARCHITECTURE.md) | System architecture and data flow diagrams |