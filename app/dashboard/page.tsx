'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2, Circle, Plus, Sparkles } from 'lucide-react'
import BottomNav from '@/components/BottomNav'
import SwipeCheckIn from '@/components/SwipeCheckIn'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import { calculateStreak, getLast7Days } from '@/lib/streak'
import type { DayStatus } from '@/lib/streak'

type Habit = {
  id: string
  habit_name: string
  identity_label: string | null
  cue: string | null
  time_of_day: string | null
  category: string | null
}

type Log = { date: string; completed: boolean }

type HabitState = {
  logs: Log[]
  streak: number
  last7: DayStatus[]
  todayLogged: boolean
  todayCompleted: boolean | null
}

const MS_24H = 24 * 60 * 60 * 1000

function checkinKey(userId: string) {
  return `habidy_last_checkin_${userId}`
}

function needsCheckIn(userId: string): boolean {
  try {
    const last = localStorage.getItem(checkinKey(userId))
    if (!last) return true
    return Date.now() - Number(last) >= MS_24H
  } catch {
    return true
  }
}

function buildHabitState(logs: Log[]): HabitState {
  const today = new Date().toISOString().split('T')[0]
  const todayLog = logs.find((l) => l.date === today)
  return {
    logs,
    streak: calculateStreak(logs),
    last7: getLast7Days(logs),
    todayLogged: !!todayLog,
    todayCompleted: todayLog?.completed ?? null,
  }
}

const QUOTES = [
  'Small steps every day lead to big changes.',
  "You don't have to be perfect, just consistent.",
  'The secret of getting ahead is getting started.',
  'Progress, not perfection.',
  'Your future self will thank you.',
  'Discipline is choosing what you want most over what you want now.',
  'One habit at a time, one day at a time.',
  "You're closer than you think — keep going!",
  'Success is the sum of small efforts repeated daily.',
  'Be patient with yourself. Growth takes time.',
]

export default function DashboardPage() {
  const router = useRouter()
  const [userId, setUserId] = useState<string | null>(null)
  const [userName, setUserName] = useState('')
  const [identityStatement, setIdentityStatement] = useState('')
  const [habits, setHabits] = useState<Habit[]>([])
  const [habitStates, setHabitStates] = useState<Record<string, HabitState>>({})
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [showSwipe, setShowSwipe] = useState(false)
  const [checked, setChecked] = useState<Set<string>>(new Set())

  const quote = useMemo(() => QUOTES[Math.floor(Math.random() * QUOTES.length)], [])
  const firstName = userName.split(' ')[0] || ''
  const identityText = identityStatement
    ? identityStatement.length > 80
      ? identityStatement.slice(0, 80) + '…'
      : identityStatement
    : null

  useEffect(() => {
    async function load() {
      try {
        setLoadError('')
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          router.replace('/login')
          return
        }
        setUserId(user.id)
        localStorage.removeItem('habidy_active_habit')

        const { data: userRow } = await supabase
          .from('users')
          .select('identity_statement, display_name')
          .eq('id', user.id)
          .maybeSingle()

        if (userRow?.identity_statement) setIdentityStatement(userRow.identity_statement)
        if (userRow?.display_name) setUserName(userRow.display_name)
        else if (user.email) setUserName(user.email.split('@')[0])

        const habitsRes = await fetch(`/api/habits?user_id=${user.id}`, { cache: 'no-store' })
        const habitsJson = await habitsRes.json().catch(() => ({})) as { habits?: Habit[]; error?: string }
        if (!habitsRes.ok) {
          throw new Error(habitsJson.error ?? 'Could not load habits')
        }
        const activeHabits: Habit[] = habitsJson.habits ?? []

        if (activeHabits.length === 0) {
          setHabits([])
          setHabitStates({})
          setLoading(false)
          return
        }

        setHabits(activeHabits)

        const habitIds = activeHabits.map((h) => h.id)
        const since = new Date()
        since.setDate(since.getDate() - 60)
        const sinceStr = since.toISOString().split('T')[0]

        const { data: allLogs } = await supabase
          .from('habit_logs')
          .select('habit_id, date, completed')
          .in('habit_id', habitIds)
          .gte('date', sinceStr)
          .order('date', { ascending: false })

        const byHabit: Record<string, Log[]> = {}
        for (const log of allLogs ?? []) {
          if (!byHabit[log.habit_id]) byHabit[log.habit_id] = []
          byHabit[log.habit_id].push({ date: log.date, completed: log.completed })
        }

        const states: Record<string, HabitState> = {}
        for (const h of activeHabits) {
          states[h.id] = buildHabitState(byHabit[h.id] ?? [])
        }
        setHabitStates(states)

        // Show swipe check-in if habits exist and haven't checked in today
        if (activeHabits.length > 0 && needsCheckIn(user.id)) {
          setShowSwipe(true)
        }

        setLoading(false)
      } catch (err) {
        setLoadError(err instanceof Error ? err.message : 'Could not load habits')
        setLoading(false)
      }
    }
    load()
  }, [router])

  async function handleLog(habitId: string, completed: boolean) {
    if (!userId) return
    const today = new Date().toISOString().split('T')[0]

    setHabitStates((prev) => {
      const current = prev[habitId] ?? { logs: [], streak: 0, last7: [], todayLogged: false, todayCompleted: null }
      const updatedLogs = current.logs.filter((l) => l.date !== today)
      updatedLogs.push({ date: today, completed })
      return { ...prev, [habitId]: buildHabitState(updatedLogs) }
    })

    try {
      await fetch(`/api/habits/${habitId}/log`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, completed, date: today }),
      })
    } catch {
      // Offline fallback
    }
  }

  const handleSwipeComplete = useCallback(
    async (completedSet: Set<string>) => {
      if (userId) localStorage.setItem(checkinKey(userId), String(Date.now()))
      setShowSwipe(false)
      setChecked(completedSet)

      const today = new Date().toISOString().split('T')[0]
      for (const habit of habits) {
        const completed = completedSet.has(habit.id)
        await handleLog(habit.id, completed)
      }
    },
    [habits, userId]
  )

  const toggle = (id: string) => {
    setChecked((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const showAddHabit = Object.values(habitStates).some((s) => s.streak >= 7)

  const dailyHabits = habits
  const dailyCompleted = dailyHabits.filter((h) => {
    const state = habitStates[h.id]
    return state?.todayLogged && state?.todayCompleted
  }).length
  const dailyPct = dailyHabits.length > 0 ? (dailyCompleted / dailyHabits.length) * 100 : 0

  if (showSwipe && habits.length > 0) {
    return (
      <SwipeCheckIn
        habits={habits.map((h) => ({ id: h.id, name: h.habit_name, description: h.cue ?? undefined }))}
        onComplete={handleSwipeComplete}
      />
    )
  }

  return (
    <div className="flex min-h-screen flex-col bg-background pb-24">
      {/* Header */}
      <header className="px-6 pt-14 pb-2">
        <div className="flex items-start justify-between gap-3">
          <motion.h1
            className="font-heading text-4xl font-black text-foreground"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            Hey {firstName} 👋
          </motion.h1>
          <motion.button
            onClick={() => router.push('/profile')}
            aria-label="Open profile"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/60 font-heading text-sm font-black text-primary-foreground shadow-md transition-transform active:scale-95"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            {(userName || 'U').split(' ').map((n) => n[0]).filter(Boolean).slice(0, 2).join('').toUpperCase()}
          </motion.button>
        </div>
        {identityText && (
          <motion.p
            className="mt-2 font-body text-sm text-muted-foreground"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.15 }}
          >
            Becoming:{' '}
            <span className="font-semibold text-primary">{identityText}</span>
          </motion.p>
        )}
      </header>

      {/* Motivational quote */}
      <section className="px-6 pt-4">
        <motion.div
          className="rounded-3xl border border-border bg-card p-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <p className="font-body text-base leading-relaxed text-foreground/90 italic">
            &ldquo;{quote}&rdquo;
          </p>
        </motion.div>
      </section>

      {/* Progress bar — shown when habits exist */}
      {habits.length > 0 && !loading && (
        <section className="px-6 pt-4">
          <motion.div
            className="rounded-2xl border border-border bg-card p-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
          >
            <div className="flex items-center justify-between">
              <p className="font-body text-sm font-semibold text-foreground">Today&apos;s Progress</p>
              <p className="font-heading text-sm font-bold text-primary">{dailyCompleted} of {dailyHabits.length}</p>
            </div>
            <div className="mt-3 h-2.5 w-full rounded-full bg-muted overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-primary to-primary/70"
                initial={{ width: 0 }}
                animate={{ width: `${dailyPct}%` }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
              />
            </div>
            {dailyCompleted === dailyHabits.length && dailyHabits.length > 0 && (
              <motion.p className="mt-2 text-center font-heading text-xs font-bold text-primary" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}>
                🎉 All habits done today!
              </motion.p>
            )}
          </motion.div>
        </section>
      )}

      {/* Content */}
      <section className="px-6 pt-5">
        {loading ? (
          <div className="rounded-3xl border border-border bg-card px-6 py-10 text-center">
            <p className="font-body text-sm text-muted-foreground">Loading your habits…</p>
          </div>
        ) : loadError ? (
          <div className="rounded-3xl border border-destructive/30 bg-card px-6 py-10 text-center">
            <p className="font-heading text-sm font-bold text-foreground">Couldn&apos;t load your habits</p>
            <p className="mt-2 font-body text-sm text-muted-foreground">{loadError}</p>
          </div>
        ) : habits.length === 0 ? (
          <motion.div
            className="flex flex-col items-center"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.35, type: 'spring', stiffness: 200 }}
          >
            <img src="/mascot.png" alt="Habidy mascot" className="h-32 w-32 object-contain" />
            <p className="mt-3 font-heading text-sm font-bold text-muted-foreground">Let&apos;s make today count!</p>
            <button
              onClick={() => router.push('/architect')}
              className="mt-6 rounded-full bg-primary px-8 py-3 font-heading text-sm font-bold text-primary-foreground shadow-lg"
            >
              Build your first habit →
            </button>
          </motion.div>
        ) : (
          <>
            <div className="flex items-center gap-2 mb-3">
              <Sparkles size={18} className="text-secondary" />
              <h2 className="font-heading text-lg font-bold text-foreground">Today&apos;s Habits</h2>
            </div>
            <ul className="space-y-2.5">
              <AnimatePresence>
                {habits.map((habit, i) => {
                  const state = habitStates[habit.id]
                  const done = state?.todayLogged && state?.todayCompleted
                  return (
                    <motion.li
                      key={habit.id}
                      initial={{ opacity: 0, x: -16 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.06, duration: 0.35 }}
                    >
                      <button
                        onClick={() => {
                          if (!state?.todayLogged) void handleLog(habit.id, !done)
                        }}
                        className={cn(
                          'flex w-full items-center gap-3 rounded-2xl border px-4 py-3.5 text-left transition-all',
                          done
                            ? 'border-primary/30 bg-primary/10'
                            : 'border-border bg-card hover:border-primary/40'
                        )}
                      >
                        {done
                          ? <CheckCircle2 size={22} className="shrink-0 text-primary" />
                          : <Circle size={22} className="shrink-0 text-muted-foreground/50" />
                        }
                        <div className="min-w-0 flex-1">
                          <span className={cn(
                            'font-body text-[15px] font-semibold transition-all',
                            done ? 'text-primary line-through decoration-primary/40' : 'text-foreground'
                          )}>
                            {habit.habit_name}
                          </span>
                          {habit.identity_label && (
                            <p className="mt-0.5 font-body text-xs text-muted-foreground">{habit.identity_label}</p>
                          )}
                        </div>
                        {state && (
                          <span className="font-heading text-xs font-bold text-muted-foreground shrink-0">
                            {state.streak}🔥
                          </span>
                        )}
                      </button>
                    </motion.li>
                  )
                })}
              </AnimatePresence>
            </ul>

            {showAddHabit && (
              <button
                onClick={() => router.push('/add-habit')}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border py-4 font-body text-sm font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
              >
                + Add another habit
              </button>
            )}
          </>
        )}
      </section>

      {/* Quick links */}
      {!loading && (
        <section className="px-6 pt-5">
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => router.push('/constellation')}
              className="flex flex-col items-start gap-2 rounded-2xl border border-border bg-card px-4 py-4 text-left shadow-sm"
            >
              <span className="text-xl">✦</span>
              <span className="font-heading text-sm font-bold text-foreground">Reflect</span>
              <span className="font-body text-xs text-muted-foreground">Chat with your coach</span>
            </button>
            <button
              onClick={() => router.push('/architect')}
              className="flex flex-col items-start gap-2 rounded-2xl border border-border bg-card px-4 py-4 text-left shadow-sm"
            >
              <span className="text-xl">🔨</span>
              <span className="font-heading text-sm font-bold text-foreground">Build</span>
              <span className="font-body text-xs text-muted-foreground">Refine with Architect</span>
            </button>
          </div>
        </section>
      )}

      {/* FAB — add habit */}
      {habits.length > 0 && (
        <motion.button
          onClick={() => router.push('/architect')}
          className="fixed bottom-24 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-primary shadow-lg shadow-primary/30 text-primary-foreground transition-transform hover:scale-110 active:scale-95"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.5, type: 'spring', stiffness: 300 }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
        >
          <Plus size={28} strokeWidth={2.5} />
        </motion.button>
      )}

      <BottomNav />
    </div>
  )
}
