# AGENTS.md — Agents

Three agents for current build. All live in `lib/agents/`.
All call the API through `lib/claude.ts`.
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
- Turn warnings injected at ≤2 turns remaining

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
- Generate a 3–4 sentence recap:
  - Reference their long-term identity directly: "Based on everything you've shared, it sounds like you're working toward becoming [identity]."
  - What has been getting in their way
  - What kind of habit would fit their life
- End with: "Ready to build your first habit around this?"
- Output the summary marker on the next line (see Data Flow)

### Data Flow
- **Reads:** `identity_statement` from `users` table, `user_profile_context.summary` via `getProfileContext()`
- **Writes:** One row to `conversation_memory` with `agent = 'identity-gatherer'`
  - The `summary` field contains the structured JSON merged with the plain-text recap:
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
Claude outputs on a new line after the closing recap:
```
IDENTITY_GATHERER_SUMMARY:{"who_they_want_to_be":"...","actions_that_person_takes":"...","what_makes_it_attractive":"...","environment":"...","cue":"...","two_minute_version":"..."}
```
The route parser strips the marker, injects the `recap` field from the closing message, and saves the combined object to `conversation_memory`.

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

### HABITS_READY Detection
When `HABITS_READY:` is detected in the assistant message:
- Parse the JSON array
- Replace the chat panel with a habit selection screen:
  - Show all 2–3 habit cards
  - Each card: `identity_label`, `habit_name`, `cue`, `two_minute_version`
  - User selects 1, 2, or all 3
  - "Start these habits →" saves selected via `POST /api/habits`
  - Routes to `/dashboard` after 1.2s

### Unselected Habits
Habits not selected are saved to `proposed_habits` with `selected = false`.
These surface in `/add-habit` after the user's first 7-day streak.

### Eval Cases
- User gives vague identity → must ask follow-up, not proceed
- User wants only 1 habit → still generate 2–3 options
- No cue established → must not advance to HABITS_READY
- Identity Gatherer summary is empty → continue without it, do not error
- `getProfileContext` returns null → continue without it, do not error

---

## Agent 3: Explore (Reflection)

**Not a conversational agent** — one-shot summarizer called from `/api/explore`.

### Behavior
1. Receives a new reflection from the user (free text)
2. Reads all past reflections for this user from `user_reflections`
3. Generates a concise updated profile summary
4. Saves to `user_profile_context.summary`

This summary is read by both the Identity Gatherer and Architect via `getProfileContext(userId)`.

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
- **Habit Breaker** — helps user identify and break a bad habit
- **Morning Ritual** — builds a multi-step morning routine once 3 habits are solid
- **3 Conversation Modes** — Into It / Balanced / Quick Start depth selector for Identity Gatherer
- **Integration:** Google Calendar for cue scheduling
