'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { LogOut, User, Mail, Target, Sparkles, Calendar, Check, X, Bell } from 'lucide-react'
import BottomNav from '@/components/BottomNav'
import { supabase } from '@/lib/supabase'
import { parseNotificationPrefs, DEFAULT_NOTIFICATION_PREFS } from '@/lib/notification-prefs'
import type { NotificationPrefs } from '@/lib/notification-prefs'

type ProfileData = {
  identity_statement?: string | null
  goal_category?: string | null
  display_name?: string | null
}

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
  const [calendarConnected, setCalendarConnected] = useState(false)
  const [calendarLoading, setCalendarLoading] = useState(false)
  const [calendarMsg, setCalendarMsg] = useState<string | null>(null)
  const [notifPrefs, setNotifPrefs] = useState<NotificationPrefs>(DEFAULT_NOTIFICATION_PREFS)
  const [notifSaving, setNotifSaving] = useState(false)

  useEffect(() => {
    const status = new URLSearchParams(window.location.search).get('calendar')
    if (status === 'connected') setCalendarMsg('Google Calendar connected!')
    if (status === 'error') setCalendarMsg('Could not connect Google Calendar. Try again.')
  }, [])

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setEmail(user.email ?? null)

      const { data: row } = await supabase
        .from('users')
        .select('identity_statement, goal_category, display_name, google_calendar_connected')
        .eq('id', user.id)
        .maybeSingle()

      if (row) {
        setData(row)
        setCalendarConnected(row.google_calendar_connected ?? false)
      }

      if (row?.google_calendar_connected) {
        const prefsRes = await fetch('/api/profile/notification-prefs')
        if (prefsRes.ok) {
          const prefsData = await prefsRes.json() as { prefs: NotificationPrefs }
          setNotifPrefs(parseNotificationPrefs(prefsData.prefs))
        }
      }

      const { count } = await supabase
        .from('habits')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)

      setHabitCount(count ?? 0)
    }
    load()
  }, [])

  async function handleDisconnectCalendar() {
    setCalendarLoading(true)
    try {
      const res = await fetch('/api/calendar/disconnect', { method: 'DELETE' })
      if (res.ok) {
        setCalendarConnected(false)
        setCalendarMsg('Google Calendar disconnected.')
      }
    } finally {
      setCalendarLoading(false)
    }
  }

  function handleConnectCalendar() {
    window.location.href = '/api/auth/google?from=profile'
  }

  async function handleNotifPrefChange(patch: Partial<NotificationPrefs>) {
    const optimistic = { ...notifPrefs, ...patch }
    setNotifPrefs(optimistic)
    setNotifSaving(true)
    try {
      const res = await fetch('/api/profile/notification-prefs', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      })
      if (res.ok) {
        const d = await res.json() as { prefs: NotificationPrefs }
        setNotifPrefs(parseNotificationPrefs(d.prefs))
      }
    } finally {
      setNotifSaving(false)
    }
  }

  function toggleMinuteBefore(min: number) {
    const current = notifPrefs.default_minutes_before
    const next = current.includes(min)
      ? current.filter((m) => m !== min)
      : [...current, min].sort((a, b) => b - a)
    void handleNotifPrefChange({ default_minutes_before: next })
  }

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

      <section className="mt-4 px-4">
        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <h3 className="mb-3 font-heading text-sm font-bold uppercase tracking-wide text-muted-foreground">
            Integrations
          </h3>
          {calendarMsg && (
            <p className={`mb-3 rounded-xl px-3 py-2 font-body text-sm ${calendarMsg.includes('connected!') ? 'bg-primary/10 text-primary' : 'bg-destructive/10 text-destructive'}`}>
              {calendarMsg}
            </p>
          )}
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Calendar size={18} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-body text-sm font-semibold text-foreground">Google Calendar</div>
              <div className="font-body text-xs text-muted-foreground">
                {calendarConnected ? 'Connected — habit reminders active' : 'Not connected'}
              </div>
            </div>
            {calendarConnected ? (
              <button
                onClick={handleDisconnectCalendar}
                disabled={calendarLoading}
                className="flex shrink-0 items-center gap-1 rounded-full border border-border bg-muted px-3 py-1.5 font-body text-xs font-semibold text-muted-foreground disabled:opacity-50"
              >
                <X size={11} /> Disconnect
              </button>
            ) : (
              <button
                onClick={handleConnectCalendar}
                className="flex shrink-0 items-center gap-1 rounded-full bg-primary px-3 py-1.5 font-body text-xs font-bold text-primary-foreground"
              >
                <Check size={11} /> Connect
              </button>
            )}
          </div>
        </div>
      </section>

      {calendarConnected && (
        <section className="mt-4 px-4">
          <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
              <Bell size={14} className="text-muted-foreground" />
              <h3 className="font-heading text-sm font-bold uppercase tracking-wide text-muted-foreground">
                Notifications
              </h3>
            </div>

            {/* Auto-dismiss toggle */}
            <div className="flex items-center justify-between gap-3 py-2">
              <div className="flex-1 min-w-0">
                <div className="font-body text-sm font-semibold text-foreground">Auto-dismiss when logged</div>
                <div className="font-body text-xs text-muted-foreground">Clears today&apos;s reminder after you log the habit</div>
              </div>
              <button
                onClick={() => void handleNotifPrefChange({ auto_dismiss_when_logged: !notifPrefs.auto_dismiss_when_logged })}
                disabled={notifSaving}
                className={`relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-50 ${notifPrefs.auto_dismiss_when_logged ? 'bg-primary' : 'bg-muted-foreground/30'}`}
              >
                <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${notifPrefs.auto_dismiss_when_logged ? 'translate-x-5' : 'translate-x-0.5'}`} />
              </button>
            </div>

            {/* Email reminder toggle */}
            <div className="flex items-center justify-between gap-3 py-2">
              <div className="flex-1 min-w-0">
                <div className="font-body text-sm font-semibold text-foreground">Email reminder</div>
                <div className="font-body text-xs text-muted-foreground">Google Calendar sends an email 1 hr before each habit</div>
              </div>
              <button
                onClick={() => void handleNotifPrefChange({ email_reminder_enabled: !notifPrefs.email_reminder_enabled })}
                disabled={notifSaving}
                className={`relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-50 ${notifPrefs.email_reminder_enabled ? 'bg-primary' : 'bg-muted-foreground/30'}`}
              >
                <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${notifPrefs.email_reminder_enabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
              </button>
            </div>

            {/* Reminder time chips */}
            <div className="mt-3">
              <div className="mb-2 font-body text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Default remind me
              </div>
              <div className="flex flex-wrap gap-2">
                {[{ label: '30 min', value: 30 }, { label: '15 min', value: 15 }, { label: '5 min', value: 5 }, { label: 'At start', value: 0 }].map(({ label, value }) => {
                  const active = notifPrefs.default_minutes_before.includes(value)
                  return (
                    <button
                      key={value}
                      onClick={() => toggleMinuteBefore(value)}
                      disabled={notifSaving}
                      className={`rounded-full border px-3 py-1 font-body text-xs font-semibold transition-colors disabled:opacity-50 ${active ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-muted/50 text-muted-foreground'}`}
                    >
                      {label}
                    </button>
                  )
                })}
              </div>
            </div>

            <p className="mt-3 font-body text-[10px] text-muted-foreground">
              Reminders include your habit name and identity statement.
            </p>
          </div>
        </section>
      )}

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
