import express from 'express';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { EventStore } from './events.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

const eventStore = new EventStore();
const PORT = process.env.PORT || 3001;

app.use(express.json({ limit: '10mb' }));

// CORS for frontend
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', mode: 'live', agents: eventStore.agents.size });
});

// Get current state
app.get('/api/state', (req, res) => {
  res.json(eventStore.getState());
});

// Receive events from Claude Code hooks
app.post('/api/events', (req, res) => {
  const { type, data } = req.body;
  if (!type) {
    return res.status(400).json({ error: 'Missing event type' });
  }
  const event = eventStore.appendEvent(type, data);
  broadcast({ type: 'event', payload: event });
  res.json({ ok: true });
});

// Receive events via query params (for hook compatibility)
app.get('/api/events', (req, res) => {
  const { type, ...data } = req.query;
  if (!type) {
    return res.status(400).json({ error: 'Missing event type' });
  }
  const event = eventStore.appendEvent(type, data);
  broadcast({ type: 'event', payload: event });
  res.json({ ok: true });
});

// Clear all events
app.post('/api/clear', (req, res) => {
  eventStore.clear();
  broadcast({ type: 'clear' });
  res.json({ ok: true });
});

// WebSocket connections
const clients = new Set();

wss.on('connection', (ws) => {
  clients.add(ws);
  console.log('Client connected, total:', clients.size);

  // Send current state immediately
  ws.send(JSON.stringify({ type: 'state', payload: eventStore.getState() }));

  ws.on('close', () => {
    clients.delete(ws);
    console.log('Client disconnected, total:', clients.size);
  });

  ws.on('error', (err) => {
    console.error('WebSocket error:', err.message);
  });
});

function broadcast(data) {
  const msg = JSON.stringify(data);
  for (const client of clients) {
    if (client.readyState === 1) { // OPEN
      client.send(msg);
    }
  }
}

// Watch events file for external changes (from file-based hooks)
const EVENTS_FILE = path.join(__dirname, '..', '.claude', 'agent-events.jsonl');
let lastSize = 0;

function watchEventsFile() {
  if (!fs.existsSync(EVENTS_FILE)) return;
  const stats = fs.statSync(EVENTS_FILE);
  if (stats.size > lastSize) {
    const fd = fs.openSync(EVENTS_FILE, 'r');
    const buffer = Buffer.alloc(stats.size - lastSize);
    fs.readSync(fd, buffer, 0, buffer.length, lastSize);
    fs.closeSync(fd);
    const lines = buffer.toString().split('\n').filter(Boolean);
    for (const line of lines) {
      try {
        const event = JSON.parse(line);
        eventStore.processEvent(event);
        broadcast({ type: 'event', payload: event });
      } catch {}
    }
    lastSize = stats.size;
  }
}

setInterval(watchEventsFile, 500);

server.listen(PORT, () => {
  console.log(`🔌 Pixel Office Server running on port ${PORT}`);
  console.log(`📊 API: http://localhost:${PORT}/api/state`);
  console.log(`📡 WebSocket: ws://localhost:${PORT}/ws`);
});
