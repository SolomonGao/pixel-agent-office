import { Agent } from './Agent.js';
import { Message } from './MessageBus.js';

const NAMES = ['Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon', 'Zeta', 'Eta', 'Theta'];
const COLORS = ['#10b981', '#06b6d4', '#8b5cf6', '#ec4899', '#f97316', '#14b8a6', '#a855f7', '#84cc16'];

export class Subagent extends Agent {
  static count = 0;

  constructor() {
    const idx = Subagent.count % NAMES.length;
    Subagent.count++;
    super(
      `sub-${Subagent.count}`,
      NAMES[idx],
      COLORS[idx],
      'subagent'
    );
    this.spriteName = 'subagent';
    this.specialty = ['code', 'search', 'analysis', 'design'][idx % 4];
    this.homePosition = null;
  }

  initPosition(index, officeMap) {
    const zone = officeMap.areas.subagentZone;
    const pos = zone[index % zone.length];
    this.homePosition = { x: pos.x, y: pos.y + 2 };
    this.x = this.homePosition.x;
    this.y = this.homePosition.y;
    this.px = this.x * officeMap.cellSize;
    this.py = this.y * officeMap.cellSize;
  }

  workOnTask(task, officeMap) {
    this.assignTask(task);
    if (task.type === 'tool' || task.description?.includes('tool')) {
      this.setExpression('tool_use');
    } else if (task.description?.includes('read') || task.description?.includes('search')) {
      this.setExpression('reading');
    } else {
      this.setExpression('coding');
    }
    this.setDialog(`Working on it... ⚒️`, 3000);
  }

  reportCompletion(messageBus) {
    if (this.currentTask) {
      messageBus.send(new Message(
        this.id,
        'claude-1',
        'report',
        { taskId: this.currentTask.id, status: 'completed' }
      ));
      this.setDialog('Task done! ✅', 2000);
    }
  }

  onIdle(dt) {
    // Gentle idle animation handled in base class
  }

  onReporting(dt, officeMap, messageBus) {
    // Return home after reporting
    if (this.homePosition && this.stateTimer > 300) {
      if (Math.abs(this.x - this.homePosition.x) > 0.5 ||
          Math.abs(this.y - this.homePosition.y) > 0.5) {
        this.moveTo(this.homePosition.x, this.homePosition.y, officeMap);
      } else {
        this.state = 'idle';
        this.currentTask = null;
        this.workProgress = 0;
      }
    }
  }
}
