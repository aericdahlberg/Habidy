"use client"

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import NavBar from '@/components/NavBar'
import { supabase } from '@/lib/supabase'

type ProfileData = {
  identity_statement?: string | null
  goal_category?: string | null
  time_available?: string | null
}

export default function ProfilePage() {
  const router = useRouter()
  const [data, setData] = useState<ProfileData>({})
  const [email, setEmail] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setEmail(user.email ?? null)

      const { data: row } = await supabase
        .from('users')
        .select('identity_statement, goal_category, time_available')
        .eq('id', user.id)
        .maybeSingle()

      if (row) setData(row)
    }
    load()
  }, [])

  function handleReset() {
    localStorage.clear()
    router.push('/welcome')
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div className="flex min-h-screen flex-col bg-zinc-50 pb-24">
      <div className="bg-white px-5 pt-12 pb-6">
        <div className="mx-auto max-w-sm">
          <h1 className="text-2xl font-semibold text-zinc-900">Profile</h1>
          {email && (
            <p className="mt-1 text-sm text-zinc-500">{email}</p>
          )}
        </div>
      </div>

      <div className="mx-auto w-full max-w-sm flex-1 px-4 pt-4 space-y-3">
        {data.identity_statement && (
          <div className="rounded-2xl bg-white border border-zinc-100 px-5 py-4">
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">Identity</p>
            <p className="mt-1 text-sm text-zinc-900">{data.identity_statement}</p>
          </div>
        )}

        {data.goal_category && (
          <div className="rounded-2xl bg-white border border-zinc-100 px-5 py-4">
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">Focus Area</p>
            <p className="mt-1 text-sm text-zinc-900">{data.goal_category}</p>
          </div>
        )}

        {data.time_available && (
          <div className="rounded-2xl bg-white border border-zinc-100 px-5 py-4">
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">Daily Time</p>
            <p className="mt-1 text-sm text-zinc-900">{data.time_available}</p>
          </div>
        )}

        {!data.identity_statement && (
          <div className="rounded-2xl bg-white border border-zinc-100 px-6 py-10 text-center">
            <p className="text-sm text-zinc-500">Complete onboarding to see your profile.</p>
            <button
              onClick={() => router.push('/welcome')}
              className="mt-4 rounded-2xl bg-zinc-900 px-6 py-3 text-sm font-medium text-white"
            >
              Start onboarding →
            </button>
          </div>
        )}

        <div className="pt-4 flex flex-col gap-3">
          <button
            onClick={handleReset}
            className="w-full rounded-2xl border border-zinc-200 bg-white py-3.5 text-sm font-medium text-zinc-500 transition-colors hover:border-zinc-400 hover:text-zinc-700"
          >
            Reset and start over
          </button>
          <button
            onClick={handleSignOut}
            className="w-full rounded-2xl border border-zinc-200 bg-white py-3.5 text-sm font-medium text-red-500 transition-colors hover:border-red-200 hover:bg-red-50"
          >
            Sign out
          </button>
        </div>
      </div>

      <NavBar />
    </div>
  )
}
