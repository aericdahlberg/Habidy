Hooks — nothing to do, they're automatic
The post-edit.sh hook fires on its own after every Edit/Write. You just need to restart Claude Code in the habidy directory once (since settings.json didn't exist when this session started). After that it's always live.

Commands — type them as slash commands


/fix-bug
/new-feature
/end-session
Type any of those directly in the Claude Code chat. Claude reads the .md file and follows the steps. You already used the workflow manually for B1 — /fix-bug would have prompted you through the same steps.

Agents — two ways to use them

Tell Claude to use one explicitly in your prompt:

"Use the bug-fixer agent to fix the M2 eval issue"
"Use the planner agent to plan the social screen refactor"

Claude can dispatch them automatically when you're in a session and the task matches — e.g. if you say "fix this bug" Claude can spawn the bug-fixer as a subagent.

The agent files in .claude/agents/ are read by Claude Code as available subagents. They define the persona, process, and output format so the subagent stays focused.

The intended flow for new work:


/new-feature  →  planner agent outputs plan  →  you approve  →  Claude executes
/fix-bug      →  bug-fixer agent isolates root cause  →  fixes it  →  hook verifies
/end-session  →  writes PROGRESS.md  →  commits  →  safe to /clear