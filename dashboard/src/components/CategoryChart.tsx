import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { BenchmarkCategory, CategoryScore } from '../types'

interface CategoryChartProps {
  scoreByCategory: Record<BenchmarkCategory, CategoryScore>
}

const categoryLabels: Record<string, string> = {
  code_generation: 'Code Gen',
  code_completion: 'Completion',
  bug_fixing: 'Bug Fix',
  code_explanation: 'Explanation',
  refactoring: 'Refactor',
  test_generation: 'Test Gen',
  task_completion: 'Task',
  security: 'Security',
  debugging: 'Debug',
  documentation: 'Docs',
  qa_reasoning: 'QA Reasoning',
}

const getBarColor = (score: number) => {
  if (score >= 0.8) return '#4ade80'
  if (score >= 0.5) return '#facc15'
  return '#f87171'
}

export function CategoryChart({ scoreByCategory }: CategoryChartProps) {
  const data = Object.entries(scoreByCategory)
    .filter(([, value]) => value.total > 0)
    .map(([key, value]) => ({
      name: categoryLabels[key] || key,
      score: value.score * 100,
      passed: value.passed,
      total: value.total,
    }))

  if (data.length === 0) {
    return <div className="text-slate-400 text-center py-8">No category data available</div>
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} layout="vertical" margin={{ top: 5, right: 30, left: 60, bottom: 5 }}>
        <XAxis type="number" domain={[0, 100]} tick={{ fill: '#94a3b8' }} />
        <YAxis type="category" dataKey="name" tick={{ fill: '#94a3b8' }} width={70} />
        <Tooltip
          contentStyle={{
            backgroundColor: '#1e293b',
            border: '1px solid #475569',
            borderRadius: '8px',
          }}
          labelStyle={{ color: '#f1f5f9' }}
          formatter={(value: number, _name: string, props) => {
            const payload = props?.payload as { passed?: number; total?: number } | undefined
            const passed = payload?.passed ?? 0
            const total = payload?.total ?? 0
            return [`${value.toFixed(1)}% (${passed}/${total})`, 'Score']
          }}
        />
        <Bar dataKey="score" radius={[0, 4, 4, 0]}>
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={getBarColor(entry.score / 100)} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
