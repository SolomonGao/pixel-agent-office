import { useRef, useEffect } from 'react';

export default function StatsPanel({ stats, agents, tasks }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.imageSmoothingEnabled = false;
    renderStats(ctx, stats, agents, tasks);
  }, [stats, agents, tasks]);

  return (
    <div className="flex flex-col h-full">
      <h2 className="text-xs text-white p-3 border-b border-pixel-border shrink-0">
        📊 STATS
      </h2>
      <div className="flex-1 p-2">
        <canvas
          ref={canvasRef}
          width={260}
          height={140}
          className="w-full"
          style={{ imageRendering: 'pixelated' }}
        />
      </div>
    </div>
  );
}

function renderStats(ctx, stats, agents, tasks) {
  ctx.clearRect(0, 0, 260, 140);
  ctx.fillStyle = '#0f0f1a';
  ctx.fillRect(0, 0, 260, 140);

  // Agent workload bars
  const subagents = agents.filter(a => a.role === 'subagent');
  const barY = 20;
  const barHeight = 8;
  const maxBarWidth = 80;

  ctx.fillStyle = '#94a3b8';
  ctx.font = '6px "Press Start 2P", monospace';
  ctx.textAlign = 'left';
  ctx.fillText('WORKLOAD', 5, 12);

  subagents.slice(0, 5).forEach((agent, i) => {
    const y = barY + i * 14;

    // Name
    ctx.fillStyle = agent.color;
    ctx.fillText(agent.name.substring(0, 4), 5, y + 6);

    // Background bar
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(40, y, maxBarWidth, barHeight);

    // Value bar
    const workload = agent.state === 'working' ? 80 : agent.state === 'idle' ? 10 : 40;
    ctx.fillStyle = agent.color;
    ctx.fillRect(40, y, maxBarWidth * (workload / 100), barHeight);

    // Border
    ctx.strokeStyle = '#374151';
    ctx.lineWidth = 0.5;
    ctx.strokeRect(40, y, maxBarWidth, barHeight);
  });

  // Task completion mini chart
  const chartX = 140;
  const chartY = 15;
  const chartW = 110;
  const chartH = 50;

  ctx.fillStyle = '#94a3b8';
  ctx.fillText('COMPLETION', chartX, 12);

  ctx.strokeStyle = '#374151';
  ctx.lineWidth = 0.5;
  ctx.strokeRect(chartX, chartY, chartW, chartH);

  const total = stats.totalTasks || 1;
  const completed = stats.completedTasks;
  const pending = tasks.pending.length;
  const inProgress = tasks.inProgress.length;

  // Pie-ish representation (stacked bars)
  const barW = 20;
  const doneH = (completed / total) * chartH;
  const progH = (inProgress / total) * chartH;
  const pendH = (pending / total) * chartH;

  ctx.fillStyle = '#10b981';
  ctx.fillRect(chartX + 5, chartY + chartH - doneH, barW, doneH);

  ctx.fillStyle = '#3b82f6';
  ctx.fillRect(chartX + 30, chartY + chartH - progH, barW, progH);

  ctx.fillStyle = '#f59e0b';
  ctx.fillRect(chartX + 55, chartY + chartH - pendH, barW, pendH);

  // Legend
  ctx.fillStyle = '#10b981';
  ctx.fillRect(chartX + 85, chartY + 5, 6, 6);
  ctx.fillStyle = '#94a3b8';
  ctx.fillText(`${completed}`, chartX + 95, chartY + 10);

  ctx.fillStyle = '#3b82f6';
  ctx.fillRect(chartX + 85, chartY + 18, 6, 6);
  ctx.fillStyle = '#94a3b8';
  ctx.fillText(`${inProgress}`, chartX + 95, chartY + 23);

  ctx.fillStyle = '#f59e0b';
  ctx.fillRect(chartX + 85, chartY + 31, 6, 6);
  ctx.fillStyle = '#94a3b8';
  ctx.fillText(`${pending}`, chartX + 95, chartY + 36);

  // Bottom stats
  ctx.fillStyle = '#94a3b8';
  ctx.fillText(`TOTAL: ${stats.totalTasks}`, 5, 115);
  ctx.fillText(`DONE: ${stats.completedTasks}`, 5, 128);

  const efficiency = stats.totalTasks > 0
    ? Math.round((stats.completedTasks / stats.totalTasks) * 100)
    : 0;
  ctx.fillStyle = efficiency > 50 ? '#10b981' : '#f59e0b';
  ctx.fillText(`${efficiency}%`, 140, 128);
}
