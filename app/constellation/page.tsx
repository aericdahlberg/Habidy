'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import BottomNav from '@/components/BottomNav'
import ChatInterface from '@/components/ChatInterface'
import { supabase } from '@/lib/supabase'

export default function IdentityGathererPage() {
  const router = useRouter()
  const [userId, setUserId] = useState<string | undefined>(undefined)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUserId(user.id)
    })
  }, [])

  // Read persistent onboarding keys (saved by loading page, NOT cleared)
  // These are the DB fallback — the API uses DB as primary source,
  // these as a fallback in case the upsert raced with this request.
  const onboardingFallback = useMemo(() => {
    if (typeof window === 'undefined') return undefined
    const questionnaire = JSON.parse(sessionStorage.getItem('habidy_questionnaire') ?? '{}')
    return {
      identity: sessionStorage.getItem('habidy_identity') ?? undefined,
      goalCategory: sessionStorage.getItem('habidy_goal_category') ?? undefined,
      frictionPoint: sessionStorage.getItem('habidy_friction_point') ?? undefined,
      timeAvailable: sessionStorage.getItem('habidy_time_available') ?? undefined,
      displayName: sessionStorage.getItem('habidy_display_name') ?? undefined,
      // Rich questionnaire context — not saved in DB columns but useful for prompts
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

  function handleHandoff() {
    router.push('/architect')
  }

  return (
    <div className="flex h-screen flex-col bg-gradient-to-b from-teal-50 to-white">
      <header className="flex shrink-0 items-center gap-3 border-b border-border bg-card/80 px-5 pt-12 pb-4 backdrop-blur-sm">
        <img src="/mascot.png" alt="Coach" className="h-10 w-10 rounded-full object-contain" />
        <div>
          <h1 className="font-heading text-lg font-extrabold text-foreground">Identity Gatherer</h1>
          <p className="font-body text-xs text-muted-foreground">Your habit investigator</p>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col overflow-hidden">
        <ChatInterface
          agentEndpoint="/api/agents/constellation"
          userId={userId}
          onHandoff={handleHandoff}
          handoffLabel="Build my habit →"
          extraPayload={onboardingFallback ? { onboardingFallback } : undefined}
        />
      </div>

      <div className="h-16 shrink-0" />
      <BottomNav />
    </div>
  )
}
