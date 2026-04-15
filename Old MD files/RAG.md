# RAG.md — Knowledge Base & Retrieval Strategy

## Purpose

The RAG (Retrieval-Augmented Generation) system gives agents access to curated
knowledge about habit science, identity, and successful people's routines — without
hallucinating or relying on the model's training data alone.

Every agent retrieves relevant context before responding.
**If retrieval returns empty, the agent stops and falls back gracefully — never invents.**

---

## Knowledge Base Categories

### Category 1: `atomic_habits`
Core principles from James Clear's framework. This is the backbone of the Architect
and Analyst agents.

**Content to embed:**

```
IDENTITY-BASED HABITS
Habits are not about what you want to achieve — they're about who you want to become.
Every action you take is a vote for the type of person you want to be.
The most effective way to change your habits is to change your identity.
"I am a runner" beats "I want to run."

THE 4 LAWS OF BEHAVIOR CHANGE
1. Make it obvious (cue)
2. Make it attractive (craving)
3. Make it easy (response/action)
4. Make it satisfying (reward)

HABIT STACKING
Formula: "After I [current habit], I will [new habit]."
Anchoring a new habit to an existing one dramatically increases follow-through.

THE 2-MINUTE RULE
When you start a new habit, it should take less than 2 minutes to do.
You're not building the action — you're building the identity.
"Run a marathon" → "Put on my running shoes."
"Study for exams" → "Open my notes."

IMPLEMENTATION INTENTION
"I will [behavior] at [time] in [location]."
People who commit to a specific time and place are 2-3x more likely to follow through.

THE PLATEAU OF LATENT POTENTIAL
Progress is not linear. Habits seem to make no difference until you cross a threshold.
The work is happening even when results aren't visible yet.
"Ice doesn't melt at 31°F — but one more degree and everything changes."

REWARD IMMEDIATELY
The brain encodes habits based on what immediately follows.
Delay the reward, weaken the habit. Reward immediately, strengthen it.

HABIT TRACKING
"Never miss twice" is more important than never missing once.
Missing once is an accident. Missing twice is starting a new habit.

THE AGGREGATION OF MARGINAL GAINS
1% better every day = 37x better in a year.
1% worse every day = nearly zero in a year.
Success is the product of daily habits, not once-in-a-lifetime transformations.
```

---

### Category 2: `success_habits`
What high-performers actually do day to day. Use to inspire habit ideas and validate
the user's choices.

**Content to embed:**

```
MORNING ROUTINES
Most high-performers protect the first hour of their day.
Common patterns: no phone for first 30 min, movement, intentional planning,
reading or learning, journaling.

The purpose isn't the specific routine — it's the signal it sends to yourself.
Starting the day with intention compounds into weeks, months, years.

EXERCISE AS A KEYSTONE HABIT
Exercise is consistently the most impactful keystone habit — it tends to improve
sleep, diet, focus, and mood as side effects.
The habit doesn't need to be intense. Consistent beats intense.

READING / CONTINUOUS LEARNING
Many highly effective people read 30-60 min daily.
Not to finish books — to keep thinking and growing.
10 pages a day = 12+ books per year.

SLEEP AS PERFORMANCE
Sleep is not rest from work — it is work. Memory consolidation, hormone regulation,
emotional processing all happen during sleep.
Protecting sleep is one of the highest-leverage habits possible.

JOURNALING / REFLECTION
Daily or weekly reflection accelerates learning from experience.
Prompts: What went well? What would I change? What am I grateful for?

SINGLE-TASKING
High focus in shorter bursts consistently outperforms scattered attention over long hours.
Deep work (Newport) — 2-4 hours of uninterrupted focus daily produces more than
8 scattered hours.

ENVIRONMENT DESIGN
Willpower is unreliable. Environment is powerful.
Remove friction from good habits. Add friction to bad ones.
"Put the guitar on the stand, not in the case."
```

---

### Category 3: `motivation`
Content for moments when users are struggling, thinking about quitting, or need context
on why this matters.

**Content to embed:**

```
WHY HABITS FEEL HARD AT FIRST
Every habit is uncomfortable before it becomes automatic.
The discomfort is not a sign it's wrong — it's a sign it's new.
The brain is literally rewiring. That takes repetition, not just intention.

YOU DON'T NEED MOTIVATION — YOU NEED SYSTEMS
Motivation is unreliable. It comes and goes.
Systems run even when you don't feel like it.
"You do not rise to the level of your goals. You fall to the level of your systems."

THE IDENTITY SHIFT IS SLOW AND THEN SUDDEN
Don't expect to feel like a different person after a week.
Identity change is gradual. One day you'll realize you just... do this thing now.
That's the moment. It's worth working toward.

DON'T THROW A ZERO
Missing once is human. Missing twice builds a new (bad) habit.
On your worst days, do the 2-minute version. Show up for yourself.
A 1% effort still counts. It keeps the identity alive.

PROGRESS ISN'T ALWAYS VISIBLE
The results you want are a lagging measure of your habits.
The work is happening even when you can't see it.
Trust the process. Trust the reps.

COMPARISON TRAP
Don't compare your day 10 to someone else's day 1000.
The only comparison that matters: you vs. you, yesterday.
```

---

### Category 4: `identity`
Deep content on identity change, self-concept, and becoming.

**Content to embed:**

```
IDENTITY PRECEDES BEHAVIOR
You don't build habits to achieve outcomes.
You build habits to become the person who naturally produces those outcomes.
"The goal is not to run a marathon. The goal is to become a runner."

YOUR BIOGRAPHY IS NOT YOUR DESTINY
Past behavior is a data point, not a prediction.
Every moment is a new vote. Old patterns can be interrupted.

SMALL ACTIONS, BIG IDENTITY
The size of the action doesn't matter.
Every time you do the habit, you're casting a vote.
Enough votes shift the identity. Identity shifts the default behavior.

THE ENVIRONMENT SHAPES THE IDENTITY
You become who your environment expects you to be.
Design environments that expect the best of you.
Surround yourself with people who have the habits you want.

PATIENCE IS THE PRACTICE
There is no destination. The journey is the destination.
The person you're becoming through this process is the point.
```

---

## Retrieval Strategy

```typescript
// In /src/lib/rag.ts

async function retrieveContext(query: string, category?: string, topK = 3) {
  // 1. Embed the query
  const embedding = await embedText(query)

  // 2. Query pgvector
  const results = await supabase.rpc('match_documents', {
    query_embedding: embedding,
    match_count: topK,
    filter_category: category ?? null
  })

  // 3. ASSERT — do not pass empty results to model
  if (!results.data || results.data.length === 0) {
    logger.warn('RAG retrieval returned empty', { query, category })
    return null  // caller handles fallback
  }

  return results.data.map(r => r.content).join('\n\n')
}
```

---

## Seeding the Knowledge Base

Script: `/scripts/seed-rag.ts`

Run once to embed all documents above and insert into `rag_documents` table.
Use OpenAI `text-embedding-3-small` or Anthropic embeddings (check current API support).

Categories to seed: `atomic_habits`, `success_habits`, `motivation`, `identity`

After seeding, run: `npm run rag:verify` to confirm retrieval is working correctly.
