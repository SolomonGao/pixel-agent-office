import { SPRITES, getPixelColor } from './sprites.js';

// Expression types with emoji icons and animation behaviors
export const EXPRESSIONS = {
  idle:     { emoji: '',  anim: 'breathe',  glow: false, colorShift: 0 },
  thinking: { emoji: '\u{1F4AD}', anim: 'float',    glow: true,  colorShift: 20 },
  coding:   { emoji: '\u{1F4BB}', anim: 'type',     glow: true,  colorShift: -10 },
  reading:  { emoji: '\u{1F4D6}', anim: 'lean',     glow: false, colorShift: 10 },
  tool_use: { emoji: '\u{1F6E0}', anim: 'cast',     glow: true,  colorShift: 30 },
  moving:   { emoji: '\u{1F6B6}', anim: 'walk',     glow: false, colorShift: 0 },
  reporting:{ emoji: '\u{2728}',  anim: 'jump',     glow: true,  colorShift: 40 },
};

export class Agent {
  constructor(id, name, color, role) {
    this.id = id;
    this.name = name;
    this.color = color;
    this.role = role;
    this.x = 0;
    this.y = 0;
    this.px = 0;
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

    // Expression system
    this.expression = 'idle';
    this.expressionTimer = 0;
    this.blinkTimer = Math.random() * 3000;
    this.isBlinking = false;
    this.animOffset = { x: 0, y: 0 };
    this.animPhase = Math.random() * Math.PI * 2;
  }

  update(dt, officeMap, messageBus, speedMultiplier = 1) {
    this.speed = this.baseSpeed * speedMultiplier;
    this.stateTimer += dt;
    this.expressionTimer += dt;
    this.blinkTimer -= dt;
    this.animPhase += dt * 0.003;

    // Blink logic
    if (this.blinkTimer <= 0) {
      this.isBlinking = true;
      if (this.blinkTimer <= -150) {
        this.isBlinking = false;
        this.blinkTimer = 2000 + Math.random() * 4000;
      }
    }

    // Animation offsets based on expression
    this.updateAnimation(dt);

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

    // Bounce
    this.bounceOffset = Math.sin(this.stateTimer * 0.003 + this.animPhase) * 1;

    // Check dialog expiry
    if (this.dialog && Date.now() > this.dialog.expiresAt) {
      this.dialog = null;
    }
  }

  updateAnimation(dt) {
    const expr = EXPRESSIONS[this.expression] || EXPRESSIONS.idle;
    const phase = this.animPhase;

    switch (expr.anim) {
      case 'breathe':
        this.animOffset.x = 0;
        this.animOffset.y = Math.sin(phase) * 0.5;
        break;
      case 'float':
        this.animOffset.x = Math.sin(phase * 0.5) * 1;
        this.animOffset.y = Math.sin(phase * 0.7) * 2 - 1;
        break;
      case 'type':
        this.animOffset.x = Math.sin(phase * 8) * 0.8;
        this.animOffset.y = Math.abs(Math.sin(phase * 6)) * -1;
        break;
      case 'lean':
        this.animOffset.x = Math.sin(phase * 0.3) * 2 + 2;
        this.animOffset.y = Math.sin(phase * 0.5) * 0.5;
        break;
      case 'cast':
        this.animOffset.x = Math.sin(phase * 3) * 2;
        this.animOffset.y = Math.sin(phase * 2) * -3;
        break;
      case 'walk':
        this.animOffset.x = Math.sin(phase * 4) * 1.5;
        this.animOffset.y = Math.abs(Math.sin(phase * 4)) * -1.5;
        break;
      case 'jump':
        this.animOffset.x = 0;
        this.animOffset.y = Math.abs(Math.sin(phase * 3)) * -4;
        break;
      default:
        this.animOffset.x = 0;
        this.animOffset.y = 0;
    }
  }

  setExpression(expression) {
    if (EXPRESSIONS[expression] && this.expression !== expression) {
      this.expression = expression;
      this.expressionTimer = 0;
    }
  }

  onIdle(dt) {
    this.setExpression('idle');
  }

  onMoving(dt, officeMap) {
    this.setExpression('moving');
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

    // Set expression based on task type
    if (this.currentTask.type === 'tool') {
      this.setExpression('tool_use');
    } else if (this.currentTask.type === 'complex') {
      this.setExpression('thinking');
    } else if (this.currentTask.description?.includes('read') || this.currentTask.description?.includes('file')) {
      this.setExpression('reading');
    } else {
      this.setExpression('coding');
    }

    const workAmount = (dt / 1000) * 15;
    this.currentTask.updateProgress(workAmount);
    this.workProgress = this.currentTask.progress;
    this.totalWorkTime += dt;

    if (this.currentTask.status === 'completed') {
      this.tasksCompleted++;
      this.state = 'reporting';
      this.setDialog('Done! ', 2000);
    }
  }

  onReporting(dt, officeMap, messageBus) {
    this.setExpression('reporting');
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
    return {
      x: this.px + this.animOffset.x,
      y: this.py + this.bounceOffset + this.animOffset.y
    };
  }

  getGridPosition() {
    return { x: Math.round(this.x), y: Math.round(this.y) };
  }
}
