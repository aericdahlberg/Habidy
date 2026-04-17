"use client"

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function WelcomePage() {
  const router = useRouter()
  const [checking, setChecking] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    async function checkNewUser() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace('/login'); return }

      const { data } = await supabase
        .from('users')
        .select('new_user')
        .eq('id', user.id)
        .maybeSingle()

      // Already seen welcome — skip to dashboard
      if (data && data.new_user === false) {
        router.replace('/dashboard')
        return
      }
      setChecking(false)
    }
    checkNewUser()
  }, [router])

  async function handleStart() {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      await supabase
        .from('users')
        .update({ new_user: false })
        .eq('id', user.id)
    }
    router.push('/')
  }

  if (checking) {
    return <div className="flex min-h-screen items-center justify-center bg-zinc-900" />
  }

  return (
    <div className="min-h-screen bg-zinc-900">

      {/* Dark hero */}
      <div className="px-6 pt-16 pb-14">
        <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
          Hab-Idy
        </p>

        <h1 className="mt-7 text-[2.6rem] font-bold leading-[1.12] tracking-tight text-white">
          Every action is a vote for the person you want to become.
        </h1>

        <p className="mt-6 text-lg leading-relaxed text-zinc-400">
          Success isn&apos;t a goal you hit. It&apos;s a lagging indicator of what you
          do — every single day.
        </p>
      </div>

      {/* White content section — rounded top, overlaps dark */}
      <div className="rounded-t-3xl bg-white px-6 pt-8 pb-16">

        {/* Why this works */}
        <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400">
          Why this works
        </p>

        <p className="mt-5 text-base leading-relaxed text-zinc-700">
          Goal-based habits have an expiry date. The moment you hit the goal, the reason
          to keep going disappears.
        </p>

        <p className="mt-4 text-base leading-relaxed text-zinc-700">
          Identity-based habits don&apos;t work like that. You&apos;re not trying to run
          a 5K — you&apos;re becoming a runner. Every run is evidence of that identity.
          That evidence compounds.
        </p>

        <p className="mt-4 text-base leading-relaxed text-zinc-700">
          The people who build lasting change aren&apos;t more motivated than you.
          They just have a better story about{' '}
          <span className="font-semibold text-zinc-900">who they are</span>.
        </p>

        {/* Pull quote */}
        <div className="mt-8 border-l-2 border-zinc-900 pl-5">
          <p className="text-base italic leading-relaxed text-zinc-600">
            &ldquo;Every habit is a vote for the identity you want to prove.&rdquo;
          </p>
        </div>

        {/* Three feature points */}
        <div className="mt-8 space-y-3">
          {[
            { icon: '🧬', title: 'Identity first', body: 'We start with who you want to be, not what you want to do.' },
            { icon: '🔁', title: 'Built to stick', body: 'Habits anchored to existing routines are far harder to drop.' },
            { icon: '📈', title: 'Evidence compounds', body: 'Each small action adds to the proof that you are that person.' },
          ].map(({ icon, title, body }) => (
            <div key={title} className="flex items-start gap-4 rounded-2xl bg-zinc-50 px-5 py-4">
              <span className="text-xl">{icon}</span>
              <div>
                <p className="text-sm font-semibold text-zinc-900">{title}</p>
                <p className="mt-0.5 text-sm leading-relaxed text-zinc-500">{body}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Time note */}
        <p className="mt-8 text-center text-sm text-zinc-400">
          This takes about 5 minutes.{' '}
          <span className="font-medium text-zinc-600">It&apos;s worth it.</span>
        </p>

        {/* CTA */}
        <button
          onClick={handleStart}
          disabled={saving}
          className="mt-5 w-full rounded-2xl bg-zinc-900 py-4 text-base font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          {saving ? 'One sec...' : "Let's build you \u2192"}
        </button>
      </div>
    </div>
  )
}
