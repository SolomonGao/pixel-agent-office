import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const EVENTS_FILE = path.join(__dirname, '..', '.claude', 'agent-events.jsonl');

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
    this.messages = [];
    this.stats = { totalTasks: 0, completedTasks: 0 };
    this.loadEvents();
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
      case 'subagent_start':
        this.agents.set(data.agentId, {
          id: data.agentId,
          name: data.name || data.agentId,
          role: 'subagent',
          color: data.color || '#10b981',
          state: 'idle',
          tasksCompleted: 0,
          startTime: timestamp,
        });
        break;

      case 'subagent_stop':
        if (this.agents.has(data.agentId)) {
          const agent = this.agents.get(data.agentId);
          agent.state = 'idle';
        }
        break;

      case 'task_created':
        this.tasks.set(data.taskId, {
          id: data.taskId,
          description: data.description,
          status: 'pending',
          priority: data.priority || 3,
          type: data.taskType || 'simple',
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
          task.completedAt = timestamp;
          if (task.assignedTo && this.agents.has(task.assignedTo)) {
            const agent = this.agents.get(task.assignedTo);
            agent.tasksCompleted++;
            agent.state = 'idle';
          }
          this.stats.completedTasks++;
        }
        break;

      case 'tool_use':
        if (data.tool === 'Bash') {
          this.messages.push({
            id: Math.random().toString(36).substr(2, 9),
            from: data.agentId || 'claude',
            to: 'tool-server',
            type: 'tool_call',
            payload: { tool: data.tool, input: data.input },
            timestamp,
          });
        }
        break;

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
    return {
      agents: Array.from(this.agents.values()),
      tasks: {
        pending: Array.from(this.tasks.values()).filter(t => t.status === 'pending'),
        inProgress: Array.from(this.tasks.values()).filter(t => t.status === 'inProgress'),
        completed: Array.from(this.tasks.values()).filter(t => t.status === 'completed'),
      },
      messages: this.messages.slice(-20),
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
    this.stats = { totalTasks: 0, completedTasks: 0 };
    if (fs.existsSync(EVENTS_FILE)) {
      fs.writeFileSync(EVENTS_FILE, '');
    }
  }
}
