'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { RefreshCw, Heart } from 'lucide-react'
import { Toaster, toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import type { HabitSuggestionResponse } from '@/components/ChatInterface'

const MAX_SELECTION = 2

const CATEGORY_COLORS: Record<string, { bar: string; label: string; bg: string }> = {
  'Health & Fitness':  { bar: 'bg-emerald-500', label: 'text-emerald-700', bg: 'bg-emerald-50'  },
  'Career & Learning': { bar: 'bg-blue-500',    label: 'text-blue-700',    bg: 'bg-blue-50'     },
  'Relationships':     { bar: 'bg-pink-500',    label: 'text-pink-700',    bg: 'bg-pink-50'     },
  'Creativity':        { bar: 'bg-violet-500',  label: 'text-violet-700',  bg: 'bg-violet-50'   },
  'Mindset & Energy':  { bar: 'bg-amber-500',   label: 'text-amber-700',   bg: 'bg-amber-50'    },
  'Something else':    { bar: 'bg-zinc-400',    label: 'text-zinc-600',    bg: 'bg-muted'       },
}

function categoryColor(cat: string) {
  return CATEGORY_COLORS[cat] ?? CATEGORY_COLORS['Something else']
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
    setSelected(new Set())

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
        setState('error')
        return
      }

      setIntroText(data.message ?? '')
      setHabits(data.habitsReady)
      setState('ready')
    } catch {
      setState('error')
    }
  }, [])

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { setState('error'); return }
      setUserId(user.id)

      // Check for pre-generated habits from quick-habit flow
      const pregenRaw = sessionStorage.getItem('habidy_pregenerated_habits')
      if (pregenRaw) {
        try {
          const pregenHabits = JSON.parse(pregenRaw) as HabitSuggestionResponse[]
          const pregenMsg = sessionStorage.getItem('habidy_pregenerated_message') ?? ''
          sessionStorage.removeItem('habidy_pregenerated_habits')
          sessionStorage.removeItem('habidy_pregenerated_message')
          setHabits(pregenHabits)
          setIntroText(pregenMsg)
          setState('ready')
          return
        } catch {
          // Fall through to auto-generate
        }
      }

      void generate(user.id)
    })
  }, [generate])

  function toggleHabit(idx: number) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(idx)) {
        next.delete(idx)
      } else {
        if (next.size >= MAX_SELECTION) {
          toast('You can only pick 2 habits to start. Deselect one to choose this one.')
          return prev
        }
        next.add(idx)
      }
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
      if (!res.ok) throw new Error(data.error ?? 'Could not save habits')

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
      <Toaster position="top-center" richColors />

      {/* Header */}
      <header className="flex shrink-0 items-center gap-3 border-b border-border bg-card/80 px-5 pt-12 pb-4 backdrop-blur-sm">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-xl">🔨</div>
        <div className="flex-1">
          <h1 className="font-heading text-lg font-extrabold text-foreground">Architect</h1>
          <p className="font-body text-xs text-muted-foreground">
            {state === 'ready' || state === 'saving' ? 'Tap ♥ to choose your habits' : 'Building your habits'}
          </p>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        <AnimatePresence mode="wait">

          {/* Loading */}
          {state === 'loading' && (
            <motion.div
              key="loading"
              className="flex min-h-full flex-col items-center justify-center px-6 py-20"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            >
              <motion.img
                src="/mascot.png" alt="Building" className="h-24 w-24 object-contain"
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              />
              <h2 className="mt-6 font-heading text-xl font-extrabold text-foreground text-center">
                Building your habits…
              </h2>
              <p className="mt-2 font-body text-sm text-muted-foreground text-center max-w-xs">
                Designing 5 options tailored to you
              </p>
              <div className="mt-8 flex gap-2">
                {[0, 1, 2, 3, 4].map((i) => (
                  <motion.div
                    key={i} className="h-2.5 w-2.5 rounded-full bg-primary"
                    animate={{ scale: [1, 1.5, 1], opacity: [0.4, 1, 0.4] }}
                    transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.18 }}
                  />
                ))}
              </div>
            </motion.div>
          )}

          {/* Error */}
          {state === 'error' && (
            <motion.div
              key="error"
              className="flex min-h-full flex-col items-center justify-center px-6 py-20"
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            >
              <p className="text-3xl">😔</p>
              <h2 className="mt-4 font-heading text-xl font-extrabold text-foreground text-center">
                Couldn&apos;t build your habits
              </h2>
              <p className="mt-2 font-body text-sm text-muted-foreground text-center max-w-xs">
                Something went wrong. Make sure you&apos;ve completed your session first.
              </p>
              <button
                onClick={() => userId && void generate(userId)}
                className="mt-8 flex items-center gap-2 rounded-full bg-primary px-8 py-3 font-heading text-sm font-bold text-primary-foreground shadow-lg"
              >
                <RefreshCw size={16} /> Try again
              </button>
              <button
                onClick={() => router.push('/constellation')}
                className="mt-3 font-body text-sm text-muted-foreground underline underline-offset-2"
              >
                Go to Identity Gatherer first →
              </button>
            </motion.div>
          )}

          {/* Card list */}
          {(state === 'ready' || state === 'saving') && habits && (
            <motion.div
              key="habits"
              className="px-4 pt-4 pb-6 space-y-3"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            >
              {introText && (
                <p className="font-body text-sm text-muted-foreground leading-relaxed italic px-1 pb-1">
                  {introText}
                </p>
              )}

              {habits.map((habit, idx) => {
                const colors = categoryColor(habit.category)
                const isSelected = selected.has(idx)
                return (
                  <motion.div
                    key={idx}
                    className={`relative overflow-hidden rounded-3xl border-2 bg-white shadow-sm transition-all ${
                      isSelected ? 'border-primary shadow-primary/20 shadow-md' : 'border-border'
                    }`}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.07 }}
                  >
                    {/* Left color bar */}
                    <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${colors.bar}`} />

                    <div className="pl-6 pr-5 py-5">
                      {/* Identity label */}
                      <p className={`font-heading text-[11px] font-bold uppercase tracking-widest ${colors.label}`}>
                        {habit.identity_label}
                      </p>

                      {/* Habit name */}
                      <h2 className="mt-1.5 font-heading text-lg font-extrabold leading-snug text-foreground">
                        {habit.habit_name}
                      </h2>

                      {/* Cue */}
                      <p className="mt-2 font-body text-sm leading-relaxed text-muted-foreground">
                        {habit.cue}
                      </p>

                      {/* Two-minute version */}
                      <div className={`mt-3 rounded-2xl ${colors.bg} px-4 py-2.5`}>
                        <p className="font-body text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                          Start with
                        </p>
                        <p className="mt-0.5 font-body text-sm font-semibold text-foreground">
                          {habit.two_minute_version}
                        </p>
                      </div>

                      {/* Category + heart button row */}
                      <div className="mt-3 flex items-center justify-between gap-3">
                        <span className="rounded-full border border-border bg-muted/50 px-3 py-1 font-body text-[11px] text-muted-foreground">
                          {habit.category}
                        </span>
                        <button
                          onClick={() => toggleHabit(idx)}
                          className={`flex items-center gap-1.5 rounded-2xl px-4 py-2 font-heading text-sm font-bold transition-all ${
                            isSelected
                              ? 'bg-primary text-primary-foreground'
                              : 'border-2 border-border bg-white text-muted-foreground'
                          }`}
                        >
                          <Heart size={15} fill={isSelected ? 'currentColor' : 'none'} />
                          {isSelected ? 'Selected' : 'Pick this'}
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )
              })}

              <button
                onClick={() => userId && void generate(userId)}
                className="flex w-full items-center justify-center gap-1.5 pt-2 font-body text-xs text-muted-foreground hover:text-foreground"
              >
                <RefreshCw size={11} /> Regenerate all
              </button>
            </motion.div>
          )}

          {/* Saved */}
          {state === 'saved' && (
            <motion.div
              key="saved"
              className="flex min-h-full items-center justify-center px-4 py-20"
              initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
            >
              <div className="w-full max-w-sm rounded-2xl bg-primary px-6 py-4 text-center font-heading text-sm font-bold text-primary-foreground shadow-lg">
                {selected.size === 1 ? 'Habit saved' : `${selected.size} habits saved`}. Heading to your dashboard…
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      {/* Floating save bar */}
      <AnimatePresence>
        {(state === 'ready' || state === 'saving') && selected.size > 0 && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 35 }}
            className="shrink-0 border-t border-border bg-white/95 backdrop-blur-md px-5 py-3"
          >
            {saveError && (
              <p className="mb-2 text-center font-body text-xs text-destructive">{saveError}</p>
            )}
            <button
              onClick={saveHabits}
              disabled={state === 'saving'}
              className="w-full rounded-full bg-primary py-3.5 font-heading text-base font-bold text-primary-foreground shadow-lg disabled:opacity-60"
            >
              {state === 'saving'
                ? 'Saving…'
                : selected.size === 1
                ? 'Start this habit →'
                : `Start these ${selected.size} habits →`}
            </button>
            <p className="mt-1 text-center font-body text-[10px] text-muted-foreground">
              {MAX_SELECTION - selected.size === 0
                ? 'Maximum selected'
                : `You can pick ${MAX_SELECTION - selected.size} more`}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="h-16 shrink-0" />
    </div>
  )
}
