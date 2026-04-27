'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import BottomNav from '@/components/BottomNav'
import ChatInterface, { type HabitSuggestionResponse } from '@/components/ChatInterface'
import { supabase } from '@/lib/supabase'

const CATEGORY_STYLES: Record<string, { border: string; bg: string; label: string }> = {
  'Health & Fitness':  { border: 'border-primary/30',   bg: 'bg-primary/10',   label: 'text-primary'   },
  'Career & Learning': { border: 'border-secondary/30', bg: 'bg-secondary/10', label: 'text-secondary' },
  'Relationships':     { border: 'border-accent/30',    bg: 'bg-accent/10',    label: 'text-accent'    },
  'Creativity':        { border: 'border-secondary/30', bg: 'bg-secondary/10', label: 'text-secondary' },
  'Mindset & Energy':  { border: 'border-primary/30',   bg: 'bg-primary/10',   label: 'text-primary'   },
  'Something else':    { border: 'border-border',       bg: 'bg-muted/50',     label: 'text-muted-foreground' },
}

function categoryStyle(category: string) {
  return CATEGORY_STYLES[category] ?? CATEGORY_STYLES['Something else']
}

export default function ArchitectPage() {
  const router = useRouter()
  const [userId, setUserId] = useState<string | undefined>(undefined)
  const [habits, setHabits] = useState<HabitSuggestionResponse[] | null>(null)
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUserId(user.id)
    })
  }, [])

  function handleHabitsReady(incoming: HabitSuggestionResponse[]) {
    setHabits(incoming)
    setSelected(new Set(incoming.map((_, i) => i)))
  }

  function toggleHabit(idx: number) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(idx)) next.delete(idx)
      else next.add(idx)
      return next
    })
  }

  async function saveHabits() {
    if (!habits || selected.size === 0 || saving) return
    setSaving(true)

    const selectedHabits = habits.filter((_, i) => selected.has(i))
    const selectedProposedIds = selectedHabits
      .map((h) => h.proposedId)
      .filter((id): id is string => id !== null)

    try {
      const res = await fetch('/api/habits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, habits: selectedHabits, selectedProposedIds }),
      })

      if (res.ok) {
        const firstHabit = selectedHabits[0]
        localStorage.setItem('habidy_active_habit', JSON.stringify({
          id: `local-${Date.now()}`,
          habit_name: firstHabit.habit_name,
          identity_label: firstHabit.identity_label,
          cue: firstHabit.cue,
          category: firstHabit.category,
        }))
      }
    } catch {
      const firstHabit = selectedHabits[0]
      localStorage.setItem('habidy_active_habit', JSON.stringify({
        id: `local-${Date.now()}`,
        habit_name: firstHabit.habit_name,
        identity_label: firstHabit.identity_label,
        cue: firstHabit.cue,
        category: firstHabit.category,
      }))
    } finally {
      setSaving(false)
      setSaved(true)
      setTimeout(() => router.push('/dashboard'), 1200)
    }
  }

  return (
    <div className="flex h-screen flex-col bg-background">
      {/* Header — Lovable style */}
      <header className="flex shrink-0 items-center gap-3 border-b border-border bg-card/80 px-5 pt-12 pb-4 backdrop-blur-sm">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-xl">
          🔨
        </div>
        <div>
          <h1 className="font-heading text-lg font-extrabold text-foreground">Architect</h1>
          <p className="font-body text-xs text-muted-foreground">
            {habits ? 'Choose your habits' : 'Building your habits'}
          </p>
        </div>
      </header>

      {/* Chat — shown until habits are ready */}
      {!habits && (
        <div className="mx-auto flex w-full max-w-lg flex-1 flex-col overflow-hidden">
          <ChatInterface
            agentEndpoint="/api/agents/architect"
            userId={userId}
            onHabitsReady={handleHabitsReady}
            initialMessage="Let's build your habits. I've reviewed your Crystal Ball session — give me a moment and I'll have a few options for you. Or tell me anything else I should know first."
            thinkingLabel="Building your habits…"
          />
        </div>
      )}

      {/* Habit selection — Lovable card UI with Habidy save logic */}
      {habits && !saved && (
        <div className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-lg px-5 py-5 space-y-4">
            <p className="font-body text-sm text-muted-foreground leading-relaxed">
              Select 1, 2, or all 3 to start.{' '}
              <span className="text-muted-foreground/60">The rest will be waiting for you at day 7.</span>
            </p>

            {habits.map((habit, idx) => {
              const isSelected = selected.has(idx)
              const style = categoryStyle(habit.category)
              return (
                <motion.button
                  key={idx}
                  onClick={() => toggleHabit(idx)}
                  className={`w-full rounded-3xl border-2 px-5 py-5 text-left transition-all ${
                    isSelected ? `${style.border} ${style.bg}` : 'border-border bg-card hover:border-primary/30'
                  }`}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.08 }}
                  whileTap={{ scale: 0.99 }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-semibold uppercase tracking-wide mb-1 ${isSelected ? style.label : 'text-muted-foreground'}`}>
                        {habit.identity_label}
                      </p>
                      <p className="font-heading text-base font-extrabold text-foreground leading-snug">
                        {habit.habit_name}
                      </p>
                      <p className="mt-2 font-body text-sm text-muted-foreground leading-relaxed">
                        {habit.cue}
                      </p>
                      <div className="mt-3 inline-flex items-center gap-1.5 rounded-xl border border-border bg-background/70 px-3 py-1.5">
                        <span className="font-body text-xs text-muted-foreground">Start with:</span>
                        <span className="font-body text-xs font-semibold text-foreground">{habit.two_minute_version}</span>
                      </div>
                    </div>
                    <div className={`mt-0.5 shrink-0 flex h-6 w-6 items-center justify-center rounded-full border-2 transition-all ${
                      isSelected ? 'border-primary bg-primary' : 'border-border bg-card'
                    }`}>
                      {isSelected && (
                        <svg className="h-3.5 w-3.5 text-primary-foreground" fill="none" viewBox="0 0 12 12" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2 6l3 3 5-5" />
                        </svg>
                      )}
                    </div>
                  </div>
                </motion.button>
              )
            })}

            <div className="pt-2">
              <motion.button
                onClick={saveHabits}
                disabled={selected.size === 0 || saving}
                className="w-full rounded-full bg-primary py-4 font-heading text-lg font-bold text-primary-foreground shadow-lg disabled:opacity-40"
                whileTap={{ scale: 0.98 }}
              >
                {saving
                  ? 'Saving…'
                  : `Start ${selected.size === 1 ? 'this habit' : `these ${selected.size} habits`} →`}
              </motion.button>
              {selected.size === 0 && (
                <p className="mt-2 text-center font-body text-xs text-muted-foreground">Select at least one habit to continue</p>
              )}
            </div>
          </div>
        </div>
      )}

      {saved && (
        <div className="flex flex-1 items-center justify-center px-4">
          <motion.div
            className="w-full max-w-sm rounded-2xl bg-primary px-6 py-4 text-center font-heading text-sm font-bold text-primary-foreground shadow-lg"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
          >
            {selected.size === 1 ? 'Habit saved' : `${selected.size} habits saved`}. Heading to your dashboard…
          </motion.div>
        </div>
      )}

      <div className="h-16 shrink-0" />
      <BottomNav />
    </div>
  )
}
