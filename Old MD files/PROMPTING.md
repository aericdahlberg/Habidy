# PROMPTING.md — How to Work With Claude Code on This Project

## The Mental Model

Claude Code is a senior developer who has read all your docs.
Your job is to give it a clear, scoped task — one feature at a time.
Its job is to build it correctly, ask when unclear, and follow the patterns already established.

---

## Starting a Session

Always `cd` into the project root before running `claude`.
Claude Code reads CLAUDE.md automatically — you don't need to re-explain the project.

First thing each session, orient it:
```
"Today I'm building [feature]. The spec is in docs/[FILE].md.
Follow the existing patterns in [related file if any].
Before you start, tell me your plan."
```

Asking for a plan first is important — it lets you catch misunderstandings before
code is written.

---

## Effective Prompt Patterns

### Starting a new feature:
```
"Build the Habit Dashboard. Spec is in docs/FEATURES.md Feature 3.
- Cards in /src/features/habits/HabitCard.tsx
- Dashboard page in /src/app/habits/page.tsx
- API route in /src/app/api/habits/route.ts
Use the data model from docs/ARCHITECTURE.md.
Tell me your plan before writing any code."
```

### Fixing a bug:
```
"Bug: when a user logs a habit and then refreshes, the streak doesn't update.
The logging is in /src/app/api/habits/[id]/log/route.ts
and the streak calculation is in /src/features/habits/useHabitStats.ts.
Find the issue and fix it. Show me the diff before applying."
```

### Adding to an agent:
```
"The Constellation agent needs to save a session summary at the end of each conversation.
The agent spec is in docs/AGENTS.md Agent 1.
The summary should go to the conversation_memory table (schema in docs/ARCHITECTURE.md).
Add this to /src/lib/agents/constellation.ts and the API route at
/src/app/api/agents/constellation/route.ts"
```

### Building the guard layer:
```
"Build the agent guard layer from docs/ARCHITECTURE.md (Agent Guard Layer section).
Create /src/lib/agentGuard.ts.
Every tool call must be logged to the tool_logs table.
Assert that tool outputs are non-empty before passing to the model.
Write a test for the empty-output assertion case."
```

---

## What Claude Code Is Great At

- Building complete features from a spec
- Writing TypeScript types from your data model
- Setting up Supabase tables and RLS policies
- Writing API routes with proper error handling
- Creating React components with Tailwind styling
- Debugging errors when you paste the stack trace
- Refactoring messy code
- Writing tests

## Where to Be More Careful

- **Agent system prompts** — review these yourself before using in production.
  Claude Code will write them, but you know your users best.
- **Database migrations** — always review before running. Check the migration file.
- **Third-party API integrations** — verify the integration is correct against the
  actual API docs, not just what Claude Code assumes.
- **Security** — always ask Claude Code to review auth, RLS policies, and
  environment variable handling.

---

## Useful Commands During a Session

```
/plan        → ask Claude to plan before acting (use this often)
/compact     → summarize context when the session gets long
/clear       → start fresh context (use when switching features)
/bug         → report a Claude Code bug to Anthropic
```

---

## Lecture Notes Integration

From Lecture 16 & 17 — apply these patterns to this project:

**Agent reliability:**
- Log every tool call AND return value (not just errors) → implemented in agentGuard.ts
- Assert on outputs before passing to model → empty RAG = stop, don't guess
- Run eval sets regularly so regressions surface early → /src/lib/agents/evals/

**Prompting the model well:**
- Give the model a role and context before the task
- Include the user's current state (goals, habits, memory) in every agent call
- Use XML tags to separate sections in long prompts (e.g. <user_context>, <task>)
- Specify output format explicitly when you need structured data

**Multi-agent coordination:**
- Each agent has a single responsibility — don't blend Architect and Analyst
- Agents hand off to each other (Analyst → Architect for replacement habit)
  but don't share a conversation — start a new session with context passed explicitly
- Store inter-agent context in the database, not in memory
