# BUILD.md — How to Build This With Claude Code

## Build Order (Do Not Skip Steps)

Work through this in order. Don't start Step N+1 until Step N works and is tested.

```
PHASE 1 — Auth & Core Infrastructure
  [x] 1.  Init Next.js project + Tailwind 4 + TypeScript
  [x] 2.  Set up Supabase project, run schema from DATA.md
  [x] 3.  Supabase Auth — email/password signup + login
          - /login page (sign in + sign up on same screen)
          - proxy.ts protecting all routes except /login
          - After signup: new_user = true → /welcome → /onboarding
          - After login: new_user + identity check → /onboarding or /dashboard
  [x] 4.  Smart root redirect (app/page.tsx)
          - Checks new_user + identity_statement
          - Routes to /onboarding or /dashboard accordingly

PHASE 2 — Core Agents
  [x] 5.  Identity Gatherer (/constellation) — dynamic investigator
          - Reads identity_statement + getProfileContext(user_id)
          - 10 turn max, opening message auto-generated
          - Saves IDENTITY_GATHERER_SUMMARY + recap to conversation_memory
          - Routes to /architect on handoff
  [x] 6.  Architect (/architect) — 2-3 habit suggestions
          - Reads conversation_memory + getProfileContext
          - Outputs HABITS_READY:[...] with 2-3 habits
          - Detection → Lovable-styled habit card selection screen
          - POST /api/habits accepts array
          - Unselected habits saved to proposed_habits

PHASE 3 — Dashboard & Habits Loop
  [x] 7.  Dashboard — wired to Supabase data
          - SwipeCheckIn on first visit each day (framer-motion card stack)
          - After check-in: habit checklist with progress bar
          - Morning greeting + motivational quote
          - Identity display ("Becoming: [identity]")
          - Streak counter per habit (🔥)
  [x] 8.  HabitCard swipe gestures + survey bottom sheet
          - Swipe right = complete, left = skip, up = survey
          - Survey: "What went right?" / "What went wrong?" / completion level
          - POST /api/habits/survey → saves to habit_survey_responses
          - Then POSTs survey content to /api/explore
  [x] 9.  /add-habit page — unlocked after 7-day streak
          - Shows proposed_habits (unselected from Architect)
          - "Generate new suggestions" → /architect
  [x] 10. Streak calculation + 7-day unlock logic (lib/streak.ts)
  [x] 11. 7-day and 30-day streak milestone celebration banners

PHASE 4 — Explore / Reflection
  [x] 12. user_reflections + user_profile_context tables
  [x] 13. getProfileContext(user_id) helper in lib/supabase.ts
  [x] 14. /api/explore — saves reflection, updates profile context via Claude
  [x] 15. /explore page — floating bubble categories + Talk to agent CTA + reflection input
  [x] 16. getProfileContext wired into Identity Gatherer and Architect system prompts

PHASE 5 — Lovable Frontend Integration
  [x] 17. Install shadcn/ui (49 components), framer-motion, radix-ui, lucide-react
  [x] 18. Tailwind 4 @theme config — teal/purple/accent colors, Nunito/Quicksand fonts
  [x] 19. 6-screen onboarding flow (/onboarding/*)
          - Welcome → Profile → Philosophy → Identity → Questionnaire → Loading
          - sessionStorage for cross-screen state
          - Loading screen saves to Supabase then routes to /constellation
  [x] 20. Lovable-styled pages: Dashboard, Constellation, Architect, Explore, Profile
  [x] 21. SwipeCheckIn component (framer-motion drag cards)
  [x] 22. BottomNav (5 tabs: Home / Explore / Coach / Social / Profile)
  [x] 23. Color scheme: off-white base, screen-specific gradients

PHASE 6 — Social
  [x] 24. friendships table + social columns on users (supabase/social.sql)
  [x] 25. /api/social/friends — GET friends with today's habit completion
  [x] 26. /api/social/friends/request — POST send friend request by email
  [x] 27. /api/social/friends/respond — POST accept / decline
  [x] 28. /social page — friends activity, add by email, pending requests
  [x] 29. /api/onboarding updated to save display_name + email for friend lookup

PHASE 7 — Observability
  [x] 30. LangSmith tracing — both agent routes wrapped with traceable()
  [x] 31. Model comparison eval script (evals/runModelComparison.ts)
  [x] 32. Judge-based scoring (question quality, atomic habits coverage, etc.)

PHASE 8 — Polish & Ship
  [ ] 33. End-to-end test: signup → onboarding (6 screens) → constellation
           → architect → select habits → dashboard → SwipeCheckIn → log it
           → swipe up survey → 7 days → /add-habit → explore → social → profile → sign out
  [ ] 34. Mobile responsive — test on physical iOS + Android
  [ ] 35. Loading and error states on all async operations
  [ ] 36. Deploy to Vercel
  [x] 37. Run supabase/social.sql in production Supabase SQL editor

PHASE 9 — Phase 2 Features
  [ ] 38. Communities on /social — group habit challenges
  [ ] 39. RAG knowledge base — embed Atomic Habits content via pgvector
  [ ] 40. Wire RAG retrieval into agent system prompts
  [ ] 41. Habit Breaker agent (Analyst) — break bad habits
  [ ] 42. Google Calendar integration — write habit cues to calendar
  [ ] 43. Navigator agent — daily planner with energy-aware scheduling
  [ ] 44. Notion integration — task sync
  [ ] 45. Push notifications
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
const db = adminClient()
```

### Browser supabase — for client components only
```typescript
// lib/supabase.ts also exports supabase (browser client)
// Use ONLY in 'use client' components for auth + RLS-respecting reads
import { supabase } from '@/lib/supabase'
```

### agentGuard wrapper (use for every DB call in agents)
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

### Onboarding state flow
```typescript
// State travels through sessionStorage across /onboarding/* screens:
sessionStorage.setItem('habidy_onboarding_profile', JSON.stringify(profile))
sessionStorage.setItem('habidy_onboarding_identity', identityStatement)
sessionStorage.setItem('habidy_onboarding_questionnaire', JSON.stringify(answers))

// All cleared in /onboarding/loading/page.tsx after saving to Supabase
```

### cn() utility for class merging
```typescript
// lib/utils.ts — always use this instead of string concatenation
import { cn } from '@/lib/utils'
className={cn('base-classes', condition && 'conditional-class')}
```

### Never do this
```typescript
// ❌ Never call Anthropic directly without the wrapper
const response = await anthropic.messages.create(...)

// ✅ Always go through claude.ts
const response = await callClaude({ systemPrompt, messages })

// ❌ Never use the browser supabase client in server API routes
import { supabase } from '@/lib/supabase'  // browser client — RLS blocks server-side

// ✅ adminClient() bypasses RLS and works server-side
import { adminClient } from '@/lib/supabase'
const db = adminClient()

// ❌ Never hardcode zinc-900 / dark backgrounds on light-themed screens
className="bg-zinc-900 text-white"

// ✅ Use design tokens — buttons use primary, surfaces use card/muted
className="bg-primary text-primary-foreground"
```

### Fixing bugs
```
Bug: [describe what's wrong]
Relevant files: [list them]
Error: [paste the exact error]
Find the issue and show me the fix before applying it.
```
