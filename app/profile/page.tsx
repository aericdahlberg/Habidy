'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { LogOut, User, Mail, Target, Sparkles } from 'lucide-react'
import BottomNav from '@/components/BottomNav'
import { supabase } from '@/lib/supabase'

type ProfileData = {
  identity_statement?: string | null
  goal_category?: string | null
  display_name?: string | null
}

type HabitCount = { count: number }

const InfoRow = ({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) => (
  <div className="flex items-start gap-3 py-3">
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
      <Icon size={18} />
    </div>
    <div className="min-w-0 flex-1">
      <div className="font-body text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-0.5 truncate font-body text-base font-medium text-foreground">{value || '—'}</div>
    </div>
  </div>
)

export default function ProfilePage() {
  const router = useRouter()
  const [email, setEmail] = useState<string | null>(null)
  const [data, setData] = useState<ProfileData>({})
  const [habitCount, setHabitCount] = useState(0)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setEmail(user.email ?? null)

      const { data: row } = await supabase
        .from('users')
        .select('identity_statement, goal_category, display_name')
        .eq('id', user.id)
        .maybeSingle()

      if (row) setData(row)

      const { count } = await supabase
        .from('habits')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)

      setHabitCount(count ?? 0)
    }
    load()
  }, [])

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  function handleReset() {
    localStorage.clear()
    router.push('/welcome')
  }

  const displayName = data.display_name || (email ? email.split('@')[0] : 'Your Profile')
  const initials = displayName
    .split(' ')
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()

  return (
    <div className="flex min-h-screen flex-col bg-background pb-24">
      <header className="flex items-center justify-between px-4 pt-12 pb-2">
        <h1 className="font-heading text-lg font-bold text-foreground">Profile</h1>
        <img src="/mascot.png" alt="" className="h-8 w-8 object-contain" />
      </header>

      <motion.section
        className="px-6 pt-4"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex flex-col items-center text-center">
          <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/60 font-heading text-3xl font-black text-primary-foreground shadow-lg">
            {initials}
          </div>
          <h2 className="mt-4 font-heading text-2xl font-black text-foreground">{displayName}</h2>
          {email && <p className="font-body text-sm text-muted-foreground">{email}</p>}
        </div>
      </motion.section>

      <section className="mt-6 px-4">
        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <h3 className="mb-1 font-heading text-sm font-bold uppercase tracking-wide text-muted-foreground">
            About you
          </h3>
          <div className="divide-y divide-border">
            <InfoRow icon={User} label="Name" value={data.display_name ?? ''} />
            <InfoRow icon={Mail} label="Email" value={email ?? ''} />
          </div>
        </div>
      </section>

      <section className="mt-4 px-4">
        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <h3 className="mb-2 font-heading text-sm font-bold uppercase tracking-wide text-muted-foreground">
            Your journey
          </h3>
          {data.identity_statement && (
            <div className="mb-3 rounded-xl bg-primary/5 p-3">
              <div className="mb-1 flex items-center gap-2 text-primary">
                <Sparkles size={14} />
                <span className="font-body text-xs font-bold uppercase tracking-wide">Identity</span>
              </div>
              <p className="font-body text-sm text-foreground">{data.identity_statement}</p>
            </div>
          )}
          <div className="flex items-center gap-3 py-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-accent/20 text-accent-foreground">
              <Target size={18} />
            </div>
            <div className="flex-1">
              <div className="font-body text-xs font-medium uppercase tracking-wide text-muted-foreground">Active habits</div>
              <div className="font-body text-base font-bold text-foreground">{habitCount}</div>
            </div>
          </div>
          {data.goal_category && (
            <div className="flex items-center gap-3 py-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-accent/20 text-accent-foreground">
                <Sparkles size={18} />
              </div>
              <div className="flex-1">
                <div className="font-body text-xs font-medium uppercase tracking-wide text-muted-foreground">Current focus</div>
                <div className="font-body text-base font-bold text-foreground">{data.goal_category}</div>
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="mt-6 px-4 space-y-3">
        <button
          onClick={handleReset}
          className="w-full rounded-full border border-border bg-card py-3.5 font-heading text-sm font-bold text-muted-foreground transition-colors hover:bg-muted"
        >
          Reset and start over
        </button>
        <button
          onClick={handleSignOut}
          className="flex w-full items-center justify-center gap-2 rounded-full bg-destructive px-6 py-4 font-heading text-base font-bold text-destructive-foreground shadow-md transition-transform active:scale-95"
        >
          <LogOut size={18} />
          Sign out
        </button>
      </section>

      <BottomNav />
    </div>
  )
}
