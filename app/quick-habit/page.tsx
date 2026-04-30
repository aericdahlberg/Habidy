'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { HabitSuggestionResponse } from '@/components/ChatInterface'

const MAX_CHARS = 200

export default function QuickHabitPage() {
  const router = useRouter()
  const [habit, setHabit] = useState('')
  const [cue, setCue] = useState('')
  const [location, setLocation] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit() {
    if (!habit.trim() || loading) return
    setLoading(true)
    setError('')

    // Persist to sessionStorage so Architect page can read if needed
    sessionStorage.setItem('habidy_quick_habit', habit.trim())
    sessionStorage.setItem('habidy_quick_cue', cue.trim())
    sessionStorage.setItem('habidy_quick_location', location.trim())

    try {
      const { data: { user } } = await supabase.auth.getUser()

      const res = await fetch('/api/agents/architect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user?.id,
          messages: [],
          autoGenerate: true,
          mode: 'quick',
          quickHabitData: {
            habit: habit.trim(),
            cue: cue.trim(),
            location: location.trim(),
          },
        }),
      })

      const data = await res.json() as {
        habitsReady?: HabitSuggestionResponse[]
        message?: string
        error?: string
      }

      if (!res.ok || data.error || !data.habitsReady?.length) {
        setError('Something went wrong building your habit. Try again.')
        setLoading(false)
        return
      }

      // Store pre-generated habits so Architect page skips auto-generate
      sessionStorage.setItem('habidy_pregenerated_habits', JSON.stringify(data.habitsReady))
      sessionStorage.setItem('habidy_pregenerated_message', data.message ?? '')
      router.push('/architect')
    } catch {
      setError('Could not connect. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-teal-50 to-white">
      {/* Header */}
      <header className="flex items-center gap-3 border-b border-border bg-card/80 px-5 pt-12 pb-4 backdrop-blur-sm">
        <button onClick={() => router.back()} className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground hover:bg-muted">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="font-heading text-lg font-extrabold text-foreground">Quick Habit</h1>
          <p className="font-body text-xs text-muted-foreground">Tell us what you have in mind</p>
        </div>
      </header>

      <div className="mx-auto w-full max-w-lg flex-1 px-5 py-6">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <h2 className="font-heading text-xl font-extrabold text-foreground">
            What habit do you want to build?
          </h2>
          <p className="mt-1 font-body text-sm text-muted-foreground">
            Be as specific as you can — the more detail you give, the better we can help.
          </p>
        </motion.div>

        <div className="mt-6 space-y-5">
          {/* Field 1 — required */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <label className="mb-1.5 block font-body text-sm font-semibold text-foreground">
              What's the habit? <span className="text-destructive">*</span>
            </label>
            <textarea
              value={habit}
              onChange={(e) => setHabit(e.target.value.slice(0, MAX_CHARS))}
              placeholder="e.g. Read 10 minutes before bed, drink 6 glasses of water a day, go for a 10 minute morning walk"
              rows={3}
              className="w-full resize-none rounded-2xl border border-border bg-white px-4 py-3 font-body text-sm text-foreground placeholder:text-muted-foreground/60 outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10 transition-all"
            />
            <p className="mt-1 text-right font-body text-[10px] text-muted-foreground/60">
              {habit.length}/{MAX_CHARS}
            </p>
          </motion.div>

          {/* Field 2 */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.18 }}
          >
            <label className="mb-1.5 block font-body text-sm font-semibold text-foreground">
              When would you do it? <span className="font-normal text-muted-foreground">(optional)</span>
            </label>
            <input
              type="text"
              value={cue}
              onChange={(e) => setCue(e.target.value.slice(0, MAX_CHARS))}
              placeholder="e.g. After my morning coffee, before I open my phone in the morning"
              className="w-full rounded-2xl border border-border bg-white px-4 py-3 font-body text-sm text-foreground placeholder:text-muted-foreground/60 outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10 transition-all"
            />
            <p className="mt-1 text-right font-body text-[10px] text-muted-foreground/60">
              {cue.length}/{MAX_CHARS}
            </p>
          </motion.div>

          {/* Field 3 */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.26 }}
          >
            <label className="mb-1.5 block font-body text-sm font-semibold text-foreground">
              Where? <span className="font-normal text-muted-foreground">(optional)</span>
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value.slice(0, MAX_CHARS))}
              placeholder="e.g. At my desk, in bed, at the gym"
              className="w-full rounded-2xl border border-border bg-white px-4 py-3 font-body text-sm text-foreground placeholder:text-muted-foreground/60 outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10 transition-all"
            />
            <p className="mt-1 text-right font-body text-[10px] text-muted-foreground/60">
              {location.length}/{MAX_CHARS}
            </p>
          </motion.div>
        </div>

        <AnimatePresence>
          {error && (
            <motion.p
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mt-4 rounded-2xl border border-destructive/30 bg-white px-4 py-3 text-center font-body text-sm text-destructive"
            >
              {error}
            </motion.p>
          )}
        </AnimatePresence>

        <motion.button
          onClick={handleSubmit}
          disabled={!habit.trim() || loading}
          whileTap={{ scale: 0.98 }}
          className="mt-6 w-full rounded-full bg-primary py-4 font-heading text-lg font-bold text-primary-foreground shadow-lg transition-opacity disabled:opacity-40"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.34 }}
        >
          {loading ? 'Building your habit…' : 'Build my habit →'}
        </motion.button>

        {loading && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-4 text-center font-body text-sm text-muted-foreground"
          >
            Designing 5 habit options tailored to you…
          </motion.p>
        )}
      </div>
    </div>
  )
}
