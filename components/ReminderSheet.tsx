'use client'

import { useState } from 'react'
import { X } from 'lucide-react'

type ReminderSheetProps = {
  habitId: string
  habitName: string
  initialEnabled: boolean
  initialMinutesBefore: number[] | null   // null = using global default
  initialReminderTime: string | null       // null = using suggested_time from Architect
  onClose: () => void
  onSaved: (patch: { reminder_enabled: boolean; reminder_minutes_before: number[] | null; reminder_time: string | null }) => void
}

const TIME_OPTIONS = [
  { label: 'Morning',   value: 'morning'   },
  { label: 'Midday',    value: 'midday'    },
  { label: 'Afternoon', value: 'afternoon' },
  { label: 'Evening',   value: 'evening'   },
  { label: 'Late night',value: 'late_night'},
]

const MINUTE_OPTIONS = [
  { label: '30 min', value: 30 },
  { label: '15 min', value: 15 },
  { label: '5 min',  value: 5  },
  { label: 'At start',value: 0 },
]

export default function ReminderSheet({
  habitId,
  habitName,
  initialEnabled,
  initialMinutesBefore,
  initialReminderTime,
  onClose,
  onSaved,
}: ReminderSheetProps) {
  const [enabled, setEnabled] = useState(initialEnabled)
  const [minutes, setMinutes] = useState<number[] | null>(initialMinutesBefore)
  const [reminderTime, setReminderTime] = useState<string | null>(initialReminderTime)
  const [saving, setSaving] = useState(false)

  function toggleMinute(val: number) {
    const current = minutes ?? []
    const next = current.includes(val)
      ? current.filter((m) => m !== val)
      : [...current, val].sort((a, b) => b - a)
    setMinutes(next.length === 0 ? null : next)
  }

  async function handleSave() {
    setSaving(true)
    try {
      await fetch(`/api/calendar/habits/${habitId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reminder_enabled: enabled,
          reminder_minutes_before: minutes,
          reminder_time: reminderTime,
        }),
      })
      onSaved({ reminder_enabled: enabled, reminder_minutes_before: minutes, reminder_time: reminderTime })
      onClose()
    } finally {
      setSaving(false)
    }
  }

  async function handleUseDefaults() {
    setSaving(true)
    try {
      await fetch(`/api/calendar/habits/${habitId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reminder_enabled: true, reminder_minutes_before: null, reminder_time: null }),
      })
      onSaved({ reminder_enabled: true, reminder_minutes_before: null, reminder_time: null })
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative z-10 w-full rounded-t-3xl bg-white px-5 pb-10 pt-4 shadow-xl">
        {/* Handle */}
        <div className="mx-auto mb-4 h-1 w-12 rounded-full bg-border" />

        <div className="flex items-center justify-between mb-4">
          <h3 className="font-heading text-base font-bold text-foreground">
            Reminders for &ldquo;{habitName}&rdquo;
          </h3>
          <button onClick={onClose} className="text-muted-foreground"><X size={18} /></button>
        </div>

        {/* Enabled toggle */}
        <div className="flex items-center justify-between gap-3 py-2">
          <div className="font-body text-sm font-semibold text-foreground">Reminders enabled</div>
          <button
            onClick={() => setEnabled((v) => !v)}
            className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${enabled ? 'bg-primary' : 'bg-muted-foreground/30'}`}
          >
            <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${enabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
          </button>
        </div>

        {enabled && (
          <>
            {/* Time of day */}
            <div className="mt-4">
              <div className="mb-2 font-body text-xs font-medium uppercase tracking-wide text-muted-foreground">Time of day</div>
              <div className="flex flex-wrap gap-2">
                {TIME_OPTIONS.map(({ label, value }) => (
                  <button
                    key={value}
                    onClick={() => setReminderTime((v) => v === value ? null : value)}
                    className={`rounded-full border px-3 py-1 font-body text-xs font-semibold transition-colors ${reminderTime === value ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-muted/50 text-muted-foreground'}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              {!reminderTime && (
                <p className="mt-1 font-body text-[10px] text-muted-foreground">Using Architect suggestion</p>
              )}
            </div>

            {/* Remind me chips */}
            <div className="mt-4">
              <div className="mb-2 font-body text-xs font-medium uppercase tracking-wide text-muted-foreground">Remind me</div>
              <div className="flex flex-wrap gap-2">
                {MINUTE_OPTIONS.map(({ label, value }) => {
                  const active = (minutes ?? []).includes(value)
                  return (
                    <button
                      key={value}
                      onClick={() => toggleMinute(value)}
                      className={`rounded-full border px-3 py-1 font-body text-xs font-semibold transition-colors ${active ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-muted/50 text-muted-foreground'}`}
                    >
                      {label}
                    </button>
                  )
                })}
              </div>
              {!minutes && (
                <p className="mt-1 font-body text-[10px] text-muted-foreground">Using global defaults from Profile</p>
              )}
            </div>
          </>
        )}

        <div className="mt-6 flex gap-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 rounded-full bg-primary py-3 font-heading text-sm font-bold text-primary-foreground disabled:opacity-60"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
          <button
            onClick={handleUseDefaults}
            disabled={saving}
            className="flex-1 rounded-full border border-border bg-card py-3 font-heading text-sm font-bold text-muted-foreground disabled:opacity-60"
          >
            Use defaults
          </button>
        </div>
      </div>
    </div>
  )
}
