export class Task {
  constructor(description, priority = 1, type = 'simple') {
    this.id = Math.random().toString(36).substr(2, 9);
    this.description = description;
    this.priority = priority;
    this.type = type; // 'simple' | 'complex' | 'tool'
    this.status = 'pending';
    this.subtasks = [];
    this.assignedTo = null;
    this.progress = 0;
    this.createdAt = Date.now();
    this.completedAt = null;
    this.workRate = 0.3 + Math.random() * 0.7; // work speed multiplier
  }

  addSubtask(description) {
    const subtask = new Task(description, this.priority, 'simple');
    subtask.parentId = this.id;
    this.subtasks.push(subtask);
    return subtask;
  }

  updateProgress(amount) {
    this.progress = Math.min(100, this.progress + amount * this.workRate);
    if (this.progress >= 100) {
      this.progress = 100;
      this.status = 'completed';
      this.completedAt = Date.now();
    }
  }
}

export class TaskQueue {
  constructor() {
    this.tasks = [];
  }

  enqueue(task) {
    this.tasks.push(task);
    this.tasks.sort((a, b) => b.priority - a.priority);
  }

  dequeue() {
    return this.tasks.shift();
  }

  peek() {
    return this.tasks[0];
  }

  getByStatus(status) {
    return this.tasks.filter(t => t.status === status);
  }

  remove(id) {
    this.tasks = this.tasks.filter(t => t.id !== id);
  }

  get length() {
    return this.tasks.length;
  }
}
