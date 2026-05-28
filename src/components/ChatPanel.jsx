import { useRef, useEffect } from 'react';

const ROLE_CONFIG = {
  user: {
    icon: '👤',
    name: 'You',
    bubbleClass: 'chat-bubble-user',
    align: 'items-end',
  },
  claude: {
    icon: '🤖',
    name: 'Claude',
    bubbleClass: 'chat-bubble-claude',
    align: 'items-start',
  },
  subagent: {
    icon: '👤',
    name: 'Agent',
    bubbleClass: 'chat-bubble-user',
    align: 'items-start',
  },
  system: {
    icon: '⚙️',
    name: 'System',
    bubbleClass: 'chat-bubble-claude',
    align: 'items-center',
  },
};

export default function ChatPanel({ messages = [] }) {
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
      return d.toLocaleTimeString('zh-CN', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });
    } catch {
      return '';
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--border-color)] shrink-0">
        <h2 className="text-[9px] text-[var(--text-secondary)] font-pixel">💬 CHAT</h2>
        <span className="text-[9px] text-[var(--text-muted)]">
          {messages.length} msgs
        </span>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto scrollbar-pixel p-3 space-y-3">
        {messages.length === 0 && (
          <div className="text-center text-[var(--text-muted)] text-xs py-8">
            No messages yet...
          </div>
        )}

        {messages.map((msg) => {
          const role = msg.fromRole || 'user';
          const config = ROLE_CONFIG[role] || ROLE_CONFIG.system;
          const isUser = role === 'user';

          return (
            <div key={msg.id} className={`flex flex-col ${config.align}`}>
              {/* Sender info */}
              <div className={`flex items-center gap-1.5 mb-1 ${isUser ? 'flex-row-reverse' : ''}`}>
                <span className="text-[10px]">{config.icon}</span>
                <span className="text-[10px] font-bold text-[var(--text-secondary)]">
                  {msg.fromName || config.name}
                </span>
                <span className="text-[8px] text-[var(--text-muted)]">
                  {formatTime(msg.timestamp)}
                </span>
              </div>

              {/* Message bubble */}
              <div
                className={`max-w-[85%] px-3 py-2 rounded-lg text-xs leading-relaxed ${config.bubbleClass}`}
                style={{
                  boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                }}
              >
                <p className="text-[var(--text-primary)] whitespace-pre-wrap break-words">
                  {msg.content}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
