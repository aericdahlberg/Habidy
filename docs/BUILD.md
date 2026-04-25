# BUILD.md — How to Build This With Claude Code

## Build Order (Do Not Skip Steps)

Work through this in order. Don't start Step N+1 until Step N works and is tested.

```
PHASE 1 — Auth & New User Flow
  [x] 1.  Init Next.js project + Tailwind + TypeScript
  [x] 2.  Set up Supabase project, run schema from DATA.md
  [x] 3.  Supabase Auth — email/password signup + login
          - /login page (sign in + sign up on same screen)
          - proxy.ts protecting all routes except /login
          - After signup: new_user = true → /welcome
          - After login: new_user check → /welcome or /dashboard
  [x] 4.  /welcome page — philosophy screen for new users
          - Set new_user = false after user views it
          - CTA "Let's build you →" → /
  [x] 5.  Identity input (/) — 4-step onboarding with rotating identity cards
          - "I want to be someone who..." input
          - Rotating identity cards: reader, athlete, writer, artist
          - Focus area, friction point, time available
          - Also accessible via + button on dashboard

PHASE 2 — Core Agents (Dynamic)
  [x] 6.  Identity Gatherer (constellation) — dynamic investigator
          - Reads identity_statement from users table
          - Calls getProfileContext(user_id)
          - 10 turn max, opening message auto-generated
          - Saves IDENTITY_GATHERER_SUMMARY + recap to conversation_memory
          - Routes to /architect on handoff
  [x] 7.  Architect — 2-3 habit suggestions
          - Reads conversation_memory + getProfileContext
          - Outputs HABITS_READY:[...] with 2-3 habits
          - Detection → habit selection screen
          - POST /api/habits accepts array
          - Unselected habits saved to proposed_habits

PHASE 3 — Dashboard & Habits Loop
  [x] 8.  Dashboard — wired to Supabase data
          - Habit card with identity_label banner + category color bar
          - Swipe right = complete, left = skip, up = survey
          - Greeting by time of day
  [x] 9.  Survey bottom sheet — 3 questions on swipe up
          - "What went right?" (free text, optional)
          - "What went wrong?" (free text, optional)
          - "Did you do the full thing, part of it, or none?" (3 buttons)
          - POST /api/habits/survey → saves to habit_survey_responses
          - Then POSTs survey content to /api/explore
  [x] 10. /add-habit page — unlocked after 7-day streak
          - Shows proposed_habits (unselected habits from Architect)
          - "Generate new suggestions" → runs Architect again
  [x] 11. Streak calculation + 7-day unlock logic
  [x] 12. 7-day and 30-day streak milestone celebration banners

PHASE 4 — Explore / Reflection
  [x] 13. user_reflections + user_profile_context tables
  [x] 14. getProfileContext(user_id) helper in lib/supabase.ts
  [x] 15. /api/explore route — saves reflection, updates profile context via Claude
  [x] 16. /explore page — reflection input + past reflections list
  [x] 17. getProfileContext wired into Identity Gatherer and Architect system prompts

PHASE 5 — Polish & Ship
  [x] 18. Profile page — sign out + reset buttons
  [ ] 19. Loading states, error states everywhere
  [ ] 20. Empty states (no habits, no logs, no reflections)
  [ ] 21. Mobile responsive — test on phone
  [ ] 22. Deploy to Vercel
  [ ] 23. End-to-end test: signup → /welcome → onboarding → identity gatherer
           → architect → select habits → dashboard → log it → swipe up survey
           → 7 days → /add-habit → explore → profile → sign out

PHASE 6 — Evals & Observability
  [x] 24. LangSmith tracing — both agent routes wrapped with traceable()
  [x] 25. Model comparison eval script (evals/runModelComparison.ts)
  [x] 26. Judge-based scoring (question quality, atomic habits coverage, etc.)
  [ ] 27. RAG knowledge base — embed Atomic Habits content via pgvector
  [ ] 28. Wire RAG retrieval into agent system prompts

PHASE 7 — Phase 2 Features
  [ ] 29. Goals module — /goals page, goals table, OKR tracking
  [ ] 30. Habit Breaker agent (Analyst) — break bad habits
  [ ] 31. Google Calendar integration — write habit cues to calendar
  [ ] 32. Navigator agent — daily planner with energy-aware scheduling
  [ ] 33. Notion integration — task sync
```

---

## How to Prompt Claude Code

Always `cd` into the project root before running `claude`.
CLAUDE.md is read automatically every session.

### Starting a session
```
"Today I'm building [specific thing from the build order above].
Read docs/AGENTS.md for agent specs and docs/DATA.md for the data model.
Tell me your plan before writing any code."
```

Always ask for a plan first. Catch misunderstandings before code is written.

---

## Key Patterns

### adminClient — always use for server-side DB calls
```typescript
// lib/supabase.ts exports adminClient()
// Use it in ALL API routes — bypasses RLS, uses service role key
import { adminClient } from '@/lib/supabase'
const supabase = adminClient()
```

### agentGuard wrapper (use for every DB call or external call)
```typescript
const user = await agentGuard({
  agentName: 'identity-gatherer',
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
  userId: string           // from Supabase session
}

// Every agent API route:
// 1. Load user context from DB via adminClient (guarded)
// 2. Call getProfileContext(userId)
// 3. Build system prompt with user context injected
// 4. Call Claude via lib/claude.ts
// 5. Return assistant message
// 6. Log everything via agentGuard + logAgentSession
```

### Never do this
```typescript
// ❌ Never call Anthropic directly without the wrapper
const response = await anthropic.messages.create(...)

// ✅ Always go through claude.ts
const response = await callClaude({ systemPrompt, messages })

// ❌ Never create a second Supabase client in an API route
const supabase = createClient(url, key)

// ✅ Always use adminClient() from lib/supabase.ts
import { adminClient } from '@/lib/supabase'

// ❌ Never use the browser supabase client in server API routes
import { supabase } from '@/lib/supabase'  // browser client — RLS blocks it server-side

// ✅ adminClient() bypasses RLS and works server-side
```

### Fixing bugs
```
Bug: [describe what's wrong]
Relevant files: [list them]
Error: [paste the exact error]
Find the issue and show me the fix before applying it.
```
