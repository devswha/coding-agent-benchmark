interface ScoreCardProps {
  title: string
  value: string
  subtitle: string
  color: 'green' | 'yellow' | 'red' | 'blue' | 'purple'
  icon?: string
  trend?: {
    value: string
    direction: 'up' | 'down'
  }
  progress?: number
}

const colorClasses = {
  green: 'text-primary',
  yellow: 'text-yellow-500',
  red: 'text-red-500',
  blue: 'text-blue-500',
  purple: 'text-purple-500',
}

const trendClasses = {
  up: 'text-primary bg-primary/10',
  down: 'text-red-500 bg-red-500/10',
}

export function ScoreCard({ title, value, subtitle, color, icon, trend, progress }: ScoreCardProps) {
  return (
    <div className="flex flex-col gap-1 rounded-xl p-5 bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-[#334155] shadow-sm hover:shadow-md transition-shadow font-['Inter',sans-serif]">
      <div className="flex items-center justify-between mb-2">
        <p className="text-slate-500 dark:text-slate-400 text-sm font-medium uppercase tracking-wide">
          {title}
        </p>
        {icon && (
          <span className={`material-symbols-outlined text-xl ${colorClasses[color]}`}>
            {icon}
          </span>
        )}
      </div>
      <div className="flex items-baseline gap-2">
        <p className="text-slate-900 dark:text-white text-3xl font-bold tracking-tight">
          {value}
        </p>
        {trend && (
          <div className={`flex items-center text-sm font-medium px-1.5 py-0.5 rounded transition-colors ${trendClasses[trend.direction]}`}>
            <span className="material-symbols-outlined text-sm mr-0.5">
              {trend.direction === 'up' ? 'trending_up' : 'trending_down'}
            </span>
            <span>{trend.value}</span>
          </div>
        )}
      </div>
      {progress !== undefined && (
        <div className="w-full bg-slate-100 dark:bg-slate-700 h-1.5 rounded-full mt-3 overflow-hidden">
          <div
            className={`${colorClasses[color].replace('text-', 'bg-')} h-full rounded-full transition-all duration-300`}
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
      {subtitle && !progress && (
        <p className="text-slate-400 text-sm mt-1">{subtitle}</p>
      )}
    </div>
  )
}
