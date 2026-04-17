"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import NavBar from '@/components/NavBar'
import { supabase } from '@/lib/supabase'

type ProposedHabit = {
  id: string
  habit_data: {
    identity_label: string
    habit_name: string
    cue: string
    two_minute_version: string
    category: string
  }
}

const CATEGORY_STYLES: Record<string, { border: string; bg: string; label: string }> = {
  'Health & Fitness':  { border: 'border-orange-200',  bg: 'bg-orange-50',  label: 'text-orange-600'  },
  'Career & Learning': { border: 'border-blue-200',    bg: 'bg-blue-50',    label: 'text-blue-600'    },
  'Relationships':     { border: 'border-pink-200',    bg: 'bg-pink-50',    label: 'text-pink-600'    },
  'Creativity':        { border: 'border-purple-200',  bg: 'bg-purple-50',  label: 'text-purple-600'  },
  'Mindset & Energy':  { border: 'border-emerald-200', bg: 'bg-emerald-50', label: 'text-emerald-600' },
  'Something else':    { border: 'border-zinc-200',    bg: 'bg-zinc-50',    label: 'text-zinc-500'    },
}

function categoryStyle(cat: string) {
  return CATEGORY_STYLES[cat] ?? CATEGORY_STYLES['Something else']
}

export default function AddHabitPage() {
  const router = useRouter()
  const [userId, setUserId] = useState<string | null>(null)
  const [proposed, setProposed] = useState<ProposedHabit[]>([])
  const [adding, setAdding] = useState<string | null>(null)  // id of habit being added
  const [added, setAdded] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUserId(user.id)

      const { data } = await supabase
        .from('proposed_habits')
        .select('id, habit_data')
        .eq('user_id', user.id)
        .eq('selected', false)
        .order('created_at', { ascending: false })

      setProposed((data ?? []) as ProposedHabit[])
      setLoading(false)
    }
    load()
  }, [])

  async function addHabit(p: ProposedHabit) {
    if (!userId || adding) return
    setAdding(p.id)
    try {
      const res = await fetch('/api/habits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          habits: [p.habit_data],
          selectedProposedIds: [p.id],
        }),
      })
      if (res.ok) {
        setAdded((prev) => new Set(prev).add(p.id))
      }
    } finally {
      setAdding(null)
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-zinc-50 pb-24">
      {/* Header */}
      <div className="bg-white border-b border-zinc-100 px-5 pt-12 pb-5">
        <div className="mx-auto max-w-sm flex items-center justify-between">
          <div>
            <h1 className="text-base font-semibold text-zinc-900">Add a habit</h1>
            <p className="text-xs text-zinc-400 mt-0.5">
              {proposed.length > 0 ? 'Architect already built these for you' : 'Generate new suggestions'}
            </p>
          </div>
          <button
            onClick={() => router.back()}
            className="text-sm text-zinc-400 hover:text-zinc-700"
          >
            ← Back
          </button>
        </div>
      </div>

      <div className="mx-auto w-full max-w-sm px-4 pt-5 space-y-3">

        {loading ? (
          <p className="text-center text-sm text-zinc-400 py-8">Loading...</p>
        ) : proposed.length === 0 ? (
          <div className="rounded-2xl bg-white border border-zinc-100 px-5 py-8 text-center space-y-3">
            <p className="text-3xl">✨</p>
            <p className="text-sm font-medium text-zinc-900">No saved suggestions</p>
            <p className="text-sm text-zinc-500 leading-relaxed">
              Run Architect again to generate new habit ideas based on where you are now.
            </p>
          </div>
        ) : (
          proposed.map((p) => {
            const h = p.habit_data
            const style = categoryStyle(h.category)
            const isAdded = added.has(p.id)
            const isAdding = adding === p.id

            return (
              <div
                key={p.id}
                className={`rounded-3xl border-2 px-5 py-5 bg-white transition-all ${
                  isAdded ? 'border-zinc-200 opacity-60' : style.border
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-semibold uppercase tracking-wide mb-1 ${style.label}`}>
                      {h.identity_label}
                    </p>
                    <p className="text-base font-semibold text-zinc-900 leading-snug">
                      {h.habit_name}
                    </p>
                    <p className="mt-2 text-sm text-zinc-500 leading-relaxed">{h.cue}</p>
                    <div className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-zinc-50 border border-zinc-100 px-3 py-1.5">
                      <span className="text-xs text-zinc-400">Start with:</span>
                      <span className="text-xs font-medium text-zinc-700">{h.two_minute_version}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => addHabit(p)}
                    disabled={isAdded || !!adding}
                    className={`flex-shrink-0 mt-0.5 rounded-2xl px-4 py-2 text-sm font-medium transition-all ${
                      isAdded
                        ? 'bg-zinc-100 text-zinc-400 cursor-default'
                        : 'bg-zinc-900 text-white hover:opacity-90 disabled:opacity-40'
                    }`}
                  >
                    {isAdded ? 'Added ✓' : isAdding ? '...' : 'Add'}
                  </button>
                </div>
              </div>
            )
          })
        )}

        {/* Divider */}
        {!loading && (
          <div className="pt-2 space-y-3">
            {added.size > 0 && (
              <button
                onClick={() => router.push('/dashboard')}
                className="w-full rounded-2xl bg-zinc-900 py-3.5 text-sm font-medium text-white"
              >
                Go to dashboard →
              </button>
            )}
            <button
              onClick={() => router.push('/architect')}
              className="w-full rounded-2xl border-2 border-zinc-200 py-3.5 text-sm font-medium text-zinc-700 hover:border-zinc-400 transition-colors"
            >
              Generate new suggestions
            </button>
          </div>
        )}
      </div>

      <NavBar />
    </div>
  )
}
