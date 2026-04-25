# AGENTS.md — Agents

All agents live in `lib/agents/`. All call the API through `lib/claude.ts`.
All are logged via `lib/logger.ts`. All assert on outputs before using them.

---

## Guard Rules (All Agents)

```
1. Log every tool call AND its return value — not just errors
2. Assert before passing anything to the model:
   - DB query null → stop, return graceful fallback message
   - User context empty → ask the user, never invent
3. Cap conversation at 10 turns → summarize and hand off
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
**Persona:** A warm, knowledgeable guide — like a brilliant friend who understands the psychology of behavior change and genuinely wants to understand you before giving advice.

### Purpose
Investigate the user's identity, motivations, environment, and life context to gather everything Architect needs to build the right habit. The Identity Gatherer does not suggest habits — that is Architect's job.

### Opening Message (auto-generated)
Before the user types anything, the Identity Gatherer generates an opening message that:
- Explains the science of habit building in 2–3 sentences (cue, routine, reward, environmental design, identity)
- Frames the session as building toward a long-term identity, broken into small steps
- Ends with: "So let's start there — who do you want to become?"
- Tone: warm + educational, not clinical

### Conversation Rules
- One question per message, never stacked
- Questions are 2–4 sentences max
- Reflects the user's exact language back at them
- Never suggests specific habits
- References identity framing at start and again in closing recap
- 10 turns maximum per session
- Wrap-up hint injected into system prompt at ≤2 turns remaining

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
When enough info is gathered (turns 6–10) or max turns hit:
- 3–4 sentence recap: who they want to become, what's in the way, what habit would fit
- Reference their long-term identity: "Based on everything you've shared, it sounds like you're working toward becoming [identity]."
- End with: "Ready to build your first habit around this?"

### Data Flow
- **Reads:** `identity_statement` from `users` table, `user_profile_context.summary` via `getProfileContext()`
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
**Persona:** Patient, structured, encouraging. Knows the Atomic Habits system cold.

### Purpose
Reads the Identity Gatherer session summary and builds 2–3 concrete, identity-based habits tailored to this specific person.

### Behavior
1. Reads Identity Gatherer session summary from `conversation_memory` (`agent = 'identity-gatherer'`)
2. Calls `getProfileContext(user_id)` and includes it in the system prompt
3. Generates exactly **2–3 habits** following the Atomic Habits framework

For each habit, output:
- `identity_label`: "I am a ___" (short, identity-affirming)
- `habit_name`: short display name
- `cue`: "After X, I will Y at Z"
- `two_minute_version`: smallest possible start
- `category`: one of the 6 goal categories
- `color`: matching the category color

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
When `HABITS_READY:` is detected:
- Parse the JSON array
- Replace chat panel with habit selection screen (2–3 habit cards)
- User selects which to activate
- "Start these habits →" saves via `POST /api/habits`
- Routes to `/dashboard` after 1.2s

### Unselected Habits
Saved to `proposed_habits` with `selected = false`. Surfaces in `/add-habit` after first 7-day streak.

### Eval Cases
- Vague identity → ask follow-up, never proceed
- User wants 1 habit → still generate 2–3 options
- No cue → don't advance to HABITS_READY
- Identity Gatherer summary empty → continue without it, do not error
- `getProfileContext` null → continue without it, do not error

---

## Agent 3: Explore (Reflection)

**Not a conversational agent** — one-shot summarizer called from `/api/explore`.

### Behavior
1. Receives new free-text reflection from user
2. Reads all past reflections from `user_reflections`
3. Generates a concise updated profile summary
4. Saves to `user_profile_context.summary`

Read by Identity Gatherer and Architect via `getProfileContext(userId)`.

---

## Shared Helper

```typescript
// lib/supabase.ts
export async function getProfileContext(userId: string): Promise<string | null>
// Reads user_profile_context.summary — returns null if not found
```

---

## Category → Color Mapping

```typescript
const CATEGORY_COLORS: Record<string, string> = {
  'Health & Fitness':    '#4ADE80',  // green
  'Career & Learning':   '#60A5FA',  // blue
  'Relationships':       '#F472B6',  // pink
  'Creativity':          '#A78BFA',  // purple
  'Mindset & Energy':    '#FBBF24',  // amber
  'Something else':      '#94A3B8',  // slate
}
```

---

## Phase 2: Future Agents

### Agent 4: Habit Breaker ("The Analyst")

**Purpose:** Helps users understand and dismantle bad habits using the cue-craving-action-reward framework in reverse. Non-judgmental, curious.

**Persona:** Gentle detective. Curious, not critical. Treats bad habits as puzzles to understand, not failures to shame.

**The Break Flow:**
```
Step 1 — NAME IT (without judgment)
  "What's the habit you want to understand?"
  Normalize: "Almost everyone has habits they'd like to change."

Step 2 — FIND THE CUE
  "When does this usually happen? Time of day? Situation? Emotion?"
  "What were you feeling right before you did it last time?"

Step 3 — FIND THE CRAVING
  "What does this habit give you? Relief? Distraction? Connection?"
  "It's serving some need — what need?"

Step 4 — SHOW THE TRAJECTORY
  Use log data if available. Be honest but compassionate.
  "Habits don't just affect your day — they change your trajectory."

Step 5 — REPLACEMENT
  "What else could meet that same need?"
  Optionally hand off to Architect to build the replacement habit.
```

**Eval Cases:**
- User is self-critical → redirect to curiosity, not shame
- No habit log data → proceed with questions only, no data references
- User can't identify the cue → offer list of common cue categories

---

### Agent 5: Navigator ("The Daily Planner") — Phase 2

**Purpose:** Pulls tasks and habits, then recommends a time-blocked daily schedule based on energy levels, urgency, and goal alignment.

**Tools (Phase 2):**
- `fetchGoogleCalendarEvents`
- `fetchNotionTasks`
- `retrieveUserEnergyPattern`
- `writeCalendarBlocks`

**Schedule Logic:**
```
For each task/habit:
  - Score: urgency + goal_alignment + energy_match
  - Tag: easy win | deep work | quick task | habit
  - Suggest time block based on user's energy pattern

Generate 2–3 schedule options (not 1 — give choice):
  Option A: Hard thing first (eat the frog)
  Option B: Momentum build (easy wins → hard work)
  Option C: Goal-first (highest alignment tasks prioritized)
```

**Eval Cases:**
- Calendar fetch empty → ask user to describe their day manually
- Notion not connected → fall back to built-in task list
- User approves schedule → confirm before writing to calendar

---

## Evals

Location: `evals/`

**Core eval cases across all agents:**
- `empty_rag_retrieval` — agent does not hallucinate, logs failure, continues gracefully
- `null_user_memory` — agent starts fresh, does not error
- `db_save_failure` — agent informs user, does not lose input, logs full error context
- `user_overwhelm_attempt` — agent redirects to one habit, explains why
- `vague_identity_goal` — agent asks clarifying questions, never accepts "I want to be better"