import { SPRITES, getPixelColor } from './sprites.js';

export class Agent {
  constructor(id, name, color, role) {
    this.id = id;
    this.name = name;
    this.color = color;
    this.role = role; // 'claude' | 'subagent' | 'tool'
    this.x = 0;
    this.y = 0;
    this.px = 0; // pixel position for smooth movement
    this.py = 0;
    this.targetX = null;
    this.targetY = null;
    this.state = 'idle';
    this.currentTask = null;
    this.path = [];
    this.pathIndex = 0;
    this.workProgress = 0;
    this.baseSpeed = 2;
    this.speed = this.baseSpeed;
    this.dialog = null;
    this.spriteName = role;
    this.tasksCompleted = 0;
    this.totalWorkTime = 0;
    this.stateTimer = 0;
    this.bounceOffset = 0;
  }

  update(dt, officeMap, messageBus, speedMultiplier = 1) {
    this.speed = this.baseSpeed * speedMultiplier;
    this.stateTimer += dt;
    this.bounceOffset = Math.sin(this.stateTimer * 0.003) * 1;

    switch (this.state) {
      case 'idle':
        this.onIdle(dt);
        break;
      case 'moving':
        this.onMoving(dt, officeMap);
        break;
      case 'working':
        this.onWorking(dt);
        break;
      case 'reporting':
        this.onReporting(dt, officeMap, messageBus);
        break;
    }

    // Update pixel position for smooth rendering
    const targetPx = this.x * officeMap.cellSize;
    const targetPy = this.y * officeMap.cellSize;
    this.px += (targetPx - this.px) * 0.15;
    this.py += (targetPy - this.py) * 0.15;

    // Check dialog expiry
    if (this.dialog && Date.now() > this.dialog.expiresAt) {
      this.dialog = null;
    }
  }

  onIdle(dt) {
    // Subclasses can override
  }

  onMoving(dt, officeMap) {
    if (this.path.length === 0 || this.pathIndex >= this.path.length) {
      this.state = this.currentTask ? 'working' : 'idle';
      this.path = [];
      this.pathIndex = 0;
      return;
    }

    const target = this.path[this.pathIndex];
    const dx = target.x - this.x;
    const dy = target.y - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 0.1) {
      this.x = target.x;
      this.y = target.y;
      this.pathIndex++;
    } else {
      const moveStep = (this.speed * dt) / 50;
      this.x += (dx / dist) * Math.min(moveStep, dist);
      this.y += (dy / dist) * Math.min(moveStep, dist);
    }
  }

  onWorking(dt) {
    if (!this.currentTask) {
      this.state = 'idle';
      return;
    }

    const workAmount = (dt / 1000) * 15;
    this.currentTask.updateProgress(workAmount);
    this.workProgress = this.currentTask.progress;
    this.totalWorkTime += dt;

    if (this.currentTask.status === 'completed') {
      this.tasksCompleted++;
      this.state = 'reporting';
      this.setDialog('Done! ✅', 2000);
    }
  }

  onReporting(dt, officeMap, messageBus) {
    // Default: go back to idle after a moment
    if (this.stateTimer > 1000) {
      this.state = 'idle';
      this.currentTask = null;
      this.workProgress = 0;
    }
  }

  moveTo(x, y, officeMap) {
    const start = { x: Math.round(this.x), y: Math.round(this.y) };
    const end = { x: Math.round(x), y: Math.round(y) };
    this.path = officeMap.findPath(start, end);
    this.pathIndex = 0;
    if (this.path.length > 0) {
      this.state = 'moving';
      return true;
    }
    return false;
  }

  setState(state) {
    this.state = state;
    this.stateTimer = 0;
  }

  setDialog(text, duration = 3000) {
    this.dialog = {
      text,
      expiresAt: Date.now() + duration,
      createdAt: Date.now()
    };
  }

  assignTask(task) {
    this.currentTask = task;
    task.assignedTo = this.id;
    task.status = 'inProgress';
    this.workProgress = 0;
  }

  getSprite() {
    return SPRITES[this.spriteName] || SPRITES.subagent;
  }

  getPosition() {
    return { x: this.px, y: this.py + this.bounceOffset };
  }

  getGridPosition() {
    return { x: Math.round(this.x), y: Math.round(this.y) };
  }
}
