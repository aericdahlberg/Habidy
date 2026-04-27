'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { RefreshCw } from 'lucide-react'
import BottomNav from '@/components/BottomNav'
import { supabase } from '@/lib/supabase'
import type { HabitSuggestionResponse } from '@/components/ChatInterface'

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

type GenerateState = 'loading' | 'ready' | 'error' | 'saving' | 'saved'

export default function ArchitectPage() {
  const router = useRouter()
  const [userId, setUserId] = useState<string | undefined>(undefined)
  const [habits, setHabits] = useState<HabitSuggestionResponse[] | null>(null)
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [state, setState] = useState<GenerateState>('loading')
  const [introText, setIntroText] = useState('')
  const [saveError, setSaveError] = useState('')

  const generate = useCallback(async (uid: string) => {
    setState('loading')
    setHabits(null)
    setIntroText('')
    try {
      const res = await fetch('/api/agents/architect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: uid, messages: [], autoGenerate: true }),
      })

      const data = await res.json() as {
        habitsReady?: HabitSuggestionResponse[]
        message?: string
        error?: string
      }

      if (!res.ok || data.error || !data.habitsReady?.length) {
        console.error('[Architect] generate failed:', data.error)
        setState('error')
        return
      }

      setIntroText(data.message ?? '')
      setHabits(data.habitsReady)
      setSelected(new Set(data.habitsReady.map((_, i) => i)))
      setState('ready')
    } catch (err) {
      console.error('[Architect] generate error:', err)
      setState('error')
    }
  }, [])

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUserId(user.id)
        void generate(user.id)
      } else {
        setState('error')
      }
    })
  }, [generate])

  function toggleHabit(idx: number) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(idx)) next.delete(idx)
      else next.add(idx)
      return next
    })
  }

  async function saveHabits() {
    if (!habits || selected.size === 0 || state === 'saving' || !userId) return
    setState('saving')
    setSaveError('')

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

      const data = await res.json().catch(() => ({})) as { error?: string }
      if (!res.ok) {
        throw new Error(data.error ?? 'Could not save habits')
      }

      localStorage.removeItem('habidy_active_habit')
      setState('saved')
      setTimeout(() => router.push('/dashboard'), 1200)
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Could not save habits')
      setState('ready')
    }
  }

  return (
    <div className="flex h-screen flex-col bg-gradient-to-b from-purple-50 to-white">
      {/* Header */}
      <header className="flex shrink-0 items-center gap-3 border-b border-border bg-card/80 px-5 pt-12 pb-4 backdrop-blur-sm">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-xl">
          🔨
        </div>
        <div>
          <h1 className="font-heading text-lg font-extrabold text-foreground">Architect</h1>
          <p className="font-body text-xs text-muted-foreground">
            {state === 'ready' ? 'Choose your habits' : 'Building your habits'}
          </p>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        <AnimatePresence mode="wait">

          {/* Loading state */}
          {state === 'loading' && (
            <motion.div
              key="loading"
              className="flex h-full flex-col items-center justify-center px-6 py-12"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.img
                src="/mascot.png"
                alt="Building habits"
                className="h-24 w-24 object-contain"
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              />
              <h2 className="mt-6 font-heading text-xl font-extrabold text-foreground text-center">
                Building your habits…
              </h2>
              <p className="mt-2 font-body text-sm text-muted-foreground text-center max-w-xs">
                Reviewing your conversation and designing habits tailored to you
              </p>
              <div className="mt-8 flex gap-2">
                {[0, 1, 2, 3, 4].map((i) => (
                  <motion.div
                    key={i}
                    className="h-2.5 w-2.5 rounded-full bg-primary"
                    animate={{ scale: [1, 1.5, 1], opacity: [0.4, 1, 0.4] }}
                    transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.18 }}
                  />
                ))}
              </div>
            </motion.div>
          )}

          {/* Error state */}
          {state === 'error' && (
            <motion.div
              key="error"
              className="flex h-full flex-col items-center justify-center px-6 py-12"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              <p className="text-3xl">😔</p>
              <h2 className="mt-4 font-heading text-xl font-extrabold text-foreground text-center">
                Couldn&apos;t build your habits
              </h2>
              <p className="mt-2 font-body text-sm text-muted-foreground text-center max-w-xs">
                Something went wrong while generating. Make sure you&apos;ve completed your Crystal Ball session first.
              </p>
              <button
                onClick={() => userId && void generate(userId)}
                className="mt-8 flex items-center gap-2 rounded-full bg-primary px-8 py-3 font-heading text-sm font-bold text-primary-foreground shadow-lg"
              >
                <RefreshCw size={16} />
                Try again
              </button>
              <button
                onClick={() => router.push('/constellation')}
                className="mt-3 font-body text-sm text-muted-foreground underline underline-offset-2"
              >
                Go to Crystal Ball first →
              </button>
            </motion.div>
          )}

          {/* Habits ready — selection UI */}
          {(state === 'ready' || state === 'saving') && habits && (
            <motion.div
              key="habits"
              className="mx-auto max-w-lg px-5 py-5 space-y-4"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
            >
              {introText && (
                <p className="font-body text-sm text-muted-foreground leading-relaxed italic">
                  {introText}
                </p>
              )}
              <p className="font-body text-xs text-muted-foreground">
                Select the habits you want to start.{' '}
                <span className="text-muted-foreground/60">Unselected ones will be saved for later.</span>
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
                    transition={{ delay: idx * 0.1 }}
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
                {saveError && (
                  <p className="mb-3 rounded-2xl border border-destructive/30 bg-card px-4 py-3 text-center font-body text-sm text-destructive">
                    {saveError}
                  </p>
                )}
                <motion.button
                  onClick={saveHabits}
                  disabled={selected.size === 0 || state === 'saving' || !userId}
                  className="w-full rounded-full bg-primary py-4 font-heading text-lg font-bold text-primary-foreground shadow-lg disabled:opacity-40"
                  whileTap={{ scale: 0.98 }}
                >
                  {state === 'saving'
                    ? 'Saving…'
                    : `Start ${selected.size === 1 ? 'this habit' : `these ${selected.size} habits`} →`}
                </motion.button>
                {selected.size === 0 && (
                  <p className="mt-2 text-center font-body text-xs text-muted-foreground">Select at least one to continue</p>
                )}
              </div>

              {/* Regenerate option */}
              <button
                onClick={() => userId && void generate(userId)}
                className="flex w-full items-center justify-center gap-1.5 pt-1 font-body text-xs text-muted-foreground hover:text-foreground"
              >
                <RefreshCw size={12} />
                Regenerate suggestions
              </button>
            </motion.div>
          )}

          {/* Saved confirmation */}
          {state === 'saved' && (
            <motion.div
              key="saved"
              className="flex h-full items-center justify-center px-4"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <div className="w-full max-w-sm rounded-2xl bg-primary px-6 py-4 text-center font-heading text-sm font-bold text-primary-foreground shadow-lg">
                {selected.size === 1 ? 'Habit saved' : `${selected.size} habits saved`}. Heading to your dashboard…
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      <div className="h-16 shrink-0" />
      <BottomNav />
    </div>
  )
}
