# AGENTS.md — Agents

All agents live in `lib/agents/`. All call the API through `lib/claude.ts`.
All are logged via `lib/logger.ts`. All assert on outputs before using them.
All agent routes are wrapped with LangSmith `traceable()` from `lib/langsmith.ts`.

---

## Guard Rules (All Agents)

```
1. Log every tool call AND its return value — not just errors
2. Assert before passing anything to the model:
   - DB query null → stop, return graceful fallback message
   - User context empty → ask the user, never invent
3. Cap conversation turns → summarize and hand off
4. Never invent user data. If you don't have it, ask.
5. One question per message. No exceptions.
6. Run eval sets on every deploy (see evals/ directory)
```

---

## Agent 1: Identity Gatherer

**File:** `lib/agents/constellation.ts`
**Route:** `/api/agents/constellation`
**Page:** `/constellation`
**DB agent key:** `identity-gatherer`
**Background:** `bg-gradient-to-b from-teal-50 to-white`

**Persona:** A warm, knowledgeable guide — like a brilliant friend who understands the psychology of behavior change and genuinely wants to understand you before giving advice.

### Two Entry Points

1. **Onboarding flow** — new users arrive here from `/mode-select` after completing the 6-screen onboarding and choosing "guided" or "deep" mode. Their identity statement, questionnaire answers, and profile are already saved.

2. **Ongoing access** — the Coach tab in BottomNav always links here. Returning users can reflect, revisit their identity, or prep for a new habit build.

> Users who choose "quick" mode go to `/quick-habit` instead — not here.

### Purpose
Investigate the user's identity, motivations, environment, and life context to gather everything Architect needs to build the right habit. The Identity Gatherer does not suggest habits — that is Architect's job.

### Opening Message (auto-generated)
Before the user types anything, the Identity Gatherer generates an opening message that:
- Explains the science of habit building in 2–3 sentences (cue, routine, reward, environmental design, identity)
- Frames the session as building toward a long-term identity, broken into small steps
- Ends with: "So let's start there — who do you want to become?"
- Tone: warm + educational, not clinical

### Three Prompt Modes

| Mode | Max turns | Wrap-up at | Focus |
|---|---|---|---|
| `guided` | 5 | ≤1 remaining | Cue, energy, blocker, reward — efficient |
| `deep` | 15 | ≤2 remaining | Identity, behavior, environment, blockers, motivation — thorough |
| `default` | 5 | ≤1 remaining | Same as guided (direct navigation without mode-select) |

Mode is passed in the request body from the frontend. System prompt builder selected accordingly:
- `guided` → `buildGuidedSystemPrompt(ctx)`
- `deep` → `buildDeepSystemPrompt(ctx)`
- anything else → `buildIdentityGathererSystemPrompt(ctx)`

### Conversation Rules
- One question per message, never stacked
- Reflects the user's exact language back at them
- Never suggests specific habits
- References identity framing at start and again in closing recap
- Wrap-up hint injected into system prompt when turns remaining ≤ wrapUpAt

### Internal Goals (never announced to user)
The agent is building answers to six fields:

| Field | Description |
|---|---|
| `who_they_want_to_be` | Who does the user truly want to become? Deeper than their initial statement. |
| `actions_that_person_takes` | What does that version of them actually do on a regular basis? |
| `what_makes_it_attractive` | What would make this enjoyable or meaningful for THIS person specifically? |
| `environment` | What environmental factors help or get in the way? Space, schedule, surroundings. |
| `cue` | Specific trigger: "After I [existing routine], I will [new habit] at [place/time]." |
| `two_minute_version` | The frictionless starting version. Under 2 minutes. Feels almost too easy. |

### Closing Recap
When enough info is gathered or max turns hit:
- Guided: 2–3 sentences then summary JSON
- Deep: 4–5 sentences then summary JSON
- Reference their long-term identity: "Based on everything you've shared, it sounds like you're working toward becoming [identity]."
- End with: "Ready to build your first habit around this?"

### Data Flow
- **Reads:** `identity_statement` from `users` table, `user_profile_context.summary` via `getProfileContext()`, optionally questionnaire data embedded in the system prompt
- **Writes:** One row to `conversation_memory` with `agent = 'identity-gatherer'`
  ```json
  {
    "who_they_want_to_be": "...",
    "actions_that_person_takes": "...",
    "what_makes_it_attractive": "...",
    "environment": "...",
    "cue": "...",
    "two_minute_version": "...",
    "recap": "plain-text closing recap paragraph"
  }
  ```

### Summary Marker
```
IDENTITY_GATHERER_SUMMARY:{"who_they_want_to_be":"...","actions_that_person_takes":"...","what_makes_it_attractive":"...","environment":"...","cue":"...","two_minute_version":"..."}
```

---

## Agent 2: Architect

**File:** `lib/agents/architect.ts`
**Route:** `/api/agents/architect`
**Page:** `/architect`
**Background:** `bg-gradient-to-b from-purple-50 to-white`

**Persona:** Patient, structured, encouraging. Knows the Atomic Habits system cold.

### Purpose
Reads the Identity Gatherer session summary and builds **exactly 5** concrete, identity-based habit options tailored to this specific person. The user picks up to 2 to start.

### Behavior
1. Reads Identity Gatherer session summary from `conversation_memory` (`agent = 'identity-gatherer'`)
2. Calls `getProfileContext(user_id)` and includes it in the system prompt
3. Generates exactly **5 habits** following the Atomic Habits framework, varied by difficulty, time of day, and duration

### Quick Mode
When `mode = 'quick'` and `quickHabitData` is present in the request body:
- Skips the Identity Gatherer session entirely
- `quickHabitData = { habit, cue, location }` from the `/quick-habit` form
- Architect generates 5 variations of the user's requested habit, ranging from very easy to more ambitious
- Habits are pre-generated before the user reaches `/architect`

For each habit, output:
- `identity_label`: "I am a ___" (short, identity-affirming)
- `habit_name`: short display name
- `cue`: "After X, I will Y at Z"
- `two_minute_version`: smallest possible start
- `category`: one of the 6 goal categories
- `proposedId`: nullable string for previously proposed habits

### The Build Flow (follow in order, conversationally)
```
Step 1 — IDENTITY     Who do they want to be?
Step 2 — BEHAVIOR     What does that person do?
Step 3 — ENJOYMENT    Make it attractive
Step 4 — CUE          "After X, I will Y at Z" — don't advance until specific
Step 5 — START SMALL  The 2-minute version
Step 6 — OUTPUT       HABITS_READY JSON
```

### HABITS_READY Detection
When `HABITS_READY:` is detected in the agent response:
- Parse the JSON array (5 habits)
- Route to `/architect` which displays the embla carousel
- User swipes through cards, taps heart button to select (max 2)
- Attempting a 3rd selection shows a Sonner toast
- Floating bottom bar appears when ≥1 selected
- "Start these N habits →" saves via `POST /api/habits`
- Routes to `/dashboard` after 1.2s

### All 5 Habits Saved to proposed_habits
ALL 5 generated habits are saved to `proposed_habits` with `selected = false` at generation time.
When the user selects up to 2 and saves, those are moved to `habits` (active).
The remaining 3 stay in `proposed_habits` and surface in `/add-habit` after first 7-day streak.

### Eval Cases
- Vague identity → ask follow-up, never proceed
- User wants 1 habit → still generate 5 options with varied difficulty
- No cue → don't advance to HABITS_READY
- Identity Gatherer summary empty → continue without it, do not error
- `getProfileContext` null → continue without it, do not error
- `quickHabitData` provided → generate 5 variations of the user's requested habit

---

## Agent 3: Explore (Reflection Summarizer)

**Not a conversational agent** — one-shot summarizer called from `/api/explore`.

### Behavior
1. Receives new free-text reflection from user (from `/explore` page or survey sheet)
2. Reads all past reflections from `user_reflections`
3. Generates a concise updated profile summary
4. Saves to `user_profile_context.summary`

Read by Identity Gatherer and Architect via `getProfileContext(userId)`.

Also triggered automatically after habit survey responses (swipe up on HabitCard).

---

## Shared Helper

```typescript
// lib/supabase.ts
export async function getProfileContext(userId: string): Promise<string | null>
// Reads user_profile_context.summary — returns null if not found
// Called by both constellation and architect system prompt builders
```

---

## Category → Style Mapping

Defined in `HabitCard.tsx` and `ArchitectPage`:

```typescript
const CATEGORY_STYLES = {
  'Health & Fitness':  { bar: 'bg-emerald-500', border: 'border-primary/30',   bg: 'bg-primary/10',   label: 'text-primary'   },
  'Career & Learning': { bar: 'bg-blue-500',    border: 'border-secondary/30', bg: 'bg-secondary/10', label: 'text-secondary' },
  'Relationships':     { bar: 'bg-pink-500',    border: 'border-accent/30',    bg: 'bg-accent/10',    label: 'text-accent'    },
  'Creativity':        { bar: 'bg-violet-500',  border: 'border-secondary/30', bg: 'bg-secondary/10', label: 'text-secondary' },
  'Mindset & Energy':  { bar: 'bg-amber-500',   border: 'border-primary/30',   bg: 'bg-primary/10',   label: 'text-primary'   },
  'Something else':    { bar: 'bg-zinc-400',    border: 'border-border',       bg: 'bg-muted',        label: 'text-muted-foreground' },
}
```

---

## LangSmith Tracing

All agent routes are wrapped with `traceable()` from `lib/langsmith.ts`.
Set `LANGCHAIN_TRACING_V2=true` + `LANGCHAIN_API_KEY` to enable.
Project name controlled by `LANGCHAIN_PROJECT` env var.

---

## Phase 2: Future Agents

### Agent 4: Habit Breaker ("The Analyst")

**Purpose:** Helps users understand and dismantle bad habits using the cue-craving-action-reward framework in reverse. Non-judgmental, curious.

**Persona:** Gentle detective. Curious, not critical. Treats bad habits as puzzles to understand, not failures to shame.

**The Break Flow:**
```
Step 1 — NAME IT (without judgment)
Step 2 — FIND THE CUE (time, situation, emotion)
Step 3 — FIND THE CRAVING (what need does it serve?)
Step 4 — SHOW THE TRAJECTORY (log data if available)
Step 5 — REPLACEMENT (hand off to Architect for replacement habit)
```

---

### Agent 5: Navigator ("The Daily Planner") — Phase 2

**Purpose:** Pulls tasks and habits, recommends a time-blocked daily schedule based on energy levels, urgency, and goal alignment.

**Tools (Phase 2):** `fetchGoogleCalendarEvents`, `fetchNotionTasks`, `writeCalendarBlocks`

---

## Evals

Location: `evals/`

**Core eval cases across all agents:**
- `empty_rag_retrieval` — agent does not hallucinate, logs failure, continues gracefully
- `null_user_memory` — agent starts fresh, does not error
- `db_save_failure` — agent informs user, does not lose input, logs full error context
- `user_overwhelm_attempt` — agent redirects to one habit, explains why
- `vague_identity_goal` — agent asks clarifying questions, never accepts "I want to be better"
