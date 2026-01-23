import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'

interface DifficultyChartProps {
  scoreByDifficulty: Record<string, number>
}

const difficultyColors: Record<string, string> = {
  easy: '#4ade80',
  medium: '#facc15',
  hard: '#f87171',
}

export function DifficultyChart({ scoreByDifficulty }: DifficultyChartProps) {
  const data = Object.entries(scoreByDifficulty)
    .filter(([, value]) => value > 0 || value === 0)
    .map(([key, value]) => ({
      name: key.charAt(0).toUpperCase() + key.slice(1),
      score: value * 100,
      difficulty: key,
    }))

  if (data.length === 0) {
    return <div className="text-slate-400 text-center py-8">No difficulty data available</div>
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
        <XAxis dataKey="name" tick={{ fill: '#94a3b8' }} />
        <YAxis domain={[0, 100]} tick={{ fill: '#94a3b8' }} />
        <Tooltip
          contentStyle={{
            backgroundColor: '#1e293b',
            border: '1px solid #475569',
            borderRadius: '8px',
          }}
          labelStyle={{ color: '#f1f5f9' }}
          formatter={(value: number) => [`${value.toFixed(1)}%`, 'Score']}
        />
        <Bar dataKey="score" radius={[4, 4, 0, 0]}>
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={difficultyColors[entry.difficulty] || '#64748b'} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
