import { useEffect, useState, useCallback } from 'react';
import { useOfficeState } from './hooks/useOfficeState.js';
import { useGameLoop } from './hooks/useGameLoop.js';
import { useLiveMode } from './hooks/useLiveMode.js';
import OfficeCanvas from './components/OfficeCanvas.jsx';
import AgentList from './components/AgentList.jsx';
import StatsPanel from './components/StatsPanel.jsx';
import PMDashboard from './components/PMDashboard.jsx';
import ChatPanel from './components/ChatPanel.jsx';

export default function App() {
  const sim = useOfficeState();
  const [liveMode, setLiveMode] = useState(false);
  const { connected, liveState, error } = useLiveMode(liveMode);
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [showPMDashboard, setShowPMDashboard] = useState(true);

  // Decide which state to use
  const isLive = liveMode && connected && liveState;
  const agents = isLive ? liveState.agents : sim.agents;
  const messages = isLive ? liveState.messages : sim.messages;
  const chatMessages = isLive ? liveState.chatMessages : [];
  const stats = isLive ? liveState.stats : sim.stats;
  const tasks = isLive ? liveState.tasks : sim.tasks;
  const speed = sim.speed;
  const isRunning = sim.isRunning;

  useEffect(() => {
    if (!liveMode) {
      sim.initOffice();
    }
  }, [liveMode, sim.initOffice]);

  // Simulation game loop (only when not in live mode)
  useGameLoop((dt) => {
    if (!liveMode) {
      sim.update(dt);
    }
  }, isRunning && !liveMode, speed);

  const handleAgentClick = useCallback((agent) => {
    setSelectedAgent(agent);
    if (!liveMode) {
      sim.addLog(`Selected agent: ${agent.name}`, 'info');
    }
  }, [liveMode, sim]);

  const activeAgentsCount = agents.filter(a => a.state !== 'idle').length;

  return (
    <div className="h-screen w-screen flex flex-col bg-pixel-dark overflow-hidden font-pixel">
      {/* Header */}
      <header className="h-14 flex items-center justify-between px-4 border-b-2 border-pixel-border bg-pixel-panel shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-lg animate-float">🤖</span>
          <h1 className="text-sm text-white tracking-wider">AI AGENT OFFICE</h1>
        </div>
        <div className="flex items-center gap-4">
          {/* Live mode toggle */}
          <button
            onClick={() => setLiveMode(!liveMode)}
            className={`pixel-btn text-[10px] ${liveMode ? 'bg-red-900 border-red-700' : 'bg-gray-800'}`}
          >
            {liveMode ? '🔴 LIVE' : '⚪ SIMULATION'}
          </button>
          {liveMode && (
            <span className={`text-[10px] ${connected ? 'text-emerald-400' : 'text-red-400'}`}>
              {connected ? '● CONNECTED' : error ? '● ERROR' : '● CONNECTING...'}
            </span>
          )}
          <div className="flex gap-4 text-xs">
            <span className="text-gray-400">
              ACTIVE: <span className="text-claude">{activeAgentsCount}</span>
            </span>
            <span className="text-gray-400">
              AGENTS: <span className="text-message">{agents.length}</span>
            </span>
            <span className="text-gray-400">
              DONE: <span className="text-subagent">{stats.completedTasks}</span>
            </span>
            {!liveMode && (
              <span className="text-gray-400">
                SPEED: <span className="text-tool">{speed}x</span>
              </span>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex min-h-0">
        {/* Center - Canvas (now takes full left+center space) */}
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
              {!liveMode && (
                <>
                  <button onClick={sim.spawnAgent} className="pixel-btn">
                    ➕ Subagent
                  </button>
                  <button
                    onClick={() => sim.setIsRunning(!sim.isRunning)}
                    className="pixel-btn"
                  >
                    {sim.isRunning ? '⏸️ Pause' : '▶️ Play'}
                  </button>
                </>
              )}
            </div>
            <div className="flex items-center gap-2">
              {!liveMode && (
                <>
                  <span className="text-xs text-gray-500">SPEED</span>
                  <input
                    type="range"
                    min="1"
                    max="5"
                    value={speed}
                    onChange={(e) => sim.setSpeed(Number(e.target.value))}
                    className="w-24 accent-claude"
                  />
                </>
              )}
              <button
                onClick={() => setShowPMDashboard(!showPMDashboard)}
                className="pixel-btn primary ml-2"
              >
                📊 PM
              </button>
            </div>
          </footer>
        </section>

        {/* Right Panel - Chat & Stats */}
        <aside className="w-80 border-l-2 border-pixel-border bg-pixel-panel flex flex-col shrink-0">
          <AgentList agents={agents} onAgentClick={handleAgentClick} />
          <div className="flex-1 min-h-0 flex flex-col border-t-2 border-pixel-border">
            <ChatPanel messages={chatMessages} />
          </div>
          <div className="h-40 border-t-2 border-pixel-border">
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
