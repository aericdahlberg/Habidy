export function shouldShowDifficultyCheckIn(streak: number, lastRatedAt: string | null): boolean {
  if (streak <= 0 || streak % 7 !== 0) return false
  if (!lastRatedAt) return true
  const daysSince = (Date.now() - new Date(lastRatedAt).getTime()) / 86_400_000
  return daysSince > 6
}