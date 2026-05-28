import { Agent } from './Agent.js';
import { Task } from './Task.js';
import { Message } from './MessageBus.js';

export class Claude extends Agent {
  constructor() {
    super('claude-1', 'Claude', '#4f46e5', 'claude');
    this.spriteName = 'claude';
    this.analysisQueue = [];
  }

  initPosition(officeMap) {
    const desk = officeMap.areas.claudeDesk;
    this.x = desk.x;
    this.y = desk.y + 2;
    this.px = this.x * officeMap.cellSize;
    this.py = this.y * officeMap.cellSize;
  }

  receiveTask(task, messageBus) {
    this.analysisQueue.push(task);
    this.setDialog(`Analyzing: ${task.description.substring(0, 15)}...`, 2000);

    // Simulate analysis time
    setTimeout(() => {
      this.analyzeAndRoute(task, messageBus);
    }, 800);
  }

  analyzeAndRoute(task, messageBus) {
    // Determine if task is complex based on description length and keywords
    const complexKeywords = ['complex', 'difficult', 'multiple', 'analyze', 'research', 'build', 'create', 'implement'];
    const isComplex = complexKeywords.some(kw => task.description.toLowerCase().includes(kw)) || task.description.length > 20;

    if (isComplex && task.type !== 'tool') {
      task.type = 'complex';
      // Split into subtasks
      const subCount = Math.min(2 + Math.floor(Math.random() * 2), 4);
      for (let i = 0; i < subCount; i++) {
        const subDesc = `Subtask ${i + 1}: ${task.description}`;
        task.addSubtask(subDesc);
      }
      this.setDialog(`Split into ${subCount} subtasks 📋`, 2000);

      // Broadcast task assignment
      messageBus.send(new Message(
        this.id,
        'all',
        'broadcast',
        { action: 'assign_complex', task, subtasks: task.subtasks }
      ));
    } else {
      messageBus.send(new Message(
        this.id,
        'all',
        'task',
        { action: 'assign', task }
      ));
    }

    this.analysisQueue = this.analysisQueue.filter(t => t.id !== task.id);
  }

  onReporting(dt, officeMap, messageBus) {
    // Claude doesn't move, just reports via message
    if (this.stateTimer > 500) {
      this.state = 'idle';
      this.currentTask = null;
      this.workProgress = 0;
    }
  }
}
