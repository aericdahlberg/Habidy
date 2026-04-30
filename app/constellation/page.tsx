'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import BottomNav from '@/components/BottomNav'
import ChatInterface from '@/components/ChatInterface'
import { supabase } from '@/lib/supabase'

const MODE_CONFIG = {
  quick:   { maxTurns: 5,  label: 'Quick',    subtitle: 'Your habit coach' },
  guided:  { maxTurns: 5,  label: 'Guided',   subtitle: '5 questions' },
  deep:    { maxTurns: 15, label: 'Deep dive', subtitle: '15 questions' },
  default: { maxTurns: 5,  label: 'Identity Gatherer', subtitle: 'Your habit investigator' },
} as const

type Mode = keyof typeof MODE_CONFIG

export default function IdentityGathererPage() {
  const router = useRouter()
  const [userId, setUserId] = useState<string | undefined>(undefined)
  const [mode, setMode] = useState<Mode>('default')
  const [turnInfo, setTurnInfo] = useState<{ used: number; remaining: number } | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUserId(user.id)
    })
    const stored = sessionStorage.getItem('habidy_mode') as Mode | null
    if (stored && stored in MODE_CONFIG) setMode(stored)
  }, [])

  const onboardingFallback = useMemo(() => {
    if (typeof window === 'undefined') return undefined
    const questionnaire = JSON.parse(sessionStorage.getItem('habidy_questionnaire') ?? '{}')
    return {
      identity: sessionStorage.getItem('habidy_identity') ?? undefined,
      goalCategory: sessionStorage.getItem('habidy_goal_category') ?? undefined,
      frictionPoint: sessionStorage.getItem('habidy_friction_point') ?? undefined,
      timeAvailable: sessionStorage.getItem('habidy_time_available') ?? undefined,
      displayName: sessionStorage.getItem('habidy_display_name') ?? undefined,
      stickTime: questionnaire.stickTime ?? undefined,
      sleep: questionnaire.sleep ?? undefined,
      stress: questionnaire.stress ?? undefined,
      anchorHabits: questionnaire.anchorHabits ?? undefined,
      wastedTime: questionnaire.wastedTime ?? undefined,
      location: questionnaire.location ?? undefined,
      goalClarity: questionnaire.goalClarity ?? undefined,
      allBlockers: Array.isArray(questionnaire.blockers) ? questionnaire.blockers : undefined,
    }
  }, [])

  const cfg = MODE_CONFIG[mode]
  const maxTurns = cfg.maxTurns

  // Question progress label shown in header
  const questionLabel = useMemo(() => {
    if (!turnInfo) return null
    if (mode === 'default') return null
    const current = Math.min(turnInfo.used + 1, maxTurns)
    return `Question ${current} of ${maxTurns}`
  }, [turnInfo, mode, maxTurns])

  // Warning: last 2 questions
  const nearingEnd = turnInfo !== null && turnInfo.remaining <= 2 && turnInfo.remaining > 0

  function handleHandoff() {
    router.push('/architect')
  }

  return (
    <div className="flex h-screen flex-col bg-gradient-to-b from-teal-50 to-white">
      <header className="flex shrink-0 items-center gap-3 border-b border-border bg-card/80 px-5 pt-12 pb-4 backdrop-blur-sm">
        <img src="/mascot.png" alt="Coach" className="h-10 w-10 rounded-full object-contain" />
        <div className="flex-1 min-w-0">
          <h1 className="font-heading text-lg font-extrabold text-foreground">Identity Gatherer</h1>
          <p className="font-body text-xs text-muted-foreground">{cfg.subtitle}</p>
        </div>

        {/* Turn counter pill */}
        {questionLabel && (
          <span className={`shrink-0 rounded-full px-3 py-1 font-body text-xs font-semibold transition-colors ${
            nearingEnd
              ? 'bg-amber-100 text-amber-700'
              : 'bg-muted text-muted-foreground'
          }`}>
            {questionLabel}
          </span>
        )}
      </header>

      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col overflow-hidden">
        <ChatInterface
          agentEndpoint="/api/agents/constellation"
          userId={userId}
          onHandoff={handleHandoff}
          handoffLabel="Build my habit →"
          maxTurns={maxTurns}
          onTurnsChange={(used, remaining) => setTurnInfo({ used, remaining })}
          extraPayload={onboardingFallback ? { onboardingFallback, mode } : { mode }}
        />
      </div>

      <div className="h-16 shrink-0" />
      <BottomNav />
    </div>
  )
}
