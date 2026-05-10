import { NextRequest, NextResponse } from 'next/server'
import { adminClient } from '@/lib/supabase'
import type { CoachProposal } from '@/lib/agents/coach'

export async function POST(req: NextRequest) {
  try {
    const { userId, proposals } = await req.json() as {
      userId?: string
      proposals?: CoachProposal[]
    }

    if (!userId || !Array.isArray(proposals) || proposals.length === 0) {
      return NextResponse.json({ error: 'userId and proposals required' }, { status: 400 })
    }

    const supabase = adminClient()
    const applied: string[] = []

    for (const proposal of proposals) {
      if (!proposal.habitId || proposal.adjustmentType === 'no_change') continue

      // Audit record first
      await supabase.from('habit_adjustments').insert({
        user_id: userId,
        habit_id: proposal.habitId,
        adjustment_type: proposal.adjustmentType,
        current_value: { value: proposal.currentValue, habitName: proposal.habitName },
        proposed_value: { value: proposal.proposedValue, habitName: proposal.habitName },
        status: 'accepted',
        resolved_at: new Date().toISOString(),
      })

      // Apply the change to the habit row
      const update: Record<string, unknown> = {}
      if (proposal.adjustmentType === 'shift_time') {
        update.time_of_day = proposal.proposedValue
      } else if (
        proposal.adjustmentType === 'increase_difficulty' ||
        proposal.adjustmentType === 'decrease_difficulty'
      ) {
        update.habit_name = proposal.proposedValue
      } else if (proposal.adjustmentType === 'change_cue') {
        update.cue = proposal.proposedValue
      }

      if (Object.keys(update).length > 0) {
        await supabase
          .from('habits')
          .update(update)
          .eq('id', proposal.habitId)
          .eq('user_id', userId)
        applied.push(proposal.habitId)
      }
    }

    // Stamp review time so the weekly card doesn't reappear immediately
    await supabase
      .from('users')
      .update({ last_coach_review_at: new Date().toISOString() })
      .eq('id', userId)

    return NextResponse.json({ applied })
  } catch (err) {
    console.error('[POST /api/agents/coach/apply]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
