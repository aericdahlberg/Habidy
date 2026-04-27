'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { Search, MessageCircle } from 'lucide-react'
import BottomNav from '@/components/BottomNav'
import { supabase } from '@/lib/supabase'

const CATEGORIES = [
  { id: 'exercise', name: 'Exercise', emoji: '🏋️', color: 'bg-primary/15 border-primary/30' },
  { id: 'finance', name: 'Finance', emoji: '💰', color: 'bg-secondary/15 border-secondary/30' },
  { id: 'dating', name: 'Dating', emoji: '💬', color: 'bg-accent/15 border-accent/30' },
  { id: 'outdoor', name: 'Outdoor', emoji: '🌿', color: 'bg-primary/15 border-primary/30' },
  { id: 'productivity', name: 'Productivity', emoji: '🧠', color: 'bg-secondary/15 border-secondary/30' },
  { id: 'mindfulness', name: 'Mindfulness', emoji: '🧘', color: 'bg-accent/15 border-accent/30' },
]

interface BubbleState {
  id: string
  x: number
  y: number
  vx: number
  vy: number
}

const BUBBLE_SIZE = 100
const SPEED = 0.6

export default function ExplorePage() {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [userId, setUserId] = useState<string | null>(null)
  const [reflection, setReflection] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [confirmed, setConfirmed] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const [bubbles, setBubbles] = useState<BubbleState[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const animRef = useRef<number>(0)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUserId(user.id)
    })
  }, [])

  useEffect(() => {
    const w = containerRef.current?.clientWidth || 320
    const h = containerRef.current?.clientHeight || 400
    const initial = CATEGORIES.map((cat) => ({
      id: cat.id,
      x: Math.random() * (w - BUBBLE_SIZE),
      y: Math.random() * (h - BUBBLE_SIZE),
      vx: (Math.random() - 0.5) * SPEED * 2,
      vy: (Math.random() - 0.5) * SPEED * 2,
    }))
    setBubbles(initial)
  }, [])

  const animate = useCallback(() => {
    setBubbles((prev) => {
      const w = containerRef.current?.clientWidth || 320
      const h = containerRef.current?.clientHeight || 400
      return prev.map((b) => {
        let { x, y, vx, vy } = b
        x += vx
        y += vy
        if (x <= 0 || x >= w - BUBBLE_SIZE) vx = -vx
        if (y <= 0 || y >= h - BUBBLE_SIZE) vy = -vy
        x = Math.max(0, Math.min(w - BUBBLE_SIZE, x))
        y = Math.max(0, Math.min(h - BUBBLE_SIZE, y))
        return { ...b, x, y, vx, vy }
      })
    })
    animRef.current = requestAnimationFrame(animate)
  }, [])

  useEffect(() => {
    animRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(animRef.current)
  }, [animate])

  async function handleReflectionSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!reflection.trim() || !userId || submitting) return
    setSubmitting(true)
    try {
      await fetch('/api/explore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, content: reflection.trim() }),
      })
      setReflection('')
      setConfirmed(true)
      setTimeout(() => setConfirmed(false), 4000)
    } finally {
      setSubmitting(false)
    }
  }

  const filtered = search
    ? CATEGORIES.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()))
    : CATEGORIES

  return (
    <div className="flex min-h-screen flex-col bg-background pb-24">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-border bg-card/95 px-5 pt-12 pb-4 backdrop-blur-md">
        <h1 className="font-heading text-2xl font-extrabold text-foreground mb-3">Explore</h1>
        <div className="relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search habit categories…"
            className="w-full rounded-full border border-border bg-background py-2.5 pl-10 pr-4 font-body text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </header>

      {/* Floating bubble categories */}
      <div
        ref={containerRef}
        className="relative mx-5 mt-4 min-h-[320px] flex-1 overflow-hidden rounded-3xl border border-border bg-card/50"
        style={{ height: '320px' }}
      >
        {filtered.map((cat) => {
          const bubble = bubbles.find((b) => b.id === cat.id)
          if (!bubble) return null
          return (
            <motion.button
              key={cat.id}
              onClick={() => setSelectedCategory(selectedCategory === cat.id ? null : cat.id)}
              className={`absolute flex flex-col items-center justify-center rounded-full border-2 ${cat.color} transition-shadow hover:shadow-lg`}
              style={{ width: BUBBLE_SIZE, height: BUBBLE_SIZE, left: bubble.x, top: bubble.y }}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
            >
              <span className="text-2xl">{cat.emoji}</span>
              <span className="font-heading text-[11px] font-bold text-foreground mt-1">{cat.name}</span>
            </motion.button>
          )
        })}
      </div>

      {/* Selected category detail + Talk to agent CTA */}
      {selectedCategory && (() => {
        const cat = CATEGORIES.find((c) => c.id === selectedCategory)
        if (!cat) return null
        return (
          <motion.section
            className="mx-5 mt-4"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="rounded-2xl border border-border bg-card p-5">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-3xl">{cat.emoji}</span>
                <h2 className="font-heading text-xl font-extrabold text-foreground">{cat.name}</h2>
              </div>
              <p className="font-body text-sm text-muted-foreground mb-4">
                Explore {cat.name.toLowerCase()} habits or talk to your coach to build something that fits your life.
              </p>
              <button
                onClick={() => router.push('/constellation')}
                className="flex w-full items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 font-heading text-sm font-bold text-primary-foreground shadow-lg transition-transform hover:scale-105 active:scale-95"
              >
                <MessageCircle size={16} />
                Talk to your coach about {cat.name.toLowerCase()}
              </button>
            </div>
          </motion.section>
        )
      })()}

      {/* Reflection input — feeds /api/explore */}
      <section className="mx-5 mt-4">
        <div className="rounded-2xl border border-border bg-card p-5">
          <h3 className="font-heading text-sm font-bold text-foreground mb-2">Share a reflection</h3>
          <form onSubmit={handleReflectionSubmit} className="flex flex-col gap-3">
            <textarea
              value={reflection}
              onChange={(e) => setReflection(e.target.value)}
              placeholder="What's on your mind about how you work, live, or want to grow?"
              rows={3}
              disabled={submitting}
              className="w-full resize-none rounded-xl border border-border bg-background px-4 py-3 font-body text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
            />
            <div className="flex items-center justify-between">
              <span className="font-body text-xs text-muted-foreground">
                {reflection.length > 0 && `${reflection.length} chars`}
              </span>
              <button
                type="submit"
                disabled={!reflection.trim() || submitting || !userId}
                className="rounded-full bg-primary px-5 py-2 font-heading text-sm font-bold text-primary-foreground disabled:opacity-30"
              >
                {submitting ? 'Saving…' : 'Submit'}
              </button>
            </div>
          </form>
          {confirmed && (
            <motion.p
              className="mt-2 font-body text-xs font-semibold text-primary"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              Got it — this will shape your future habits.
            </motion.p>
          )}
        </div>
      </section>

      <BottomNav />
    </div>
  )
}
