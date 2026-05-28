import { useRef, useEffect } from 'react';

export default function ActivityLog({ logs }) {
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [logs]);

  return (
    <div className="flex flex-col h-full">
      <h2 className="text-xs text-white p-3 border-b border-pixel-border shrink-0">
        📡 LOGS
      </h2>
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto scrollbar-pixel p-2"
      >
        {logs.length === 0 && (
          <div className="text-center text-gray-600 text-xs py-8">
            Waiting for activity...
          </div>
        )}
        {logs.map((log, i) => (
          <div
            key={i}
            className="text-[8px] text-gray-400 mb-1 leading-relaxed font-mono"
          >
            {log}
          </div>
        ))}
      </div>
    </div>
  );
}
