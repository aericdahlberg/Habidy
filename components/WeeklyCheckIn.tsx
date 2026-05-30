'use client'

import { useState } from 'react'
import { X } from 'lucide-react'

type Rating = 'too_easy' | 'just_right' | 'too_hard'

type LevelUpData = {
  habitId: string
  habitName: string
  habitCue: string | null
  identityLabel: string | null
}

type Props = {
  habitId: string
  habitName: string
  habitCue: string | null
  identityLabel: string | null
  streak: number
  onDismiss: () => void
  onLevelUp: (data: LevelUpData) => void
}

const RATINGS: { value: Rating; label: string; sub: string }[] = [
  { value: 'too_hard',  label: 'Too Hard',   sub: "I'm struggling" },
  { value: 'just_right', label: 'Just Right', sub: 'Good challenge' },
  { value: 'too_easy',  label: 'Too Easy',   sub: 'Ready for more' },
]

export default function WeeklyCheckIn({ habitId, habitName, habitCue, identityLabel, streak, onDismiss, onLevelUp }: Props) {
  const [submitting, setSubmitting] = useState(false)

  async function handleRate(rating: Rating) {
    if (submitting) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/habits/${habitId}/difficulty-feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating }),
      })
      const data = await res.json() as { action?: string }
      if (res.ok && data.action === 'level_up') {
        onLevelUp({ habitId, habitName, habitCue, identityLabel })
      } else {
        onDismiss()
      }
    } catch {
      onDismiss()
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end">
      <div className="absolute inset-0 bg-black/30" onClick={onDismiss} />
      <div className="relative w-full rounded-t-3xl bg-white px-5 pt-5 pb-10 shadow-xl">
        <div className="mx-auto h-1 w-10 rounded-full bg-border mb-4" />

        <button
          onClick={onDismiss}
          className="absolute right-5 top-5 rounded-full p-1.5 text-muted-foreground hover:bg-muted"
        >
          <X size={16} />
        </button>

        <p className="font-heading text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
          {streak}-day check-in
        </p>
        <h2 className="font-heading text-base font-bold text-foreground mb-4">
          How is <span className="text-primary">{habitName}</span> feeling?
        </h2>

        <div className="flex gap-2">
          {RATINGS.map(({ value, label, sub }) => (
            <button
              key={value}
              onClick={() => void handleRate(value)}
              disabled={submitting}
              className="flex flex-1 flex-col items-center gap-1 rounded-2xl border border-border bg-muted/40 py-4 transition-colors hover:border-primary/40 hover:bg-primary/5 disabled:opacity-50"
            >
              <span className="font-heading text-sm font-bold text-foreground">{label}</span>
              <span className="font-body text-xs text-muted-foreground">{sub}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}