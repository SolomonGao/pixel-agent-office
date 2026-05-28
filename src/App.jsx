import { useState, useCallback } from 'react';
import { useLiveMode } from './hooks/useLiveMode.js';
import OfficeCanvas from './components/OfficeCanvas.jsx';
import AgentList from './components/AgentList.jsx';
import StatsPanel from './components/StatsPanel.jsx';
import ChatPanel from './components/ChatPanel.jsx';

export default function App() {
  const { connected, liveState, error } = useLiveMode(true);
  const [selectedAgent, setSelectedAgent] = useState(null);

  const agents = liveState?.agents || [];
  const messages = liveState?.messages || [];
  const chatMessages = liveState?.chatMessages || [];
  const stats = liveState?.stats || { totalTasks: 0, completedTasks: 0 };

  const handleAgentClick = useCallback((agent) => {
    setSelectedAgent(agent);
  }, []);

  const activeAgentsCount = agents.filter(a => a.state !== 'idle').length;

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden"
      style={{ background: 'var(--bg-primary)', fontFamily: "'Noto Sans SC', sans-serif" }}>

      {/* Header */}
      <header className="h-12 flex items-center justify-between px-4 shrink-0"
        style={{ background: 'var(--bg-panel)', borderBottom: '2px solid var(--border-color)' }}>
        <div className="flex items-center gap-3">
          <span className="text-lg animate-float-gentle">🤖</span>
          <h1 className="text-sm font-pixel tracking-wider" style={{ color: 'var(--text-primary)' }}>
            AI AGENT OFFICE
          </h1>
        </div>
        <div className="flex items-center gap-4">
          <span className={`text-[10px] ${connected ? 'text-emerald-400' : error ? 'text-red-400' : 'text-yellow-400'}`}>
            {connected ? '● LIVE' : error ? '● ERROR' : '● CONNECTING...'}
          </span>
          <div className="flex gap-4 text-xs" style={{ color: 'var(--text-muted)' }}>
            <span>
              ACTIVE: <span style={{ color: 'var(--accent-claude)' }}>{activeAgentsCount}</span>
            </span>
            <span>
              AGENTS: <span style={{ color: 'var(--accent-message)' }}>{agents.length}</span>
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex min-h-0">
        {/* Center - Canvas */}
        <section className="flex-1 flex flex-col min-w-0 relative p-2">
          <div className="flex-1 flex items-center justify-center rounded-lg overflow-hidden"
            style={{ background: 'var(--bg-secondary)' }}>
            <OfficeCanvas
              agents={agents}
              messages={messages}
              selectedAgent={selectedAgent}
              onAgentClick={handleAgentClick}
            />
          </div>

          {/* Bottom bar - minimal status */}
          <footer className="h-10 flex items-center justify-between px-3 mt-2 shrink-0 rounded"
            style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-color)' }}>
            <div className="flex items-center gap-3 text-[10px]" style={{ color: 'var(--text-muted)' }}>
              <span>Server: localhost:3001</span>
              {error && <span className="text-red-400">{error}</span>}
            </div>
            <div className="flex items-center gap-2 text-[10px]" style={{ color: 'var(--text-muted)' }}>
              <span>Tasks: {stats.totalTasks}</span>
              <span>Done: {stats.completedTasks}</span>
            </div>
          </footer>
        </section>

        {/* Right Panel - Chat & Stats */}
        <aside className="w-72 shrink-0 flex flex-col m-2 ml-0 rounded-lg overflow-hidden"
          style={{ background: 'var(--bg-panel)', border: '2px solid var(--border-color)' }}>
          <AgentList agents={agents} onAgentClick={handleAgentClick} />
          <div className="flex-1 min-h-0 flex flex-col"
            style={{ borderTop: '1px solid var(--border-color)' }}>
            <ChatPanel messages={chatMessages} />
          </div>
          <div className="h-28 shrink-0"
            style={{ borderTop: '1px solid var(--border-color)' }}>
            <StatsPanel stats={stats} agents={agents} />
          </div>
        </aside>
      </main>
    </div>
  );
}
