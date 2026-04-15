"use client"

import { useState, useRef } from 'react'
import StreakDots from './StreakDots'
import type { DayStatus } from '@/lib/streak'

type Habit = {
  id: string
  name: string
  identity_link: string | null
  cue: string | null
  time_of_day: string | null
  goal_category: string | null
}

type Props = {
  habit: Habit
  streak: number
  last7: DayStatus[]
  todayLogged: boolean
  todayCompleted: boolean | null
  onLog: (completed: boolean) => Promise<void>
}

const CATEGORY_COLORS: Record<string, string> = {
  'Health & Fitness': 'bg-emerald-500',
  'Career & Learning': 'bg-blue-500',
  'Relationships': 'bg-pink-500',
  'Creativity': 'bg-violet-500',
  'Mindset & Energy': 'bg-amber-500',
  'Something else': 'bg-zinc-500',
}

export default function HabitCard({ habit, streak, last7, todayLogged, todayCompleted, onLog }: Props) {
  const [logging, setLogging] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  // Touch/swipe handling
  const touchStartX = useRef<number | null>(null)

  function handleTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX
  }

  async function handleTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null) return
    const dx = e.changedTouches[0].clientX - touchStartX.current
    touchStartX.current = null

    if (Math.abs(dx) < 60) return  // not a real swipe
    await handleLog(dx > 0)
  }

  async function handleLog(completed: boolean) {
    if (logging || todayLogged) return
    setLogging(true)
    try {
      await onLog(completed)
      setToast(
        completed
          ? 'Vote cast. You\'re becoming them.'
          : 'No streak broken — just paused. Back tomorrow.'
      )
      setTimeout(() => setToast(null), 3000)
    } finally {
      setLogging(false)
    }
  }

  const colorBar = CATEGORY_COLORS[habit.goal_category ?? ''] ?? 'bg-zinc-400'

  return (
    <div className="relative overflow-hidden rounded-3xl border border-zinc-100 bg-white shadow-sm">
      {/* Left color bar */}
      <div className={`absolute left-0 top-0 bottom-0 w-1 ${colorBar}`} />

      <div className="px-6 py-5 pl-7">
        {/* Habit name */}
        <h3 className="text-lg font-semibold text-zinc-900">{habit.name}</h3>

        {/* Cue + time */}
        {(habit.cue || habit.time_of_day) && (
          <p className="mt-0.5 text-sm text-zinc-500">
            {[habit.cue, habit.time_of_day].filter(Boolean).join(' · ')}
          </p>
        )}

        {/* Identity link */}
        {habit.identity_link && (
          <p className="mt-2 text-sm italic text-zinc-400">→ "{habit.identity_link}"</p>
        )}

        {/* Streak dots */}
        <div className="mt-4">
          <StreakDots days={last7} streak={streak} />
        </div>

        {/* Action buttons */}
        <div
          className="mt-4 flex gap-3"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {todayLogged ? (
            <div className={`flex flex-1 items-center justify-center rounded-2xl py-3.5 text-sm font-medium ${
              todayCompleted
                ? 'bg-zinc-900 text-white'
                : 'bg-zinc-100 text-zinc-500'
            }`}>
              {todayCompleted ? '✓ Done today' : '✗ Skipped'}
            </div>
          ) : (
            <>
              <button
                onClick={() => handleLog(true)}
                disabled={logging}
                className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-zinc-900 py-3.5 text-sm font-medium text-white transition-opacity disabled:opacity-50"
              >
                ✓ Done today
              </button>
              <button
                onClick={() => handleLog(false)}
                disabled={logging}
                className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-zinc-100 py-3.5 text-sm font-medium text-zinc-600 transition-opacity disabled:opacity-50"
              >
                ✗ Skip
              </button>
            </>
          )}
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className="absolute inset-x-0 bottom-0 rounded-b-3xl bg-zinc-900 px-6 py-3 text-center text-sm text-white transition-all">
          {toast}
        </div>
      )}
    </div>
  )
}
