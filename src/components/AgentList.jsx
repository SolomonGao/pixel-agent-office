import { useState } from 'react';

const ROLE_ICONS = {
  claude: '🤖',
  subagent: '👤',
  tool: '🔧',
};

const STATE_TO_EXPRESSION = {
  idle: 'idle',
  thinking: 'thinking',
  working: 'coding',
  reading: 'reading',
  tool_use: 'tool_use',
  moving: 'moving',
  reporting: 'reporting',
};

const EXPRESSION_LABELS = {
  idle: 'Idle',
  thinking: 'Thinking',
  coding: 'Coding',
  reading: 'Reading',
  tool_use: 'Tool',
  moving: 'Moving',
  reporting: 'Done',
};

export default function AgentList({ agents, onAgentClick }) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  if (isCollapsed) {
    return (
      <div className="shrink-0 border-b border-[var(--border-color)]">
        <button
          onClick={() => setIsCollapsed(false)}
          className="w-full flex items-center justify-between px-3 py-2 text-xs hover:bg-[var(--bg-panel-hover)] transition-colors"
        >
          <span className="text-[var(--text-muted)]">👥 Agents ({agents.length})</span>
          <span className="text-[var(--text-muted)]">▼</span>
        </button>
      </div>
    );
  }

  return (
    <div className="shrink-0 border-b border-[var(--border-color)]">
      <button
        onClick={() => setIsCollapsed(true)}
        className="w-full flex items-center justify-between px-3 py-2 text-xs hover:bg-[var(--bg-panel-hover)] transition-colors"
      >
        <span className="text-[var(--text-secondary)] font-pixel text-[9px]">👥 AGENTS</span>
        <span className="text-[var(--text-muted)]">▲</span>
      </button>

      <div className="px-2 pb-2 space-y-1 max-h-32 overflow-y-auto scrollbar-pixel">
        {agents.map((agent) => {
          const role = agent.role || 'subagent';
          // Support both class instances (expression) and live mode (state)
          const expression = agent.expression || STATE_TO_EXPRESSION[agent.state] || 'idle';
          const exprLabel = EXPRESSION_LABELS[expression] || 'Idle';

          return (
            <button
              key={agent.id}
              onClick={() => onAgentClick?.(agent)}
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-[var(--bg-panel-hover)] transition-colors text-left"
            >
              {/* Color indicator */}
              <div
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{
                  backgroundColor: agent.color,
                  boxShadow: `0 0 4px ${agent.color}40`
                }}
              />

              {/* Icon + Name */}
              <span className="text-[10px]">{ROLE_ICONS[role] || '👤'}</span>
              <span className="text-[11px] text-[var(--text-primary)] truncate flex-1">
                {agent.name}
              </span>

              {/* Status pill */}
              <span className={`status-pill ${expression}`}>
                {exprLabel}
              </span>
            </button>
          );
        })}

        {agents.length === 0 && (
          <div className="text-center text-[var(--text-muted)] text-xs py-2">
            No agents yet...
          </div>
        )}
      </div>
    </div>
  );
}
