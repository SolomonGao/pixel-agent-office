import { useEffect, useState, useCallback } from 'react';
import { useOfficeState } from './hooks/useOfficeState.js';
import { useGameLoop } from './hooks/useGameLoop.js';
import OfficeCanvas from './components/OfficeCanvas.jsx';
import TaskBoard from './components/TaskBoard.jsx';
import AgentList from './components/AgentList.jsx';
import ActivityLog from './components/ActivityLog.jsx';
import StatsPanel from './components/StatsPanel.jsx';
import PMDashboard from './components/PMDashboard.jsx';

export default function App() {
  const {
    agents, tasks, messages, logs, stats, speed, isRunning,
    setSpeed, setIsRunning, addTask, spawnAgent, initOffice, update, addLog
  } = useOfficeState();

  const [showPMDashboard, setShowPMDashboard] = useState(true);
  const [selectedAgent, setSelectedAgent] = useState(null);

  useEffect(() => {
    initOffice();
    // Add a welcome task
    setTimeout(() => {
      addTask('Initialize pixel office visualization', 5, 'simple');
    }, 1000);
  }, [initOffice, addTask]);

  useGameLoop((dt) => {
    update(dt);
  }, isRunning, speed);

  const handleAddTask = useCallback((description, priority, type) => {
    addTask(description, priority, type);
  }, [addTask]);

  const handleAgentClick = useCallback((agent) => {
    setSelectedAgent(agent);
    addLog(`Selected agent: ${agent.name}`, 'info');
  }, [addLog]);

  const activeAgentsCount = agents.filter(a => a.state !== 'idle').length;

  return (
    <div className="h-screen w-screen flex flex-col bg-pixel-dark overflow-hidden font-pixel">
      {/* Header */}
      <header className="h-14 flex items-center justify-between px-4 border-b-2 border-pixel-border bg-pixel-panel shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-lg animate-float">🤖</span>
          <h1 className="text-sm text-white tracking-wider">AI AGENT OFFICE</h1>
        </div>
        <div className="flex gap-6 text-xs">
          <span className="text-gray-400">
            ACTIVE: <span className="text-claude">{activeAgentsCount}</span>
          </span>
          <span className="text-gray-400">
            TASKS: <span className="text-message">{tasks.inProgress.length}</span>
          </span>
          <span className="text-gray-400">
            DONE: <span className="text-subagent">{stats.completedTasks}</span>
          </span>
          <span className="text-gray-400">
            SPEED: <span className="text-tool">{speed}x</span>
          </span>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex min-h-0">
        {/* Left Panel - Task Board */}
        <aside className="w-80 border-r-2 border-pixel-border bg-pixel-panel flex flex-col shrink-0">
          <TaskBoard tasks={tasks} onAddTask={handleAddTask} />
        </aside>

        {/* Center - Canvas */}
        <section className="flex-1 flex flex-col min-w-0 relative">
          <div className="flex-1 flex items-center justify-center bg-pixel-darker relative overflow-hidden">
            <OfficeCanvas
              agents={agents}
              messages={messages}
              selectedAgent={selectedAgent}
              onAgentClick={handleAgentClick}
            />
          </div>

          {/* Bottom Controls */}
          <footer className="h-12 flex items-center justify-between px-4 border-t-2 border-pixel-border bg-pixel-panel shrink-0">
            <div className="flex gap-2">
              <button onClick={spawnAgent} className="pixel-btn">
                ➕ Subagent
              </button>
              <button
                onClick={() => setIsRunning(!isRunning)}
                className="pixel-btn"
              >
                {isRunning ? '⏸️ Pause' : '▶️ Play'}
              </button>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">SPEED</span>
              <input
                type="range"
                min="1"
                max="5"
                value={speed}
                onChange={(e) => setSpeed(Number(e.target.value))}
                className="w-24 accent-claude"
              />
              <button
                onClick={() => setShowPMDashboard(!showPMDashboard)}
                className="pixel-btn primary ml-2"
              >
                📊 PM
              </button>
            </div>
          </footer>
        </section>

        {/* Right Panel - Logs & Stats */}
        <aside className="w-72 border-l-2 border-pixel-border bg-pixel-panel flex flex-col shrink-0">
          <AgentList agents={agents} onAgentClick={handleAgentClick} />
          <div className="flex-1 min-h-0 flex flex-col border-t-2 border-pixel-border">
            <ActivityLog logs={logs} />
          </div>
          <div className="h-48 border-t-2 border-pixel-border">
            <StatsPanel stats={stats} agents={agents} tasks={tasks} />
          </div>
        </aside>
      </main>

      {/* PM Dashboard Overlay */}
      {showPMDashboard && (
        <PMDashboard
          stats={stats}
          agents={agents}
          tasks={tasks}
          onClose={() => setShowPMDashboard(false)}
        />
      )}
    </div>
  );
}
