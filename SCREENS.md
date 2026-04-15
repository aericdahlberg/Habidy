# SCREENS.md — The 4 MVP Screens

## Screen 1: Onboarding

**Goal:** Earn trust fast, collect just enough to make the AI useful.
**Time to complete:** Under 3 minutes.
**Rule:** Max 4 inputs. No walls of text. Every question feels meaningful.

### Flow

```
Step 1 — The opening (full screen, minimal)
  Large text: "How can I help you be the person you want to be?"
  Single text input. Placeholder: "I want to be someone who..."
  Button: "Let's figure it out"

Step 2 — Pick a focus area
  "What area of your life matters most right now?"
  6 cards to tap (one selection):
    🏃 Health & Fitness
    💼 Career & Learning
    🤝 Relationships
    🎨 Creativity
    🧠 Mindset & Energy
    📚 Something else

Step 3 — The honest question
  "What's one thing you do (or don't do) every day that doesn't match
   who you want to be?"
  Text input. Short. This is their friction point.

Step 4 — Time reality check
  "About how much time per day could you give to a new habit?"
  4 options:
    ⏱ 5 minutes
    🕐 15 minutes
    🕑 30 minutes
    🕓 1 hour+
```

### After Onboarding
Save: `identity_statement`, `goal_category`, `friction_point`, `time_available`
Route user to: Constellation (first time) or Dashboard (returning)
Show: "Nice. Let's explore what kind of person you're becoming." → Constellation

---

## Screen 2: Constellation

**Goal:** Open-ended AI conversation about who the user is and what they want.
Warm up the user before they build a habit with Architect.
**UI:** Full chat interface. Clean. Feels like iMessage, not a form.

### What It Does
- Asks about what brings the user joy, what drains them, what their ideal day looks like
- Surfaces self-awareness: "You mentioned feeling energized after exercise twice now"
- Prepares context that Architect will use to suggest a relevant habit
- Ends with a natural handoff: "Want to turn one of these ideas into a real habit?"
  → Button: "Build a habit →" (routes to Architect)

### Conversation Starters (Constellation picks one)
- "Tell me about a day that felt really good recently. What made it that way?"
- "What does the person you want to become actually do on a Tuesday morning?"
- "What's something you keep meaning to start but never quite get to?"

### Key Rules
- One question at a time. Always.
- Never suggest a specific habit — that's Architect's job.
- Session ends when user clicks "Build a habit" or after ~10 turns.
- Save a 2–3 sentence summary of the conversation to `conversation_memory`
  so Architect can reference it.

### Persistent Entry
Constellation is also accessible from the nav any time — not just first session.
It's the "thinking out loud" space.

---

## Screen 3: Architect

**Goal:** Build exactly one habit using the Atomic Habits framework.
Full back-and-forth chat, but structured internally — the agent follows
the 6-step flow below without the user seeing "steps."

### The 6-Step Internal Flow (Agent follows this, but conversationally)

```
STEP 1 — IDENTITY
  Agent asks: "Who do you want to be — not what you want to do?"
  Collect: identity_link ("I am ...")
  Use Constellation summary as context if available.

STEP 2 — BEHAVIOR
  Agent asks: "What does this person actually do each day?"
  "Which of these feels most true to you, even a little?"
  Narrow to ONE habit direction.

STEP 3 — MAKE IT ENJOYABLE
  Agent asks: "Of all the ways you could do this — what sounds
  least terrible? Even a little fun?"
  "How could we make this actually satisfying?"
  Collect: reward idea, what makes it attractive.

STEP 4 — CUE (Implementation Intention)
  Agent asks: "After what existing thing in your day could this happen?"
  "Where will you be? What will you have just done?"
  Collect: cue ("After I [X], I will [habit] at [location]")
  This is the most important step. Don't skip it.

STEP 5 — START ABSURDLY SMALL
  Agent proposes the 2-minute version.
  "We're not building the action yet — we're building the identity.
   What's the smallest version of this that still counts?"
  Collect: two_minute_version

STEP 6 — CLOSE THE LOOP
  Agent summarizes the full habit back to the user.
  Shows them how it connects to their goal.
  "Every time you do this, you're casting a vote for the person
   you're becoming."
  → Button: "Save this habit" → saves to DB, routes to Dashboard
```

### What Gets Saved
```
habit.name
habit.identity_link     "I am someone who..."
habit.cue               "After I brush my teeth, I will..."
habit.craving           why it matters to them
habit.action            the actual behavior
habit.reward            immediate payoff
habit.two_minute_version the absurdly small version
habit.goal_category     inherited from onboarding
habit.time_of_day       morning | afternoon | evening | anytime
```

### Key Rules
- One question per message. Always.
- If the user is vague ("I want to be healthier"), ask a follow-up — never accept vague.
- Never suggest more than one habit. If the user pushes for more, acknowledge
  the enthusiasm and redirect: "Let's make this first one automatic — then we build."
- If the conversation stalls, reference the Constellation summary:
  "You mentioned enjoying mornings — could this fit there?"

---

## Screen 4: Dashboard

**Goal:** Make logging a habit take under 3 seconds. Show the streak. Show the why.

### Layout

```
Header: "Good [morning/afternoon/evening], [name]"
Subtext: rotating identity reminder — "You're becoming someone who [identity_link]"

─────────────────────────────────
HABIT CARD (one card per habit — MVP has max 1)

  [Goal category color bar on left edge]

  "Run for 2 minutes"
  After I make coffee · Morning
  → "I am someone who takes care of their body"

  Last 7 days: ● ● ● ○ ● ● ●   Streak: 5 🔥

  [  ✓ Done today  ]  [  ✗ Skip  ]
─────────────────────────────────

Bottom: "+ Add another habit" → routes to Architect
        (only show after first habit has 7+ logs — don't let user pile on too early)
```

### Swipe Behavior
- Swipe right = Done ✓ (green flash, streak increments)
- Swipe left = Skipped ✗ (no guilt message — "Tomorrow's a new vote.")
- Tapping buttons does the same as swiping

### After Logging
- Done: brief identity affirmation — "Vote cast. You're becoming a [runner/reader/etc.]"
- Skipped: "No streak broken — just paused. Back tomorrow."

### Streak Display
- Show last 7 days as filled/empty dots
- Show current streak number
- At 7 days: small celebration moment
- At 30 days: bigger celebration + prompt to "level up" the habit

### Nav (bottom bar, 4 icons)
```
🏠 Dashboard   💬 Constellation   🔨 Architect   👤 Profile
```
