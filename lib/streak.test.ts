import { describe, it, expect } from 'vitest'
import { getPhase } from '@/lib/streak'

describe('getPhase', () => {
  describe('Building phase (streak 0–6)', () => {
    it('streak 0 → Building, 7 days to Establishing', () => {
      expect(getPhase(0)).toEqual({ phase: 'Building', daysToNextPhase: 7 })
    })
    it('streak 3 → Building, 4 days to Establishing', () => {
      expect(getPhase(3)).toEqual({ phase: 'Building', daysToNextPhase: 4 })
    })
    it('streak 6 → Building, 1 day to Establishing', () => {
      expect(getPhase(6)).toEqual({ phase: 'Building', daysToNextPhase: 1 })
    })
  })

  describe('Establishing phase (streak 7–20)', () => {
    it('streak 7 → Establishing, 14 days to Maintaining', () => {
      expect(getPhase(7)).toEqual({ phase: 'Establishing', daysToNextPhase: 14 })
    })
    it('streak 14 → Establishing, 7 days to Maintaining', () => {
      expect(getPhase(14)).toEqual({ phase: 'Establishing', daysToNextPhase: 7 })
    })
    it('streak 20 → Establishing, 1 day to Maintaining', () => {
      expect(getPhase(20)).toEqual({ phase: 'Establishing', daysToNextPhase: 1 })
    })
  })

  describe('Maintaining phase (streak 21+)', () => {
    it('streak 21 → Maintaining, null', () => {
      expect(getPhase(21)).toEqual({ phase: 'Maintaining', daysToNextPhase: null })
    })
    it('streak 100 → Maintaining, null', () => {
      expect(getPhase(100)).toEqual({ phase: 'Maintaining', daysToNextPhase: null })
    })
  })

  describe('streak reset returns to Building', () => {
    it('streak 0 after reset → Building, 7 days', () => {
      expect(getPhase(0)).toEqual({ phase: 'Building', daysToNextPhase: 7 })
    })
  })
})
