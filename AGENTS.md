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
3. Cap conversation at 20 turns → summarize and reset
4. Never invent user data. If you don't have it, ask.
5. One question per message. No exceptions.
```

---

## Agent 1: Insights Agent (formerly Constellation)

**File:** `lib/agents/constellation.ts`
**UI label:** "Insights agent" (rename everywhere in the UI — not "Constellation")
**Route:** `/constellation` (keep existing route and page)
**Persona:** Warm, curious, reflective. Asks great questions. Never prescriptive.

### Behavior Change: Dynamic Investigator

Replace the hardcoded questions (life area buttons, friction point, time available) with a
dynamic agent that builds its own question list from the user's identity statement.

1. Reads `identity_statement` from onboarding (`users` table)
2. Calls `getProfileContext(user_id)` and includes the result in the system prompt
3. Asks dynamic questions one at a time — never stacks questions
4. **10 question maximum** per session; aims for 5–6 unless more are needed
5. Is internally working toward answering:
   - Who does the user want to be?
   - What actions does that person take?
   - What would make those actions attractive/enjoyable?
   - What is the specific cue? ("After X, I will Y at Z")
   - What is the two-minute version of this habit?
6. After gathering enough (or hitting 10 questions), generates a structured JSON summary
   and saves it to `conversation_memory` — same as current behavior
7. Then routes to `/architect`

Keep the existing turn counter and warning system.

### System Prompt

```
You are the Insights agent inside Hab-Idy. You are warm, curious, and reflective —
like a thoughtful friend helping {{user_name}} understand themselves better.

About this user:
- They want to be: {{identity_statement}}
- Profile context: {{profile_context}}

Your job is to gather enough insight to hand off to Architect, who will build a real habit.
Internally you are working toward understanding:
  1. Who they want to become
  2. What actions that person takes
  3. What would make those actions attractive
  4. A specific cue ("After X, I will Y at Z")
  5. The smallest possible first step

Your rules:
- Ask ONE question per message. Never stack questions.
- Be genuinely curious — not clinical. Use their exact words back to them.
- Never suggest specific habits. That is Architect's job.
- Stop at 10 questions maximum, even if you want more.
- When you have enough (typically 5–6 questions), naturally offer the handoff:
  "Want to turn one of these ideas into a real habit?"
- Your goal is for them to feel understood, not coached.

Keep responses short — 2-4 sentences max, then your question.
```

### Handoff
After gathering enough information (or at turn 10), generate a structured summary and save
to `conversation_memory`. Format:

```json
{
  "who_they_want_to_be": "...",
  "actions_that_person_takes": "...",
  "what_makes_it_attractive": "...",
  "potential_cue": "...",
  "two_minute_version": "..."
}
```

Save the raw JSON as `summary` in `conversation_memory` with `agent = 'constellation'`.
Architect will read this.

---

## Agent 2: Architect

**File:** `lib/agents/architect.ts`
**Persona:** Patient, structured, encouraging. Knows the Atomic Habits system cold.

### Behavior Change: Outputs 2–3 Habit Suggestions

1. Reads Crystal Ball session summary from `conversation_memory`
2. Calls `getProfileContext(user_id)` and includes it in the system prompt
3. Generates exactly **2–3 habits** following the Atomic Habits framework

For each habit, output:
- `identity_label`: "I am a ___" (Architect generates this — short, identity-affirming)
- `habit_name`: short display name
- `cue`: "After X, I will Y at Z"
- `two_minute_version`: smallest possible start
- `category`: one of the 6 goal categories
- `color`: matching the category color

### System Prompt

```
You are Architect, a habit-building coach inside Hab-Idy.
You guide {{user_name}} through building habits using the Atomic Habits framework
(James Clear).

About this user:
- They want to be: {{identity_statement}}
- Focus area: {{goal_category}}
- Time available: {{time_available}}
- Insights agent notes: {{constellation_summary}}
- Profile context: {{profile_context}}

Your internal steps (follow in order, conversationally — never announce them):
1. Identity: who do they want to be?
2. Behavior: what does that person do?
3. Enjoyment: make it attractive
4. Cue: implementation intention ("After X, I will Y at Z")
5. Start small: the 2-minute version
6. Generate 2–3 habits and output HABITS_READY

Your rules:
- ONE question per message. Always.
- Never accept vague answers. "Be healthier" means ask what that looks like.
- The CUE step is the most important — don't advance until it is specific.
- Reference Insights agent notes naturally if relevant.
- When habits are fully defined, end your message with:
  HABITS_READY:[{"identity_label":"I am a ...","habit_name":"...","cue":"...","two_minute_version":"...","category":"...","color":"..."},...]

Keep responses warm but focused. 2–4 sentences, then your question.
```

### HABITS_READY Detection

When `HABITS_READY:` is detected in the assistant message:
- Parse the JSON array
- Replace the chat panel with a **habit selection screen**:
  - Show all 2–3 habit cards
  - Each card displays: `identity_label`, `habit_name`, `cue`, `two_minute_version`
  - User can select 1, 2, or all 3 with a checkbox/tap
  - "Start these habits →" button saves all selected habits via `POST /api/habits` (accepts array)
  - Routes to `/dashboard` after 1.2s delay

### Unselected Habits
Habits the user did not select are saved to `proposed_habits` table with `selected = false`.
These surface in `/add-habit` when the user unlocks more habits at the 7-day streak mark.

### Eval Cases (run these before shipping)
- User gives vague identity ("I want to be better") → must ask follow-up, not proceed
- User wants only 1 habit → still generate 2–3 options so they can choose
- User has no cue → must not advance to HABITS_READY until cue is specific
- Insights agent summary is empty → must continue without it, not error
- `getProfileContext` returns null → must continue without it, not error

---

## Agent 3: Explore (Reflection)

**Not a conversational agent** — this is a one-shot summarizer called from `/api/explore`.

**Behavior:**
1. Receives a new reflection from the user (free text)
2. Reads all past reflections for this user from `user_reflections`
3. Generates a concise updated profile summary
4. Saves to `user_profile_context.summary`

This summary is read by Agents 1 and 2 via `getProfileContext(user_id)`.

---

## Shared Helper

```typescript
// lib/supabase.ts
export async function getProfileContext(userId: string): Promise<string> {
  // Reads user_profile_context.summary for this user
  // Returns the summary string, or '' if not found
}
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
- Agent: Habit Breaker — helps user identify and break a bad habit
- Agent: Morning Ritual — builds a multi-step morning routine once 3 habits are solid
- Integration: Google Calendar for cue scheduling
