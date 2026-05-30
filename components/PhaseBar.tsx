type Props = {
  phase: 'Building' | 'Establishing' | 'Maintaining'
  streak: number
  daysToNextPhase: number | null
}

const PHASE_CONFIG = {
  Building:     { color: 'bg-teal-400',   text: 'text-teal-700',   max: 7,  label: 'Building' },
  Establishing: { color: 'bg-purple-400', text: 'text-purple-700', max: 14, label: 'Establishing' },
  Maintaining:  { color: 'bg-amber-400',  text: 'text-amber-700',  max: 1,  label: 'Maintaining' },
}

export default function PhaseBar({ phase, streak, daysToNextPhase }: Props) {
  const config = PHASE_CONFIG[phase]

  const progress =
    phase === 'Building'     ? Math.min(streak / 7, 1) :
    phase === 'Establishing' ? Math.min((streak - 7) / 14, 1) :
    1

  const nextPhase =
    phase === 'Building'     ? 'Establishing' :
    phase === 'Establishing' ? 'Maintaining' :
    null

  return (
    <div className="mt-3 space-y-1">
      <div className="flex items-center justify-between">
        <span className={`text-xs font-semibold uppercase tracking-wide ${config.text}`}>
          {config.label}
        </span>
        {daysToNextPhase !== null && nextPhase && (
          <span className="text-xs text-zinc-400">
            {daysToNextPhase}d to {nextPhase}
          </span>
        )}
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-100">
        <div
          className={`h-full rounded-full transition-all duration-500 ${config.color}`}
          style={{ width: `${progress * 100}%` }}
        />
      </div>
    </div>
  )
}
