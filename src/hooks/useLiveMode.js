import { useState, useEffect, useRef, useCallback } from 'react';

const WS_URL = 'ws://localhost:3001/ws';
const API_URL = 'http://localhost:3001/api';

export function useLiveMode(enabled) {
  const [connected, setConnected] = useState(false);
  const [liveState, setLiveState] = useState(null);
  const [error, setError] = useState(null);
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);

  const connect = useCallback(() => {
    if (!enabled) return;

    try {
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

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
            // Merge new event into state
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
        wsRef.current = null;
        // Auto reconnect after 3s
        reconnectTimeoutRef.current = setTimeout(() => {
          if (enabled) connect();
        }, 3000);
      };

      ws.onerror = (err) => {
        setError('Connection failed');
        setConnected(false);
      };
    } catch (err) {
      setError(err.message);
    }
  }, [enabled]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setConnected(false);
  }, []);

  // Poll fallback if WebSocket fails
  const pollState = useCallback(async () => {
    if (!enabled || connected) return;
    try {
      const res = await fetch(`${API_URL}/state`);
      if (res.ok) {
        const state = await res.json();
        setLiveState(state);
      }
    } catch {
      // Server not running
    }
  }, [enabled, connected]);

  useEffect(() => {
    if (enabled) {
      connect();
      // Poll as fallback
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
  }

  return newState;
}
