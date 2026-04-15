import type { DayStatus } from '@/lib/streak'

type Props = {
  days: DayStatus[]
  streak: number
}

export default function StreakDots({ days, streak }: Props) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-1.5">
        {days.map((d) => (
          <div
            key={d.date}
            title={d.date}
            className={`h-2.5 w-2.5 rounded-full transition-all ${
              d.completed === true
                ? 'bg-zinc-900'
                : d.completed === false
                ? 'bg-zinc-200'
                : 'bg-zinc-100 border border-dashed border-zinc-300'
            }`}
          />
        ))}
      </div>
      {streak > 0 && (
        <span className="text-sm font-medium text-zinc-700">
          {streak} {streak === 1 ? 'day' : 'days'} 🔥
        </span>
      )}
    </div>
  )
}
