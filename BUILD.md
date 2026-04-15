# BUILD.md — How to Build This With Claude Code

## Build Order (Do Not Skip Steps)

Work through this in order. Don't start Step N+1 until Step N works.

```
WEEK 1 — Foundation
  [ ] 1. Init Next.js project + Tailwind + TypeScript
  [ ] 2. Set up Supabase project, run schema from DATA.md
  [ ] 3. Auth — sign up, login, session (Supabase Auth)
  [ ] 4. Onboarding flow — 4 steps, saves to users table
  [ ] 5. Dashboard — static version with fake habit data (no API yet)

WEEK 2 — The AI
  [ ] 6. Build /src/lib/claude.ts — Anthropic client wrapper
  [ ] 7. Build /src/lib/agentGuard.ts — logging + assertion wrapper
  [ ] 8. Build /src/lib/logger.ts — writes to tool_logs
  [ ] 9. Build ChatInterface.tsx — shared chat UI component
  [ ] 10. Constellation agent — system prompt + API route + wire to UI
  [ ] 11. Architect agent — system prompt + API route + wire to UI

WEEK 3 — Habits Loop
  [ ] 12. Architect saves habit to DB at end of conversation
  [ ] 13. Dashboard fetches real habits from API
  [ ] 14. Habit logging — swipe/tap Done or Skip
  [ ] 15. Streak calculation + last 7 days display
  [ ] 16. Constellation saves session summary to conversation_memory
  [ ] 17. Architect reads conversation_memory at session start

WEEK 4 — Polish & Ship
  [ ] 18. Mobile responsive — test on phone
  [ ] 19. Loading states, error states everywhere
  [ ] 20. Empty states (no habits yet, no logs yet)
  [ ] 21. Celebration moments (7-day streak, habit saved)
  [ ] 22. Deploy to Vercel
  [ ] 23. End-to-end test: new user → onboarding → constellation
           → architect → habit saved → dashboard → log it → streak
```

---

## How to Prompt Claude Code

Always `cd` into the project root before running `claude`.
CLAUDE.md is read automatically every session.

### Starting a session
```
"Today I'm building [specific thing from the build order above].
Read docs/SCREENS.md for the spec and docs/DATA.md for the data model.
Tell me your plan before writing any code."
```

Always ask for a plan first. Catch misunderstandings before code is written.

### Example prompts by step

**Step 4 — Onboarding**
```
Build the onboarding flow. Spec is in docs/SCREENS.md Screen 1.
4 steps, saves to the users table on completion.
Route to /constellation after completing.
Use Supabase client from /src/lib/supabase.ts.
Plan first, then build.
```

**Step 10 — Constellation agent**
```
Build the Constellation agent. Spec is in docs/AGENTS.md Agent 1.
- System prompt in /src/lib/agents/constellation.ts
- API route at /src/app/api/agents/constellation/route.ts
- Uses the shared ChatInterface component
- Loads user context (identity_statement, goal_category, friction_point)
  from the users table before every session
- At session end, saves a summary to conversation_memory table
All calls go through /src/lib/claude.ts and /src/lib/agentGuard.ts.
Plan first.
```

**Step 12 — Architect saves habit**
```
At the end of the Architect conversation, when the user says "Save this habit",
the agent should extract the habit fields (name, cue, craving, action, reward,
two_minute_version, time_of_day) from the conversation and save to the habits table.
Fields are defined in docs/DATA.md.
Then redirect to /dashboard.
If the save fails, tell the user and do not lose their data.
```

**Step 14 — Habit logging**
```
On the Dashboard habit card, implement:
- Swipe right = mark completed for today
- Swipe left = mark skipped for today
- Both call POST /api/habits/[id]/log
- After logging: show brief identity affirmation (done) or "back tomorrow" (skip)
- Prevent logging twice in the same day
Spec is in docs/SCREENS.md Screen 4.
```

### Fixing bugs
```
Bug: [describe what's wrong]
Relevant files: [list them]
Error: [paste the exact error]
Find the issue and show me the fix before applying it.
```

---

## Key Patterns Claude Code Must Follow

### agentGuard wrapper (use for every DB call or external call)
```typescript
const user = await agentGuard({
  agentName: 'constellation',
  toolName: 'getUser',
  input: { userId },
  fn: () => supabase.from('users').select('*').eq('id', userId).single(),
  assert: (result) => {
    if (!result.data) throw new Error('User not found — cannot build context')
  }
})
```

### Message format for both agents
```typescript
// Every agent API call receives:
{
  messages: Message[]      // full conversation history
  userId: string           // to load user context
}

// Every agent API route:
// 1. Load user context from DB (guarded)
// 2. Build system prompt with user context injected
// 3. Call Claude API via /src/lib/claude.ts
// 4. Return assistant message
// 5. Log everything
```

### Never do this
```typescript
// ❌ Never call Anthropic directly in a component or route without the wrapper
const response = await anthropic.messages.create(...)

// ✅ Always go through claude.ts
const response = await callClaude({ systemPrompt, messages })
```
