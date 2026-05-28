export default function StatsPanel({ stats, agents }) {
  const activeAgents = agents.filter(a => a.state !== 'idle').length;
  const totalAgents = agents.length;
  const totalTasks = stats.totalTasks || 0;
  const completedTasks = stats.completedTasks || 0;
  const efficiency = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--border-color)] shrink-0">
        <h2 className="text-[9px] text-[var(--text-secondary)] font-pixel">📊 STATS</h2>
      </div>

      <div className="flex-1 p-2 grid grid-cols-2 gap-2">
        <StatCard
          label="ACTIVE"
          value={activeAgents}
          color="var(--accent-claude)"
        />
        <StatCard
          label="DONE"
          value={completedTasks}
          color="var(--accent-subagent)"
        />
        <StatCard
          label="TASKS"
          value={totalTasks}
          color="var(--accent-tool)"
        />
        <StatCard
          label="EFF %"
          value={`${efficiency}%`}
          color="var(--accent-warm)"
        />
      </div>
    </div>
  );
}

function StatCard({ label, value, color }) {
  return (
    <div className="stat-card flex flex-col justify-center">
      <div className="stat-label">{label}</div>
      <div className="stat-value" style={{ color }}>{value}</div>
    </div>
  );
}
