"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import NavBar from '@/components/NavBar'
import ChatInterface, { type HabitSuggestionResponse } from '@/components/ChatInterface'
import { supabase } from '@/lib/supabase'

// Maps the 6 goal categories to Tailwind-safe class strings
const CATEGORY_STYLES: Record<string, { border: string; bg: string; label: string }> = {
  'Health & Fitness':  { border: 'border-orange-200',  bg: 'bg-orange-50',  label: 'text-orange-600'  },
  'Career & Learning': { border: 'border-blue-200',    bg: 'bg-blue-50',    label: 'text-blue-600'    },
  'Relationships':     { border: 'border-pink-200',    bg: 'bg-pink-50',    label: 'text-pink-600'    },
  'Creativity':        { border: 'border-purple-200',  bg: 'bg-purple-50',  label: 'text-purple-600'  },
  'Mindset & Energy':  { border: 'border-emerald-200', bg: 'bg-emerald-50', label: 'text-emerald-600' },
  'Something else':    { border: 'border-zinc-200',    bg: 'bg-zinc-50',    label: 'text-zinc-500'    },
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
    // Pre-select all habits so the user sees them as chosen by default
    setSelected(new Set(incoming.map((_, i) => i)))
  }

  function toggleHabit(idx: number) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(idx)) {
        next.delete(idx)
      } else {
        next.add(idx)
      }
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
        body: JSON.stringify({
          user_id: userId,
          habits: selectedHabits,
          selectedProposedIds,
        }),
      })

      if (res.ok) {
        // Save first habit to localStorage for the dashboard fallback
        const firstHabit = selectedHabits[0]
        localStorage.setItem('habidy_active_habit', JSON.stringify({
          id: `local-${Date.now()}`,
          name: firstHabit.habit_name,
          identity_link: firstHabit.identity_label,
          cue: firstHabit.cue,
          goal_category: firstHabit.category,
        }))
      }
    } catch {
      // Offline — save first habit locally as fallback
      const firstHabit = selectedHabits[0]
      localStorage.setItem('habidy_active_habit', JSON.stringify({
        id: `local-${Date.now()}`,
        name: firstHabit.habit_name,
        identity_link: firstHabit.identity_label,
        cue: firstHabit.cue,
        goal_category: firstHabit.category,
      }))
    } finally {
      setSaving(false)
      setSaved(true)
      setTimeout(() => router.push('/dashboard'), 1200)
    }
  }

  return (
    <div className="flex h-screen flex-col bg-white">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-zinc-100 px-4 py-4">
        <div className="mx-auto flex max-w-sm items-center justify-between">
          <div>
            <h1 className="text-base font-semibold text-zinc-900">Architect</h1>
            <p className="text-xs text-zinc-400">
              {habits ? 'Choose your habits' : 'Building your habits'}
            </p>
          </div>
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-100 text-sm">
            🔨
          </div>
        </div>
      </div>

      {/* Chat — shown until habits are ready */}
      {!habits && (
        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col overflow-hidden">
          <ChatInterface
            agentEndpoint="/api/agents/architect"
            userId={userId}
            onHabitsReady={handleHabitsReady}
            initialMessage="Let's build your habits. I've reviewed your Crystal Ball session — give me a moment and I'll have a few options for you. Or tell me anything else I should know first."
            thinkingLabel="Building your habits..."
          />
        </div>
      )}

      {/* Habit selection screen — replaces chat when habits are ready */}
      {habits && !saved && (
        <div className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-sm px-4 py-5 space-y-3">
            <p className="text-sm text-zinc-500 leading-relaxed">
              Select 1, 2, or all 3 to start.{' '}
              <span className="text-zinc-400">The rest will be waiting for you at day 7.</span>
            </p>

            {habits.map((habit, idx) => {
              const isSelected = selected.has(idx)
              const style = categoryStyle(habit.category)
              return (
                <button
                  key={idx}
                  onClick={() => toggleHabit(idx)}
                  className={`w-full rounded-3xl border-2 px-5 py-5 text-left transition-all ${
                    isSelected
                      ? `${style.border} ${style.bg}`
                      : 'border-zinc-100 bg-white hover:border-zinc-200'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      {/* Identity label */}
                      <p className={`text-xs font-semibold uppercase tracking-wide mb-1 ${
                        isSelected ? style.label : 'text-zinc-400'
                      }`}>
                        {habit.identity_label}
                      </p>
                      {/* Habit name */}
                      <p className="text-base font-semibold text-zinc-900 leading-snug">
                        {habit.habit_name}
                      </p>
                      {/* Cue */}
                      <p className="mt-2 text-sm text-zinc-500 leading-relaxed">
                        {habit.cue}
                      </p>
                      {/* Two-minute version */}
                      <div className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-white/70 border border-zinc-100 px-3 py-1.5">
                        <span className="text-xs text-zinc-400">Start with:</span>
                        <span className="text-xs font-medium text-zinc-700">{habit.two_minute_version}</span>
                      </div>
                    </div>
                    {/* Checkbox */}
                    <div className={`flex-shrink-0 mt-0.5 flex h-5 w-5 items-center justify-center rounded-full border-2 transition-all ${
                      isSelected
                        ? `border-zinc-900 bg-zinc-900`
                        : 'border-zinc-300 bg-white'
                    }`}>
                      {isSelected && (
                        <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 12 12" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2 6l3 3 5-5" />
                        </svg>
                      )}
                    </div>
                  </div>
                </button>
              )
            })}

            <div className="pt-2">
              <button
                onClick={saveHabits}
                disabled={selected.size === 0 || saving}
                className="w-full rounded-2xl bg-zinc-900 py-4 text-base font-medium text-white transition-opacity disabled:opacity-30"
              >
                {saving
                  ? 'Saving...'
                  : `Start ${selected.size === 1 ? 'this habit' : `these ${selected.size} habits`} →`}
              </button>
              {selected.size === 0 && (
                <p className="mt-2 text-center text-xs text-zinc-400">Select at least one habit to continue</p>
              )}
            </div>
          </div>
        </div>
      )}

      {saved && (
        <div className="flex-1 flex items-center justify-center px-4">
          <div className="w-full max-w-sm rounded-2xl bg-zinc-900 px-6 py-4 text-center text-sm text-white">
            {selected.size === 1 ? 'Habit saved' : `${selected.size} habits saved`}. Heading to your dashboard...
          </div>
        </div>
      )}

      <div className="h-16 flex-shrink-0" />
      <NavBar />
    </div>
  )
}
