export function Header() {
  return (
    <header className="bg-slate-800 border-b border-slate-700 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">B</span>
          </div>
          <h1 className="text-xl font-semibold text-white">Benchmark Dashboard</h1>
        </div>
        <div className="text-sm text-slate-400">
          Coding Agent Benchmark System
        </div>
      </div>
    </header>
  )
}
