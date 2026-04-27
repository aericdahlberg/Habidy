'use client'

import { useEffect, useState } from 'react'
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

  function handleHandoff() {
    router.push('/architect')
  }

  return (
    <div className="flex h-screen flex-col bg-gradient-to-b from-teal-50 to-white">
      {/* Header — Lovable Coach style */}
      <header className="flex shrink-0 items-center gap-3 border-b border-border bg-card/80 px-5 pt-12 pb-4 backdrop-blur-sm">
        <img src="/mascot.png" alt="Coach" className="h-10 w-10 rounded-full object-contain" />
        <div>
          <h1 className="font-heading text-lg font-extrabold text-foreground">Identity Gatherer</h1>
          <p className="font-body text-xs text-muted-foreground">Your habit investigator</p>
        </div>
      </header>

      {/* Chat — existing agent logic untouched */}
      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col overflow-hidden">
        <ChatInterface
          agentEndpoint="/api/agents/constellation"
          userId={userId}
          onHandoff={handleHandoff}
          handoffLabel="Build my habit →"
        />
      </div>

      <div className="h-16 shrink-0" />
      <BottomNav />
    </div>
  )
}
