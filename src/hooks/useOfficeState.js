import { useState, useCallback, useRef, useEffect } from 'react';
import { Claude } from '../core/Claude.js';
import { Subagent } from '../core/Subagent.js';
import { ToolAgent } from '../core/ToolAgent.js';
import { Task, TaskQueue } from '../core/Task.js';
import { OfficeMap } from '../core/OfficeMap.js';
import { MessageBus } from '../core/MessageBus.js';

export function useOfficeState() {
  const [uiState, setUiState] = useState({
    agents: [],
    tasks: { pending: [], inProgress: [], completed: [] },
    messages: [],
    logs: [],
    stats: { totalTasks: 0, completedTasks: 0 },
  });

  const [speed, setSpeed] = useState(2);
  const [isRunning, setIsRunning] = useState(true);

  // All mutable game state lives in refs
  const officeMapRef = useRef(new OfficeMap());
  const messageBusRef = useRef(new MessageBus());
  const agentsRef = useRef([]);
  const taskQueueRef = useRef(new TaskQueue());
  const tasksRef = useRef({ pending: [], inProgress: [], completed: [] });
  const logsRef = useRef([]);
  const statsRef = useRef({ totalTasks: 0, completedTasks: 0 });
  const frameCountRef = useRef(0);
  const initializedRef = useRef(false);

  const syncUi = useCallback(() => {
    setUiState({
      agents: [...agentsRef.current],
      tasks: {
        pending: [...tasksRef.current.pending],
        inProgress: [...tasksRef.current.inProgress],
        completed: [...tasksRef.current.completed],
      },
      messages: messageBusRef.current.getActiveMessages(),
      logs: [...logsRef.current],
      stats: { ...statsRef.current },
    });
  }, []);

  const addLog = useCallback((message, type = 'info') => {
    const icons = {
      task: '🆕', assign: '📤', move: '🏃', work: '⚒️',
      complete: '✅', message: '💬', tool: '🛠️',
      info: 'ℹ️', spawn: '🤖', error: '❌'
    };
    const icon = icons[type] || icons.info;
    const timestamp = new Date().toLocaleTimeString('zh-CN', { hour12: false });
    const entry = `[${timestamp}] ${icon} ${message}`;
    logsRef.current = [entry, ...logsRef.current].slice(0, 100);
  }, []);

  const initOffice = useCallback(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    const officeMap = officeMapRef.current;
    const messageBus = messageBusRef.current;

    const claude = new Claude();
    claude.initPosition(officeMap);

    const toolAgent = new ToolAgent();
    toolAgent.initPosition(officeMap);

    const initialAgents = [claude, toolAgent];
    for (let i = 0; i < 3; i++) {
      const sub = new Subagent();
      sub.initPosition(i, officeMap);
      initialAgents.push(sub);
    }

    agentsRef.current = initialAgents;

    // Handle message delivery
    messageBus.onDelivered = (msg) => {
      addLog(`${msg.from} → ${msg.to || 'all'}: ${msg.type}`, 'message');

      const payload = msg.payload;
      if (!payload) return;

      if (payload.action === 'assign' && payload.task) {
        assignTaskToAgentRef(payload.task);
      } else if (payload.action === 'assign_complex' && payload.subtasks) {
        const idleSubs = agentsRef.current.filter(a => a.role === 'subagent' && a.state === 'idle');
        payload.subtasks.forEach((subtask, i) => {
          if (idleSubs[i]) assignTaskToAgentRef(subtask, idleSubs[i]);
        });
      } else if (msg.type === 'report') {
        addLog(`Task completed`, 'complete');
      }
    };

    addLog('Office initialized: Claude + 3 Subagents + 1 ToolAgent', 'spawn');
    syncUi();

    // Welcome task
    setTimeout(() => {
      addTaskRef('Initialize pixel office visualization', 5, 'simple');
    }, 1000);
  }, [addLog, syncUi]);

  function assignTaskToAgentRef(task, specificAgent = null) {
    const agentsList = agentsRef.current;
    const officeMap = officeMapRef.current;

    let agent;
    if (specificAgent) {
      agent = specificAgent;
    } else if (task.type === 'tool') {
      agent = agentsList.find(a => a.role === 'tool' && a.state === 'idle');
    } else {
      agent = agentsList.find(a => a.role === 'subagent' && a.state === 'idle');
    }

    if (!agent) {
      taskQueueRef.current.enqueue(task);
      addLog(`Task queued (no idle agents)`, 'info');
      return;
    }

    agent.assignTask(task);

    if (agent.role === 'subagent') {
      const subs = agentsList.filter(a => a.role === 'subagent');
      const idx = subs.indexOf(agent);
      const zone = officeMap.areas.subagentZone;
      const spot = zone[idx % zone.length];
      agent.moveTo(spot.x, spot.y + 1, officeMap);
    } else if (agent.role === 'tool') {
      agent.moveTo(officeMap.areas.toolServer.x - 2, officeMap.areas.toolServer.y + 3, officeMap);
    }

    // Move task from pending to inProgress
    tasksRef.current.pending = tasksRef.current.pending.filter(t => t.id !== task.id);
    tasksRef.current.inProgress = [...tasksRef.current.inProgress, task];

    addLog(`${agent.name} assigned task`, 'assign');
  }

  function addTaskRef(description, priority = 1, type = 'simple') {
    const task = new Task(description, priority, type);
    tasksRef.current.pending = [...tasksRef.current.pending, task];
    statsRef.current.totalTasks++;
    addLog(`New task: "${description}"`, 'task');

    const claude = agentsRef.current.find(a => a.role === 'claude');
    if (claude) {
      claude.receiveTask(task, messageBusRef.current);
    }
  }

  const addTask = useCallback((description, priority, type) => {
    addTaskRef(description, priority, type);
    syncUi();
  }, [syncUi]);

  const spawnAgent = useCallback(() => {
    const officeMap = officeMapRef.current;
    const newSub = new Subagent();
    const subCount = agentsRef.current.filter(a => a.role === 'subagent').length;
    newSub.initPosition(subCount, officeMap);
    agentsRef.current = [...agentsRef.current, newSub];
    addLog(`${newSub.name} joined the team!`, 'spawn');
    syncUi();
  }, [addLog, syncUi]);

  const update = useCallback((dt) => {
    const officeMap = officeMapRef.current;
    const messageBus = messageBusRef.current;
    const agentsList = agentsRef.current;

    frameCountRef.current++;

    // Update message bus
    messageBus.update(dt);

    // Update agents
    let anyTaskCompleted = false;
    for (const agent of agentsList) {
      agent.update(dt, officeMap, messageBus, speed);

      if (agent.state === 'reporting' && agent.currentTask?.status === 'completed') {
        if (agent.role === 'subagent') {
          agent.reportCompletion(messageBus);
        }
        agent.state = 'idle';
        agent.currentTask = null;
        agent.workProgress = 0;
        anyTaskCompleted = true;
      }
    }

    // Check for completed tasks in inProgress
    const completedTasks = tasksRef.current.inProgress.filter(t => t.status === 'completed');
    if (completedTasks.length > 0) {
      tasksRef.current.inProgress = tasksRef.current.inProgress.filter(t => t.status !== 'completed');
      tasksRef.current.completed = [...tasksRef.current.completed, ...completedTasks];
      statsRef.current.completedTasks += completedTasks.length;
      anyTaskCompleted = true;
    }

    // Check queued tasks
    if (taskQueueRef.current.length > 0) {
      const idleSub = agentsList.find(a => a.role === 'subagent' && a.state === 'idle');
      if (idleSub) {
        const nextTask = taskQueueRef.current.dequeue();
        if (nextTask) assignTaskToAgentRef(nextTask);
      }
    }

    // Sync UI every 5 frames (~12fps UI updates)
    if (frameCountRef.current % 5 === 0 || anyTaskCompleted) {
      syncUi();
    }
  }, [speed, syncUi]);

  // Expose ref-based state for direct canvas access
  return {
    ...uiState,
    speed,
    isRunning,
    agentsRef,
    officeMap: officeMapRef.current,
    messageBus: messageBusRef.current,
    setSpeed,
    setIsRunning,
    addTask,
    spawnAgent,
    initOffice,
    update,
    addLog,
  };
}
