## Human readable list of recurring errors or known issues 

#Last Update April 26, 2026



1. Agent conversations too long and not concise

Too much back and forth, responses not focused enough
Need to balance depth with efficiency
Involves: both agent system prompts


1. No input sanitization or character limits

Users could paste massive amounts of text into input fields
Safety concern: harmful habit requests could potentially override Claude safety
Need to verify Claude safety rails are intact for harmful requests
Involves: all agent input fields, API routes


🟡 Medium Priority Improvements
8. Architect habit cards need better progression UI

Cards should feel exciting and show identity progression
Format: "You are a writer — here are your first habits, the path is toward xyz"
Should show the journey, not just the habit
Involves: app/architect/page.tsx

9. No 7-day streak unlock screen

Users don't know they can unlock more habits after 7 days
Need a screen explaining this mechanic
Involves: app/dashboard/page.tsx, app/add-habit/

10. No chat history visible in app

Users can't see past conversations with agents
Need either a history view or chat summaries
Involves: conversation_memory table, new UI needed

11. Explore page scope too narrow

Should cover both building AND removing habits
Currently only focused on adding reflections
Involves: app/explore/page.tsx


🟢 Feature Backlog (Build Later)
12. Agent engagement modes
Three conversation depth settings based on user preference:

Into it — deep identity work, full Atomic Habits framework, real motivation investigation
Medium — balanced approach, some depth
Easy — quick and simple habit creation
Involves: lib/agents/constellation.ts, onboarding preference screen

13. Habit progression planning
After initial habit, agent should outline a progression path:

"Let's start with X, then progress to Y, then Z"
Long-term identity roadmap
Involves: Architect agent

14. Energy/schedule awareness
Ask users:

Is this habit energizing or draining?
What time of day do you have most energy?
How often do you already do this behavior?
Use to schedule habits at optimal times
Involves: Crystal Ball agent questions

15. Calendar integration
Show habits on a calendar view on dashboard
Stretch: Gmail/Google Calendar connect
Involves: new dashboard component, Google API
16. RAG implementation
Use Atomic Habits PDF already in repo as retrieval context for agents
Involves: HabitRagData/attomic habbits.pdf, vector embeddings
17. Onboarding positivity framing
Start with "Who do you see yourself as in a year?" framing
Make sure language doesn't make users feel bad about who they aren't yet
Focus on growth trajectory, every action = 1% better
Involves: app/onboarding/, welcome copy
18. Multi-agent orchestration
Separate agents for different app functions
Research: Claude Code Codex approach vs current setup
Involves: architecture decision
19.  Habit limit is 2 from Architect
Currently can select up to 2 — change to max 2, but create 5 potential habits
Involves: app/architect/page.tsx
20.  Show JSON habit output to user
Display the structured habit data in a readable, exciting way after creation
Involves: app/architect/page.tsx