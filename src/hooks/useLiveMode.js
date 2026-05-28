import { useState, useEffect, useRef, useCallback } from 'react';

const WS_URL = 'ws://localhost:3001/ws';
const API_URL = 'http://localhost:3001/api';

export function useLiveMode(enabled) {
  const [connected, setConnected] = useState(false);
  const [liveState, setLiveState] = useState(null);
  const [error, setError] = useState(null);
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const intentionalCloseRef = useRef(false);
  const enabledRef = useRef(enabled);
  const connectedRef = useRef(false);

  // Keep refs in sync to avoid stale closures in WebSocket handlers
  enabledRef.current = enabled;
  connectedRef.current = connected;

  const clearReconnectTimer = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  }, []);

  const connect = useCallback(() => {
    // Use ref for latest value, not the stale closure
    if (!enabledRef.current) return;

    // Prevent multiple concurrent connection attempts
    if (wsRef.current) return;

    // Clear any pending reconnect before creating a new socket
    clearReconnectTimer();

    try {
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;
      intentionalCloseRef.current = false;

      ws.onopen = () => {
        setConnected(true);
        setError(null);
        console.log('🔌 Connected to Pixel Office Server');
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'state') {
            setLiveState(data.payload);
          } else if (data.type === 'event') {
            setLiveState(prev => {
              if (!prev) return prev;
              return mergeEvent(prev, data.payload);
            });
          } else if (data.type === 'clear') {
            setLiveState(null);
          }
        } catch (err) {
          console.error('WebSocket message error:', err);
        }
      };

      ws.onclose = () => {
        setConnected(false);

        // Only clear the ref if this socket is still the current one
        if (wsRef.current === ws) {
          wsRef.current = null;
        }

        // Do NOT reconnect if disconnect() was called intentionally
        if (!intentionalCloseRef.current && enabledRef.current) {
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, 3000);
        }
      };

      ws.onerror = () => {
        setError('Connection failed');
        setConnected(false);
      };
    } catch (err) {
      setError(err.message);
    }
  }, [clearReconnectTimer]);

  const disconnect = useCallback(() => {
    clearReconnectTimer();

    const ws = wsRef.current;
    if (!ws) return;

    // Mark that we are intentionally closing so onclose doesn't reconnect
    intentionalCloseRef.current = true;

    // Detach handlers to prevent stale closure callbacks from firing
    ws.onopen = null;
    ws.onmessage = null;
    ws.onclose = null;
    ws.onerror = null;

    // Only close if not already closed or closing
    if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
      ws.close();
    }

    // Only clear the ref if this socket is still the current one
    if (wsRef.current === ws) {
      wsRef.current = null;
    }

    setConnected(false);
  }, [clearReconnectTimer]);

  // Poll fallback if WebSocket fails
  const pollState = useCallback(async () => {
    if (!enabledRef.current || connectedRef.current) return;
    try {
      const res = await fetch(`${API_URL}/state`);
      if (res.ok) {
        const state = await res.json();
        setLiveState(state);
      }
    } catch {
      // Server not running
    }
  }, []);

  useEffect(() => {
    if (enabled) {
      connect();
      const interval = setInterval(pollState, 1000);
      return () => {
        disconnect();
        clearInterval(interval);
      };
    } else {
      disconnect();
      setLiveState(null);
    }
  }, [enabled, connect, disconnect, pollState]);

  const sendEvent = useCallback(async (type, data) => {
    try {
      await fetch(`${API_URL}/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, data }),
      });
    } catch (err) {
      console.error('Failed to send event:', err);
    }
  }, []);

  return { connected, liveState, error, sendEvent };
}

function mergeEvent(state, event) {
  const newState = { ...state };
  const { type, data } = event;

  switch (type) {
    case 'subagent_start':
      newState.agents = [...newState.agents, {
        id: data.agentId,
        name: data.name || data.agentId,
        role: 'subagent',
        color: data.color || '#10b981',
        state: 'idle',
        tasksCompleted: 0,
      }];
      break;

    case 'subagent_stop':
      newState.agents = newState.agents.filter(a => a.id !== data.agentId);
      break;

    case 'task_created':
      newState.tasks.pending = [...newState.tasks.pending, {
        id: data.taskId,
        description: data.description,
        status: 'pending',
        priority: data.priority || 3,
        type: data.taskType || 'simple',
      }];
      newState.stats = { ...newState.stats, totalTasks: newState.stats.totalTasks + 1 };
      break;

    case 'task_completed':
      newState.tasks.inProgress = newState.tasks.inProgress.filter(t => t.id !== data.taskId);
      const completedTask = newState.tasks.pending.find(t => t.id === data.taskId) ||
                            newState.tasks.inProgress.find(t => t.id === data.taskId);
      if (completedTask) {
        newState.tasks.completed = [...newState.tasks.completed, { ...completedTask, status: 'completed' }];
      }
      newState.stats = { ...newState.stats, completedTasks: newState.stats.completedTasks + 1 };
      break;

    case 'tool_use':
      newState.messages = [...newState.messages.slice(-19), {
        id: Math.random().toString(36).substr(2, 9),
        from: data.agentId || 'claude',
        to: 'tool-server',
        type: 'tool_call',
        payload: { tool: data.tool, input: data.input },
      }];
      break;

    case 'chat_message': {
      const chatMsg = {
        id: Math.random().toString(36).substr(2, 9),
        from: data.from || 'unknown',
        fromName: data.fromName || data.from || 'Unknown',
        fromRole: data.fromRole || 'user',
        content: data.content || '',
        context: data.context || 'default',
        timestamp: data.timestamp || new Date().toISOString(),
      };
      newState.chatMessages = [...(newState.chatMessages || []).slice(-19), chatMsg];
      // Update agent dialog for bubble display
      const agentId = data.fromRole === 'claude' ? 'claude' : data.from;
      const agentIdx = newState.agents.findIndex(a => a.id === agentId);
      if (agentIdx >= 0) {
        newState.agents = newState.agents.map((a, i) =>
          i === agentIdx ? { ...a, dialog: data.content || '', dialogExpiresAt: Date.now() + 8000 } : a
        );
      }
      break;
    }
  }

  return newState;
}
