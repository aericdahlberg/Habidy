import { describe, it, expect, vi, afterEach } from 'vitest'
import { shouldShowDifficultyCheckIn } from '@/lib/difficulty-trigger'

const DAY_MS = 86_400_000

function daysAgo(n: number): string {
  return new Date(Date.now() - n * DAY_MS).toISOString()
}

afterEach(() => { vi.useRealTimers() })

describe('shouldShowDifficultyCheckIn', () => {
  describe('interval_trigger — fires at day 7, 14, 21 only', () => {
    it('streak 0 → false', () => {
      expect(shouldShowDifficultyCheckIn(0, null)).toBe(false)
    })
    it('streak 6 → false (not yet at multiple)', () => {
      expect(shouldShowDifficultyCheckIn(6, null)).toBe(false)
    })
    it('streak 7, never rated → true', () => {
      expect(shouldShowDifficultyCheckIn(7, null)).toBe(true)
    })
    it('streak 8 → false (past the multiple, not yet at 14)', () => {
      expect(shouldShowDifficultyCheckIn(8, null)).toBe(false)
    })
    it('streak 13 → false', () => {
      expect(shouldShowDifficultyCheckIn(13, null)).toBe(false)
    })
    it('streak 14, never rated → true', () => {
      expect(shouldShowDifficultyCheckIn(14, null)).toBe(true)
    })
    it('streak 21, never rated → true', () => {
      expect(shouldShowDifficultyCheckIn(21, null)).toBe(true)
    })
    it('streak 28, never rated → true', () => {
      expect(shouldShowDifficultyCheckIn(28, null)).toBe(true)
    })
  })

  describe('double-fire prevention — lastRatedAt guard', () => {
    it('streak 7, rated 3 days ago → false (too soon)', () => {
      expect(shouldShowDifficultyCheckIn(7, daysAgo(3))).toBe(false)
    })
    it('streak 7, rated exactly 6 days ago → false (boundary: must be > 6)', () => {
      expect(shouldShowDifficultyCheckIn(7, daysAgo(6))).toBe(false)
    })
    it('streak 7, rated 7 days ago → true (new period)', () => {
      expect(shouldShowDifficultyCheckIn(7, daysAgo(7))).toBe(true)
    })
    it('streak 14, rated 7 days ago → true (next period ready)', () => {
      expect(shouldShowDifficultyCheckIn(14, daysAgo(7))).toBe(true)
    })
    it('streak 14, rated 3 days ago → false (same period)', () => {
      expect(shouldShowDifficultyCheckIn(14, daysAgo(3))).toBe(false)
    })
  })
})
