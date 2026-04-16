"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type Mode = 'signin' | 'signup'

export default function LoginPage() {
  const router = useRouter()
  const [mode, setMode] = useState<Mode>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({ email, password })
        if (error) { setError(error.message); return }

        // Create a minimal users row so the welcome page can check new_user flag
        if (data.user) {
          const { error: insertError } = await supabase
            .from('users')
            .insert({
              id: data.user.id,
              new_user: true,
            })

          if (insertError) {
            console.error('User insert failed:', insertError)
          }
        }
        router.push('/welcome')
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) { setError(error.message); return }

        // Check if user has seen the welcome screen
        const userId = data.user?.id
        if (userId) {
          const { data: userData } = await supabase
            .from('users')
            .select('new_user')
            .eq('id', userId)
            .maybeSingle()

          // No row yet (never finished onboarding) or new_user = true → show welcome
          if (!userData || userData.new_user === true) {
            router.push('/welcome')
            return
          }
        }
        router.push('/dashboard')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white px-6">
      <div className="w-full max-w-sm">
        {/* Logo / wordmark */}
        <div className="mb-10 text-center">
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">Hab-Idy</h1>
          <p className="mt-2 text-sm text-zinc-500">Become the person you want to be.</p>
        </div>

        {/* Mode toggle */}
        <div className="mb-8 flex rounded-2xl bg-zinc-100 p-1">
          <button
            type="button"
            onClick={() => { setMode('signin'); setError('') }}
            className={`flex-1 rounded-xl py-2 text-sm font-medium transition-all ${
              mode === 'signin'
                ? 'bg-white text-zinc-900 shadow-sm'
                : 'text-zinc-500 hover:text-zinc-700'
            }`}
          >
            Sign in
          </button>
          <button
            type="button"
            onClick={() => { setMode('signup'); setError('') }}
            className={`flex-1 rounded-xl py-2 text-sm font-medium transition-all ${
              mode === 'signup'
                ? 'bg-white text-zinc-900 shadow-sm'
                : 'text-zinc-500 hover:text-zinc-700'
            }`}
          >
            Create account
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium uppercase tracking-wide text-zinc-400">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              autoComplete="email"
              className="w-full rounded-2xl border-2 border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 placeholder-zinc-400 outline-none focus:border-zinc-800 transition-colors"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium uppercase tracking-wide text-zinc-400">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={mode === 'signup' ? 'At least 6 characters' : '••••••••'}
              required
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              className="w-full rounded-2xl border-2 border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 placeholder-zinc-400 outline-none focus:border-zinc-800 transition-colors"
            />
          </div>

          {error && (
            <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || !email.trim() || !password.trim()}
            className="mt-2 w-full rounded-2xl bg-zinc-900 py-4 text-base font-medium text-white transition-opacity disabled:opacity-40"
          >
            {loading
              ? mode === 'signup' ? 'Creating account...' : 'Signing in...'
              : mode === 'signup' ? 'Create account' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  )
}
