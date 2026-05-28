import { useRef, useEffect } from 'react';

const ROLE_COLORS = {
  user: 'border-l-emerald-500 bg-emerald-900/20',
  claude: 'border-l-indigo-500 bg-indigo-900/20',
  subagent: 'border-l-amber-500 bg-amber-900/20',
  system: 'border-l-gray-500 bg-gray-800/30',
};

const ROLE_ICONS = {
  user: '👤',
  claude: '🤖',
  subagent: '🦾',
  system: '⚙️',
};

const ROLE_NAMES = {
  user: 'You',
  claude: 'Claude',
  subagent: 'Agent',
  system: 'System',
};

export default function ChatPanel({ messages = [], onClose }) {
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const formatTime = (ts) => {
    if (!ts) return '';
    try {
      const d = new Date(ts);
      return d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
    } catch {
      return '';
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2 border-b border-pixel-border shrink-0">
        <h2 className="text-xs text-white">💬 CHAT</h2>
        {onClose && (
          <button onClick={onClose} className="text-gray-500 hover:text-white text-xs">✕</button>
        )}
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto scrollbar-pixel p-2 space-y-2">
        {messages.length === 0 && (
          <div className="text-center text-gray-600 text-xs py-8">
            No messages yet...
          </div>
        )}

        {messages.map((msg) => {
          const role = msg.fromRole || 'user';
          const colorClass = ROLE_COLORS[role] || ROLE_COLORS.system;
          const icon = ROLE_ICONS[role] || '💬';
          const name = msg.fromName || ROLE_NAMES[role] || msg.from || 'Unknown';

          return (
            <div
              key={msg.id}
              className={`pixel-card border-l-4 ${colorClass} text-xs`}
            >
              <div className="flex items-center gap-1.5 mb-1">
                <span className="text-[10px]">{icon}</span>
                <span className="text-[10px] font-bold text-gray-300">{name}</span>
                <span className="text-[8px] text-gray-600 ml-auto">{formatTime(msg.timestamp)}</span>
              </div>
              <p className="text-gray-200 text-[11px] leading-relaxed whitespace-pre-wrap break-words">
                {msg.content}
              </p>
              {msg.context && msg.context !== 'default' && (
                <span className="inline-block mt-1 px-1 py-0.5 text-[8px] bg-gray-800 text-gray-500 rounded">
                  {msg.context}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
