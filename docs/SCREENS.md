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

### Screen 6b: Google Calendar (`/onboarding/calendar`)

Optional screen inserted between Questionnaire and Loading. Shown to all new users.

```
Mascot image (40×40)
"Connect Google Calendar"
"See your habits alongside your schedule and get reminders."

Benefits list (3 rows with icons):
  📅  "See habits on your calendar"
  ⏰  "Daily reminders at the right time"
  🧠  "Architect learns your free time"

[Connect Google Calendar →]  → GET /api/auth/google?from=onboarding
                                → Google consent → callback → /onboarding/loading

[Skip for now]  → /onboarding/loading (text-muted-foreground underline)

(Note: skipping is always fine — can connect later from Profile → Integrations)
```

Navigation:
- "Connect" starts the OAuth flow; after Google consent, callback redirects to `/onboarding/loading`
- "Skip" navigates directly to `/onboarding/loading`

### Screen 6: Loading (`/onboarding/loading`)

```
Animated bouncing mascot
"Building your path…"
5 pulsing teal dots
"Getting your experience ready…"
```

On mount:
1. Reads all `sessionStorage` keys
2. POSTs to `/api/onboarding` (identity_statement, goal_category, friction_point,
   time_available, profile_name, email, questionnaire)
3. Clears sessionStorage
4. After 2.5s → router.replace('/mode-select')

---

## Screen: Mode Select (`/mode-select`)

Background: `bg-gradient-to-b from-purple-50 via-white to-teal-50`

New screen that appears AFTER onboarding loading and BEFORE any agent interaction.
Cards slide up one by one with staggered framer-motion entrance animations.
BottomNav is **hidden** on this screen.

```
Mascot image (centered, 64×64)
"How do you want to start?"
"Choose the experience that fits you right now."

Card 1 — ⚡ "I know what I want"
  Badge: "Quick start"      Subtitle: "2 minutes"
  Description: "Tell us the habit you have in mind. We'll help you make it stick."
  Accent: teal (text-primary, border-primary/20)
  → /quick-habit

Card 2 — 🧭 "Give me some direction"   ← highlighted with ring-2 ring-secondary/30
  Badge: "Recommended"     Subtitle: "7 minutes"
  Description: "Answer a few questions and we'll find the right habit for your life."
  Accent: purple (text-secondary, border-secondary/40)
  → /constellation

Card 3 — 🔮 "Coach me through it"
  Badge: "Full experience"  Subtitle: "20 minutes"
  Description: "A deep dive into your identity, motivations, and what's been getting in your way."
  Accent: amber (text-amber-600, border-amber-200)
  → /constellation
```

On tap:
- `sessionStorage.setItem('habidy_mode', 'quick' | 'guided' | 'deep')`
- `POST /api/mode` with chosen mode (saves to users.engagement_mode in DB)
- Navigate to dest

---

## Screen: Quick Habit (`/quick-habit`)

Background: `bg-gradient-to-b from-teal-50 to-white`

For users who chose "I know what I want". A simple form — NOT a chat interface.
BottomNav is **hidden** on this screen.

```
Header: ← Back | "Quick Habit" | "Tell us what you have in mind"

"What habit do you want to build?"
"Be as specific as you can…"

Field 1 — "What's the habit?" (required, textarea, 200-char limit)
  Placeholder: "e.g. Read 10 minutes before bed, drink 6 glasses of water a day"

Field 2 — "When would you do it?" (optional, input, 200-char limit)
  Placeholder: "e.g. After my morning coffee, before I open my phone"

Field 3 — "Where?" (optional, input, 200-char limit)
  Placeholder: "e.g. At my desk, in bed, at the gym"

[Build my habit →]  (disabled until Field 1 filled)

Loading state: "Designing 5 habit options tailored to you…"
```

On submit:
1. Saves to sessionStorage: `habidy_quick_habit`, `habidy_quick_cue`, `habidy_quick_location`
2. POSTs to `/api/agents/architect` with `{ mode: 'quick', autoGenerate: true, quickHabitData: { habit, cue, location } }`
3. Stores response in `sessionStorage('habidy_pregenerated_habits')`
4. Redirects to `/architect` which reads the pre-generated habits (skips auto-generate)

---

## Screen: Identity Gatherer (`/constellation`)

Background: `bg-gradient-to-b from-teal-50 to-white`

**Role:** Onboarding finale for new users. Ongoing coach for returning users.

```
Header:
  Mascot image (rounded, 40×40)
  "Identity Gatherer"
  Mode subtitle (e.g. "5 questions" or "15 questions")
  Turn counter pill (top-right, e.g. "Question 3 of 5") — amber when last 2 remain

Chat area (ChatInterface.tsx):
  Agent message bubbles: white card with border + drop shadow
  User message bubbles: teal (bg-primary)
  Typing indicator: three teal pulsing dots
  Teal send button
  Input: white, rounded-2xl, focus ring on primary

[Build my habit →] handoff button → /architect
```

**Three Modes** (set by `/mode-select`, stored in `sessionStorage('habidy_mode')`):

| Mode | Max turns | Prompt style |
|---|---|---|
| `guided` | 5 | Focused — 5 targeted questions on cue, energy, blocker, reward |
| `deep` | 15 | Full coaching — identity, behavior, environment, blockers, motivation |
| (default) | 5 | Same as guided — used when navigating to /constellation directly |

Mode is sent in every API call via `extraPayload: { mode }`.
Turn counter shows "Question X of Y" when mode is guided or deep.
Always accessible from BottomNav Coach tab — not just first time.

---

## Screen: Architect (`/architect`)

Background: `bg-gradient-to-b from-purple-50 to-white`
No BottomNav (replaced by floating selection bar).

```
Header:
  🔨 emoji in teal circle
  "Architect"
  "Tap ♥ to choose your habits"   (subtitle when habits ready)
  "X / 5" counter (top-right)

Loading state:
  Bouncing mascot + "Building your habits…" + "Designing 5 options tailored to you"

Habit carousel (embla-carousel-react, one card at a time):

  ┌────────────────────────────────────┐
  │████████ (category color bar, top)  │
  │                                    │
  │ I AM A DAILY READER    (label)     │
  │ Morning Page Habit     (name, 2xl) │
  │                                    │
  │ After I make coffee,               │
  │ I will read at my desk.  (cue)     │
  │                                    │
  │ ┌──────────────────────────────┐   │
  │ │ Start with: Read 1 paragraph │   │
  │ └──────────────────────────────┘   │
  │ Career & Learning  (pill)          │
  │                                    │
  │  [♥ Choose this habit]             │
  └────────────────────────────────────┘

  ◀  ● ● ○ ○ ○  ▶       (arrows + dots)

  "Regenerate all" link at bottom

Selection rules:
  - Tap heart button to select/deselect
  - Max 2 selections enforced — 3rd tap shows Sonner toast:
    "You can only pick 2 habits to start. Deselect one to choose this one."
  - Selected dots show at 40% opacity in indicator row
  - Selected card gets primary-colored border + shadow

Floating bottom bar (AnimatePresence, springs up when ≥1 selected):
  [Start this habit →] / [Start these 2 habits →]
  [Add to Google Calendar] toggle — only shown if user has calendar connected
    (teal border + bg when on; muted border when off; pre-checked if connected)
  "You can pick N more" / "Maximum selected" hint below button
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

### Per-habit Reminder Sheet

Bell icon appears in the identity banner (top-right of HabitCard) when:
- `calendarConnected === true` AND `habit.google_calendar_event_id` is set

Tapping the bell opens `<ReminderSheet>`:
```
Reminders for "{habitName}"

Reminders enabled     [toggle]
Time of day           [Morning] [Midday] [Afternoon] [Evening] [Late night]
Remind me             [30 min] [15 min] [5 min] [At start]  ← multi-pick
                      "Using global defaults from Profile" (when none picked)

[Save]    [Use defaults]   ← "Use defaults" resets per-habit overrides to null
```

`PATCH /api/calendar/habits/[habitId]` — propagates to Google Calendar event.

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

"Integrations" card:
  Calendar icon + "Google Calendar"
  If connected:   green dot + "Connected" · [Disconnect] button → DELETE /api/calendar/disconnect
  If not:         gray dot + "Not connected" · [Connect] button → GET /api/auth/google?from=profile
  Success banner (from ?calendar=connected query param): green "Google Calendar connected!"
  Error banner   (from ?calendar=error query param):    red   "Could not connect. Try again."
  Banners auto-dismiss on next page load (query param not persisted)

[Reset and start over] → clears localStorage, routes to /welcome
[Sign out] → Supabase signOut(), routes to /login
```

"Notifications" card (shown only when `calendarConnected === true`):

```
🔔 NOTIFICATIONS

Auto-dismiss when logged      [toggle, default ON]
  "Clears today's reminder after you log the habit"

Email reminder (1 hr before)  [toggle, default OFF]
  "Google Calendar sends an email 1 hr before each habit"

Default remind me:
  [ 30 min ] [ 15 min ] [ 5 min ] [ At start ]   ← multi-pick chips
"Reminders include your habit name and identity statement."
```

State: debounced `PATCH /api/profile/notification-prefs` on every toggle/chip click.
Optimistic update — UI reflects change immediately, reverts on server error.

OAuth redirect params:
- `?from=profile` → callback redirects back to `/profile?calendar=connected`
- `?from=onboarding` → callback redirects to `/onboarding/loading`

---

## Screen: Habit Coach (`/coach`)

**Background:** `bg-gradient-to-b from-secondary/5 to-background`
**Entry:** `WeeklyReviewCard` on `/dashboard` → "Let's talk →" button
**Also reachable:** Coach tab in BottomNav (when review is due; otherwise goes to `/constellation`)

```
Header:
  ← back button (router.back())
  "Habit Coach"  (font-heading, xl)
  "Weekly review"  (muted subtitle)

Chat area:
  ChatInterface component with agentEndpoint="/api/agents/coach"
  thinkingLabel="Reviewing your week…"
  maxTurns=12

Apply bar (AnimatePresence — appears when COACH_PROPOSALS detected):
  Purple button: "Apply N change(s) →"
  → POST /api/agents/coach/apply
  → success state: teal confirmation + redirect to /dashboard after 1.5s

BottomNav visible.
```

**Data flow:**
1. On mount: auth check → setUserId
2. ChatInterface auto-calls `/api/agents/coach` with `messages: []` on first render
3. Agent reads `[HABIT ANALYSIS]` + `[CALENDAR CONTEXT]` from server-loaded context
4. When Claude outputs `COACH_PROPOSALS:`, `onProposalsReady` fires → Apply bar appears
5. Apply bar: POST to `/api/agents/coach/apply` → updates habits + `last_coach_review_at`

**State:**
- `proposals: CoachProposal[] | null` — set when agent outputs COACH_PROPOSALS marker
- `applying: boolean` — disabled state for Apply button
- `applied: boolean` — success state, triggers redirect

---

## BottomNav (5 tabs)

Fixed at bottom. White `bg-white/95`, `backdrop-blur-md`, subtle `border-t border-zinc-100`.

```
🏠 Home      → /dashboard
🧭 Explore   → /explore
[mascot] Coach → /coach (when weekly review due) | /constellation (otherwise)
👥 Social    → /social
👤 Profile   → /profile
```

Active tab: teal (`text-primary`). Inactive: muted gray. Font size 10px to fit 5 tabs.

**Hidden on:** `/mode-select`, `/quick-habit` (returns null — these are full-screen flow screens).

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
