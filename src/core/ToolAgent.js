import { Agent } from './Agent.js';
import { Message } from './MessageBus.js';

const TOOLS = ['file_read', 'web_search', 'code_exec', 'bash', 'grep', 'glob'];

export class ToolAgent extends Agent {
  constructor(id = 'tool-1') {
    super(id, 'ToolBot', '#f59e0b', 'tool');
    this.spriteName = 'toolAgent';
    this.availableTools = [...TOOLS];
  }

  initPosition(officeMap) {
    const server = officeMap.areas.toolServer;
    this.x = server.x - 2;
    this.y = server.y + 2;
    this.px = this.x * officeMap.cellSize;
    this.py = this.y * officeMap.cellSize;
  }

  executeTool(toolName, params, messageBus) {
    const tool = this.availableTools.find(t => t === toolName) || this.availableTools[0];
    this.setDialog(`${tool}()... 🛠️`, 2000);

    // Simulate tool execution time
    setTimeout(() => {
      messageBus.send(new Message(
        this.id,
        'claude-1',
        'result',
        { tool, params, result: `Output from ${tool}` }
      ));
      this.setDialog(`${tool} done! ✓`, 1500);
    }, 1200);
  }

  workOnTask(task, officeMap, messageBus) {
    this.assignTask(task);
    if (task.type === 'tool') {
      const toolName = task.description.split(' ')[0] || 'file_read';
      this.executeTool(toolName, { query: task.description }, messageBus);
    } else {
      this.setDialog('Processing... ⚙️', 3000);
    }
  }

  onReporting(dt, officeMap, messageBus) {
    if (this.stateTimer > 800) {
      this.state = 'idle';
      this.currentTask = null;
      this.workProgress = 0;
    }
  }
}
