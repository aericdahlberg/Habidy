import type { CoachProposal } from './types'

export function extractProposalsFromMessage(message: string): CoachProposal[] | null {
  const match = message.match(/COACH_PROPOSALS:(\[[\s\S]+?\])\s*$/)
  if (!match) return null
  try {
    const parsed = JSON.parse(match[1])
    if (!Array.isArray(parsed) || parsed.length === 0) return null
    return parsed as CoachProposal[]
  } catch {
    return null
  }
}
