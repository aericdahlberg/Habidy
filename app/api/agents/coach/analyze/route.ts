import { NextRequest, NextResponse } from 'next/server'
import { agentGuard } from '@/lib/agentGuard'
import { adminClient } from '@/lib/supabase'
import { loadWeeklyAnalysis } from '@/lib/agents/coach'

const supabase = adminClient()

export async function POST(req: NextRequest) {
  try {
    const { userId } = await req.json() as { userId?: string }
    if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 })

    // Verify user exists before running analysis
    await agentGuard({
      agentName: 'coach',
      toolName: 'verifyUser',
      input: { userId },
      userId,
      fn: async () => {
        const r = await supabase.from('users').select('id').eq('id', userId).single()
        return r
      },
      assert: (r) => { if (!r.data) throw new Error('User not found') },
    })

    const analysis = await loadWeeklyAnalysis(userId)

    if (!analysis) {
      return NextResponse.json({ hasData: false, reason: 'no_habits' })
    }

    return NextResponse.json({ hasData: true, analysis })
  } catch (err) {
    console.error('[POST /api/agents/coach/analyze]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
