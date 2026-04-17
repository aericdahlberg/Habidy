"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import NavBar from '@/components/NavBar'
import HabitCard from '@/components/HabitCard'
import type { DayStatus } from '@/lib/streak'
import { calculateStreak, getLast7Days } from '@/lib/streak'
import { supabase } from '@/lib/supabase'

type Habit = {
  id: string
  name: string
  identity_link: string | null
  cue: string | null
  time_of_day: string | null
  goal_category: string | null
}

type Log = { date: string; completed: boolean }

type HabitState = {
  logs: Log[]
  streak: number
  last7: DayStatus[]
  todayLogged: boolean
  todayCompleted: boolean | null
}

function getGreeting(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
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

export default function DashboardPage() {
  const router = useRouter()
  const [userId, setUserId] = useState<string | null>(null)
  const [habits, setHabits] = useState<Habit[]>([])
  const [habitStates, setHabitStates] = useState<Record<string, HabitState>>({})
  const [identityStatement, setIdentityStatement] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      setUserId(user.id)

      // Load identity statement
      const { data: userRow } = await supabase
        .from('users')
        .select('identity_statement')
        .eq('id', user.id)
        .maybeSingle()
      if (userRow?.identity_statement) setIdentityStatement(userRow.identity_statement)

      // Load active habits
      const habitsRes = await fetch(`/api/habits?user_id=${user.id}`)
      const habitsJson = await habitsRes.json() as { habits?: Habit[] }
      const activeHabits: Habit[] = habitsJson.habits ?? []

      if (activeHabits.length === 0) {
        // Fall back to localStorage for offline / pre-save state
        const saved = localStorage.getItem('habidy_active_habit')
        if (saved) {
          const h: Habit = JSON.parse(saved)
          setHabits([h])
          const savedLogs = localStorage.getItem(`habidy_logs_${h.id}`)
          const logs: Log[] = savedLogs ? JSON.parse(savedLogs) : []
          setHabitStates({ [h.id]: buildHabitState(logs) })
        }
        setLoading(false)
        return
      }

      setHabits(activeHabits)

      // Load last 60 days of logs for all habits in one query
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
      setLoading(false)
    }

    load()
  }, [])

  async function handleLog(habitId: string, completed: boolean) {
    if (!userId) return
    const today = new Date().toISOString().split('T')[0]

    setHabitStates((prev) => {
      const current = prev[habitId] ?? { logs: [], streak: 0, last7: [], todayLogged: false, todayCompleted: null }
      const updatedLogs = current.logs.filter((l) => l.date !== today)
      updatedLogs.push({ date: today, completed })
      return { ...prev, [habitId]: buildHabitState(updatedLogs) }
    })

    // Persist locally
    localStorage.setItem(`habidy_logs_${habitId}`, JSON.stringify(
      (habitStates[habitId]?.logs ?? []).filter((l) => l.date !== today).concat({ date: today, completed })
    ))

    try {
      await fetch(`/api/habits/${habitId}/log`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, completed, date: today }),
      })
    } catch {
      // Offline — local state is fine
    }
  }

  // Show "+ Add habit" if any habit has a 7-day streak
  const showAddHabit = Object.values(habitStates).some((s) => s.streak >= 7)

  return (
    <div className="flex min-h-screen flex-col bg-zinc-50 pb-24">
      {/* Header */}
      <div className="bg-white px-5 pt-12 pb-6">
        <div className="mx-auto max-w-sm flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-zinc-900">{getGreeting()}</h1>
            {identityStatement && (
              <p className="mt-1 text-sm text-zinc-500 leading-relaxed">
                You&apos;re becoming someone who{' '}
                {identityStatement.replace(/^i want to be someone who\s*/i, '')}
              </p>
            )}
          </div>
          {/* + button — add a new identity */}
          <button
            onClick={() => router.push('/')}
            className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-zinc-100 text-lg font-light text-zinc-600 transition-colors hover:bg-zinc-200 active:bg-zinc-300"
            title="Add new identity"
          >
            +
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto w-full max-w-sm flex-1 px-4 pt-4 space-y-4">

        {/* Streak milestone celebrations — check all habits */}
        {Object.values(habitStates).some((s) => s.streak === 7) && (
          <div className="rounded-2xl bg-amber-50 border border-amber-100 px-5 py-4 text-center">
            <p className="text-xl">🎉</p>
            <p className="mt-1 text-sm font-medium text-amber-900">
              7-day streak! You&apos;re building something real.
            </p>
          </div>
        )}
        {Object.values(habitStates).some((s) => s.streak === 30) && (
          <div className="rounded-2xl bg-amber-50 border border-amber-200 px-5 py-4 text-center">
            <p className="text-2xl">🏆</p>
            <p className="mt-1 text-sm font-medium text-amber-900">
              30 days. Time to level up this habit?
            </p>
          </div>
        )}

        {/* Habit cards */}
        {loading ? (
          <div className="rounded-3xl border border-zinc-100 bg-white px-6 py-10 text-center">
            <p className="text-sm text-zinc-400">Loading your habits...</p>
          </div>
        ) : habits.length === 0 ? (
          <div className="rounded-3xl border border-zinc-200 bg-white px-6 py-10 text-center">
            <p className="text-3xl">🌱</p>
            <p className="mt-3 text-base font-medium text-zinc-900">No habit yet</p>
            <p className="mt-1 text-sm text-zinc-500">Build your first habit with Architect</p>
            <button
              onClick={() => router.push('/architect')}
              className="mt-4 rounded-2xl bg-zinc-900 px-6 py-3 text-sm font-medium text-white"
            >
              Build a habit →
            </button>
          </div>
        ) : (
          habits.map((habit) => {
            const state = habitStates[habit.id] ?? {
              logs: [], streak: 0, last7: getLast7Days([]), todayLogged: false, todayCompleted: null,
            }
            return (
              <HabitCard
                key={habit.id}
                habit={habit}
                streak={state.streak}
                last7={state.last7}
                todayLogged={state.todayLogged}
                todayCompleted={state.todayCompleted}
                userId={userId}
                onLog={(completed) => handleLog(habit.id, completed)}
              />
            )
          })
        )}

        {/* Add another habit — shown after 7-day streak */}
        {showAddHabit && (
          <button
            onClick={() => router.push('/add-habit')}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-zinc-200 py-4 text-sm font-medium text-zinc-500 transition-colors hover:border-zinc-400 hover:text-zinc-700"
          >
            + Add another habit
          </button>
        )}

        {/* Quick links */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          <button
            onClick={() => router.push('/constellation')}
            className="flex flex-col items-start gap-2 rounded-2xl bg-white border border-zinc-100 px-4 py-4 text-left shadow-sm"
          >
            <span className="text-xl">✦</span>
            <span className="text-sm font-medium text-zinc-900">Reflect</span>
            <span className="text-xs text-zinc-500">Chat with Crystal Ball</span>
          </button>
          <button
            onClick={() => router.push('/architect')}
            className="flex flex-col items-start gap-2 rounded-2xl bg-white border border-zinc-100 px-4 py-4 text-left shadow-sm"
          >
            <span className="text-xl">🔨</span>
            <span className="text-sm font-medium text-zinc-900">Build</span>
            <span className="text-xs text-zinc-500">Refine with Architect</span>
          </button>
        </div>
      </div>

      <NavBar />
    </div>
  )
}
