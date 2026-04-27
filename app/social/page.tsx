'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { UserPlus, Users, CheckCircle2, Circle, Clock, Send, Bell } from 'lucide-react'
import BottomNav from '@/components/BottomNav'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'

interface Friend {
  friendship_id: string
  friend_id: string
  display_name: string
  avatar_url: string | null
  habits_today: number
  completed_today: number
  logged_today: number
  completion_rate: number
}

interface PendingRequest {
  friendship_id: string
  user_id: string
  display_name: string
}

const COMMUNITIES = [
  { id: 'fitness',      name: 'Fitness Squad',   emoji: '💪', members: 2400 },
  { id: 'finance',      name: 'Money Mindset',    emoji: '💰', members: 1800 },
  { id: 'mindfulness',  name: 'Deep Calm',        emoji: '🧘', members: 950  },
  { id: 'productivity', name: 'Deep Focus',       emoji: '🧠', members: 3100 },
]

function initials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

function CompletionBadge({ completed, total }: { completed: number; total: number }) {
  if (total === 0) return <Circle size={20} className="text-muted-foreground/30" />
  if (completed === total) return <CheckCircle2 size={20} className="text-primary" />
  if (completed > 0) return (
    <div className="flex items-center gap-1">
      <Clock size={16} className="text-secondary" />
      <span className="font-heading text-xs font-bold text-secondary">{completed}/{total}</span>
    </div>
  )
  return <Circle size={20} className="text-muted-foreground/30" />
}

export default function SocialPage() {
  const [userId, setUserId] = useState<string | null>(null)
  const [friends, setFriends] = useState<Friend[]>([])
  const [pending, setPending] = useState<PendingRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [emailInput, setEmailInput] = useState('')
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState<string | null>(null)
  const [sendSuccess, setSendSuccess] = useState<string | null>(null)
  const [responding, setResponding] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return
        setUserId(user.id)

        const res = await fetch(`/api/social/friends?user_id=${user.id}`)
        const json = await res.json() as { friends: Friend[]; pending: PendingRequest[] }
        setFriends(json.friends ?? [])
        setPending(json.pending ?? [])
      } catch {
        // non-fatal
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  async function sendRequest() {
    if (!userId || !emailInput.trim() || sending) return
    setSending(true)
    setSendError(null)
    setSendSuccess(null)

    try {
      const res = await fetch('/api/social/friends/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, email: emailInput.trim() }),
      })
      const json = await res.json() as { error?: string; display_name?: string }

      if (!res.ok) {
        setSendError(json.error ?? 'Something went wrong')
      } else {
        setSendSuccess(`Request sent to ${json.display_name ?? emailInput}!`)
        setEmailInput('')
      }
    } finally {
      setSending(false)
    }
  }

  async function respond(friendshipId: string, action: 'accept' | 'decline') {
    if (!userId || responding) return
    setResponding(friendshipId)

    try {
      const res = await fetch('/api/social/friends/respond', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, friendship_id: friendshipId, action }),
      })

      if (res.ok) {
        setPending((prev) => prev.filter((p) => p.friendship_id !== friendshipId))

        if (action === 'accept') {
          // Refresh friends list to show new friend
          const freshen = await fetch(`/api/social/friends?user_id=${userId}`)
          const json = await freshen.json() as { friends: Friend[] }
          setFriends(json.friends ?? [])
        }
      }
    } finally {
      setResponding(null)
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-background pb-24">
      {/* Header */}
      <header className="px-5 pt-12 pb-2">
        <motion.h1
          className="font-heading text-3xl font-extrabold text-foreground"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          Social
        </motion.h1>
        <p className="mt-1 font-body text-sm text-muted-foreground">Stay accountable together</p>
      </header>

      {/* Pending friend requests */}
      <AnimatePresence>
        {pending.length > 0 && (
          <motion.section
            className="px-5 pt-5"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            <h2 className="font-heading text-lg font-bold text-foreground flex items-center gap-2">
              <Bell size={18} className="text-accent" />
              Friend Requests
              <span className="ml-1 rounded-full bg-accent px-2 py-0.5 font-heading text-xs font-black text-accent-foreground">
                {pending.length}
              </span>
            </h2>
            <div className="mt-3 space-y-2.5">
              {pending.map((req, i) => (
                <motion.div
                  key={req.friendship_id}
                  className="flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3"
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 12 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-accent to-accent/60 font-heading text-sm font-black text-accent-foreground">
                    {initials(req.display_name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-body text-sm font-semibold text-foreground truncate">{req.display_name}</p>
                    <p className="font-body text-xs text-muted-foreground">wants to be accountability partners</p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => respond(req.friendship_id, 'accept')}
                      disabled={responding === req.friendship_id}
                      className="rounded-full bg-primary px-3 py-1.5 font-heading text-xs font-bold text-primary-foreground disabled:opacity-50"
                    >
                      Accept
                    </button>
                    <button
                      onClick={() => respond(req.friendship_id, 'decline')}
                      disabled={responding === req.friendship_id}
                      className="rounded-full border border-border px-3 py-1.5 font-heading text-xs font-bold text-muted-foreground hover:bg-muted disabled:opacity-50"
                    >
                      Decline
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      {/* Friends Activity */}
      <section className="px-5 pt-5">
        <h2 className="font-heading text-lg font-bold text-foreground flex items-center gap-2">
          <Users size={18} className="text-primary" /> Friends Activity
        </h2>

        {loading ? (
          <div className="mt-3 space-y-2.5">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-16 rounded-2xl border border-border bg-card animate-pulse" />
            ))}
          </div>
        ) : friends.length === 0 ? (
          <motion.div
            className="mt-3 rounded-2xl border border-dashed border-border bg-card/50 px-6 py-8 text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <p className="text-2xl mb-2">👋</p>
            <p className="font-heading text-sm font-bold text-foreground">No friends yet</p>
            <p className="font-body text-xs text-muted-foreground mt-1">
              Add friends below to see how they&apos;re doing on their habits
            </p>
          </motion.div>
        ) : (
          <div className="mt-3 space-y-2.5">
            {friends.map((friend, i) => (
              <motion.div
                key={friend.friend_id}
                className="flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3"
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.06 }}
              >
                {friend.avatar_url ? (
                  <img
                    src={friend.avatar_url}
                    alt={friend.display_name}
                    className="h-10 w-10 rounded-full object-cover"
                  />
                ) : (
                  <div className={cn(
                    'flex h-10 w-10 shrink-0 items-center justify-center rounded-full font-heading text-sm font-black text-primary-foreground',
                    'bg-gradient-to-br from-primary to-primary/60'
                  )}>
                    {initials(friend.display_name)}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-body text-sm font-semibold text-foreground truncate">
                    {friend.display_name}
                  </p>
                  {friend.habits_today === 0 ? (
                    <p className="font-body text-xs text-muted-foreground">No habits set yet</p>
                  ) : (
                    <p className="font-body text-xs text-muted-foreground">
                      {friend.completed_today}/{friend.habits_today} habits today
                    </p>
                  )}
                </div>

                {/* Progress mini-bar */}
                {friend.habits_today > 0 && (
                  <div className="mr-2 hidden sm:flex flex-col items-end gap-1">
                    <div className="h-1.5 w-16 rounded-full bg-muted overflow-hidden">
                      <div
                        className={cn(
                          'h-full rounded-full transition-all',
                          friend.completion_rate === 1 ? 'bg-primary' :
                          friend.completion_rate > 0 ? 'bg-secondary' : 'bg-muted-foreground/20'
                        )}
                        style={{ width: `${Math.round(friend.completion_rate * 100)}%` }}
                      />
                    </div>
                  </div>
                )}

                <CompletionBadge completed={friend.completed_today} total={friend.habits_today} />
              </motion.div>
            ))}
          </div>
        )}
      </section>

      {/* Add a friend */}
      <section className="px-5 pt-6">
        <h2 className="font-heading text-lg font-bold text-foreground flex items-center gap-2">
          <UserPlus size={18} className="text-accent" /> Add a Friend
        </h2>
        <motion.div
          className="mt-3 rounded-2xl border border-border bg-card p-4"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <p className="font-body text-xs text-muted-foreground mb-3">
            Enter their Habidy email to send a request
          </p>
          <div className="flex gap-2">
            <input
              type="email"
              value={emailInput}
              onChange={(e) => { setEmailInput(e.target.value); setSendError(null); setSendSuccess(null) }}
              onKeyDown={(e) => e.key === 'Enter' && void sendRequest()}
              placeholder="friend@email.com"
              className="flex-1 rounded-xl border border-border bg-background px-4 py-2.5 font-body text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <button
              onClick={() => void sendRequest()}
              disabled={!emailInput.trim() || sending}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground disabled:opacity-40"
            >
              <Send size={16} />
            </button>
          </div>
          <AnimatePresence>
            {sendError && (
              <motion.p
                className="mt-2 font-body text-xs text-destructive"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              >
                {sendError}
              </motion.p>
            )}
            {sendSuccess && (
              <motion.p
                className="mt-2 font-body text-xs font-semibold text-primary"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              >
                {sendSuccess}
              </motion.p>
            )}
          </AnimatePresence>
        </motion.div>
      </section>

      {/* Communities — cosmetic, coming soon */}
      <section className="px-5 pt-6">
        <h2 className="font-heading text-lg font-bold text-foreground">Communities</h2>
        <p className="mt-1 font-body text-xs text-muted-foreground">Coming soon</p>
        <div className="mt-3 grid grid-cols-2 gap-3">
          {COMMUNITIES.map((community, i) => (
            <motion.div
              key={community.id}
              className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-card p-4 opacity-60"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 0.6, y: 0 }}
              transition={{ delay: i * 0.08 + 0.3 }}
            >
              <span className="text-3xl">{community.emoji}</span>
              <p className="font-heading text-sm font-bold text-foreground text-center">{community.name}</p>
              <p className="font-body text-xs text-muted-foreground">{community.members.toLocaleString()} members</p>
              <button
                disabled
                className="mt-1 rounded-full border border-border px-4 py-1 font-heading text-xs font-bold text-muted-foreground cursor-not-allowed"
              >
                Join
              </button>
            </motion.div>
          ))}
        </div>
      </section>

      <BottomNav />
    </div>
  )
}
