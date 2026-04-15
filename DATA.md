# DATA.md — MVP Database & API

## Philosophy
Only build what the 4 screens actually need right now.
No future-proofing. Add tables when you need them.

---

## Database Schema (5 tables only)

### `users`
```sql
id                  uuid PRIMARY KEY DEFAULT gen_random_uuid()
email               text UNIQUE NOT NULL
name                text
identity_statement  text        -- "I want to be someone who..."
goal_category       text        -- health | career | relationships | creativity | mindset | other
friction_point      text        -- "One thing that doesn't match who I want to be"
time_available      text        -- 5min | 15min | 30min | 60min+
onboarding_done     boolean DEFAULT false
created_at          timestamptz DEFAULT now()
```

### `habits`
```sql
id                  uuid PRIMARY KEY DEFAULT gen_random_uuid()
user_id             uuid REFERENCES users NOT NULL
name                text NOT NULL          -- "Run for 2 minutes"
identity_link       text                   -- "I am someone who takes care of their body"
cue                 text                   -- "After I make coffee"
craving             text                   -- why it matters to them
action              text                   -- the actual behavior
reward              text                   -- immediate payoff
two_minute_version  text                   -- the absurdly small version
time_of_day         text                   -- morning | afternoon | evening | anytime
goal_category       text                   -- inherited from user
is_active           boolean DEFAULT true
created_at          timestamptz DEFAULT now()
```

### `habit_logs`
```sql
id          uuid PRIMARY KEY DEFAULT gen_random_uuid()
habit_id    uuid REFERENCES habits NOT NULL
user_id     uuid REFERENCES users NOT NULL
date        date NOT NULL
completed   boolean NOT NULL
logged_at   timestamptz DEFAULT now()
```

### `conversation_memory`
```sql
id          uuid PRIMARY KEY DEFAULT gen_random_uuid()
user_id     uuid REFERENCES users NOT NULL
agent       text NOT NULL   -- 'constellation' | 'architect'
summary     text            -- 2-3 sentence AI-generated summary
created_at  timestamptz DEFAULT now()
```

### `tool_logs` (agent guard layer)
```sql
id          uuid PRIMARY KEY DEFAULT gen_random_uuid()
user_id     uuid
agent       text
tool_name   text
input       jsonb
output      jsonb
success     boolean
error       text
duration_ms int
created_at  timestamptz DEFAULT now()
```

---

## API Routes (11 routes total)

### Auth
```
POST  /api/auth/signup
POST  /api/auth/login
POST  /api/auth/logout
```

### Onboarding
```
POST  /api/onboarding          -- save identity, goal_category, friction_point, time_available
                               -- sets onboarding_done = true
```

### Habits
```
GET   /api/habits              -- get user's active habits
POST  /api/habits              -- create habit (called by Architect at end of flow)
POST  /api/habits/[id]/log     -- log completion or skip for today
GET   /api/habits/[id]/streak  -- returns current streak + last 7 days
```

### Agents
```
POST  /api/agents/constellation  -- send message, get response
POST  /api/agents/architect      -- send message, get response
```

### Memory
```
GET   /api/memory/[agent]        -- get latest summary for this agent
POST  /api/memory/[agent]        -- save session summary
```

---

## Streak Calculation

```typescript
// /src/lib/streak.ts

function calculateStreak(logs: HabitLog[]): number {
  // Sort logs by date descending
  // Count consecutive completed days going back from today
  // Stop at first missed day
  // Return count
}

function getLast7Days(logs: HabitLog[]): DayStatus[] {
  // Return array of 7 objects: { date, completed: boolean | null }
  // null = not scheduled / no log yet for that day
}
```

---

## File Structure

```
/
├── CLAUDE.md
├── docs/
│   ├── SCREENS.md
│   ├── AGENTS.md
│   ├── DATA.md          ← this file
│   └── BUILD.md
├── src/
│   ├── app/
│   │   ├── page.tsx                        Onboarding (root)
│   │   ├── dashboard/page.tsx              Dashboard
│   │   ├── constellation/page.tsx          Constellation chat
│   │   ├── architect/page.tsx              Architect chat
│   │   └── api/
│   │       ├── auth/
│   │       ├── onboarding/route.ts
│   │       ├── habits/
│   │       ├── agents/
│   │       │   ├── constellation/route.ts
│   │       │   └── architect/route.ts
│   │       └── memory/
│   ├── components/
│   │   ├── ChatInterface.tsx    -- shared chat UI (used by both agents)
│   │   ├── HabitCard.tsx
│   │   ├── StreakDots.tsx
│   │   └── NavBar.tsx
│   └── lib/
│       ├── claude.ts            -- Anthropic client (only place API is called)
│       ├── agentGuard.ts        -- logging + assertion wrapper
│       ├── logger.ts            -- writes to tool_logs table
│       ├── streak.ts            -- streak calculation logic
│       ├── supabase.ts          -- DB client
│       └── agents/
│           ├── constellation.ts -- system prompt + message builder
│           └── architect.ts     -- system prompt + message builder
```
