# UX.md — User Experience, Flows & Interaction Design

## Core UX Principles

1. **Get students into the habit loop fast** — minimal setup, maximum momentum from day one
2. **Frictionless by default** — if it takes more than 3 seconds, redesign it
3. **Always show the why** — every habit, task, and suggestion shows how it connects to a goal
4. **Adaptive, not rigid** — habits flex with life; consistency > perfection
5. **Identity language everywhere** — never "you completed 4/7" always "you're becoming X"

---

## Full User Flow (5 Stages)

Based on iPad notes. This is the backbone of the app architecture.

### Stage 1 — GOAL / BECOMING
*"Not everyone has a goal — and that's okay. We'll find it together."*

Entry point: "How can I help you be the person you want to be?"

Questions to surface:
- What habits can I imagine this person having?
- How can we streamline this process?
- What does this person's day look like?

Design note: This stage must feel exploratory, not like a form. Constellation agent owns this.

---

### Stage 2 — HABITS INTERFACE WITH MY LIFE
Map existing habits (good and bad) to the user's life and goals.

- What habits are currently in the way?
- What habits are currently helping?
- Survey: how much time do you currently spend on [category]?
- Success rate of current habits?
- Cue / urge / action / reward mapping

Design note: This is discovery, not judgment. The tone is curiosity.

---

### Stage 3 — IMPLEMENTING A HABIT
Building the habit correctly from the start.

- What habits to implement (suggestions based on goals + enjoyment)
- Psychology: cue, urge, action, reward framework
- Fitting into schedule / time management
- Timeframe and ease — start absurdly small
- Reminders — smart, not annoying
- Experimentation with misaligned habits (it's okay to try and adjust)

Key question: *"About how much time do you have per week to do this habit?"*
Goals should be **measurable and time-boxed**.

Design note: Architect agent owns this stage. Never suggest more than one habit.

---

### Stage 4 — TRACKING THE HABIT
Make tracking invisible where possible.

- Homepage: habits listed, swipe for completion (right = done, left = missed)
- Widget on phone home screen for one-tap logging
- Smart reminders — timed to user's patterns, not fixed clock times
- Tedious to track EVERY habit → solution: auto-tracking where possible,
  widget for quick manual log, limit active habits to 3-5 max

Design note: The widget is critical for Phase 2. It's the lowest-friction logging path.

---

### Stage 5 — MAINTAIN THE HABIT
Long-term retention and accountability.

- Accountability system: streaks, friend streaks, social aspects
- "Don't throw a zero" — even 2 minutes counts
- Ability to recount/rebuild after a miss without shame
- Increase difficulty of habit over time as it becomes automatic
- Check: is this habit still aligned with life goals?
- Warn of busy schedule coming up (calendar integration)
- Travel insights — adjust habits when traveling, not abandon them

---

## Color Coding System

**COLOR CODING IS A CORE UI FEATURE — not optional.**

Every item in the app has a color tied to its goal category:

| Category | Color | Hex |
|----------|-------|-----|
| Health & Fitness | Sage green | `#84B59F` |
| Career & Learning | Deep blue | `#1C3F6E` |
| Relationships | Warm coral | `#E07A5F` |
| Creativity | Soft purple | `#9B72AA` |
| Mindset & Energy | Amber | `#F2A65A` |
| Have-To-Dos (non-goal tasks) | Neutral gray | `#9E9E9E` |

**Goal habits** get their full category color.
**Have-to-dos** (classes, appointments, obligations) get neutral gray.
This visual distinction makes goal alignment immediately visible.

Every habit card, task item, and calendar block should carry its color.

---

## Adaptive Scheduling

*"Flexible tasks and habits to account for vacations, travel, changing time
and priority metrics — week-to-week interaction with your AI mentor."*

### Energy-Based Scheduling
- Throughout the day, the app notices low-energy signals (time patterns, self-report)
- Surfaces things that can **energize** the user: exercise, social interaction,
  creative tasks, short walks
- User can maintain a list: "Things I've noticed that help my energy"
  (e.g., exercise, call a friend, go outside for 10 min)
- AI recommends these at low-energy moments

### Adaptive Habit Flexibility
- When user marks a habit as "not today" — no shame, ask: "Want to do a 2-min version?"
- Vacation mode: habits auto-adjust to a minimal "maintenance" version
- Busy week detected (via calendar): AI proactively simplifies habit load
  ("Looks like a heavy week — want to set lighter versions of your habits?")

### Weekly AI Mentor Check-In
- Every Sunday (or user-chosen day): brief reflection with AI mentor
- Review: what worked, what didn't, any habit adjustments needed?
- Set intentions for the upcoming week
- This is a feature, not a notification — users should look forward to it

---

## OKR / Goal Tracking Framework

*"After putting in goals, build OKRs or a method to discernibly track progress
with actions, then building those into routine."*

For each major goal, the app creates:

```
GOAL: Become a software engineer I'm proud of
  └── KEY RESULT 1: Write code for 30 min, 5x/week (tracked via habit)
  └── KEY RESULT 2: Complete 1 project per month (tracked via milestone)
  └── KEY RESULT 3: Apply to 3 internships by March (tracked via task)

HABITS mapped to this goal:
  - Daily: "30 min coding practice" → [color: Career blue]
  - Weekly: "Review one concept I struggled with"
```

The OKR view shows users **exactly how their daily actions connect to their goals**.
This is the most important feature for keeping motivation alive.

---

## Morning Routine Feature

*"In the morning, open your phone to the habit app — can help set your habits by
giving you persuasive instructions explaining how this will help your goals."*

Morning check-in flow (takes < 60 seconds):
1. "Good morning [name]. Here's who you're becoming today." [identity reminder]
2. Show today's 3 habits with their goal connections
3. Show next calendar event / must-do
4. Optional: "How's your energy?" (1-5) — adjusts suggestions
5. One motivational line from RAG (identity or motivation category)
6. CTA: "Start with [easiest habit] — it takes 2 minutes."

Design note: This is the daily ritual that drives retention.
If users open the app in the morning, they're 3x more likely to log habits that day.

---

## App Blocking Feature (Phase 2)

*"Block different apps on your phone if you want to do this."*

- Integration with iOS Screen Time / Android Digital Wellbeing APIs
- User can set: "Block [Instagram, TikTok] during [morning habit window]"
- Framed positively: "Protect your focus time, not restrict your freedom"
- When a blocked app is opened: brief reminder of the goal they're working toward
- This is **opt-in only** — never automatic

Phase note: Requires native mobile app (React Native). Web cannot do this.

---

## Intervention / Notification System

*"Ability to intervene when bad habits are about to be made."*

Rules for notifications (never annoying):
- **Max 1 notification per day** (outside of reminders the user set themselves)
- **Always identity-framed**: "Are you showing up for yourself today?"
- **Never guilt**: no "you missed yesterday" — always "today's a new vote"
- Smart timing: learns when user typically logs and adjusts
- Screen time intervention (Phase 2/3): if user opens a distraction app
  during a habit window, brief check-in appears

---

## Widget Spec (Phase 2)

Home screen widget for iOS and Android:

**Small widget (2x2):**
- Today's most important habit
- One-tap complete button
- Streak number

**Medium widget (2x4):**
- Top 3 habits for today
- Individual complete buttons
- Goal color coding

**Design principle:** Widget should be beautiful enough that users *want* it
on their home screen. It's a daily identity reminder, not just a to-do list.

---

## Notion / Task Integration

*"Pull information from a todo list app like Notion and recommend tasks to do
based on feasibility, difficulty, energy level while maintaining alignment with goals."*

Integration behavior:
- Import tasks from Notion (or built-in task list as fallback)
- Each task gets tagged: goal alignment, energy cost, urgency, time estimate
- AI recommends which tasks to do and when based on:
  - User's energy level (from morning check-in)
  - Deadline urgency
  - Goal alignment score
  - Current habit streak status
- Show options, never commands — user always chooses
- Write approved schedule back to Google Calendar

Time tracking:
- Track hours spent per goal category per week
- Show the user: "You spent 4h on Career this week, 0.5h on Health"
- Connect to goal OKRs: "You're at 60% of your coding goal this week"

---

## Social Features (Phase 2)

From notes: *"friend streaks, social aspects"*

- Friend streaks: see friends' streak counts (not habits — privacy default)
- Accountability partner: pair with a friend for one shared habit
- Celebration moments: when a friend hits a milestone, you see it
- No public feed — this is intimate, not performative

Design principle: Social features should create warm accountability,
not comparison anxiety. Keep it opt-in and private by default.

---

## Habit Difficulty Progression

*"Increase difficulty of habit over time as it becomes automatic."*

The app tracks habit automaticity signals:
- Completion rate over 21+ days
- User self-report: "How easy was this today?" (quick 1-5 on log)
- Time to complete (if trackable)

When a habit reaches ~80% completion for 3+ weeks:
- AI suggests: "This seems automatic for you now. Want to level it up?"
- Suggests the next version: "5 min run" → "15 min run" → "20 min run"
- Never pushes — always asks

---

## Quick Start Principle

*"Get students into the habit loop fast — minimal setup, maximum momentum from day one."*

Onboarding should take < 5 minutes and end with:
1. One identity statement saved
2. One goal saved
3. One habit built and scheduled
4. The user having logged it (or being shown exactly how to)

The user should feel momentum before they leave the onboarding flow.
Never end onboarding on a data-collection screen — end on a win.
