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

      // If user has already seen welcome, skip straight to dashboard
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
    return <div className="flex min-h-screen items-center justify-center bg-white" />
  }

  return (
    <div className="flex min-h-screen flex-col bg-white px-6">
      <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-16">

        {/* Eyebrow */}
        <p className="mb-6 text-xs font-semibold uppercase tracking-widest text-zinc-400">
          Hab-Idy
        </p>

        {/* Hero statement */}
        <h1 className="text-4xl font-bold leading-tight tracking-tight text-zinc-900">
          Every action is a vote for the person you want to become.
        </h1>

        <p className="mt-5 text-lg leading-relaxed text-zinc-500">
          Success isn&apos;t a goal you hit — it&apos;s a lagging indicator of what you do daily.
          The people who build lasting change aren&apos;t more motivated than you. They just have
          better systems.
        </p>

        {/* Psychology section */}
        <div className="mt-10 rounded-3xl bg-zinc-50 px-6 py-6">
          <p className="text-sm font-semibold uppercase tracking-wide text-zinc-400">
            Why this works
          </p>
          <p className="mt-3 text-base leading-relaxed text-zinc-700">
            Goal-based habits fail because hitting the goal removes the reason to continue.
            Identity-based habits stick because they&apos;re tied to who you are —
            <span className="font-semibold text-zinc-900"> not what you want.</span>
          </p>
          <p className="mt-3 text-base leading-relaxed text-zinc-700">
            Instead of &ldquo;I want to run a 5K,&rdquo; we build toward &ldquo;I am a runner.&rdquo;
            Every habit we create is evidence of that identity.
          </p>
        </div>

        {/* Time note */}
        <p className="mt-8 text-center text-sm text-zinc-400">
          This takes about 5 minutes. It&apos;s worth it.
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
