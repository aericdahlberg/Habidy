"use client"

import { useState, useRef } from 'react'
import StreakDots from './StreakDots'
import type { DayStatus } from '@/lib/streak'

type Habit = {
  id: string
  habit_name: string
  identity_label: string | null
  cue: string | null
  time_of_day: string | null
  category: string | null
}

type Props = {
  habit: Habit
  streak: number
  last7: DayStatus[]
  todayLogged: boolean
  todayCompleted: boolean | null
  userId: string | null
  onLog: (completed: boolean) => Promise<void>
}

type CompletionLevel = 'full' | 'partial' | 'none'

const CATEGORY_STYLES: Record<string, { bar: string; bannerBg: string; bannerText: string }> = {
  'Health & Fitness':  { bar: 'bg-emerald-500', bannerBg: 'bg-emerald-50',  bannerText: 'text-emerald-700' },
  'Career & Learning': { bar: 'bg-blue-500',    bannerBg: 'bg-blue-50',     bannerText: 'text-blue-700'    },
  'Relationships':     { bar: 'bg-pink-500',    bannerBg: 'bg-pink-50',     bannerText: 'text-pink-700'    },
  'Creativity':        { bar: 'bg-violet-500',  bannerBg: 'bg-violet-50',   bannerText: 'text-violet-700'  },
  'Mindset & Energy':  { bar: 'bg-amber-500',   bannerBg: 'bg-amber-50',    bannerText: 'text-amber-700'   },
  'Something else':    { bar: 'bg-zinc-500',    bannerBg: 'bg-zinc-50',     bannerText: 'text-zinc-600'    },
}

function categoryStyle(cat: string | null) {
  return CATEGORY_STYLES[cat ?? ''] ?? CATEGORY_STYLES['Something else']
}

export default function HabitCard({ habit, streak, last7, todayLogged, todayCompleted, userId, onLog }: Props) {
  const [logging, setLogging] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  // Survey state
  const [showSurvey, setShowSurvey] = useState(false)
  const [wentRight, setWentRight] = useState('')
  const [wentWrong, setWentWrong] = useState('')
  const [completionLevel, setCompletionLevel] = useState<CompletionLevel | null>(null)
  const [surveySubmitting, setSurveySubmitting] = useState(false)

  // Touch tracking (X + Y for swipe direction)
  const touchStartX = useRef<number | null>(null)
  const touchStartY = useRef<number | null>(null)

  function handleTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
  }

  async function handleTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null || touchStartY.current === null) return
    const dx = e.changedTouches[0].clientX - touchStartX.current
    const dy = e.changedTouches[0].clientY - touchStartY.current
    touchStartX.current = null
    touchStartY.current = null

    const absX = Math.abs(dx)
    const absY = Math.abs(dy)

    if (absX < 60 && absY < 60) return  // not a real swipe

    // Swipe up: Y dominates and is negative (finger moves up)
    if (absY > absX && dy < -60) {
      if (!todayLogged) setShowSurvey(true)
      return
    }

    // Horizontal swipe: right = complete, left = skip
    if (absX > absY) {
      await handleLog(dx > 0)
    }
  }

  async function handleLog(completed: boolean) {
    if (logging || todayLogged) return
    setLogging(true)
    try {
      await onLog(completed)
      setToast(
        completed
          ? "Vote cast. You're becoming them."
          : 'No streak broken — just paused. Back tomorrow.'
      )
      setTimeout(() => setToast(null), 3000)
    } finally {
      setLogging(false)
    }
  }

  async function handleSurveySubmit() {
    if (!completionLevel || surveySubmitting) return
    setSurveySubmitting(true)
    const today = new Date().toISOString().split('T')[0]

    try {
      // Save survey response
      await fetch('/api/habits/survey', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          habitId: habit.id,
          date: today,
          wentRight: wentRight.trim() || null,
          wentWrong: wentWrong.trim() || null,
          completionLevel,
        }),
      })

      // Feed survey content into profile context via explore
      const parts: string[] = [`Habit check-in for "${habit.habit_name}": did ${completionLevel} of it.`]
      if (wentRight.trim()) parts.push(`What went right: ${wentRight.trim()}`)
      if (wentWrong.trim()) parts.push(`What went wrong: ${wentWrong.trim()}`)
      await fetch('/api/explore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, content: parts.join(' ') }),
      })
    } catch {
      // Non-fatal — survey saved locally even if profile update fails
    } finally {
      setSurveySubmitting(false)
      setShowSurvey(false)
      setWentRight('')
      setWentWrong('')
      setCompletionLevel(null)
      setToast('Reflection saved.')
      setTimeout(() => setToast(null), 3000)
    }
  }

  const style = categoryStyle(habit.category)

  return (
    <>
      <div
        className="relative overflow-hidden rounded-3xl border border-zinc-100 bg-white shadow-sm"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Left color bar */}
        <div className={`absolute left-0 top-0 bottom-0 w-1 ${style.bar}`} />

        {/* Identity banner */}
        {habit.identity_label && (
          <div className={`pl-7 pr-6 py-2.5 ${style.bannerBg}`}>
            <p className={`text-xs font-semibold uppercase tracking-wide ${style.bannerText}`}>
              {habit.identity_label}
            </p>
          </div>
        )}

        <div className="px-6 py-5 pl-7">
          {/* Habit name */}
          <h3 className="text-lg font-semibold text-zinc-900">{habit.habit_name}</h3>

          {/* Cue */}
          {habit.cue && (
            <p className="mt-0.5 text-sm text-zinc-500">{habit.cue}</p>
          )}

          {/* Streak dots */}
          <div className="mt-4">
            <StreakDots days={last7} streak={streak} />
          </div>

          {/* Swipe hint — only shown before today is logged */}
          {!todayLogged && (
            <p className="mt-2 text-xs text-zinc-300 text-center select-none">
              swipe right to complete · left to skip · up to reflect
            </p>
          )}

          {/* Action buttons */}
          <div className="mt-4 flex gap-3">
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

      {/* Survey bottom sheet */}
      {showSurvey && (
        <div className="fixed inset-0 z-50 flex items-end">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/30"
            onClick={() => setShowSurvey(false)}
          />

          {/* Sheet */}
          <div className="relative w-full rounded-t-3xl bg-white px-5 pt-5 pb-10 space-y-5 shadow-xl">
            {/* Handle */}
            <div className="mx-auto h-1 w-10 rounded-full bg-zinc-200" />

            <h2 className="text-base font-semibold text-zinc-900">Quick reflection</h2>

            {/* Q1 */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-zinc-700">What went right?</label>
              <textarea
                value={wentRight}
                onChange={(e) => setWentRight(e.target.value)}
                placeholder="Optional..."
                rows={2}
                className="w-full resize-none rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm text-zinc-900 placeholder-zinc-400 outline-none focus:border-zinc-400"
              />
            </div>

            {/* Q2 */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-zinc-700">What went wrong?</label>
              <textarea
                value={wentWrong}
                onChange={(e) => setWentWrong(e.target.value)}
                placeholder="Optional..."
                rows={2}
                className="w-full resize-none rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm text-zinc-900 placeholder-zinc-400 outline-none focus:border-zinc-400"
              />
            </div>

            {/* Q3 */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-700">
                Did you do the full thing, part of it, or none?
              </label>
              <div className="flex gap-2">
                {(['full', 'partial', 'none'] as CompletionLevel[]).map((level) => (
                  <button
                    key={level}
                    onClick={() => setCompletionLevel(level)}
                    className={`flex-1 rounded-2xl py-2.5 text-sm font-medium transition-colors capitalize ${
                      completionLevel === level
                        ? 'bg-zinc-900 text-white'
                        : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                    }`}
                  >
                    {level === 'partial' ? 'Part of it' : level.charAt(0).toUpperCase() + level.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleSurveySubmit}
              disabled={!completionLevel || surveySubmitting}
              className="w-full rounded-2xl bg-zinc-900 py-3.5 text-sm font-medium text-white transition-opacity disabled:opacity-30"
            >
              {surveySubmitting ? 'Saving...' : 'Save reflection'}
            </button>
          </div>
        </div>
      )}
    </>
  )
}
