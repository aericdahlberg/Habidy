'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { RefreshCw, Heart, ChevronLeft, ChevronRight } from 'lucide-react'
import { Toaster, toast } from 'sonner'
import useEmblaCarousel from 'embla-carousel-react'
import { supabase } from '@/lib/supabase'
import type { HabitSuggestionResponse } from '@/components/ChatInterface'

const MAX_SELECTION = 2

const CATEGORY_COLORS: Record<string, { bar: string; label: string; bg: string }> = {
  'Health & Fitness':  { bar: 'bg-primary',   label: 'text-primary',   bg: 'bg-primary/8'   },
  'Career & Learning': { bar: 'bg-secondary', label: 'text-secondary', bg: 'bg-secondary/8' },
  'Relationships':     { bar: 'bg-pink-400',  label: 'text-pink-600',  bg: 'bg-pink-50'     },
  'Creativity':        { bar: 'bg-secondary', label: 'text-secondary', bg: 'bg-secondary/8' },
  'Mindset & Energy':  { bar: 'bg-primary',   label: 'text-primary',   bg: 'bg-primary/8'   },
  'Something else':    { bar: 'bg-muted',     label: 'text-muted-foreground', bg: 'bg-muted/50' },
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
  const [currentIdx, setCurrentIdx] = useState(0)

  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: false })

  // Sync embla scroll position to currentIdx
  useEffect(() => {
    if (!emblaApi) return
    const onSelect = () => setCurrentIdx(emblaApi.selectedScrollSnap())
    emblaApi.on('select', onSelect)
    return () => { emblaApi.off('select', onSelect) }
  }, [emblaApi])

  const generate = useCallback(async (uid: string) => {
    setState('loading')
    setHabits(null)
    setIntroText('')
    setSelected(new Set())
    setCurrentIdx(0)

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
        {(state === 'ready' || state === 'saving') && habits && (
          <span className="font-body text-xs text-muted-foreground">
            {currentIdx + 1} / {habits.length}
          </span>
        )}
      </header>

      <div className="flex-1 overflow-hidden">
        <AnimatePresence mode="wait">

          {/* Loading */}
          {state === 'loading' && (
            <motion.div
              key="loading"
              className="flex h-full flex-col items-center justify-center px-6"
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
              className="flex h-full flex-col items-center justify-center px-6"
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

          {/* Carousel */}
          {(state === 'ready' || state === 'saving') && habits && (
            <motion.div
              key="habits"
              className="flex h-full flex-col"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            >
              {introText && (
                <p className="mx-5 mt-4 font-body text-sm text-muted-foreground leading-relaxed italic line-clamp-2">
                  {introText}
                </p>
              )}

              {/* Embla carousel */}
              <div className="flex-1 overflow-hidden pt-3 pb-2" ref={emblaRef}>
                <div className="flex h-full">
                  {habits.map((habit, idx) => {
                    const colors = categoryColor(habit.category)
                    const isSelected = selected.has(idx)
                    return (
                      <div key={idx} className="flex-none w-full px-4 h-full">
                        <motion.div
                          className={`relative flex h-full flex-col rounded-3xl border-2 bg-white shadow-sm overflow-hidden transition-all ${
                            isSelected
                              ? 'border-primary shadow-primary/20 shadow-md'
                              : 'border-border'
                          }`}
                          initial={{ opacity: 0, scale: 0.96 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: 0.05 }}
                        >
                          {/* Category bar */}
                          <div className={`h-1.5 w-full ${colors.bar}`} />

                          <div className="flex flex-1 flex-col px-6 py-5 overflow-y-auto">
                            {/* Identity label */}
                            <p className={`font-heading text-xs font-bold uppercase tracking-widest ${colors.label}`}>
                              {habit.identity_label}
                            </p>

                            {/* Habit name */}
                            <h2 className="mt-2 font-heading text-2xl font-extrabold leading-tight text-foreground">
                              {habit.habit_name}
                            </h2>

                            {/* Cue */}
                            <p className="mt-4 font-body text-sm leading-relaxed text-muted-foreground">
                              {habit.cue}
                            </p>

                            {/* Two-minute version */}
                            <div className={`mt-5 rounded-2xl ${colors.bg} px-4 py-3`}>
                              <p className="font-body text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                                Start with
                              </p>
                              <p className="mt-1 font-body text-sm font-semibold text-foreground">
                                {habit.two_minute_version}
                              </p>
                            </div>

                            {/* Category */}
                            <span className={`mt-4 inline-block self-start rounded-full border border-border bg-muted/50 px-3 py-1 font-body text-[11px] text-muted-foreground`}>
                              {habit.category}
                            </span>

                            <div className="flex-1" />

                            {/* Heart button */}
                            <button
                              onClick={() => toggleHabit(idx)}
                              className={`mt-4 flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 font-heading text-sm font-bold transition-all ${
                                isSelected
                                  ? 'bg-primary text-primary-foreground'
                                  : 'border-2 border-border bg-white text-muted-foreground hover:border-primary/40 hover:text-primary'
                              }`}
                            >
                              <Heart
                                size={18}
                                className="transition-all"
                                fill={isSelected ? 'currentColor' : 'none'}
                              />
                              {isSelected ? 'Selected' : 'Choose this habit'}
                            </button>
                          </div>
                        </motion.div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Prev / Next arrows + dot indicators */}
              <div className="flex shrink-0 items-center justify-center gap-4 py-3">
                <button
                  onClick={() => emblaApi?.scrollPrev()}
                  disabled={currentIdx === 0}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-white text-muted-foreground disabled:opacity-30 transition-opacity"
                >
                  <ChevronLeft size={18} />
                </button>

                <div className="flex gap-1.5">
                  {habits.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => emblaApi?.scrollTo(i)}
                      className={`h-2 rounded-full transition-all ${
                        i === currentIdx
                          ? 'w-5 bg-primary'
                          : selected.has(i)
                          ? 'w-2 bg-primary/40'
                          : 'w-2 bg-muted'
                      }`}
                    />
                  ))}
                </div>

                <button
                  onClick={() => emblaApi?.scrollNext()}
                  disabled={currentIdx === habits.length - 1}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-white text-muted-foreground disabled:opacity-30 transition-opacity"
                >
                  <ChevronRight size={18} />
                </button>
              </div>

              {/* Regenerate */}
              <button
                onClick={() => userId && void generate(userId)}
                className="flex items-center justify-center gap-1.5 pb-1 font-body text-xs text-muted-foreground hover:text-foreground"
              >
                <RefreshCw size={11} /> Regenerate all
              </button>
            </motion.div>
          )}

          {/* Saved */}
          {state === 'saved' && (
            <motion.div
              key="saved"
              className="flex h-full items-center justify-center px-4"
              initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
            >
              <div className="w-full max-w-sm rounded-2xl bg-primary px-6 py-4 text-center font-heading text-sm font-bold text-primary-foreground shadow-lg">
                {selected.size === 1 ? 'Habit saved' : `${selected.size} habits saved`}. Heading to your dashboard…
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      {/* Floating selection bar — sits above BottomNav */}
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
