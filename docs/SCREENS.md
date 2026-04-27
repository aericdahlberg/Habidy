# SCREENS.md — All Screens

Design system: Nunito headings, Quicksand body, teal primary, purple secondary.
Base: off-white `#F7F7F7`. Specific screens have gradient backgrounds (noted below).

---

## Onboarding Flow (6 screens)

All onboarding screens share: `bg-gradient-to-br from-teal-50 to-purple-50`

Onboarding state is held in `sessionStorage` across the 6 screens (keys:
`habidy_onboarding_profile`, `habidy_onboarding_identity`, `habidy_onboarding_questionnaire`).
At the Loading screen everything is saved to Supabase via `POST /api/onboarding`, then
`sessionStorage` is cleared and the user is redirected to `/constellation`.

### Screen 1: Welcome (`/onboarding`)

```
Mascot image (spring animation — scales + slight rotate in)
"Habidy" in large teal font
"We're here to help you become the person you know you can be."
[Get Started] → /onboarding/profile
```

### Screen 2: Profile Setup (`/onboarding/profile`)

```
"Let's get to know you"
Fields:
  Full Name (required)
  Date of Birth — DD / MM / YYYY (three separate number inputs)
  Gender — dropdown (Male / Female / Non-binary / Prefer not to say)
  Home Address (optional)

Permissions (shadcn Switch toggles):
  Push Notifications
  Data & Analytics Sharing

Terms checkbox (required)

[Continue] → /onboarding/philosophy
```

Saves to `sessionStorage` on Continue.

### Screen 3: Philosophy (`/onboarding/philosophy`)

```
"Most people don't fail because they're lazy."
Explanation of identity-based habits vs goal-based habits
Card: "There's a version of you that reads every morning..."
Gradient card: "1% better every day → 37× better in a year."
Closing: "Be honest — the more real you are, the more this works."

[Let's figure out who you're becoming] → /onboarding/identity
```

Static screen — no data collected.

### Screen 4: Identity Input (`/onboarding/identity`)

```
"How would you describe who you are today, and how do you envision
 yourself evolving over the next year?"

Tall textarea, autoFocus
Placeholder: "e.g. I'm a college student who procrastinates a lot.
  In one year, I want to be disciplined, fit, and confident in interviews."

[Continue] → /onboarding/questionnaire   (disabled until text entered)
```

Saves to `sessionStorage` on Continue.

### Screen 5: Questionnaire (`/onboarding/questionnaire`)

3 sub-screens, each with animated slide transitions. Progress bar at top.

**Sub-screen 1 — Who you are**
- Focus (#1 priority — single choice, 7 options)
- Goal clarity (single choice, 3 options)
- Biggest blockers (multi-choice, up to 2)

**Sub-screen 2 — Your day**
- When you have most energy (6 time-of-day options)
- When you're most likely to stick to something (6 options)
- Sleep amount (5 options)
- Morning feel (5 options)
- Stress level (4 options)

**Sub-screen 3 — Your habits**
- Existing daily habits you do automatically (multi-choice, 9 options)
- Time of day that feels wasted (6 options)
- Where you spend most of your time (7 options)

Sticky footer: [Back] + [Continue / Done]

Saves to `sessionStorage` on Done.

### Screen 6: Loading (`/onboarding/loading`)

```
Animated bouncing mascot
"Building your path…"
5 pulsing teal dots
"Getting ready to meet your Identity Gatherer…"
```

On mount:
1. Reads all `sessionStorage` keys
2. POSTs to `/api/onboarding` (identity_statement, goal_category, friction_point,
   time_available, profile_name, email, questionnaire)
3. Clears sessionStorage
4. After 2.5s → router.replace('/constellation')

---

## Screen: Identity Gatherer (`/constellation`)

Background: `bg-gradient-to-b from-teal-50 to-white`

**Role:** Onboarding finale for new users. Ongoing coach for returning users.

```
Header:
  Mascot image (rounded, 40×40)
  "Identity Gatherer"
  "Your habit investigator"

Chat area (ChatInterface.tsx):
  Agent message bubbles: white card with border + drop shadow
  User message bubbles: teal (bg-primary)
  Typing indicator: three teal pulsing dots
  Teal send button
  Input: white, rounded-2xl, focus ring on primary

[Build my habit →] handoff button → /architect
```

Rules: 10-turn cap per session. Opening question auto-generated from user context.
Always accessible from BottomNav Coach tab — not just first time.

---

## Screen: Architect (`/architect`)

Background: `bg-gradient-to-b from-purple-50 to-white`

```
Header:
  🔨 emoji in teal circle
  "Architect"
  "Building your habits" → "Choose your habits" (after HABITS_READY)

Phase 1 — Chat (same ChatInterface as constellation)

Phase 2 — Habit selection (replaces chat when HABITS_READY detected)
  2–3 habit cards, Lovable card design:

  ┌──────────────────────────────────────────┐
  │ I AM A DAILY RUNNER          (label)     │
  │ Kitchen Table Wind-Down      (name bold) │
  │ After I brush my teeth...    (cue)       │
  │ ┌─────────────────────────────┐          │
  │ │ Start with: Walk to the door│          │
  │ └─────────────────────────────┘          │
  │                              [●] check  │
  └──────────────────────────────────────────┘

  Cards pre-selected. Tap to toggle.
  Category-colored border + background when selected.

  [Start these N habits →] button → saves via POST /api/habits → /dashboard
```

---

## Screen: Dashboard (`/dashboard`)

Background: flat `#F7F7F7`

### First Visit Each Day — SwipeCheckIn

Full-screen swipe experience (replaces entire page content):

```
"Daily Check-in ✨"
"Did you do it today?"

Card stack (3 cards stacked with perspective):
  Active card: draggable, rotates as dragged
  Right swipe overlay: teal ✓
  Left swipe overlay: red ✗
  "[N] of [total]" label
  Habit name + description
  "Swipe right = done · left = not yet"

Manual buttons below: [✗] [✓]
```

After all cards swiped → logs to `/api/habits/[id]/log` for each habit → shows main dashboard.

### After Check-In — Main Dashboard

```
Header:
  "Hey [first name] 👋"          (Nunito, 4xl, black)
  "Becoming: [identity preview]"  (muted, teal accent)
  Avatar button (gradient circle with initials) → /profile

Quote card (white, rounded-3xl):
  Random motivational quote, italic

Progress bar card:
  "Today's Progress"   [N of total]
  Gradient bar: teal → teal/70

Today's Habits (checklist):
  Each row: circle icon | habit_name (identity_label below) | streak 🔥
  Tap = immediate log (✓ green checked state)
  Done: teal check icon + teal text + strikethrough

Milestone banners:
  7-day: "🎉 7-day streak! You're building something real."
  30-day: "🏆 30 days. Time to level up this habit?"

Quick links (2-up grid):
  [✦ Reflect — Chat with your coach]  → /constellation
  [🔨 Build — Refine with Architect]  → /architect

After 7-day streak on any habit:
  [+ Add another habit] button → /add-habit

FAB (+ button, bottom right above nav):
  Fixed, teal, spring in → /architect
```

### Swipe Mechanic (HabitCard)

Still supported via touch events on individual cards in the habit list (swipe up → survey).

| Gesture | Action |
|---------|--------|
| Swipe right | Complete — POST /api/habits/[id]/log, toast "Vote cast. You're becoming them." |
| Swipe left  | Skip — POST /api/habits/[id]/log, toast "No streak broken — just paused." |
| Swipe up    | Opens reflection survey sheet (before today is logged) |
| Tap buttons | Done / Skip buttons below each card |

### Survey Bottom Sheet

```
Handle bar
"Quick reflection"

What went right? [textarea]
What went wrong? [textarea]
Full / Part of it / None   (teal selected, muted unselected)

[Save reflection] → POST /api/habits/survey, then POST /api/explore
```

---

## Screen: Explore (`/explore`)

Background: flat `#F7F7F7`. Sticky header with backdrop blur.

```
Sticky header:
  "Explore"
  Search input (rounded-full, magnifier icon)

Floating bubble area (320px tall, rounded-3xl card):
  6 animated bubbles: Exercise, Finance, Dating, Outdoor, Productivity, Mindfulness
  Bubbles bounce around, collide with walls
  Tap a bubble → stops it, shows category detail below

Category detail (appears below bubbles on selection):
  Emoji + category name
  "Explore [category] habits or talk to your coach..."
  [Talk to your coach about [category]] → /constellation

Reflection input (always visible):
  "Share a reflection"
  Textarea: "What's on your mind about how you work, live, or want to grow?"
  Character count + [Submit]
  On submit: POST /api/explore → updates user_profile_context
  Confirmation: "Got it — this will shape your future habits."
```

---

## Screen: Social (`/social`)

Background: flat `#F7F7F7`. New in v2.

```
"Social"
"Stay accountable together"

[Friend Requests badge — only shown when pending exist]
  Each request: initials avatar | name + "wants to be accountability partners"
  [Accept] [Decline] buttons → POST /api/social/friends/respond

[Friends Activity]
  Each friend: initials/avatar | "N/total habits today"
  Mini progress bar (teal = all done, purple = partial)
  Status icon: ✓ green (all done) | clock purple (partial) | circle gray (none)
  Empty state: "No friends yet" + mascot nudge

[Add a Friend]
  Email input + send button → POST /api/social/friends/request
  Inline success: "Request sent to [name]!"
  Inline error: "No Habidy user found with that email"

[Communities]  (cosmetic, coming soon — dimmed)
  4 community cards in 2-column grid
  Join buttons disabled
```

---

## Screen: Add Habit (`/add-habit`)

Background: flat `#F7F7F7`. **Unlocked after 7-day streak on any habit.**

```
Header: "Add a habit" | ← Back button
Subtext: "Architect already built these for you" OR "Generate new suggestions"

Proposed habit cards (from proposed_habits table):
  Each card: identity_label, habit_name, cue, two_minute_version
  Category-colored border/bg
  [Add] button → POST /api/habits → becomes [Added ✓]

If no proposed habits:
  "No saved suggestions"
  "Run Architect again to generate new habit ideas..."

If at least one added:
  [Go to dashboard →]

[Generate new suggestions] → /architect
```

---

## Screen: Profile (`/profile`)

Background: flat `#F7F7F7`. Lovable card layout with Supabase data.

```
Header: "Profile" | mascot thumbnail

Avatar circle (gradient teal, large initials)
Display name (from users.display_name or email prefix)
Email

"About you" card:
  Name | Email rows with icon + label

"Your journey" card:
  Identity statement (teal sparkle icon, soft teal bg)
  Active habits count (from habits table)
  Current focus (from users.goal_category)

[Reset and start over] → clears localStorage, routes to /welcome
[Sign out] → Supabase signOut(), routes to /login
```

---

## BottomNav (5 tabs)

Fixed at bottom. White `bg-white/95`, `backdrop-blur-md`, subtle `border-t border-zinc-100`.

```
🏠 Home      → /dashboard
🧭 Explore   → /explore
[mascot] Coach → /constellation
👥 Social    → /social
👤 Profile   → /profile
```

Active tab: teal (`text-primary`). Inactive: muted gray. Font size 10px to fit 5 tabs.

---

## Screen: Welcome (`/welcome`)

Background: `bg-gradient-to-br from-amber-50 via-white to-teal-50`

This screen is now a redirect bridge only — shows a loading spinner while it:
1. Checks `users.new_user` and `users.identity_statement`
2. Sets `new_user = false`
3. Routes to `/onboarding` (new users) or `/dashboard` (returning users)

The old philosophy/brand-story content was moved to `/onboarding/philosophy`.

---

## Screen: Login (`/login`)

Standard Supabase Auth UI. Email/password only. No OAuth.
