export default function AgentList({ agents, onAgentClick }) {
  const stateLabels = {
    idle: { text: 'IDLE', color: 'bg-gray-500' },
    moving: { text: 'MOVE', color: 'bg-blue-500' },
    working: { text: 'WORK', color: 'bg-amber-500' },
    reporting: { text: 'DONE', color: 'bg-emerald-500' }
  };

  const roleLabels = {
    claude: { text: 'CL', color: 'text-indigo-400' },
    subagent: { text: 'SA', color: 'text-emerald-400' },
    tool: { text: 'TL', color: 'text-amber-400' }
  };

  return (
    <div className="flex flex-col h-48">
      <h2 className="text-xs text-white p-3 border-b border-pixel-border shrink-0">
        👥 AGENTS ({agents.length})
      </h2>
      <div className="flex-1 overflow-y-auto scrollbar-pixel p-2">
        {agents.map(agent => {
          const state = stateLabels[agent.state] || stateLabels.idle;
          const role = roleLabels[agent.role] || roleLabels.subagent;

          return (
            <div
              key={agent.id}
              onClick={() => onAgentClick?.(agent)}
              className="pixel-card text-xs cursor-pointer hover:bg-gray-800 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 border"
                    style={{ backgroundColor: agent.color, borderColor: agent.color }}
                  />
                  <div>
                    <div className="flex items-center gap-1">
                      <span className={`text-[8px] ${role.color}`}>{role.text}</span>
                      <span className="text-white">{agent.name}</span>
                    </div>
                    {agent.currentTask && (
                      <div className="text-[7px] text-gray-500 truncate max-w-32">
                        {agent.currentTask.description.substring(0, 20)}...
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-end">
                  <span className={`text-[7px] px-1 ${state.color} text-white`}>
                    {state.text}
                  </span>
                  <span className="text-[7px] text-gray-500 mt-0.5">
                    ✓{agent.tasksCompleted}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
