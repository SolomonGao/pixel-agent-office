import { useRef, useEffect } from 'react';
import { getPixelColor } from '../core/sprites.js';
import { SPRITES } from '../core/sprites.js';
import { OfficeMap } from '../core/OfficeMap.js';

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;
const CELL_SIZE = 20;

export default function OfficeCanvas({ agents, messages, selectedAgent, onAgentClick }) {
  const canvasRef = useRef(null);
  const officeMapRef = useRef(new OfficeMap());

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Disable smoothing for pixel art look
    ctx.imageSmoothingEnabled = false;

    render(ctx, agents, messages, selectedAgent);
  }, [agents, messages, selectedAgent]);

  const handleClick = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    // Find clicked agent
    for (const agent of agents) {
      const pos = agent.getPosition();
      const size = 32; // 16 * 2 scale
      if (x >= pos.x && x <= pos.x + size && y >= pos.y && y <= pos.y + size) {
        onAgentClick?.(agent);
        return;
      }
    }
  };

  return (
    <canvas
      ref={canvasRef}
      width={CANVAS_WIDTH}
      height={CANVAS_HEIGHT}
      onClick={handleClick}
      className="border-2 border-pixel-border cursor-pointer"
      style={{ maxWidth: '100%', maxHeight: '100%' }}
    />
  );
}

function render(ctx, agents, messages, selectedAgent) {
  ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  // 1. Draw floor grid
  drawFloor(ctx);

  // 2. Draw areas/rooms
  drawAreas(ctx);

  // 3. Draw furniture
  drawFurniture(ctx);

  // 4. Draw messages
  drawMessages(ctx, messages, agents);

  // 5. Draw agents
  for (const agent of agents) {
    drawAgent(ctx, agent, agent === selectedAgent);
  }

  // 6. Draw labels
  drawLabels(ctx);
}

function drawFloor(ctx) {
  for (let y = 0; y < 30; y++) {
    for (let x = 0; x < 40; x++) {
      const px = x * CELL_SIZE;
      const py = y * CELL_SIZE;

      // Checkerboard pattern
      const isEven = (x + y) % 2 === 0;
      ctx.fillStyle = isEven ? '#1e293b' : '#1a1a2e';
      ctx.fillRect(px, py, CELL_SIZE, CELL_SIZE);

      // Grid lines
      ctx.strokeStyle = '#2d3748';
      ctx.lineWidth = 0.5;
      ctx.strokeRect(px, py, CELL_SIZE, CELL_SIZE);
    }
  }
}

function drawAreas(ctx) {
  // Claude desk area
  ctx.fillStyle = 'rgba(79, 70, 229, 0.08)';
  ctx.fillRect(17 * CELL_SIZE, 3 * CELL_SIZE, 10 * CELL_SIZE, 6 * CELL_SIZE);

  // Subagent zone
  ctx.fillStyle = 'rgba(16, 185, 129, 0.06)';
  ctx.fillRect(3 * CELL_SIZE, 8 * CELL_SIZE, 15 * CELL_SIZE, 10 * CELL_SIZE);

  // Tool server area
  ctx.fillStyle = 'rgba(245, 158, 11, 0.08)';
  ctx.fillRect(32 * CELL_SIZE, 5 * CELL_SIZE, 7 * CELL_SIZE, 8 * CELL_SIZE);

  // Meeting room
  ctx.fillStyle = 'rgba(139, 92, 246, 0.06)';
  ctx.fillRect(22 * CELL_SIZE, 17 * CELL_SIZE, 10 * CELL_SIZE, 9 * CELL_SIZE);
}

function drawFurniture(ctx) {
  // Claude's desk
  drawSprite(ctx, SPRITES.desk, 19 * CELL_SIZE, 4 * CELL_SIZE, '#4f46e5', 1.5);

  // Subagent desks
  const deskPositions = [
    [4, 9], [9, 9], [14, 9],
    [4, 14], [9, 14]
  ];
  deskPositions.forEach(([dx, dy], i) => {
    drawSprite(ctx, SPRITES.desk, dx * CELL_SIZE, dy * CELL_SIZE, '#10b981', 1.5);
  });

  // Chairs near desks
  deskPositions.forEach(([dx, dy]) => {
    drawSprite(ctx, SPRITES.chair, (dx + 1) * CELL_SIZE, (dy + 2.5) * CELL_SIZE, '#475569', 1);
  });

  // Server rack
  drawSprite(ctx, SPRITES.server, 34 * CELL_SIZE, 6 * CELL_SIZE, '#f59e0b', 1.5);

  // Plants (decoration)
  drawSprite(ctx, SPRITES.plant, 1 * CELL_SIZE, 1 * CELL_SIZE, '#10b981', 1.2);
  drawSprite(ctx, SPRITES.plant, 38 * CELL_SIZE, 1 * CELL_SIZE, '#10b981', 1.2);
  drawSprite(ctx, SPRITES.plant, 1 * CELL_SIZE, 27 * CELL_SIZE, '#10b981', 1.2);
  drawSprite(ctx, SPRITES.plant, 38 * CELL_SIZE, 27 * CELL_SIZE, '#10b981', 1.2);
}

function drawAgent(ctx, agent, isSelected) {
  // Handle both Agent class instances and plain objects (live mode)
  const isClassInstance = typeof agent.getPosition === 'function';

  const pos = isClassInstance
    ? agent.getPosition()
    : {
        x: (agent.px !== undefined ? agent.px : (agent.x || 0) * CELL_SIZE),
        y: (agent.py !== undefined ? agent.py : (agent.y || 0) * CELL_SIZE)
      };

  const sprite = isClassInstance
    ? agent.getSprite()
    : SPRITES[agent.spriteName || agent.role || 'subagent'];

  const scale = 2;

  // Selection glow
  if (isSelected) {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.fillRect(pos.x - 4, pos.y - 4, 16 * scale + 8, 16 * scale + 8);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.strokeRect(pos.x - 4, pos.y - 4, 16 * scale + 8, 16 * scale + 8);
  }

  // Draw sprite
  drawSprite(ctx, sprite, pos.x, pos.y, agent.color, scale);

  // Work progress bar
  if (agent.state === 'working') {
    const progress = isClassInstance
      ? (agent.currentTask?.progress || 0)
      : (agent.workProgress || 0);

    if (progress > 0) {
      const barWidth = 32;
      const barHeight = 4;
      const barX = pos.x;
      const barY = pos.y - 10;

      ctx.fillStyle = '#374151';
      ctx.fillRect(barX, barY, barWidth, barHeight);

      ctx.fillStyle = agent.color;
      ctx.fillRect(barX, barY, barWidth * (progress / 100), barHeight);

      ctx.strokeStyle = '#1f2937';
      ctx.lineWidth = 0.5;
      ctx.strokeRect(barX, barY, barWidth, barHeight);
    }
  }

  // State indicator dot
  const stateColors = {
    idle: '#6b7280',
    moving: '#3b82f6',
    working: '#f59e0b',
    reporting: '#10b981'
  };
  ctx.fillStyle = stateColors[agent.state] || '#6b7280';
  ctx.fillRect(pos.x + 28, pos.y - 4, 4, 4);

  // Dialog bubble
  if (agent.dialog) {
    const dialogText = isClassInstance ? agent.dialog.text : agent.dialog;
    drawDialogBubble(ctx, pos.x + 16, pos.y - 8, dialogText);
  }

  // Name label
  ctx.fillStyle = '#94a3b8';
  ctx.font = '6px "Press Start 2P", monospace';
  ctx.textAlign = 'center';
  ctx.fillText(agent.name, pos.x + 16, pos.y + 38);
}

function drawSprite(ctx, sprite, x, y, baseColor, scale = 2) {
  if (!sprite) return;
  for (let row = 0; row < 16; row++) {
    for (let col = 0; col < 16; col++) {
      const pixel = sprite[row]?.[col];
      if (pixel !== undefined && pixel !== 0) {
        ctx.fillStyle = getPixelColor(pixel, baseColor);
        ctx.fillRect(x + col * scale, y + row * scale, scale, scale);
      }
    }
  }
}

function drawDialogBubble(ctx, x, y, text) {
  const padding = 6;
  const maxWidth = 120;
  ctx.font = '6px "Press Start 2P", monospace';
  const textWidth = Math.min(ctx.measureText(text).width, maxWidth);
  const boxWidth = textWidth + padding * 2;
  const boxHeight = 16;

  // Bubble background
  ctx.fillStyle = '#0f0f1a';
  ctx.fillRect(x - boxWidth / 2, y - boxHeight, boxWidth, boxHeight);

  // Border
  ctx.strokeStyle = '#4b5563';
  ctx.lineWidth = 1;
  ctx.strokeRect(x - boxWidth / 2, y - boxHeight, boxWidth, boxHeight);

  // Triangle pointer
  ctx.fillStyle = '#0f0f1a';
  ctx.beginPath();
  ctx.moveTo(x - 3, y);
  ctx.lineTo(x + 3, y);
  ctx.lineTo(x, y + 4);
  ctx.closePath();
  ctx.fill();

  // Text
  ctx.fillStyle = '#e2e8f0';
  ctx.textAlign = 'center';
  ctx.fillText(text.substring(0, 18), x, y - boxHeight + 11);
}

function getAgentPos(agent) {
  if (typeof agent.getPosition === 'function') {
    return agent.getPosition();
  }
  return {
    x: (agent.px !== undefined ? agent.px : (agent.x || 0) * CELL_SIZE),
    y: (agent.py !== undefined ? agent.py : (agent.y || 0) * CELL_SIZE)
  };
}

function getMessageColor(msg) {
  if (typeof msg.getColor === 'function') {
    return msg.getColor();
  }
  const colors = {
    task: '#3b82f6',
    report: '#10b981',
    tool_call: '#f59e0b',
    result: '#8b5cf6',
    broadcast: '#ec4899'
  };
  return colors[msg.type] || '#94a3b8';
}

function drawMessages(ctx, messages, agents) {
  for (const msg of messages) {
    const fromAgent = agents.find(a => a.id === msg.from);
    const toAgent = agents.find(a => a.id === msg.to);

    if (!fromAgent) continue;

    const fromPos = getAgentPos(fromAgent);
    const startX = fromPos.x + 16;
    const startY = fromPos.y + 16;

    const progress = msg.progress !== undefined ? msg.progress : 0.5;
    const msgColor = getMessageColor(msg);

    let endX, endY;
    if (toAgent) {
      const toPos = getAgentPos(toAgent);
      endX = toPos.x + 16;
      endY = toPos.y + 16;
    } else {
      // Broadcast - go outward
      endX = startX + Math.cos(progress * Math.PI * 4) * 60;
      endY = startY + Math.sin(progress * Math.PI * 4) * 60;
    }

    const curX = startX + (endX - startX) * progress;
    const curY = startY + (endY - startY) * progress;

    // Draw trail
    ctx.strokeStyle = msgColor + '40';
    ctx.lineWidth = 2;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(curX, curY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw particle
    ctx.fillStyle = msgColor;
    ctx.fillRect(curX - 2, curY - 2, 5, 5);
  }
}

function drawLabels(ctx) {
  ctx.font = '6px "Press Start 2P", monospace';
  ctx.textAlign = 'center';

  ctx.fillStyle = 'rgba(79, 70, 229, 0.6)';
  ctx.fillText('CLAUDE', 22 * CELL_SIZE, 3.5 * CELL_SIZE);

  ctx.fillStyle = 'rgba(16, 185, 129, 0.5)';
  ctx.fillText('SUBAGENTS', 10 * CELL_SIZE, 7.5 * CELL_SIZE);

  ctx.fillStyle = 'rgba(245, 158, 11, 0.6)';
  ctx.fillText('TOOLS', 35.5 * CELL_SIZE, 5.5 * CELL_SIZE);

  ctx.fillStyle = 'rgba(139, 92, 246, 0.5)';
  ctx.fillText('MEETING', 27 * CELL_SIZE, 18.5 * CELL_SIZE);
}
