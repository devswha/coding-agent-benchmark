interface ScoreCardProps {
  title: string
  value: string
  subtitle: string
  color: 'green' | 'yellow' | 'red' | 'blue' | 'purple'
}

const colorClasses = {
  green: 'bg-green-500/20 border-green-500/50 text-green-400',
  yellow: 'bg-yellow-500/20 border-yellow-500/50 text-yellow-400',
  red: 'bg-red-500/20 border-red-500/50 text-red-400',
  blue: 'bg-blue-500/20 border-blue-500/50 text-blue-400',
  purple: 'bg-purple-500/20 border-purple-500/50 text-purple-400',
}

export function ScoreCard({ title, value, subtitle, color }: ScoreCardProps) {
  return (
    <div className={`rounded-xl p-4 border ${colorClasses[color]}`}>
      <div className="text-sm font-medium text-slate-300 mb-1">{title}</div>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs text-slate-400 mt-1">{subtitle}</div>
    </div>
  )
}
