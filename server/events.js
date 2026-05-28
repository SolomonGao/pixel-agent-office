import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const EVENTS_FILE = path.join(__dirname, '..', '.claude', 'agent-events.jsonl');

// Subagent desk positions on the office grid
const SUBAGENT_DESKS = [
  { x: 4, y: 9 }, { x: 9, y: 9 }, { x: 14, y: 9 },
  { x: 4, y: 14 }, { x: 9, y: 14 }
];

const CELL_SIZE = 20;

// Ensure .claude directory exists
const claudeDir = path.dirname(EVENTS_FILE);
if (!fs.existsSync(claudeDir)) {
  fs.mkdirSync(claudeDir, { recursive: true });
}

export class EventStore {
  constructor() {
    this.events = [];
    this.agents = new Map();
    this.tasks = new Map();
    this.messages = [];       // inter-agent/tool messages (for particle animation)
    this.chatMessages = [];   // user/assistant chat messages
    this.stats = { totalTasks: 0, completedTasks: 0 };
    this.deskAssignments = new Map(); // agentId -> desk index
    this.initClaudeAgent();
    this.loadEvents();
  }

  initClaudeAgent() {
    // Claude is always present at his desk
    this.agents.set('claude', {
      id: 'claude',
      name: 'Claude',
      role: 'claude',
      color: '#4f46e5',
      state: 'idle',
      tasksCompleted: 0,
      x: 19,
      y: 4,
      px: 19 * CELL_SIZE,
      py: 4 * CELL_SIZE,
    });
  }

  findFreeDesk() {
    for (let i = 0; i < SUBAGENT_DESKS.length; i++) {
      let taken = false;
      for (const [agentId, idx] of this.deskAssignments) {
        if (idx === i && this.agents.has(agentId)) {
          taken = true;
          break;
        }
      }
      if (!taken) return i;
    }
    return 0; // fallback: first desk
  }

  loadEvents() {
    if (!fs.existsSync(EVENTS_FILE)) return;
    const lines = fs.readFileSync(EVENTS_FILE, 'utf-8').split('\n').filter(Boolean);
    for (const line of lines) {
      try {
        const event = JSON.parse(line);
        this.processEvent(event);
      } catch {
        // skip invalid lines
      }
    }
  }

  processEvent(event) {
    this.events.push(event);
    const { type, data, timestamp } = event;

    switch (type) {
      case 'subagent_start': {
        const deskIndex = this.findFreeDesk();
        const desk = SUBAGENT_DESKS[deskIndex] || { x: 10, y: 10 };
        const agentName = data.name || data.agentType || data.type || `Agent-${data.agentId?.slice(0, 6) || '???'}`;
        this.agents.set(data.agentId, {
          id: data.agentId,
          name: agentName,
          role: 'subagent',
          color: data.color || '#10b981',
          state: 'idle',
          tasksCompleted: 0,
          startTime: timestamp,
          x: desk.x,
          y: desk.y,
          px: desk.x * CELL_SIZE,
          py: desk.y * CELL_SIZE,
        });
        this.deskAssignments.set(data.agentId, deskIndex);
        break;
      }

      case 'subagent_stop':
        if (this.agents.has(data.agentId)) {
          this.agents.delete(data.agentId);
        }
        this.deskAssignments.delete(data.agentId);
        break;

      case 'task_created':
        this.tasks.set(data.taskId, {
          id: data.taskId,
          description: data.description,
          status: 'pending',
          priority: data.priority || 3,
          type: data.taskType || 'simple',
          subtasks: data.subtasks || [],
          progress: 0,
          createdAt: timestamp,
        });
        this.stats.totalTasks++;
        break;

      case 'task_assigned':
        if (this.tasks.has(data.taskId)) {
          const task = this.tasks.get(data.taskId);
          task.status = 'inProgress';
          task.assignedTo = data.agentId;
          if (this.agents.has(data.agentId)) {
            this.agents.get(data.agentId).state = 'working';
          }
        }
        break;

      case 'task_completed':
        if (this.tasks.has(data.taskId)) {
          const task = this.tasks.get(data.taskId);
          task.status = 'completed';
          task.progress = 100;
          task.completedAt = timestamp;
          if (task.assignedTo && this.agents.has(task.assignedTo)) {
            const agent = this.agents.get(task.assignedTo);
            agent.tasksCompleted++;
            agent.state = 'idle';
          }
          this.stats.completedTasks++;
        }
        break;

      case 'tool_use': {
        const toolName = data.tool_name || data.tool || 'unknown';
        if (toolName === 'Bash' || toolName === 'Read' || toolName === 'Edit' || toolName === 'Write') {
          this.messages.push({
            id: Math.random().toString(36).substr(2, 9),
            from: data.agentId || 'claude',
            to: 'tool-server',
            type: 'tool_call',
            payload: { tool: toolName, input: data.tool_input || data.input || '' },
            timestamp,
          });
        }
        break;
      }

      case 'agent_message':
        this.messages.push({
          id: Math.random().toString(36).substr(2, 9),
          from: data.from,
          to: data.to,
          type: data.messageType || 'broadcast',
          payload: data.payload,
          timestamp,
        });
        break;

      case 'chat_message': {
        const chatMsg = {
          id: Math.random().toString(36).substr(2, 9),
          from: data.from || 'unknown',
          fromName: data.fromName || data.from || 'Unknown',
          fromRole: data.fromRole || 'user',
          content: data.content || '',
          context: data.context || 'default',
          timestamp: timestamp || new Date().toISOString(),
        };
        this.chatMessages.push(chatMsg);
        // Keep only last 50 chat messages
        if (this.chatMessages.length > 50) {
          this.chatMessages = this.chatMessages.slice(-50);
        }
        // Also set as dialog on the agent for bubble display
        const agentId = data.fromRole === 'claude' ? 'claude' : data.from;
        if (this.agents.has(agentId)) {
          const agent = this.agents.get(agentId);
          agent.dialog = data.content || '';
          agent.dialogExpiresAt = Date.now() + 8000; // 8 seconds
        }
        break;
      }
    }

    // Keep only last 100 events in memory
    if (this.events.length > 100) {
      this.events = this.events.slice(-100);
    }
  }

  appendEvent(type, data) {
    const event = {
      timestamp: new Date().toISOString(),
      type,
      data,
    };
    const line = JSON.stringify(event) + '\n';
    fs.appendFileSync(EVENTS_FILE, line);
    this.processEvent(event);
    return event;
  }

  getState() {
    // Clean up expired dialogs
    const now = Date.now();
    for (const agent of this.agents.values()) {
      if (agent.dialogExpiresAt && now > agent.dialogExpiresAt) {
        agent.dialog = null;
        agent.dialogExpiresAt = null;
      }
    }

    return {
      agents: Array.from(this.agents.values()),
      tasks: {
        pending: Array.from(this.tasks.values()).filter(t => t.status === 'pending'),
        inProgress: Array.from(this.tasks.values()).filter(t => t.status === 'inProgress'),
        completed: Array.from(this.tasks.values()).filter(t => t.status === 'completed'),
      },
      messages: this.messages.slice(-20),
      chatMessages: this.chatMessages.slice(-20),
      logs: this.events.slice(-50).map(e => {
        const time = new Date(e.timestamp).toLocaleTimeString('zh-CN', { hour12: false });
        const icons = {
          subagent_start: '🤖',
          subagent_stop: '👋',
          task_created: '🆕',
          task_assigned: '📤',
          task_completed: '✅',
          tool_use: '🛠️',
          agent_message: '💬',
          chat_message: '💬',
        };
        const icon = icons[e.type] || 'ℹ️';
        return `[${time}] ${icon} ${e.type}: ${JSON.stringify(e.data).substring(0, 60)}`;
      }),
      stats: { ...this.stats },
    };
  }

  clear() {
    this.events = [];
    this.agents.clear();
    this.tasks.clear();
    this.messages = [];
    this.chatMessages = [];
    this.stats = { totalTasks: 0, completedTasks: 0 };
    this.deskAssignments.clear();
    this.initClaudeAgent();
    if (fs.existsSync(EVENTS_FILE)) {
      fs.writeFileSync(EVENTS_FILE, '');
    }
  }
}
