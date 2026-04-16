# BUILD.md — How to Build This With Claude Code

## Build Order (Do Not Skip Steps)

Work through this in order. Don't start Step N+1 until Step N works and is tested.

```
PHASE 1 — Auth & New User Flow
  [x] 1.  Init Next.js project + Tailwind + TypeScript
  [x] 2.  Set up Supabase project, run schema from DATA.md
  [ ] 3.  Supabase Auth — email/password signup + login
          - /login page (sign in + sign up on same screen)
          - middleware.ts protecting all routes except /login
          - After signup: new_user = true → /welcome
          - After login: new_user check → /welcome or /dashboard
          - Replace all localStorage user_id usage with session user.id
  [ ] 4.  /welcome page — philosophy screen for new users
          - Set new_user = false after user views it
          - CTA "Let's build you →" → /
  [ ] 5.  Identity input (/) — updated with rotating identity images
          - Keep "I want to be someone who..." input
          - Rotating background images: reader, athlete, writer, artist
          - Also accessible via + button on dashboard

PHASE 2 — Core Agents (Dynamic)
  [ ] 6.  Insights agent (constellation) — replace hardcoded questions with dynamic
          - Reads identity_statement from users table
          - Calls getProfileContext(user_id)
          - 10 question max, aims for 5-6
          - Saves structured JSON summary to conversation_memory
          - Routes to /architect on handoff
  [ ] 7.  Architect — upgrade to 2-3 habit suggestions
          - Reads conversation_memory + getProfileContext
          - Outputs HABITS_READY:[...] with 2-3 habits
          - Detection → habit selection screen
          - POST /api/habits accepts array
          - Unselected habits saved to proposed_habits

PHASE 3 — Dashboard & Habits Loop
  [x] 8.  Dashboard — static version
  [ ] 9.  Dashboard — wire to real Supabase data (session user.id)
          - Habit card header: identity_label banner + category color bar
          - Swipe right = complete, left = skip (existing)
          - Swipe up = survey bottom sheet (SurveySheet component)
  [ ] 10. Survey bottom sheet — 3 questions on swipe up
          - "What went right?" (free text, optional)
          - "What went wrong?" (free text, optional)
          - "Did you do the full thing, part of it, or none?" (3 buttons)
          - POST /api/survey → saves to habit_survey_responses
          - Then POSTs survey content to /api/explore
  [ ] 11. /add-habit page — unlocked after 7-day streak
          - Shows proposed_habits (unselected habits from Architect)
          - "Generate new suggestions" → runs Architect again
  [ ] 12. Streak calculation + 7-day unlock logic

PHASE 4 — Explore / Reflection
  [ ] 13. user_reflections + user_profile_context tables (Supabase)
  [ ] 14. getProfileContext(user_id) helper in lib/supabase.ts
  [ ] 15. /api/explore route — saves reflection, updates profile context via Claude
  [ ] 16. /explore page — reflection input + past reflections list
  [ ] 17. Wire getProfileContext into Insights agent and Architect system prompts

PHASE 5 — Polish & Ship
  [ ] 18. Profile page — sign out button
  [ ] 19. Loading states, error states everywhere
  [ ] 20. Empty states (no habits, no logs, no reflections)
  [ ] 21. Celebration moments (7-day streak, habit saved)
  [ ] 22. Mobile responsive — test on phone
  [ ] 23. Deploy to Vercel
  [ ] 24. End-to-end test: signup → /welcome → onboarding → insights agent
           → architect → select habits → dashboard → log it → swipe up survey
           → 7 days → /add-habit → explore → profile → sign out
```

---

## How to Prompt Claude Code

Always `cd` into the project root before running `claude`.
CLAUDE.md is read automatically every session.

### Starting a session
```
"Today I'm building [specific thing from the build order above].
Read AGENTS.md for agent specs and DATA.md for the data model.
Tell me your plan before writing any code."
```

Always ask for a plan first. Catch misunderstandings before code is written.

---

### Prompts by Step

**Step 3 — Auth**
```
Set up Supabase Auth with email/password.
- Add /login page with sign in and sign up on the same screen
- middleware.ts at root that protects all routes except /login
- After signup: check users.new_user flag — true → /welcome, false → /dashboard
- Replace all localStorage user_id usage with Supabase session user.id
- Sign out button on the profile page
- Use the existing supabase client from lib/supabase.ts — do not create a new one
Plan first.
```

**Step 4 — Welcome screen**
```
Build the /welcome page for new users.
- Only shown when users.new_user = true
- After user views it, set new_user = false in Supabase
- Content: bold identity framing ("habits are votes for who you want to become"),
  brief section on why identity-based habits outlast goal-based ones,
  subtle note that onboarding takes a few minutes and is worth it
- Tone: warm, exciting, like the start of something real — not clinical
- One CTA: "Let's build you →" → routes to /
Spec is in SCREENS.md.
```

**Step 6 — Insights agent (dynamic)**
```
Upgrade the Insights agent (constellation route) to a dynamic investigator.
- Replace hardcoded questions with dynamic questions generated from identity_statement
- Read identity_statement from users table (session user.id)
- Call getProfileContext(user_id) and inject into system prompt
- 10 question max per session, aim for 5-6
- Save structured JSON summary to conversation_memory on handoff
- Route to /architect after handoff
Spec is in AGENTS.md Agent 1.
Plan first.
```

**Step 7 — Architect habit selection**
```
Upgrade Architect to output 2-3 habit suggestions.
- Read conversation_memory + getProfileContext at session start
- Output HABITS_READY:[...json array...] when habits are defined
- When detected: replace chat with a habit selection screen
- Each card shows identity_label, habit_name, cue, two_minute_version
- "Start these habits →" saves selected habits via POST /api/habits (accepts array)
- Unselected habits go to proposed_habits table
- Route to /dashboard after 1.2s
Spec is in AGENTS.md Agent 2.
Plan first.
```

**Step 10 — Survey bottom sheet**
```
Add swipe UP to the habit card.
- Swipe up opens SurveySheet bottom sheet with:
  a. "What went right?" (free text, optional)
  b. "What went wrong?" (free text, optional)
  c. "Did you do the full thing, part of it, or none?" (3 buttons: Full / Part / None)
- On submit: POST /api/survey (saves to habit_survey_responses)
- Then POST /api/explore with the survey content
- Table schema in DATA.md.
```

**Step 15 — Explore API**
```
Build POST /api/explore.
- Saves a new row to user_reflections
- Reads all past reflections for this user
- Calls Claude to generate an updated profile summary
- Saves/updates user_profile_context.summary for this user
- Returns the new summary in the response
Schema in DATA.md. Use agentGuard for all DB calls.
```

**Fixing bugs**
```
Bug: [describe what's wrong]
Relevant files: [list them]
Error: [paste the exact error]
Find the issue and show me the fix before applying it.
```

---

## Key Patterns

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
  userId: string           // to load user context (from Supabase session)
}

// Every agent API route:
// 1. Load user context from DB (guarded)
// 2. Call getProfileContext(userId)
// 3. Build system prompt with user context injected
// 4. Call Claude API via lib/claude.ts
// 5. Return assistant message
// 6. Log everything
```

### Never do this
```typescript
// ❌ Never call Anthropic directly in a component or route without the wrapper
const response = await anthropic.messages.create(...)

// ✅ Always go through claude.ts
const response = await callClaude({ systemPrompt, messages })

// ❌ Never create a second Supabase client
const supabase = createClient(url, key)

// ✅ Always import from lib/supabase.ts
import { supabase } from '@/lib/supabase'

// ❌ Never store user_id in localStorage
localStorage.setItem('user_id', user.id)

// ✅ Always read from Supabase session
const { data: { session } } = await supabase.auth.getSession()
const userId = session?.user.id
```
