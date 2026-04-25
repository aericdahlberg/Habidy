# SCREENS.md — All Screens

## Screen 1: Onboarding (/)

**Goal:** Earn trust fast, collect just enough to make the AI useful.
**Time to complete:** Under 3 minutes.
**Rule:** Max 4 inputs. No walls of text. Every question feels meaningful.

### Flow

```
Step 1 — Identity (full screen, minimal)
  Rotating identity card behind the input (reader, athlete, writer, artist)
  Cards rotate every 2.5s with gradient backgrounds
  Text input: "I want to be someone who..."
  Button: "Let's figure it out"
  Progress dots at top (4 dots, first active)

Step 2 — Focus area
  "What area of your life matters most right now?"
  6 cards (one selection):
    🏃 Health & Fitness
    💼 Career & Learning
    🤝 Relationships
    🎨 Creativity
    🧠 Mindset & Energy
    📚 Something else

Step 3 — Friction point
  "What's one thing you do (or don't do) every day that doesn't match
   who you want to be?"
  Text input. Short. This is their friction point.
  Button: "Continue"

Step 4 — Time reality check
  "About how much time per day could you give to a new habit?"
  4 options:
    ⏱ 5 minutes
    🕐 15 minutes
    🕑 30 minutes
    🕓 1 hour+
  Selecting one immediately saves and advances.
```

### Completion screen
```
  ✓ (checkmark in black circle)
  "You're all set."
  "Let's explore what kind of person you're becoming."
  Identity statement echoed back in italic
  Button: "Meet your Insights agent →" → /constellation
```

### After Onboarding
Save: `identity_statement`, `goal_category`, `friction_point`, `time_available`
Also accessible via + button on dashboard (for adding a new identity).

---

## Screen 2: Identity Gatherer (/constellation)

**Goal:** Open-ended AI conversation to gather deep context before building a habit.
**UI:** Full chat interface. Clean. One question at a time.

### What It Does
- Generates an opening message explaining habit science + identity framing
- Ends opening with: "So let's start there — who do you want to become?"
- Asks focused follow-up questions one at a time (2–4 sentences each)
- Internally working toward: who they want to become, actions, what makes it attractive, environment, cue, two-minute version
- Generates a 3–4 sentence closing recap, then hands off to Architect

### Key Rules
- One question at a time. Always.
- Never suggest a specific habit — that's Architect's job.
- 10 turns maximum per session.
- Turn warning shown to user when few turns remain.
- Closing recap ends with: "Ready to build your first habit around this?"
- Handoff button: "Build my habit →" → routes to /architect

### Persistent Entry
Accessible from nav any time — not just first session.
Each session saves a new summary to `conversation_memory`.

---

## Screen 3: Architect (/architect)

**Goal:** Build 2–3 identity-based habits using the Atomic Habits framework.
**UI:** Full chat interface, then habit selection screen when HABITS_READY detected.

### Chat Phase
- Reads Identity Gatherer summary from conversation_memory
- Reads user profile context
- Asks clarifying questions to refine habit design
- 20 turns maximum

### Habit Selection Screen (replaces chat when HABITS_READY detected)
```
  2–3 habit cards displayed vertically

  Each card:
  ┌──────────────────────────────────────┐
  │ [category color accent bar, left]    │
  │ I am a daily writer                  │  ← identity_label
  │ Kitchen Table Wind-Down              │  ← habit_name
  │ After I brush my teeth, I will...    │  ← cue
  │ Start with: Write 2 lines            │  ← two_minute_version
  │ [ ] checkbox (selected state)        │
  └──────────────────────────────────────┘

  "Start these habits →" button
  (saves selected, marks unselected as proposed_habits, routes to /dashboard)
```

### Key Rules
- Always generates 2–3 options — never just 1
- Unselected habits saved to `proposed_habits` for /add-habit
- Cue must follow "After X, I will Y at Z" format — agent doesn't advance without it
- Routes to /dashboard after 1.2s delay

---

## Screen 4: Dashboard (/dashboard)

**Goal:** Make logging a habit take under 3 seconds. Show the streak. Show the why.

### Layout

```
Header:
  "Good [morning/afternoon/evening]"
  "You're becoming someone who [identity_statement]"
  [+] button (top right) → /onboarding to add new identity

─────────────────────────────────────────
HABIT CARD (one per habit)

  [Category color bar, left edge]
  [Identity banner if set: "I AM A DAILY WRITER"]
  "Kitchen Table Wind-Down"           ← habit_name
  "After I brush my teeth, I will..." ← cue
  ● ● ● ○ ● ● ●  Streak: 5 🔥        ← 7-day dots + streak

  Swipe hint (shown until today is logged):
  "swipe right to complete · left to skip · up to reflect"

  [ ✓ Done today ]  [ ✗ Skip ]
─────────────────────────────────────────

Milestone banners (shown when triggered):
  7-day: "🎉 7-day streak! You're building something real."
  30-day: "🏆 30 days. Time to level up this habit?"

Quick links:
  [✦ Reflect  — Chat with Crystal Ball]  [🔨 Build — Refine with Architect]

After 7-day streak on any habit:
  [+ Add another habit] button → /add-habit
```

### Swipe Behavior
- Swipe right = Done ✓ — POST /api/habits/[id]/log with completed: true
  Toast: "Vote cast. You're becoming them."
- Swipe left = Skipped ✗ — POST /api/habits/[id]/log with completed: false
  Toast: "No streak broken — just paused. Back tomorrow."
- Swipe up = Opens survey bottom sheet (only before today is logged)

### Survey Bottom Sheet (swipe up)
```
  ─ (handle)
  "Quick reflection"

  What went right? [optional textarea]
  What went wrong? [optional textarea]
  Did you do the full thing, part of it, or none?
    [Full]  [Part of it]  [None]

  [Save reflection] button
```
Saves to habit_survey_responses, then POSTs content to /api/explore.

### Nav (bottom bar, 4 icons)
```
🏠 Home (/dashboard)  ✦ Explore (/explore)  🔨 Build (/architect)  👤 Profile (/profile)
```

---

## Screen 5: Add Habit (/add-habit)

**Goal:** Let user activate habits Architect already designed but they didn't select.
**Unlock:** Only shown after any habit reaches a 7-day streak.

### Layout
```
Header: "Add a habit"
Subtext: "Architect already built these for you" or "Generate new suggestions"

Proposed habit cards (unselected from previous Architect sessions):
  Each card shows identity_label, habit_name, cue, two_minute_version
  [Add] button per card (becomes [Added ✓] after tapping)

If no proposed habits:
  "No saved suggestions"
  [Generate new suggestions] → /architect

After adding at least one:
  [Go to dashboard →] button

[Generate new suggestions] → /architect
```

---

## Screen 6: Explore (/explore)

**Goal:** Free-form reflection that feeds into the user's growing profile context.
Every reflection makes the agents smarter about this specific person.

### Layout
```
Growing textarea:
  Placeholder: "What's on your mind? How did today go?
  What's working, what isn't? This is just for you."

[Save reflection] button

Past reflections (below, reverse chronological):
  Each shows: content + relative timestamp ("2 days ago")
```

### After Saving
- Saves to `user_reflections`
- Calls Claude to regenerate `user_profile_context.summary`
- Both Identity Gatherer and Architect read this on next session

---

## Screen 7: Profile (/profile)

**Goal:** Review your identity, see your settings, sign out.

### Layout
```
"Profile"

Identity statement (from onboarding)
Focus area
Time available

[Reset and start over] → clears localStorage, routes to /welcome
[Sign out] → Supabase signOut(), routes to /login
```

---

## Welcome Screen (/welcome)

Shown once on first login (new_user = true).

```
Dark hero section:
  "Every action is a vote for the person you want to become."

Three feature cards:
  Identity first — habits tied to who you're becoming, not what you should do
  Built to stick — the 2-minute rule and cue-based design from Atomic Habits
  Evidence compounds — every log is proof of your identity

[Let's build you →] button → / (onboarding)
```
Sets new_user = false after viewing.
