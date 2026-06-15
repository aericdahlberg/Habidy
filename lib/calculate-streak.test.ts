import { describe, it, expect, vi, afterEach } from 'vitest'
import { calculateStreak } from '@/lib/streak'

// All dates in these tests are UTC (matching what streak.ts uses internally).
// See streak_midnight eval note: calculateStreak uses toISOString() (UTC) while
// habit logs use localDateStr() (local TZ) — can diverge for UTC+ users near midnight.

function dateStr(daysAgo: number): string {
  const d = new Date()
  d.setDate(d.getDate() - daysAgo)
  return d.toISOString().split('T')[0]
}

afterEach(() => vi.useRealTimers())

describe('calculateStreak', () => {
  describe('swipe_daily — streak counts correctly after a single log', () => {
    it('no logs → 0', () => {
      expect(calculateStreak([])).toBe(0)
    })

    it('completed today → 1', () => {
      expect(calculateStreak([{ date: dateStr(0), completed: true }])).toBe(1)
    })

    it('completed yesterday (not yet today) → 1', () => {
      expect(calculateStreak([{ date: dateStr(1), completed: true }])).toBe(1)
    })

    it('completed=false today → 0 (skipped days do not count)', () => {
      expect(calculateStreak([{ date: dateStr(0), completed: false }])).toBe(0)
    })
  })

  describe('streak_midnight — gap handling and multi-day streaks', () => {
    it('3 consecutive days ending today → 3', () => {
      const logs = [
        { date: dateStr(0), completed: true },
        { date: dateStr(1), completed: true },
        { date: dateStr(2), completed: true },
      ]
      expect(calculateStreak(logs)).toBe(3)
    })

    it('gap 2 days ago breaks streak — only counts today', () => {
      const logs = [
        { date: dateStr(0), completed: true },
        { date: dateStr(2), completed: true }, // gap at day 1
      ]
      expect(calculateStreak(logs)).toBe(1)
    })

    it('log 2 days ago but nothing yesterday or today → 0', () => {
      expect(calculateStreak([{ date: dateStr(2), completed: true }])).toBe(0)
    })

    it('mixed completed/skipped — only counts consecutive completed from anchor', () => {
      const logs = [
        { date: dateStr(0), completed: true },
        { date: dateStr(1), completed: false }, // skipped — breaks streak
        { date: dateStr(2), completed: true },
      ]
      expect(calculateStreak(logs)).toBe(1)
    })
  })

  describe('double_log — upsert does not inflate streak', () => {
    it('two logs for same date → counts as 1 day (last write wins in Map)', () => {
      const logs = [
        { date: dateStr(0), completed: true },
        { date: dateStr(0), completed: true }, // duplicate
      ]
      // Map deduplicates by date — second entry overwrites first
      expect(calculateStreak(logs)).toBe(1)
    })

    it('duplicate + yesterday → streak = 2, not 3', () => {
      const logs = [
        { date: dateStr(0), completed: true },
        { date: dateStr(0), completed: true }, // duplicate today
        { date: dateStr(1), completed: true },
      ]
      expect(calculateStreak(logs)).toBe(2)
    })
  })
})
