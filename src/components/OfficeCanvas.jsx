import { useRef, useEffect } from 'react';
import { getPixelColor, SPRITES } from '../core/sprites.js';
import { OfficeMap } from '../core/OfficeMap.js';

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;
const CELL_SIZE = 20;

// Background particles for atmosphere
const BG_PARTICLES = Array.from({ length: 30 }, () => ({
  x: Math.random() * CANVAS_WIDTH,
  y: Math.random() * CANVAS_HEIGHT,
  size: Math.random() * 2 + 1,
  speedX: (Math.random() - 0.5) * 0.3,
  speedY: (Math.random() - 0.5) * 0.3,
  opacity: Math.random() * 0.3 + 0.1,
  color: ['#4f46e5', '#10b981', '#f59e0b', '#6366f1'][Math.floor(Math.random() * 4)],
}));

export default function OfficeCanvas({ agents, messages, selectedAgent, onAgentClick }) {
  const canvasRef = useRef(null);
  const officeMapRef = useRef(new OfficeMap());
  const timeRef = useRef(0);
  const shakeRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.imageSmoothingEnabled = false;

    // Check if any tool messages are active for screen shake
    const hasToolMessage = messages.some(m => m.type === 'tool_call');
    if (hasToolMessage) {
      shakeRef.current = 2;
    }

    render(ctx, agents, messages, selectedAgent, timeRef.current, shakeRef);
    timeRef.current += 1;
  }, [agents, messages, selectedAgent]);

  const handleClick = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    for (const agent of agents) {
      const pos = getAgentPos(agent);
      const size = 32;
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

function render(ctx, agents, messages, selectedAgent, time, shakeRef) {
  // Apply screen shake decay
  const shakeX = (Math.random() - 0.5) * shakeRef.current;
  const shakeY = (Math.random() - 0.5) * shakeRef.current;
  shakeRef.current *= 0.9;
  if (shakeRef.current < 0.1) shakeRef.current = 0;

  ctx.save();
  ctx.translate(shakeX, shakeY);

  ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  // 1. Background particles (atmosphere)
  drawBackgroundParticles(ctx, time);

  // 2. Draw floor grid
  drawFloor(ctx);

  // 3. Draw areas/rooms
  drawAreas(ctx);

  // 4. Draw furniture
  drawFurniture(ctx);

  // 5. Draw connection lines between agents
  drawAgentConnections(ctx, agents);

  // 6. Draw messages with enhanced effects
  drawMessages(ctx, messages, agents, time);

  // 7. Draw agents with glow effects
  for (const agent of agents) {
    drawAgent(ctx, agent, agent === selectedAgent, time);
  }

  // 8. Draw labels
  drawLabels(ctx);

  // 9. HUD overlay effects
  drawHUDOverlay(ctx, agents, time);

  ctx.restore();
}

function drawBackgroundParticles(ctx, time) {
  for (const p of BG_PARTICLES) {
    const px = (p.x + p.speedX * time) % CANVAS_WIDTH;
    const py = (p.y + p.speedY * time) % CANVAS_HEIGHT;
    const actualX = px < 0 ? px + CANVAS_WIDTH : px;
    const actualY = py < 0 ? py + CANVAS_HEIGHT : py;

    const flicker = Math.sin(time * 0.02 + p.x) * 0.15 + 0.85;
    ctx.fillStyle = p.color + Math.floor(p.opacity * flicker * 255).toString(16).padStart(2, '0');
    ctx.fillRect(actualX, actualY, p.size, p.size);
  }
}

function drawFloor(ctx) {
  for (let y = 0; y < 30; y++) {
    for (let x = 0; x < 40; x++) {
      const px = x * CELL_SIZE;
      const py = y * CELL_SIZE;
      const isEven = (x + y) % 2 === 0;
      ctx.fillStyle = isEven ? '#131325' : '#18182b';
      ctx.fillRect(px, py, CELL_SIZE, CELL_SIZE);
      ctx.strokeStyle = '#1f1f35';
      ctx.lineWidth = 0.5;
      ctx.strokeRect(px, py, CELL_SIZE, CELL_SIZE);
    }
  }
}

function drawAreas(ctx) {
  // Claude desk area
  ctx.fillStyle = 'rgba(99, 102, 241, 0.12)';
  ctx.fillRect(17 * CELL_SIZE, 3 * CELL_SIZE, 10 * CELL_SIZE, 6 * CELL_SIZE);

  // Subagent zone
  ctx.fillStyle = 'rgba(16, 185, 129, 0.10)';
  ctx.fillRect(3 * CELL_SIZE, 8 * CELL_SIZE, 15 * CELL_SIZE, 10 * CELL_SIZE);

  // Tool server area
  ctx.fillStyle = 'rgba(245, 158, 11, 0.12)';
  ctx.fillRect(32 * CELL_SIZE, 5 * CELL_SIZE, 7 * CELL_SIZE, 8 * CELL_SIZE);

  // Meeting room
  ctx.fillStyle = 'rgba(139, 92, 246, 0.10)';
  ctx.fillRect(22 * CELL_SIZE, 17 * CELL_SIZE, 10 * CELL_SIZE, 9 * CELL_SIZE);
}

function drawFurniture(ctx) {
  // Claude's desk
  drawSprite(ctx, SPRITES.desk, 19 * CELL_SIZE, 4 * CELL_SIZE, '#6366f1', 1.5);

  // Subagent desks
  const deskPositions = [
    [4, 9], [9, 9], [14, 9],
    [4, 14], [9, 14]
  ];
  deskPositions.forEach(([dx, dy]) => {
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

function drawAgentConnections(ctx, agents) {
  // Draw subtle lines between agents that are close to each other
  for (let i = 0; i < agents.length; i++) {
    for (let j = i + 1; j < agents.length; j++) {
      const a1 = getAgentPos(agents[i]);
      const a2 = getAgentPos(agents[j]);
      const dist = Math.hypot(a1.x - a2.x, a1.y - a2.y);

      if (dist < 200) {
        const opacity = (1 - dist / 200) * 0.08;
        ctx.strokeStyle = `rgba(99, 102, 241, ${opacity})`;
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 8]);
        ctx.beginPath();
        ctx.moveTo(a1.x + 16, a1.y + 16);
        ctx.lineTo(a2.x + 16, a2.y + 16);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }
  }
}

function drawAgent(ctx, agent, isSelected, time) {
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

  // Glow effect for working agents
  if (agent.state === 'working') {
    const glowRadius = 20 + Math.sin(time * 0.05) * 5;
    const gradient = ctx.createRadialGradient(
      pos.x + 16, pos.y + 16, 5,
      pos.x + 16, pos.y + 16, glowRadius
    );
    gradient.addColorStop(0, agent.color + '40');
    gradient.addColorStop(1, agent.color + '00');
    ctx.fillStyle = gradient;
    ctx.fillRect(pos.x - 20, pos.y - 20, 72, 72);
  }

  // Idle pulse for Claude
  if (agent.role === 'claude' && agent.state === 'idle') {
    const pulseAlpha = Math.sin(time * 0.03) * 0.05 + 0.08;
    ctx.fillStyle = agent.color + Math.floor(pulseAlpha * 255).toString(16).padStart(2, '0');
    ctx.fillRect(pos.x - 8, pos.y - 8, 48, 48);
  }

  // Selection glow
  if (isSelected) {
    ctx.shadowColor = agent.color;
    ctx.shadowBlur = 15;
    ctx.strokeStyle = agent.color;
    ctx.lineWidth = 2;
    ctx.strokeRect(pos.x - 4, pos.y - 4, 16 * scale + 8, 16 * scale + 8);
    ctx.shadowBlur = 0;

    // Animated selection corners
    const cornerSize = 6;
    const offset = Math.sin(time * 0.1) * 2;
    ctx.fillStyle = '#ffffff';
    // Top-left
    ctx.fillRect(pos.x - 6 - offset, pos.y - 6 - offset, cornerSize, 2);
    ctx.fillRect(pos.x - 6 - offset, pos.y - 6 - offset, 2, cornerSize);
    // Top-right
    ctx.fillRect(pos.x + 32 + offset - cornerSize + 4, pos.y - 6 - offset, cornerSize, 2);
    ctx.fillRect(pos.x + 32 + 4 + offset, pos.y - 6 - offset, 2, cornerSize);
    // Bottom-left
    ctx.fillRect(pos.x - 6 - offset, pos.y + 32 + 4 + offset, cornerSize, 2);
    ctx.fillRect(pos.x - 6 - offset, pos.y + 32 + offset, 2, cornerSize);
    // Bottom-right
    ctx.fillRect(pos.x + 32 + offset - cornerSize + 4, pos.y + 32 + 4 + offset, cornerSize, 2);
    ctx.fillRect(pos.x + 32 + 4 + offset, pos.y + 32 + offset, 2, cornerSize);
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
      const barHeight = 5;
      const barX = pos.x;
      const barY = pos.y - 12;

      ctx.fillStyle = '#1f1f35';
      ctx.fillRect(barX, barY, barWidth, barHeight);

      // Segmented progress fill
      const fillWidth = barWidth * (progress / 100);
      ctx.fillStyle = agent.color;
      for (let i = 0; i < fillWidth; i += 4) {
        ctx.fillRect(barX + i, barY, 3, barHeight);
      }

      ctx.strokeStyle = agent.color + '80';
      ctx.lineWidth = 1;
      ctx.strokeRect(barX, barY, barWidth, barHeight);
    }
  }

  // State indicator dot with animation
  const stateColors = {
    idle: '#6b7280',
    moving: '#3b82f6',
    working: '#f59e0b',
    reporting: '#10b981'
  };
  const dotColor = stateColors[agent.state] || '#6b7280';

  // Pulsing dot for non-idle states
  if (agent.state !== 'idle') {
    const pulseSize = Math.sin(time * 0.08) * 1.5 + 2.5;
    ctx.fillStyle = dotColor + '60';
    ctx.fillRect(pos.x + 28 - pulseSize/2 + 2, pos.y - 4 - pulseSize/2 + 2, pulseSize * 2, pulseSize * 2);
  }

  ctx.fillStyle = dotColor;
  ctx.fillRect(pos.x + 28, pos.y - 4, 4, 4);

  // Dialog bubble (chat message or task dialog)
  if (agent.dialog) {
    const dialogText = isClassInstance ? agent.dialog.text : agent.dialog;
    if (dialogText) {
      drawDialogBubble(ctx, pos.x + 16, pos.y - 10, dialogText, agent.color);
    }
  }

  // Name label with background
  const nameText = agent.name;
  ctx.font = '6px "Press Start 2P", "Noto Sans SC", sans-serif';
  ctx.textAlign = 'center';
  const nameWidth = ctx.measureText(nameText).width;

  // Name background pill
  ctx.fillStyle = 'rgba(13, 13, 26, 0.8)';
  ctx.fillRect(pos.x + 16 - nameWidth/2 - 4, pos.y + 36, nameWidth + 8, 10);
  ctx.strokeStyle = agent.color + '60';
  ctx.lineWidth = 0.5;
  ctx.strokeRect(pos.x + 16 - nameWidth/2 - 4, pos.y + 36, nameWidth + 8, 10);

  ctx.fillStyle = '#94a3b8';
  ctx.fillText(nameText, pos.x + 16, pos.y + 43);
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

function drawDialogBubble(ctx, x, y, text, color = '#e2e8f0') {
  const padding = 8;
  const maxWidth = 140;
  ctx.font = '7px "Press Start 2P", "Noto Sans SC", sans-serif';

  // Wrap text if too long
  let displayText = text;
  if (displayText.length > 30) {
    displayText = displayText.substring(0, 27) + '...';
  }

  const textWidth = Math.min(ctx.measureText(displayText).width, maxWidth);
  const boxWidth = textWidth + padding * 2;
  const boxHeight = 20;

  // Bubble background with border glow
  ctx.fillStyle = '#0d0d1a';
  ctx.fillRect(x - boxWidth / 2, y - boxHeight, boxWidth, boxHeight);

  // Border with agent color
  ctx.strokeStyle = color + '80';
  ctx.lineWidth = 1;
  ctx.strokeRect(x - boxWidth / 2, y - boxHeight, boxWidth, boxHeight);

  // Triangle pointer
  ctx.fillStyle = '#0d0d1a';
  ctx.strokeStyle = color + '80';
  ctx.beginPath();
  ctx.moveTo(x - 4, y);
  ctx.lineTo(x + 4, y);
  ctx.lineTo(x, y + 5);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Text
  ctx.fillStyle = '#e2e8f0';
  ctx.textAlign = 'center';
  ctx.fillText(displayText, x, y - boxHeight + 13);
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

function drawMessages(ctx, messages, agents, time) {
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
      // Broadcast - spiral outward
      const angle = progress * Math.PI * 6 + time * 0.02;
      const radius = progress * 80;
      endX = startX + Math.cos(angle) * radius;
      endY = startY + Math.sin(angle) * radius;
    }

    const curX = startX + (endX - startX) * progress;
    const curY = startY + (endY - startY) * progress;

    // Enhanced trail with glow
    ctx.shadowColor = msgColor;
    ctx.shadowBlur = 6;
    ctx.strokeStyle = msgColor + '60';
    ctx.lineWidth = 2;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(curX, curY);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.shadowBlur = 0;

    // Particle with glow
    ctx.shadowColor = msgColor;
    ctx.shadowBlur = 8;
    ctx.fillStyle = msgColor;
    ctx.fillRect(curX - 3, curY - 3, 7, 7);
    ctx.shadowBlur = 0;

    // Sparkle effect around particle
    if (msg.type === 'tool_call') {
      for (let i = 0; i < 3; i++) {
        const sparkleAngle = (time * 0.1 + i * Math.PI * 2 / 3);
        const sparkleDist = 8 + Math.sin(time * 0.15 + i) * 3;
        const sx = curX + Math.cos(sparkleAngle) * sparkleDist;
        const sy = curY + Math.sin(sparkleAngle) * sparkleDist;
        ctx.fillStyle = msgColor + '80';
        ctx.fillRect(sx - 1, sy - 1, 2, 2);
      }
    }
  }
}

function drawLabels(ctx) {
  ctx.font = '7px "Press Start 2P", "Noto Sans SC", sans-serif';
  ctx.textAlign = 'center';

  ctx.fillStyle = 'rgba(99, 102, 241, 0.6)';
  ctx.fillText('CLAUDE', 22 * CELL_SIZE, 3.5 * CELL_SIZE);

  ctx.fillStyle = 'rgba(16, 185, 129, 0.5)';
  ctx.fillText('SUBAGENTS', 10 * CELL_SIZE, 7.5 * CELL_SIZE);

  ctx.fillStyle = 'rgba(245, 158, 11, 0.6)';
  ctx.fillText('TOOLS', 35.5 * CELL_SIZE, 5.5 * CELL_SIZE);

  ctx.fillStyle = 'rgba(139, 92, 246, 0.5)';
  ctx.fillText('MEETING', 27 * CELL_SIZE, 18.5 * CELL_SIZE);
}

function drawHUDOverlay(ctx, agents, time) {
  // Corner brackets (HUD effect)
  const cornerSize = 16;
  const margin = 4;
  ctx.strokeStyle = 'rgba(99, 102, 241, 0.3)';
  ctx.lineWidth = 2;

  // Top-left
  ctx.beginPath();
  ctx.moveTo(margin + cornerSize, margin);
  ctx.lineTo(margin, margin);
  ctx.lineTo(margin, margin + cornerSize);
  ctx.stroke();

  // Top-right
  ctx.beginPath();
  ctx.moveTo(CANVAS_WIDTH - margin - cornerSize, margin);
  ctx.lineTo(CANVAS_WIDTH - margin, margin);
  ctx.lineTo(CANVAS_WIDTH - margin, margin + cornerSize);
  ctx.stroke();

  // Bottom-left
  ctx.beginPath();
  ctx.moveTo(margin + cornerSize, CANVAS_HEIGHT - margin);
  ctx.lineTo(margin, CANVAS_HEIGHT - margin);
  ctx.lineTo(margin, CANVAS_HEIGHT - margin - cornerSize);
  ctx.stroke();

  // Bottom-right
  ctx.beginPath();
  ctx.moveTo(CANVAS_WIDTH - margin - cornerSize, CANVAS_HEIGHT - margin);
  ctx.lineTo(CANVAS_WIDTH - margin, CANVAS_HEIGHT - margin);
  ctx.lineTo(CANVAS_WIDTH - margin, CANVAS_HEIGHT - margin - cornerSize);
  ctx.stroke();

  // Scanline effect
  const scanY = (time * 0.5) % CANVAS_HEIGHT;
  ctx.fillStyle = 'rgba(99, 102, 241, 0.03)';
  ctx.fillRect(0, scanY, CANVAS_WIDTH, 2);

  // Active agent count indicator
  const activeCount = agents.filter(a => a.state !== 'idle').length;
  if (activeCount > 0) {
    ctx.font = '7px "Press Start 2P", sans-serif';
    ctx.textAlign = 'right';
    ctx.fillStyle = 'rgba(245, 158, 11, 0.7)';
    ctx.fillText(`⚡ ${activeCount} ACTIVE`, CANVAS_WIDTH - 12, CANVAS_HEIGHT - 12);
  }
}
