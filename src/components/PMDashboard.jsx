import { useState } from 'react';

export default function PMDashboard({ stats, agents, tasks, onClose }) {
  const [minimized, setMinimized] = useState(false);
  const [position, setPosition] = useState({ x: 20, y: 20 });
  const [dragging, setDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const handleMouseDown = (e) => {
    setDragging(true);
    setDragOffset({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    });
  };

  const handleMouseMove = (e) => {
    if (dragging) {
      setPosition({
        x: e.clientX - dragOffset.x,
        y: e.clientY - dragOffset.y
      });
    }
  };

  const handleMouseUp = () => {
    setDragging(false);
  };

  if (minimized) {
    return (
      <div
        className="fixed z-50 cursor-pointer"
        style={{ left: position.x, top: position.y }}
        onClick={() => setMinimized(false)}
      >
        <div className="pixel-btn primary text-lg p-2 animate-pulse">
          📊
        </div>
      </div>
    );
  }

  const activeAgents = agents.filter(a => a.state !== 'idle').length;
  const idleAgents = agents.filter(a => a.state === 'idle').length;
  const totalTasks = stats.totalTasks;
  const completedTasks = stats.completedTasks;
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Agent efficiency ranking
  const rankedAgents = [...agents]
    .filter(a => a.role !== 'claude')
    .sort((a, b) => b.tasksCompleted - a.tasksCompleted)
    .slice(0, 5);

  return (
    <div
      className="fixed z-50"
      style={{ left: position.x, top: position.y }}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <div className="pixel-border bg-pixel-panel w-72 shadow-2xl">
        {/* Header - draggable */}
        <div
          className="flex items-center justify-between p-2 border-b border-pixel-border cursor-move bg-pixel-darker"
          onMouseDown={handleMouseDown}
        >
          <span className="text-xs text-white">📊 PM DASHBOARD</span>
          <div className="flex gap-1">
            <button onClick={() => setMinimized(true)} className="text-gray-500 hover:text-white text-xs">
              ─
            </button>
            <button onClick={onClose} className="text-gray-500 hover:text-red-400 text-xs">
              ✕
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-3">
          {/* Progress */}
          <div className="mb-3">
            <div className="flex justify-between text-[8px] text-gray-400 mb-1">
              <span>PROJECT PROGRESS</span>
              <span>{completionRate}%</span>
            </div>
            <div className="w-full h-3 bg-gray-800 border border-gray-700">
              <div
                className="h-full bg-gradient-to-r from-indigo-600 to-emerald-500 transition-all"
                style={{ width: `${completionRate}%` }}
              />
            </div>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-2 mb-3">
            <div className="pixel-card text-center">
              <div className="text-[8px] text-gray-500">ACTIVE</div>
              <div className="text-lg text-blue-400">{activeAgents}</div>
            </div>
            <div className="pixel-card text-center">
              <div className="text-[8px] text-gray-500">IDLE</div>
              <div className="text-lg text-gray-400">{idleAgents}</div>
            </div>
            <div className="pixel-card text-center">
              <div className="text-[8px] text-gray-500">TASKS</div>
              <div className="text-lg text-amber-400">{totalTasks}</div>
            </div>
            <div className="pixel-card text-center">
              <div className="text-[8px] text-gray-500">DONE</div>
              <div className="text-lg text-emerald-400">{completedTasks}</div>
            </div>
          </div>

          {/* Task breakdown */}
          <div className="mb-3">
            <div className="text-[8px] text-gray-500 mb-1">TASK QUEUE</div>
            <div className="flex gap-1 text-[8px]">
              <span className="px-1 bg-amber-600 text-white">
                P:{tasks.pending.length}
              </span>
              <span className="px-1 bg-blue-600 text-white">
                IP:{tasks.inProgress.length}
              </span>
              <span className="px-1 bg-emerald-600 text-white">
                D:{tasks.completed.length}
              </span>
            </div>
          </div>

          {/* Agent leaderboard */}
          <div>
            <div className="text-[8px] text-gray-500 mb-1">🏆 TOP PERFORMERS</div>
            {rankedAgents.map((agent, i) => (
              <div key={agent.id} className="flex items-center justify-between text-[8px] mb-0.5">
                <div className="flex items-center gap-1">
                  <span className="text-gray-600 w-3">{i + 1}.</span>
                  <div
                    className="w-2 h-2"
                    style={{ backgroundColor: agent.color }}
                  />
                  <span className="text-gray-300">{agent.name}</span>
                </div>
                <span className="text-emerald-400">{agent.tasksCompleted}✓</span>
              </div>
            ))}
            {rankedAgents.length === 0 && (
              <div className="text-[8px] text-gray-600">No data yet...</div>
            )}
          </div>

          {/* System load bar */}
          <div className="mt-3">
            <div className="flex justify-between text-[8px] text-gray-500 mb-1">
              <span>SYSTEM LOAD</span>
              <span>{Math.round((activeAgents / Math.max(agents.length, 1)) * 100)}%</span>
            </div>
            <div className="w-full h-2 bg-gray-800">
              <div
                className="h-full bg-claude"
                style={{
                  width: `${(activeAgents / Math.max(agents.length, 1)) * 100}%`
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
