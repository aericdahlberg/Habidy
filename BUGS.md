## Human readable list of recurring errors or known issues 

#Last Update May 1, 2026

---

## 🔴 Blockers — Found in pre-demo sweep (May 1)

**B1. `profile_name` column does not exist in DB — 3 production files break silently**
`social.sql` only adds `display_name`, `avatar_url`, `email` — never `profile_name`.
Supabase rejects any `.select()` that includes `profile_name`, setting `data = null`.
- `app/profile/page.tsx:44` — profile screen shows blank name / email fallback
- `app/api/agents/architect/route.ts:86` — assert throws, userRow stays null, Architect runs with no user context (no identity, no name)
- `app/api/agents/constellation/route.ts:75` — same; Crystal Ball coach has no context for returning users
Fix: remove `profile_name` from all three selects and its `(userRow?.profile_name as string)` fallback references. Replace with `display_name` (already a real column).

**B2. DEFAULT_MODEL was 'claude-sonnet-4-5' (stale) → FIXED**
`lib/claude.ts:34` defaulted to `claude-sonnet-4-5`. Changed to `claude-sonnet-4-6` per CLAUDE.md.
Status: ✅ Fixed May 1, 2026

---

## 🟠 High Priority — Found in pre-demo sweep (May 1)

**H1. HABITS_READY regex anchors to end-of-message — parse fails on trailing text**
`lib/agents/architect.ts:131` uses `/HABITS_READY:(\[[\s\S]+?\])\s*$/`.
If the model adds any text after the closing `]` (sign-off, emoji), `extractHabitsFromMessage` returns null → architect API returns 500 → user sees error during live demo.
Fix: remove `\s*$` anchor → `/HABITS_READY:(\[[\s\S]+?\])/`

**H2. `habidy_active_habit` localStorage key is not user-scoped**
`app/dashboard/page.tsx:104` and `app/architect/page.tsx:144` use a global key with no user ID.
Same cross-user contamination pattern fixed earlier for `habidy_last_checkin`.
If accounts are switched during a demo, user A's active habit key leaks to user B until dashboard clears it.
Fix: scope to `habidy_active_habit_${userId}` same as check-in key.

**H3. Crystal Ball → Architect context handoff not verified end-to-end**
`app/api/agents/architect/route.ts:111-124` loads `conversation_memory` where `agent='identity-gatherer'`.
This only works if the constellation route actually SAVES a memory row when summarizing.
Action: run a full Crystal Ball session and verify the `conversation_memory` row appears in Supabase before demoing the integrated flow.

---

## 🟡 Medium Priority — Found in pre-demo sweep (May 1)

**M1. Eval: forced-summary fallback uses Sonnet without retry wrapping**
`evals/agentEval.ts` ~line 324 — when the agent doesn't emit `IDENTITY_GATHERER_SUMMARY:` in MAX_TURNS,
the fallback calls Sonnet directly without the `withRetry` wrapper. Under heavy eval load (24 concurrent
runs), 429s here propagate as hard failures. Eval-only — does not affect the live app.
Fix: wrap the forced-summary API call in `withRetry`.

**M2. Eval: MAX_TURNS.guided = 5 too low — forced-summary triggers frequently**
Guided prompt asks for "5 questions + closing recap" but turn budget is 5.
Agent uses turn 5 for question 5, never reaches the recap → forced-summary fires almost every run.
Eval-only.
Fix: raise MAX_TURNS.guided to 6, or reduce the prompt to 4 questions.

**M3. Eval: opening "Hello" message included in judge transcripts**
The seed turn `{ role: 'user', content: 'Hello' }` is passed to scoring judges, slightly depressing
`questionSpecificity` scores (agent greeting counts as a turn). Eval-only.

**M4. Onboarding re-trigger wipes user data**
`app/onboarding/loading/page.tsx` uses `upsert({ onConflict: 'id' })` and reads fields from sessionStorage,
which is cleared after the first successful save. If the user hits back and re-triggers the loading screen,
sessionStorage is empty so the upsert overwrites their previously saved identity, goal_category, and
friction_point with null/empty values. Does not create a duplicate user — same row, same ID — but data is lost.
Fix: add an early return in `saveAndRedirect()` if `identityStatement` is empty, to prevent an empty upsert.

**M5. "Ghost" auth users with no onboarding data — not a bug, expected behavior**
Supabase Auth creates a row in `auth.users` at the moment of `signUp()`, before any onboarding completes.
The `public.users` row is only created when the loading screen fires. Users who sign up but close the browser
mid-onboarding will have an auth record but no profile data. This is normal and not a code bug — investigated
May 1, 2026 after seeing a second user appear 6 minutes after a demo signup.

---

1. Agent conversations too long and not concise

Too much back and forth, responses not focused enough
Need to balance depth with efficiency
Involves: both agent system prompts


1. No input sanitization or character limits

Users could paste massive amounts of text into input fields
Safety concern: harmful habit requests could potentially override Claude safety
Need to verify Claude safety rails are intact for harmful requests
Involves: all agent input fields, API routes


🟡 Medium Priority Improvements
8. Architect habit cards need better progression UI

Cards should feel exciting and show identity progression
Format: "You are a writer — here are your first habits, the path is toward xyz"
Should show the journey, not just the habit
Involves: app/architect/page.tsx

9. No 7-day streak unlock screen

Users don't know they can unlock more habits after 7 days
Need a screen explaining this mechanic
Involves: app/dashboard/page.tsx, app/add-habit/

10. No chat history visible in app

Users can't see past conversations with agents
Need either a history view or chat summaries
Involves: conversation_memory table, new UI needed

11. Explore page scope too narrow

Should cover both building AND removing habits
Currently only focused on adding reflections
Involves: app/explore/page.tsx


🟢 Feature Backlog (Build Later)
12. Agent engagement modes
Three conversation depth settings based on user preference:

Into it — deep identity work, full Atomic Habits framework, real motivation investigation
Medium — balanced approach, some depth
Easy — quick and simple habit creation
Involves: lib/agents/constellation.ts, onboarding preference screen

13. Habit progression planning
After initial habit, agent should outline a progression path:

"Let's start with X, then progress to Y, then Z"
Long-term identity roadmap
Involves: Architect agent

14. Energy/schedule awareness
Ask users:

Is this habit energizing or draining?
What time of day do you have most energy?
How often do you already do this behavior?
Use to schedule habits at optimal times
Involves: Crystal Ball agent questions

15. Calendar integration
Show habits on a calendar view on dashboard
Stretch: Gmail/Google Calendar connect
Involves: new dashboard component, Google API
16. RAG implementation
Use Atomic Habits PDF already in repo as retrieval context for agents
Involves: HabitRagData/attomic habbits.pdf, vector embeddings
17. Onboarding positivity framing
Start with "Who do you see yourself as in a year?" framing
Make sure language doesn't make users feel bad about who they aren't yet
Focus on growth trajectory, every action = 1% better
Involves: app/onboarding/, welcome copy
18. Multi-agent orchestration
Separate agents for different app functions
Research: Claude Code Codex approach vs current setup
Involves: architecture decision
19.  Habit limit is 2 from Architect
Currently can select up to 2 — change to max 2, but create 5 potential habits
Involves: app/architect/page.tsx
20.  Show JSON habit output to user
Display the structured habit data in a readable, exciting way after creation
Involves: app/architect/page.tsx
21. Page with information on analytics for identity goals, see picture on phone take april 27-30 for more info on what that couldlook like. Bright colors info exciting
22. should we implement a way to make user pay and then give money back when they accomplish goals...? How do we monetize this? Can we monetize this...? 
23. elevenlabsapi for voice control and discussion.