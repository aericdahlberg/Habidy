# ARCHITECTURE.md

## System Overview

```
User Browser
    │
    ▼
Next.js App (Vercel)
    ├── /app          → React pages + layouts
    ├── /api          → API route handlers
    └── /lib          → Claude client, agents, RAG, logger
         │
         ├──► Anthropic API (Claude claude-sonnet-4-6)
         ├──► Supabase (Postgres + pgvector + Auth)
         ├──► Google Calendar API      (Phase 2)
         └──► Notion API               (Phase 2)
```

---

## Data Model

### `users`
```sql
id            uuid PRIMARY KEY
email         text UNIQUE
name          text
identity_statement  text        -- "I am someone who..."
onboarding_complete boolean DEFAULT false
created_at    timestamptz
```

### `goals`
```sql
id            uuid PRIMARY KEY
user_id       uuid REFERENCES users
title         text
description   text
category      text   -- health | career | relationships | learning | creativity | other
why           text   -- why this goal matters to them
created_at    timestamptz
is_active     boolean DEFAULT true
```

### `habits`
```sql
id            uuid PRIMARY KEY
user_id       uuid REFERENCES users
goal_id       uuid REFERENCES goals
name          text
description   text
identity_link text   -- "This makes me a person who..."
-- Atomic Habits loop fields:
cue           text   -- when/where trigger
craving       text   -- why it matters, emotional pull
action        text   -- the actual behavior (start small)
reward        text   -- immediate payoff
-- Scheduling:
frequency     text   -- daily | weekdays | custom
custom_days   int[]  -- [0,1,2,3,4,5,6] = Sun–Sat
time_of_day   text   -- morning | afternoon | evening | anytime
energy_cost   text   -- low | medium | high
-- Metadata:
two_minute_version text  -- the absurdly small starting version
created_at    timestamptz
is_active     boolean DEFAULT true
```

### `habit_logs`
```sql
id            uuid PRIMARY KEY
habit_id      uuid REFERENCES habits
user_id       uuid REFERENCES users
date          date
completed     boolean
notes         text
mood          int    -- 1-5, optional
energy        int    -- 1-5, optional
logged_at     timestamptz
```

### `conversation_memory`
```sql
id            uuid PRIMARY KEY
user_id       uuid REFERENCES users
agent         text   -- constellation | architect | analyst | navigator
session_id    uuid
summary       text   -- AI-generated summary of the session
key_insights  text[] -- array of extracted insights
created_at    timestamptz
```

### `rag_documents` (pgvector)
```sql
id            uuid PRIMARY KEY
content       text
category      text   -- atomic_habits | success_habits | motivation | identity
embedding     vector(1536)
source        text
created_at    timestamptz
```

### `tool_logs` (agent guard layer)
```sql
id            uuid PRIMARY KEY
user_id       uuid
agent         text
tool_name     text
input         jsonb
output        jsonb
success       boolean
error         text
duration_ms   int
created_at    timestamptz
```

---

## API Routes

```
POST   /api/auth/signup
POST   /api/auth/login

POST   /api/onboarding/complete        -- save identity + initial goals

GET    /api/habits                     -- list user's habits
POST   /api/habits                     -- create habit
PATCH  /api/habits/[id]                -- update habit
DELETE /api/habits/[id]                -- deactivate habit

POST   /api/habits/[id]/log            -- log completion for today
GET    /api/habits/[id]/stats          -- streak, completion rate, trend

GET    /api/goals                      -- list goals
POST   /api/goals                      -- create goal
PATCH  /api/goals/[id]

POST   /api/agents/constellation       -- chat with Constellation
POST   /api/agents/architect           -- habit builder session
POST   /api/agents/analyst             -- habit breaker session
POST   /api/agents/navigator           -- daily planner (Phase 2)

GET    /api/insights/daily             -- AI-generated daily summary
GET    /api/insights/progress          -- progress toward goals

GET    /api/memory/[agent]             -- retrieve past session summaries
POST   /api/memory/[agent]             -- save session summary
```

---

## Agent Guard Layer

Every agent call MUST go through the guard wrapper in `/src/lib/agentGuard.ts`.

```typescript
// Pattern every agent must follow:
const result = await agentGuard({
  agentName: 'constellation',
  toolName: 'retrieveContext',
  input: { userId, query },
  fn: async () => ragRetrieve(userId, query),
  assert: (output) => {
    if (!output || output.length === 0) {
      throw new Error('RAG returned empty — cannot proceed without context')
    }
  }
})
```

Rules:
1. **Log every tool call and its return value** — not just errors
2. **Assert on tool outputs before passing to model** — empty = stop
3. **All logs go to `tool_logs` table** in Supabase
4. **Run eval sets on every deploy** — see `/docs/AGENTS.md` for eval cases

---

## File Structure

```
/
├── CLAUDE.md
├── docs/
│   ├── ARCHITECTURE.md       ← this file
│   ├── AGENTS.md
│   ├── FEATURES.md
│   ├── RAG.md
│   ├── PHASES.md
│   └── PROMPTING.md
├── src/
│   ├── app/                  Next.js App Router pages
│   │   ├── page.tsx          Landing / onboarding entry
│   │   ├── dashboard/
│   │   ├── habits/
│   │   ├── constellation/
│   │   ├── builder/
│   │   ├── breaker/
│   │   └── planner/          Phase 2
│   ├── components/           Shared UI components
│   ├── features/             Feature-specific logic + components
│   │   ├── onboarding/
│   │   ├── constellation/
│   │   ├── habits/
│   │   ├── builder/
│   │   ├── breaker/
│   │   └── planner/
│   └── lib/
│       ├── claude.ts         Anthropic client (single source of truth)
│       ├── agentGuard.ts     Tool logging + assertion wrapper
│       ├── logger.ts         Structured logging
│       ├── supabase.ts       DB client
│       ├── rag.ts            Embedding + retrieval
│       └── agents/
│           ├── constellation.ts
│           ├── architect.ts
│           ├── analyst.ts
│           └── navigator.ts
```

---

## Additional Data Models (from new notes)

### `key_results`
```sql
id            uuid PRIMARY KEY
goal_id       uuid REFERENCES goals
user_id       uuid REFERENCES users
title         text        -- "Write code 30 min, 5x/week"
target_value  float       -- 5 (sessions per week)
current_value float       -- tracked automatically from habit_logs
unit          text        -- "sessions" | "hours" | "times" | "pages"
timeframe     text        -- "weekly" | "monthly"
habit_id      uuid REFERENCES habits  -- nullable, links to tracking habit
due_date      date
created_at    timestamptz
```

### `energy_logs`
```sql
id            uuid PRIMARY KEY
user_id       uuid REFERENCES users
level         int         -- 1-5
logged_at     timestamptz
context       text        -- "morning_checkin" | "after_habit" | "manual"
```

### `habit_difficulty_logs`
```sql
id            uuid PRIMARY KEY
habit_id      uuid REFERENCES habits
user_id       uuid REFERENCES users
ease_rating   int         -- 1-5 (how easy was this today)
logged_at     timestamptz
```

### Color coding enum
```typescript
export const GOAL_CATEGORIES = {
  health:        { label: 'Health & Fitness',   color: '#84B59F' },
  career:        { label: 'Career & Learning',  color: '#1C3F6E' },
  relationships: { label: 'Relationships',       color: '#E07A5F' },
  creativity:    { label: 'Creativity',          color: '#9B72AA' },
  mindset:       { label: 'Mindset & Energy',   color: '#F2A65A' },
  obligation:    { label: 'Have-To-Do',          color: '#9E9E9E' },
} as const
```

### Additional API Routes
```
GET    /api/goals/[id]/okrs              -- get key results for a goal
POST   /api/goals/[id]/okrs              -- create key result
GET    /api/insights/weekly              -- AI weekly summary
POST   /api/energy/log                   -- log energy level
GET    /api/energy/patterns              -- user's energy patterns over time
POST   /api/habits/[id]/difficulty-log  -- log ease rating after completion
GET    /api/tasks/suggestions            -- AI task recommendations (Phase 2)
```
