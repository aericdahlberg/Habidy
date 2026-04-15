# FEATURES.md

## Feature 1: Onboarding ("The Mirror")

**Goal:** Earn trust quickly, get enough context to be useful, and spark the user's
belief that this is a place where change is possible.

**Opening:** Full-screen, minimal UI. Just the question:
> *"How can I help you be the person you want to be?"*

**Flow:**
```
Screen 1 — The Opening Question
  Free text input. Let them write. No constraints.
  This is their identity statement seed.

Screen 2 — What matters most?
  "What area of your life do you most want to change?"
  Options (multi-select, max 3): Health · Career · Relationships ·
  Learning · Creativity · Energy · Mindset · Other

Screen 3 — Where are you now?
  "What's one thing about your daily life that isn't matching who you want to be?"
  Free text. Short. This is their friction point.

Screen 4 — What does success feel like?
  "Imagine 6 months from now — you've made real progress.
   What's different about your day-to-day?"
  Free text. This is their vision.

Screen 5 — Introduce the AI
  "Here's how I'll help you..."
  Explain each agent briefly — what they do and WHY the AI is involved.
  Make clear: the AI is a thinking partner, not a rule-giver.
  CTA: "Let's start with one thing."
```

**Rules:**
- Max 5 screens — never more
- Every question has a "skip" option (but log skips — they're informative)
- Tone: warm, spacious, unhurried. No progress bars on the first screen.
- Save everything immediately — no losing data on back-navigation

---

## Feature 2: Constellation ("The Explorer")

**Goal:** Help users understand themselves. Surface patterns. Build self-awareness
over time through ongoing conversation.

**UI:**
- Chat interface, minimal chrome
- Agent avatar: a constellation icon (stars forming a shape)
- Shows "insight saved" confirmation when agent extracts a key insight
- Past session summaries accessible in a sidebar ("Your Story So Far")

**Conversation starters (rotate, not always the same):**
- "How did today go for you?"
- "What's been on your mind lately?"
- "Tell me about a moment this week that felt really alive."
- "What's something you've been avoiding?"

**Memory behavior:**
- End of every session: AI generates a 2-3 sentence summary + 3-5 key insights
- Saved to `conversation_memory` table
- Next session: agent opens with a reference to something from last time
  ("Last time you mentioned feeling drained after long meetings — did that come up again?")

**Engagement hook:**
- After 3 sessions: show user a "Your Patterns" card with 3 things the AI has noticed
- This creates a "wow, it really knows me" moment

---

## Feature 3: Habit Dashboard ("The Tracker")

**Goal:** Make logging completion effortless and make the "why" impossible to ignore.

**UI:**
- Card-based layout, one card per active habit
- Each card shows:
  - Habit name
  - Identity link: *"This makes me someone who..."*
  - Linked goal (with goal category color)
  - Last 7 days: dot indicators (filled = done, empty = missed, gray = not scheduled)
  - Current streak
  - ✓ / ✗ buttons — or swipe right (done) / left (missed)
- Logging should take **under 3 seconds**

**Progress framing (critical — this is what keeps users):**
- Never show raw numbers alone. Always frame them:
  - ✗ "Streak: 4 days" → ✓ "You're becoming a morning runner — 4 days strong"
  - ✗ "Completion: 71%" → ✓ "You showed up 5 out of 7 days. That's momentum."
- Show a "weekly momentum score" (0–100) that factors in completion + consistency

**The 1% Better Principle:**
- Somewhere visible on the dashboard: a running "improvement curve"
- Small text: *"1% better every day = 37x better in a year"*
- Show their trajectory, not just today's score

**Don't break the chain:**
- If a user hasn't logged by 8pm, send a gentle nudge (push notification or in-app)
- Message: "Don't throw a zero today — even 2 minutes counts."

**Zero state (no habits yet):**
- Prompt to go to Architect to build their first habit
- Show a brief explanation of why starting with one habit is the right move

---

## Feature 4: Habit Builder ("The Architect")

**Goal:** Build exactly one habit per session using the Atomic Habits framework.
The output is a fully-formed habit with cue, craving, action, and reward defined.

**UI:**
- Conversational chat interface with structured progress indicator
  (Step 1 of 6 — Identity → Behavior → Enjoyment → Cue → Start Small → Why It Matters)
- At the end: a beautiful "Habit Card" preview before saving
- Confirmation screen: "Your first vote has been cast."

**Atomic Habits Content to Reference (from RAG):**
- Identity-based habits: "Every action is a vote for the type of person you want to be"
- Implementation intention: "I will [behavior] at [time] in [location]"
- Habit stacking: "After [current habit], I will [new habit]"
- 2-minute rule: "When you start a new habit, it should take less than 2 minutes"
- Make it obvious, attractive, easy, satisfying (the 4 laws)
- Reward immediately — the brain encodes habits based on what follows

**Why habits matter in their context:**
After the habit is built, show a personalized message:
> "You said you want to be someone who [identity]. Every time you do [habit],
> you're proving that to yourself. Over 30 days, that's 30 votes cast."

---

## Feature 5: Habit Breaker ("The Analyst")

**Goal:** Help users understand and replace bad habits. Non-judgmental, curious framing.

**UI:**
- Chat interface with Analyst agent
- Can optionally be triggered from the Dashboard ("I want to understand this habit better")
- At the end: option to "build a replacement habit" → hands off to Architect

**Key content:**
- "Habits change the trajectory of your days — small shifts compound"
- Bad habits aren't failures — they're patterns serving a need
- The goal is never shame. It's understanding → replacement.

**Data integration (Phase 2):**
- If screen time / location data available: show patterns before the conversation
  ("You tend to check social media around 9pm — what's usually happening then?")

---

## Feature 6: Daily Planner / Navigator ("The Navigator") — Phase 2

**Goal:** AI-assisted daily scheduling that connects tasks to goals and respects
the user's energy patterns.

**Integrations required:**
- Google Calendar (read + write)
- Notion (read tasks) — or built-in task list as fallback

**UI:**
- Morning check-in flow (takes 60 seconds)
  - "How's your energy today?" (1-5)
  - "Any constraints I should know about?"
- Shows 2-3 schedule options to choose from
- Each task shows: goal alignment, energy cost, time estimate, urgency
- User selects a schedule → writes to Google Calendar

**Recommendation logic:**
- Prioritize: urgency × goal_alignment × energy_match
- Always include at least one habit from their habit stack
- Easy win first or hard thing first — user sets their preference

---

## Engagement & Retention Strategy

The hardest part of habit apps is keeping people coming back. These are the mechanisms:

**1. Streaks with identity framing**
Never just "Day 4 streak" — always "Day 4 of becoming [identity]"

**2. The Constellation memory hook**
After 3 sessions: show "Your Patterns" — 3 things the AI has noticed about them.
This creates emotional investment.

**3. Progress visibility**
Dashboard always shows *trajectory*, not just today.
"You've done [habit] 18 times. That's 18 votes for who you're becoming."

**4. Daily nudge (not nagging)**
One notification per day maximum, timed to when they typically log.
Message always focuses on identity: "Are you showing up for yourself today?"

**5. Weekly insight email/notification**
"Here's what your week looked like" — data + one AI insight about their pattern.

**6. Celebrate milestones**
7 days, 30 days, 66 days (the real habit formation number), 100 days.
Make these feel significant. Full-screen celebration moment.

**7. The Navigator as daily ritual (Phase 2)**
Morning check-in becomes a habit itself — users who plan their day in the app
stay engaged 3-4x longer than those who don't.

---

## Feature 7: Analytics & Insights ("The Mirror")

**Goal:** Show users clear progress, patterns, and what's working — make the invisible visible.

**UI:**
- Streaks and completion rates per habit
- Weekly momentum score (composite of consistency + completion)
- OKR progress view: goal → key results → habit completion %
- "What's working" AI summary: weekly pattern analysis
- Hours spent per goal category (once task/time tracking is in)
- Friend streaks (opt-in, Phase 2)

**Key framing:**
- Never raw numbers alone — always identity framed
- "You've cast 18 votes for becoming a runner"
- Show trajectory curves, not just snapshots

---

## Feature 8: Reflection Agent (Optional, Phase 2)

**Goal:** Weekly AI-guided reflection that connects patterns to goals and suggests adjustments.

**Triggers:**
- Weekly check-in (Sunday or user-chosen)
- After a streak break (non-judgmental re-entry)
- When calendar shows a busy week coming up

**Questions the agent asks:**
- What outside influences affected your habits this week?
- Is this habit still aligned with your life goals?
- Are you ready to increase the difficulty on any habits?

**Smart calendar awareness:**
- Detects busy weeks from calendar integration
- Proactively warns: "Looks like a heavy week — want simplified habit versions?"
- Travel detection: suggests "travel mode" habit adaptations

---

## Feature 9: Morning Ritual ("The Launch Pad")

**Goal:** Make opening Hab-Idy in the morning a habit in itself.

**Flow (under 60 seconds):**
1. Identity reminder: "Good morning [name]. Here's who you're becoming today."
2. Today's top 3 habits with goal color codes
3. First calendar event of the day
4. Optional energy check-in (1-5)
5. One motivational pull from RAG
6. CTA: "Start with [easiest habit] — 2 minutes."

**Why this matters:** Users who open the app in the morning are 3x more likely
to log habits that day. This feature drives retention more than any other.

---

## Feature 10: App Blocking / Focus Mode (Phase 3 — Native App Only)

**Goal:** Help users protect habit time from distraction apps.

- Opt-in only — never automatic
- Integrates with iOS Screen Time / Android Digital Wellbeing
- User sets: "Block [app] during [morning window]"
- When blocked app opened: brief identity reminder, not a lecture
- Requires native mobile app (React Native or Swift/Kotlin)
