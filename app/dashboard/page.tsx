"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import NavBar from '@/components/NavBar'
import HabitCard from '@/components/HabitCard'
import type { DayStatus } from '@/lib/streak'
import { calculateStreak, getLast7Days } from '@/lib/streak'

type Habit = {
  id: string
  name: string
  identity_link: string | null
  cue: string | null
  time_of_day: string | null
  goal_category: string | null
}

type Log = { date: string; completed: boolean }

const MOCK_HABIT: Habit = {
  id: 'mock-habit-1',
  name: 'Run for 2 minutes',
  identity_link: 'I am someone who takes care of their body',
  cue: 'After I make coffee',
  time_of_day: 'Morning',
  goal_category: 'Health & Fitness',
}

const MOCK_LOGS: Log[] = (() => {
  const today = new Date()
  return [4, 3, 2, 1, 0].map((offset) => {
    const d = new Date(today)
    d.setDate(d.getDate() - offset)
    return { date: d.toISOString().split('T')[0], completed: offset !== 3 }
  })
})()

function getGreeting(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

export default function DashboardPage() {
  const router = useRouter()
  const [habit, setHabit] = useState<Habit | null>(null)
  const [logs, setLogs] = useState<Log[]>([])
  const [todayLogged, setTodayLogged] = useState(false)
  const [todayCompleted, setTodayCompleted] = useState<boolean | null>(null)
  const [last7, setLast7] = useState<DayStatus[]>([])
  const [streak, setStreak] = useState(0)
  const [identityStatement, setIdentityStatement] = useState('')
  const [totalLogs, setTotalLogs] = useState(0)

  useEffect(() => {
    // Load onboarding data
    const stored = localStorage.getItem('habidy_onboarding')
    if (stored) {
      const data = JSON.parse(stored)
      setIdentityStatement(data.identity_statement ?? '')
    }

    // Load habit — try saved habit, fall back to mock
    const savedHabit = localStorage.getItem('habidy_active_habit')
    const activeHabit: Habit = savedHabit ? JSON.parse(savedHabit) : MOCK_HABIT
    setHabit(activeHabit)

    // Load logs — try localStorage, fall back to mock
    const savedLogs = localStorage.getItem(`habidy_logs_${activeHabit.id}`)
    const activeLogs: Log[] = savedLogs ? JSON.parse(savedLogs) : MOCK_LOGS
    setLogs(activeLogs)
    setTotalLogs(activeLogs.filter((l) => l.completed).length)

    // Check today
    const today = new Date().toISOString().split('T')[0]
    const todayLog = activeLogs.find((l) => l.date === today)
    setTodayLogged(!!todayLog)
    setTodayCompleted(todayLog?.completed ?? null)

    // Streak
    setStreak(calculateStreak(activeLogs))
    setLast7(getLast7Days(activeLogs))
  }, [])

  async function handleLog(completed: boolean) {
    if (!habit) return
    const today = new Date().toISOString().split('T')[0]

    // Optimistic update
    const updatedLogs = logs.filter((l) => l.date !== today)
    updatedLogs.push({ date: today, completed })
    setLogs(updatedLogs)
    setTodayLogged(true)
    setTodayCompleted(completed)
    setStreak(calculateStreak(updatedLogs))
    setLast7(getLast7Days(updatedLogs))
    if (completed) setTotalLogs((n) => n + 1)

    // Persist locally
    localStorage.setItem(`habidy_logs_${habit.id}`, JSON.stringify(updatedLogs))

    // Try API
    try {
      await fetch(`/api/habits/${habit.id}/log`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: 'mock-user-id', completed, date: today }),
      })
    } catch {
      // Offline — local state is fine
    }
  }

  const showAddHabit = totalLogs >= 7

  return (
    <div className="flex min-h-screen flex-col bg-zinc-50 pb-24">
      {/* Header */}
      <div className="bg-white px-5 pt-12 pb-6">
        <div className="mx-auto max-w-sm">
          <h1 className="text-2xl font-semibold text-zinc-900">
            {getGreeting()}
          </h1>
          {identityStatement && (
            <p className="mt-1 text-sm text-zinc-500 leading-relaxed">
              You&apos;re becoming someone who {identityStatement.replace(/^i want to be someone who\s*/i, '')}
            </p>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto w-full max-w-sm flex-1 px-4 pt-4 space-y-4">

        {/* Streak milestone celebrations */}
        {streak === 7 && (
          <div className="rounded-2xl bg-amber-50 border border-amber-100 px-5 py-4 text-center">
            <p className="text-xl">🎉</p>
            <p className="mt-1 text-sm font-medium text-amber-900">7-day streak! You&apos;re building something real.</p>
          </div>
        )}
        {streak === 30 && (
          <div className="rounded-2xl bg-amber-50 border border-amber-200 px-5 py-4 text-center">
            <p className="text-2xl">🏆</p>
            <p className="mt-1 text-sm font-medium text-amber-900">30 days. Time to level up this habit?</p>
          </div>
        )}

        {/* Habit card */}
        {habit ? (
          <HabitCard
            habit={habit}
            streak={streak}
            last7={last7}
            todayLogged={todayLogged}
            todayCompleted={todayCompleted}
            onLog={handleLog}
          />
        ) : (
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
        )}

        {/* Add another habit (only after 7 logs) */}
        {showAddHabit && (
          <button
            onClick={() => router.push('/architect')}
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
            <span className="text-xs text-zinc-500">Chat with Constellation</span>
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
