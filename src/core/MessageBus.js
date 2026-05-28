export class Message {
  constructor(from, to, type, payload) {
    this.id = Math.random().toString(36).substr(2, 9);
    this.from = from;
    this.to = to;
    this.type = type; // 'task' | 'report' | 'tool_call' | 'result' | 'broadcast'
    this.payload = payload;
    this.progress = 0;
    this.status = 'sending';
    this.createdAt = Date.now();
  }

  getColor() {
    const colors = {
      task: '#3b82f6',
      report: '#10b981',
      tool_call: '#f59e0b',
      result: '#8b5cf6',
      broadcast: '#ec4899'
    };
    return colors[this.type] || '#94a3b8';
  }
}

export class MessageBus {
  constructor() {
    this.messages = [];
    this.subscribers = {};
    this.onDelivered = null;
  }

  send(msg) {
    this.messages.push(msg);
  }

  broadcast(from, payload) {
    const msg = new Message(from, null, 'broadcast', payload);
    this.messages.push(msg);
  }

  subscribe(agentId, callback) {
    if (!this.subscribers[agentId]) {
      this.subscribers[agentId] = [];
    }
    this.subscribers[agentId].push(callback);
  }

  unsubscribe(agentId, callback) {
    if (this.subscribers[agentId]) {
      this.subscribers[agentId] = this.subscribers[agentId].filter(cb => cb !== callback);
    }
  }

  update(dt) {
    const speed = 0.002;
    for (const msg of this.messages) {
      if (msg.status === 'sending') {
        msg.progress += dt * speed;
        if (msg.progress >= 1) {
          msg.progress = 1;
          msg.status = 'delivered';
          this.deliver(msg);
        }
      }
    }

    // Remove delivered messages after a short delay
    this.messages = this.messages.filter(m => {
      if (m.status === 'delivered') {
        return Date.now() - m.createdAt < 500;
      }
      return true;
    });
  }

  deliver(msg) {
    if (msg.to && this.subscribers[msg.to]) {
      for (const callback of this.subscribers[msg.to]) {
        callback(msg);
      }
    }
    if (this.onDelivered) {
      this.onDelivered(msg);
    }
  }

  getActiveMessages() {
    return this.messages.filter(m => m.status === 'sending');
  }
}
