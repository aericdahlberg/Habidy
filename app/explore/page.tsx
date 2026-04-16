"use client"

import { useState, useEffect, useRef } from 'react'
import NavBar from '@/components/NavBar'
import { supabase } from '@/lib/supabase'

type Reflection = {
  id: string
  content: string
  created_at: string
}

function timeAgo(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

export default function ExplorePage() {
  const [userId, setUserId] = useState<string | null>(null)
  const [reflections, setReflections] = useState<Reflection[]>([])
  const [input, setInput] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [confirmed, setConfirmed] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Load user + past reflections on mount
  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUserId(user.id)

      const { data } = await supabase
        .from('user_reflections')
        .select('id, content, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (data) setReflections(data)
    }
    load()
  }, [])

  // Auto-grow textarea
  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [input])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!input.trim() || !userId || submitting) return

    setSubmitting(true)
    setConfirmed(false)

    try {
      const res = await fetch('/api/explore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, content: input.trim() }),
      })

      if (!res.ok) return

      const { reflection } = await res.json() as { reflection: Reflection; summary: string }

      setReflections((prev) => [reflection, ...prev])
      setInput('')
      setConfirmed(true)
      setTimeout(() => setConfirmed(false), 4000)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-zinc-50 pb-24">
      {/* Header */}
      <div className="bg-white px-5 pt-12 pb-6">
        <div className="mx-auto max-w-sm">
          <h1 className="text-2xl font-semibold text-zinc-900">Explore</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Reflect on how you work, live, and want to grow.
          </p>
        </div>
      </div>

      <div className="mx-auto w-full max-w-sm flex-1 px-4 pt-4 space-y-4">
        {/* Input card */}
        <div className="rounded-3xl bg-white border border-zinc-100 px-5 py-5">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSubmit(e as unknown as React.FormEvent)
              }}
              placeholder="What's on your mind about how you work, live, or want to grow?"
              rows={3}
              disabled={submitting}
              className="w-full resize-none bg-transparent text-sm leading-relaxed text-zinc-900 placeholder-zinc-400 outline-none disabled:opacity-50"
            />
            <div className="flex items-center justify-between">
              <span className="text-xs text-zinc-400">
                {input.length > 0 && `${input.length} chars · ⌘↵ to submit`}
              </span>
              <button
                type="submit"
                disabled={!input.trim() || submitting}
                className="rounded-xl bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-opacity disabled:opacity-30"
              >
                {submitting ? 'Saving...' : 'Submit'}
              </button>
            </div>
          </form>
        </div>

        {/* Confirmation */}
        {confirmed && (
          <div className="rounded-2xl bg-zinc-900 px-5 py-4 text-sm text-white">
            Got it — this will shape your future habits.
          </div>
        )}

        {/* Past reflections */}
        {reflections.length > 0 && (
          <div className="flex flex-col gap-3">
            <p className="px-1 text-xs font-medium uppercase tracking-wide text-zinc-400">
              Past reflections
            </p>
            {reflections.map((r) => (
              <div
                key={r.id}
                className="rounded-2xl bg-white border border-zinc-100 px-5 py-4"
              >
                <p className="text-sm leading-relaxed text-zinc-800">{r.content}</p>
                <p className="mt-2 text-xs text-zinc-400">{timeAgo(r.created_at)}</p>
              </div>
            ))}
          </div>
        )}

        {reflections.length === 0 && !submitting && (
          <div className="rounded-2xl border border-dashed border-zinc-200 px-6 py-10 text-center">
            <p className="text-sm text-zinc-400">
              Your reflections will appear here. The more you share, the better your habits will fit who you actually are.
            </p>
          </div>
        )}
      </div>

      <NavBar />
    </div>
  )
}
