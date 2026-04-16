"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import NavBar from '@/components/NavBar'
import ChatInterface from '@/components/ChatInterface'
import { supabase } from '@/lib/supabase'

type HabitData = Record<string, string>

export default function ArchitectPage() {
  const router = useRouter()
  const [userId, setUserId] = useState<string | undefined>(undefined)
  const [habitData, setHabitData] = useState<HabitData | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUserId(user.id)
    })
  }, [])

  async function handleHabitReady(data: HabitData) {
    setHabitData(data)
  }

  async function saveHabit() {
    if (!habitData || saving) return
    setSaving(true)

    const stored = localStorage.getItem('habidy_onboarding')
    const onboarding = stored ? JSON.parse(stored) : {}

    try {
      const res = await fetch('/api/habits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          goal_category: onboarding.goal_category ?? null,
          ...habitData,
        }),
      })

      if (res.ok) {
        setSaved(true)
        // Store habit in localStorage for dashboard mock
        localStorage.setItem('habidy_active_habit', JSON.stringify({
          id: `local-${Date.now()}`,
          goal_category: onboarding.goal_category ?? 'Something else',
          ...habitData,
        }))
        setTimeout(() => router.push('/dashboard'), 1200)
      }
    } catch {
      // Continue anyway with local data
      localStorage.setItem('habidy_active_habit', JSON.stringify({
        id: `local-${Date.now()}`,
        goal_category: onboarding.goal_category ?? 'Something else',
        ...habitData,
      }))
      setSaved(true)
      setTimeout(() => router.push('/dashboard'), 1200)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex h-screen flex-col bg-white">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-zinc-100 px-4 py-4">
        <div className="mx-auto flex max-w-sm items-center justify-between">
          <div>
            <h1 className="text-base font-semibold text-zinc-900">Architect</h1>
            <p className="text-xs text-zinc-400">Building your habit</p>
          </div>
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-100 text-sm">
            🔨
          </div>
        </div>
      </div>

      {/* Chat */}
      <div className="mx-auto flex w-full max-w-sm flex-1 flex-col overflow-hidden">
        <ChatInterface
          agentEndpoint="/api/agents/architect"
          userId={userId}
          onHabitReady={handleHabitReady}
          initialMessage="Let's build a habit together. First — who do you want to be? Not what you want to do, but the identity behind it."
        />
      </div>

      {/* Save habit panel — appears when habit is ready */}
      {habitData && !saved && (
        <div className="flex-shrink-0 border-t border-zinc-100 bg-white px-4 py-4">
          <div className="mx-auto max-w-sm">
            <div className="mb-3 rounded-2xl bg-zinc-50 p-4 text-sm text-zinc-600">
              <p className="font-medium text-zinc-900">{habitData.name}</p>
              {habitData.cue && <p className="mt-1 text-zinc-500">{habitData.cue}</p>}
            </div>
            <button
              onClick={saveHabit}
              disabled={saving}
              className="w-full rounded-2xl bg-zinc-900 py-4 text-base font-medium text-white transition-opacity disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save this habit'}
            </button>
          </div>
        </div>
      )}

      {saved && (
        <div className="flex-shrink-0 border-t border-zinc-100 bg-white px-4 py-4">
          <div className="mx-auto max-w-sm rounded-2xl bg-zinc-900 px-6 py-4 text-center text-sm text-white">
            Habit saved. Heading to your dashboard...
          </div>
        </div>
      )}

      <div className="h-16 flex-shrink-0" />
      <NavBar />
    </div>
  )
}
