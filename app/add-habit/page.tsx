"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import BottomNav from '@/components/BottomNav'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'

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
  'Health & Fitness':  { border: 'border-primary/30',   bg: 'bg-primary/10',   label: 'text-primary'   },
  'Career & Learning': { border: 'border-secondary/30', bg: 'bg-secondary/10', label: 'text-secondary' },
  'Relationships':     { border: 'border-accent/30',    bg: 'bg-accent/10',    label: 'text-accent'    },
  'Creativity':        { border: 'border-secondary/30', bg: 'bg-secondary/10', label: 'text-secondary' },
  'Mindset & Energy':  { border: 'border-primary/30',   bg: 'bg-primary/10',   label: 'text-primary'   },
  'Something else':    { border: 'border-border',       bg: 'bg-muted/50',     label: 'text-muted-foreground' },
}

function categoryStyle(cat: string) {
  return CATEGORY_STYLES[cat] ?? CATEGORY_STYLES['Something else']
}

export default function AddHabitPage() {
  const router = useRouter()
  const [userId, setUserId] = useState<string | null>(null)
  const [proposed, setProposed] = useState<ProposedHabit[]>([])
  const [adding, setAdding] = useState<string | null>(null)
  const [added, setAdded] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
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
      } catch {
        // Non-fatal
      } finally {
        setLoading(false)
      }
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
      if (res.ok) setAdded((prev) => new Set(prev).add(p.id))
    } finally {
      setAdding(null)
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-background pb-24">
      <header className="border-b border-border bg-card/95 px-5 pt-12 pb-5 backdrop-blur-md">
        <div className="mx-auto max-w-sm flex items-center justify-between">
          <div>
            <h1 className="font-heading text-lg font-extrabold text-foreground">Add a habit</h1>
            <p className="font-body text-xs text-muted-foreground mt-0.5">
              {proposed.length > 0 ? 'Architect already built these for you' : 'Generate new suggestions'}
            </p>
          </div>
          <button
            onClick={() => router.back()}
            className="font-body text-sm text-muted-foreground hover:text-foreground"
          >
            ← Back
          </button>
        </div>
      </header>

      <div className="mx-auto w-full max-w-sm px-4 pt-5 space-y-3">
        {loading ? (
          <p className="text-center font-body text-sm text-muted-foreground py-8">Loading…</p>
        ) : proposed.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card px-5 py-8 text-center space-y-3">
            <p className="text-3xl">✨</p>
            <p className="font-heading text-sm font-bold text-foreground">No saved suggestions</p>
            <p className="font-body text-sm text-muted-foreground leading-relaxed">
              Run Architect again to generate new habit ideas based on where you are now.
            </p>
          </div>
        ) : (
          proposed.map((p, idx) => {
            const h = p.habit_data
            const style = categoryStyle(h.category)
            const isAdded = added.has(p.id)
            const isAdding = adding === p.id

            return (
              <motion.div
                key={p.id}
                className={cn(
                  'rounded-3xl border-2 px-5 py-5 bg-card transition-all',
                  isAdded ? 'border-border opacity-60' : style.border
                )}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.07 }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className={`font-body text-xs font-semibold uppercase tracking-wide mb-1 ${style.label}`}>
                      {h.identity_label}
                    </p>
                    <p className="font-heading text-base font-extrabold text-foreground leading-snug">
                      {h.habit_name}
                    </p>
                    <p className="mt-2 font-body text-sm text-muted-foreground leading-relaxed">{h.cue}</p>
                    <div className="mt-3 inline-flex items-center gap-1.5 rounded-xl border border-border bg-background/70 px-3 py-1.5">
                      <span className="font-body text-xs text-muted-foreground">Start with:</span>
                      <span className="font-body text-xs font-semibold text-foreground">{h.two_minute_version}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => void addHabit(p)}
                    disabled={isAdded || !!adding}
                    className={cn(
                      'shrink-0 mt-0.5 rounded-full px-4 py-2 font-heading text-sm font-bold transition-all',
                      isAdded
                        ? 'bg-muted text-muted-foreground cursor-default'
                        : 'bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-40'
                    )}
                  >
                    {isAdded ? 'Added ✓' : isAdding ? '…' : 'Add'}
                  </button>
                </div>
              </motion.div>
            )
          })
        )}

        {!loading && (
          <div className="pt-2 space-y-3">
            {added.size > 0 && (
              <button
                onClick={() => router.push('/dashboard')}
                className="w-full rounded-full bg-primary py-4 font-heading text-sm font-bold text-primary-foreground shadow-lg"
              >
                Go to dashboard →
              </button>
            )}
            <button
              onClick={() => router.push('/architect')}
              className="w-full rounded-2xl border-2 border-border bg-card py-3.5 font-heading text-sm font-bold text-foreground transition-colors hover:border-primary/40"
            >
              Generate new suggestions
            </button>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  )
}
