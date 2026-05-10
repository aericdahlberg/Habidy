'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Calendar, ChevronRight, Bell, Clock, RefreshCw } from 'lucide-react'
import { supabase } from '@/lib/supabase'

const BENEFITS = [
  { icon: Clock, text: 'Habit times suggested around your real schedule' },
  { icon: Bell, text: 'One gentle reminder 5 min before each habit' },
  { icon: RefreshCw, text: 'Recurring — set once, never forget again' },
]

export default function OnboardingCalendarPage() {
  const router = useRouter()
  const [userId, setUserId] = useState<string | null>(null)
  const [connecting, setConnecting] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUserId(user.id)
    })
  }, [])

  function handleConnect() {
    setConnecting(true)
    window.location.href = '/api/auth/google?from=onboarding'
  }

  function handleSkip() {
    router.push('/onboarding/loading')
  }

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-teal-50 to-purple-50 px-6 py-10">
      <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">

          {/* Icon + heading */}
          <div className="flex flex-col items-center text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
              <Calendar size={36} className="text-primary" />
            </div>
            <h1 className="mt-5 font-heading text-2xl font-extrabold text-foreground">
              Connect your calendar
            </h1>
            <p className="mt-2 font-body text-sm leading-relaxed text-muted-foreground">
              Optional, but recommended. We use it to suggest habit times that fit your day and add quiet reminders.
            </p>
          </div>

          {/* Benefits */}
          <div className="rounded-2xl border border-border bg-white p-4 space-y-4">
            {BENEFITS.map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Icon size={17} />
                </div>
                <p className="font-body text-sm text-foreground">{text}</p>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="space-y-3">
            <button
              onClick={handleConnect}
              disabled={connecting || !userId}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-primary py-4 font-heading text-base font-bold text-primary-foreground shadow-lg disabled:opacity-60 active:scale-95 transition-transform"
            >
              <Calendar size={18} />
              {connecting ? 'Connecting…' : 'Connect Google Calendar'}
            </button>

            <button
              onClick={handleSkip}
              className="flex w-full items-center justify-center gap-1.5 py-3 font-body text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Skip for now <ChevronRight size={14} />
            </button>
          </div>

          <p className="text-center font-body text-[11px] text-muted-foreground">
            You can connect anytime from your profile. We only read and write habit events — nothing else.
          </p>
        </motion.div>
      </div>
    </div>
  )
}
