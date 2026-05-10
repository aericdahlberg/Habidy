'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import ChatInterface from '@/components/ChatInterface'
import BottomNav from '@/components/BottomNav'
import type { CoachProposal } from '@/lib/agents/coach'

export default function CoachPage() {
  const router = useRouter()
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [proposals, setProposals] = useState<CoachProposal[] | null>(null)
  const [applying, setApplying] = useState(false)
  const [applied, setApplied] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.replace('/login'); return }
      setUserId(user.id)
      setLoading(false)
    })
  }, [router])

  async function applyProposals() {
    if (!userId || !proposals) return
    setApplying(true)
    try {
      const res = await fetch('/api/agents/coach/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, proposals }),
      })
      if (!res.ok) throw new Error('Apply failed')
      setApplied(true)
      setTimeout(() => router.push('/dashboard'), 1500)
    } catch {
      setApplying(false)
    }
  }

  function handleProposalsReady(raw: Record<string, unknown>[]) {
    setProposals(raw as CoachProposal[])
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="font-body text-sm text-muted-foreground">Loading…</p>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-secondary/5 to-background pb-24">
      <header className="px-6 pt-14 pb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-card border border-border text-muted-foreground transition-colors hover:text-foreground"
            aria-label="Go back"
          >
            ←
          </button>
          <div>
            <h1 className="font-heading text-xl font-black text-foreground">Habit Coach</h1>
            <p className="font-body text-xs text-muted-foreground">Weekly review</p>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-hidden">
        {userId && (
          <ChatInterface
            agentEndpoint="/api/agents/coach"
            userId={userId}
            thinkingLabel="Reviewing your week…"
            maxTurns={12}
            onProposalsReady={handleProposalsReady}
          />
        )}
      </div>

      {/* Apply proposals bar */}
      <AnimatePresence>
        {proposals && !applied && (
          <motion.div
            className="fixed bottom-20 left-0 right-0 z-40 px-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
          >
            <button
              onClick={applyProposals}
              disabled={applying}
              className="w-full rounded-2xl bg-secondary py-4 font-heading text-sm font-bold text-white shadow-lg shadow-secondary/30 transition-opacity disabled:opacity-60"
            >
              {applying ? 'Applying changes…' : `Apply ${proposals.length} change${proposals.length === 1 ? '' : 's'} →`}
            </button>
          </motion.div>
        )}
        {applied && (
          <motion.div
            className="fixed bottom-20 left-0 right-0 z-40 px-6"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <div className="flex items-center justify-center gap-2 rounded-2xl bg-primary py-4 font-heading text-sm font-bold text-primary-foreground shadow-lg">
              <CheckCircle2 size={18} />
              Changes applied — heading back
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <BottomNav />
    </div>
  )
}
