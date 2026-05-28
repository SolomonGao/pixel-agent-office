import { useRef, useEffect } from 'react';
import { getPixelColor, SPRITES } from '../core/sprites.js';
import { OfficeMap } from '../core/OfficeMap.js';
import { EXPRESSIONS } from '../core/Agent.js';

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;
const CELL_SIZE = 20;

// Wood floor patterns (warm, natural)
const WOOD_PATTERNS = [
  '#3d2e1e', '#42321f', '#382a1a', '#403020', '#35281a',
  '#443522', '#3a2c1c', '#413220', '#362a1b', '#3f3020',
];

// Soft particles for atmosphere
const ATMOSPHERE_PARTICLES = Array.from({ length: 20 }, () => ({
  x: Math.random() * CANVAS_WIDTH,
  y: Math.random() * CANVAS_HEIGHT,
  size: Math.random() * 1.5 + 0.5,
  speedY: -Math.random() * 0.2 - 0.1,
  opacity: Math.random() * 0.15 + 0.05,
  phase: Math.random() * Math.PI * 2,
}));

// State → expression mapping for live mode agents
function getExpressionFromState(state) {
  switch (state) {
    case 'working': return 'coding';
    case 'thinking': return 'thinking';
    case 'moving': return 'moving';
    case 'reporting': return 'reporting';
    case 'tool_use': return 'tool_use';
    case 'reading': return 'reading';
    default: return 'idle';
  }
}

export default function OfficeCanvas({ agents, messages, selectedAgent, onAgentClick }) {
  const canvasRef = useRef(null);
  const officeMapRef = useRef(new OfficeMap());
  const timeRef = useRef(0);

  // Per-agent animation state for live mode (plain objects)
  const animStateRef = useRef(new Map());

  // Update animation state for live agents
  useEffect(() => {
    const animMap = animStateRef.current;
    const now = Date.now();

    for (const agent of agents) {
      const isClass = typeof agent.getPosition === 'function';
      if (isClass) continue; // Class instances handle their own animation

      let state = animMap.get(agent.id);
      if (!state) {
        state = {
          px: agent.px ?? agent.x * CELL_SIZE,
          py: agent.py ?? agent.y * CELL_SIZE,
          targetPx: agent.px ?? agent.x * CELL_SIZE,
          targetPy: agent.py ?? agent.y * CELL_SIZE,
          animPhase: Math.random() * Math.PI * 2,
          blinkTimer: Math.random() * 3000,
          isBlinking: false,
          prevState: agent.state,
          stateTimer: 0,
        };
        animMap.set(agent.id, state);
      }

      // Update target position
      const targetX = agent.px ?? agent.x * CELL_SIZE;
      const targetY = agent.py ?? agent.y * CELL_SIZE;

      // If position changed significantly, update target
      if (Math.abs(state.targetPx - targetX) > 1 || Math.abs(state.targetPy - targetY) > 1) {
        state.targetPx = targetX;
        state.targetPy = targetY;
      }

      // Smooth interpolation toward target
      state.px += (state.targetPx - state.px) * 0.12;
      state.py += (state.targetPy - state.py) * 0.12;

      // Update animation
      state.animPhase += 16 * 0.003; // ~60fps dt ≈ 16ms
      state.blinkTimer -= 16;
      state.stateTimer += 16;

      if (state.blinkTimer <= 0) {
        state.isBlinking = true;
        if (state.blinkTimer <= -150) {
          state.isBlinking = false;
          state.blinkTimer = 2000 + Math.random() * 4000;
        }
      }

      // Reset state timer on state change
      if (state.prevState !== agent.state) {
        state.stateTimer = 0;
        state.prevState = agent.state;
      }
    }

    // Clean up stale agents
    const currentIds = new Set(agents.map(a => a.id));
    for (const [id] of animMap) {
      if (!currentIds.has(id)) {
        animMap.delete(id);
      }
    }
  }, [agents]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.imageSmoothingEnabled = false;
    render(ctx, agents, messages, selectedAgent, timeRef.current, animStateRef.current);
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
      const pos = getAgentPos(agent, animStateRef.current);
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
      className="rounded-lg shadow-2xl"
      style={{ maxWidth: '100%', maxHeight: '100%', imageRendering: 'pixelated' }}
    />
  );
}

function render(ctx, agents, messages, selectedAgent, time, animStates) {
  ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  // 1. Walls and base
  drawWalls(ctx);

  // 2. Wood floor with natural variation
  drawFloor(ctx);

  // 3. Window with light rays
  drawWindows(ctx, time);

  // 4. Area rugs/zone markers (subtle)
  drawZoneRugs(ctx);

  // 5. Furniture
  drawFurniture(ctx, time);

  // 6. Decorations
  drawDecorations(ctx, time);

  // 7. Messages (tool calls, etc.)
  drawMessages(ctx, messages, agents, time, animStates);

  // 8. Agents with expressions and animations
  for (const agent of agents) {
    drawAgent(ctx, agent, agent === selectedAgent, time, animStates);
  }

  // 9. Area labels
  drawLabels(ctx);

  // 10. Atmosphere particles
  drawAtmosphereParticles(ctx, time);

  // 11. Warm vignette overlay
  drawVignette(ctx);
}

function drawWalls(ctx) {
  // Wall color
  ctx.fillStyle = '#2a1f2d';
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  // Baseboard
  ctx.fillStyle = '#3d2e1e';
  ctx.fillRect(0, CANVAS_HEIGHT - 8, CANVAS_WIDTH, 8);

  // Top trim
  ctx.fillStyle = '#352840';
  ctx.fillRect(0, 0, CANVAS_WIDTH, 4);
}

function drawFloor(ctx) {
  // Wooden floor tiles with natural variation
  for (let y = 4; y < 30; y++) {
    for (let x = 0; x < 40; x++) {
      const px = x * CELL_SIZE;
      const py = y * CELL_SIZE;

      // Deterministic pattern based on position
      const patternIndex = (x * 7 + y * 13) % WOOD_PATTERNS.length;
      const baseColor = WOOD_PATTERNS[patternIndex];

      // Slight variation per tile
      ctx.fillStyle = baseColor;
      ctx.fillRect(px, py, CELL_SIZE, CELL_SIZE);

      // Wood grain lines
      ctx.strokeStyle = 'rgba(0,0,0,0.15)';
      ctx.lineWidth = 0.5;
      if ((x + y) % 3 === 0) {
        ctx.beginPath();
        ctx.moveTo(px, py + CELL_SIZE * 0.7);
        ctx.lineTo(px + CELL_SIZE, py + CELL_SIZE * 0.3);
        ctx.stroke();
      }

      // Tile gap
      ctx.strokeStyle = 'rgba(0,0,0,0.3)';
      ctx.lineWidth = 0.5;
      ctx.strokeRect(px, py, CELL_SIZE, CELL_SIZE);
    }
  }
}

function drawWindows(ctx, time) {
  const windowPositions = [
    { x: 2, y: 1, w: 4, h: 3 },
    { x: 34, y: 1, w: 4, h: 3 },
  ];

  for (const win of windowPositions) {
    const px = win.x * CELL_SIZE;
    const py = win.y * CELL_SIZE;
    const pw = win.w * CELL_SIZE;
    const ph = win.h * CELL_SIZE;

    // Window frame
    ctx.fillStyle = '#4a3a28';
    ctx.fillRect(px - 2, py - 2, pw + 4, ph + 4);

    // Glass with soft light
    const lightIntensity = 0.12 + Math.sin(time * 0.01) * 0.03;
    ctx.fillStyle = `rgba(200, 220, 255, ${lightIntensity})`;
    ctx.fillRect(px, py, pw, ph);

    // Window panes
    ctx.strokeStyle = '#5a4a38';
    ctx.lineWidth = 2;
    ctx.strokeRect(px, py, pw, ph);
    ctx.beginPath();
    ctx.moveTo(px + pw / 2, py);
    ctx.lineTo(px + pw / 2, py + ph);
    ctx.moveTo(px, py + ph / 2);
    ctx.lineTo(px + pw, py + ph / 2);
    ctx.stroke();

    // Light rays on floor
    const rayGradient = ctx.createLinearGradient(px + pw / 2, py + ph, px + pw / 2, py + ph + 80);
    rayGradient.addColorStop(0, `rgba(245, 230, 200, 0.08)`);
    rayGradient.addColorStop(1, 'rgba(245, 230, 200, 0)');
    ctx.fillStyle = rayGradient;
    ctx.fillRect(px, py + ph, pw, 80);
  }
}

function drawZoneRugs(ctx) {
  // Claude area rug
  ctx.fillStyle = 'rgba(123, 155, 209, 0.06)';
  ctx.fillRect(16 * CELL_SIZE, 3 * CELL_SIZE, 12 * CELL_SIZE, 8 * CELL_SIZE);
  ctx.strokeStyle = 'rgba(123, 155, 209, 0.15)';
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 4]);
  ctx.strokeRect(16 * CELL_SIZE, 3 * CELL_SIZE, 12 * CELL_SIZE, 8 * CELL_SIZE);
  ctx.setLineDash([]);

  // Subagent area rug
  ctx.fillStyle = 'rgba(124, 184, 154, 0.05)';
  ctx.fillRect(2 * CELL_SIZE, 7 * CELL_SIZE, 17 * CELL_SIZE, 12 * CELL_SIZE);
  ctx.strokeStyle = 'rgba(124, 184, 154, 0.12)';
  ctx.setLineDash([4, 4]);
  ctx.strokeRect(2 * CELL_SIZE, 7 * CELL_SIZE, 17 * CELL_SIZE, 12 * CELL_SIZE);
  ctx.setLineDash([]);

  // Tool area rug
  ctx.fillStyle = 'rgba(212, 165, 116, 0.06)';
  ctx.fillRect(31 * CELL_SIZE, 4 * CELL_SIZE, 9 * CELL_SIZE, 10 * CELL_SIZE);
  ctx.strokeStyle = 'rgba(212, 165, 116, 0.15)';
  ctx.setLineDash([4, 4]);
  ctx.strokeRect(31 * CELL_SIZE, 4 * CELL_SIZE, 9 * CELL_SIZE, 10 * CELL_SIZE);
  ctx.setLineDash([]);
}

function drawFurniture(ctx, time) {
  // Claude's desk with monitor
  drawSprite(ctx, SPRITES.desk, 19 * CELL_SIZE, 5 * CELL_SIZE, '#5a4a3a', 1.5);

  // Monitor glow
  const monitorGlow = ctx.createRadialGradient(
    21 * CELL_SIZE + 8, 4 * CELL_SIZE + 8, 2,
    21 * CELL_SIZE + 8, 4 * CELL_SIZE + 8, 20
  );
  monitorGlow.addColorStop(0, 'rgba(123, 155, 209, 0.2)');
  monitorGlow.addColorStop(1, 'rgba(123, 155, 209, 0)');
  ctx.fillStyle = monitorGlow;
  ctx.fillRect(19 * CELL_SIZE, 2 * CELL_SIZE, 6 * CELL_SIZE, 6 * CELL_SIZE);

  // Subagent desks
  const deskPositions = [
    [4, 10], [9, 10], [14, 10],
    [4, 15], [9, 15]
  ];
  deskPositions.forEach(([dx, dy], i) => {
    const deskColor = ['#4a6a5a', '#5a6a4a', '#5a5a6a', '#6a5a4a', '#4a5a6a'][i];
    drawSprite(ctx, SPRITES.desk, dx * CELL_SIZE, dy * CELL_SIZE, deskColor, 1.5);
  });

  // Chairs
  deskPositions.forEach(([dx, dy]) => {
    drawSprite(ctx, SPRITES.chair, (dx + 1) * CELL_SIZE, (dy + 2.5) * CELL_SIZE, '#5a5040', 1);
  });

  // Server rack with blinking lights
  drawSprite(ctx, SPRITES.server, 34 * CELL_SIZE, 6 * CELL_SIZE, '#6a5a4a', 1.5);

  // Blinking LED on server
  const blinkPhase = Math.sin(time * 0.1) > 0;
  ctx.fillStyle = blinkPhase ? '#4ade80' : '#1f4a2a';
  ctx.fillRect(35 * CELL_SIZE, 7 * CELL_SIZE, 3, 3);
  ctx.fillStyle = !blinkPhase ? '#f59e0b' : '#4a3a1a';
  ctx.fillRect(36 * CELL_SIZE, 9 * CELL_SIZE, 3, 3);
}

function drawDecorations(ctx, time) {
  // Corner plants
  drawSprite(ctx, SPRITES.plant, 1 * CELL_SIZE, 6 * CELL_SIZE, '#5a8a6a', 1.2);
  drawSprite(ctx, SPRITES.plant, 38 * CELL_SIZE, 6 * CELL_SIZE, '#5a8a6a', 1.2);
  drawSprite(ctx, SPRITES.plant, 1 * CELL_SIZE, 26 * CELL_SIZE, '#6a8a5a', 1.2);
  drawSprite(ctx, SPRITES.plant, 38 * CELL_SIZE, 26 * CELL_SIZE, '#5a7a6a', 1.2);

  // Coffee mugs on desks
  drawSprite(ctx, SPRITES.mug, 20 * CELL_SIZE, 4 * CELL_SIZE, '#d4a574', 0.8);
  drawSprite(ctx, SPRITES.mug, 5 * CELL_SIZE, 9 * CELL_SIZE, '#c4854a', 0.8);
  drawSprite(ctx, SPRITES.mug, 10 * CELL_SIZE, 9 * CELL_SIZE, '#a07050', 0.8);

  // Steam from coffee
  const steamOffset = Math.sin(time * 0.05) * 2;
  ctx.fillStyle = 'rgba(240, 230, 210, 0.2)';
  ctx.fillRect(20 * CELL_SIZE + 4, 3 * CELL_SIZE + steamOffset, 2, 4);
  ctx.fillRect(5 * CELL_SIZE + 4, 8 * CELL_SIZE + steamOffset, 2, 4);

  // Books on shelf area
  drawSprite(ctx, SPRITES.books, 15 * CELL_SIZE, 4 * CELL_SIZE, '#8a6a4a', 0.8);

  // Wall clock
  const cx = 20 * CELL_SIZE;
  const cy = 1.5 * CELL_SIZE;
  ctx.fillStyle = '#f0e6d3';
  ctx.beginPath();
  ctx.arc(cx, cy, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#5a4a3a';
  ctx.lineWidth = 2;
  ctx.stroke();
  // Clock hands
  const hourAngle = (time * 0.001) % (Math.PI * 2);
  const minAngle = (time * 0.01) % (Math.PI * 2);
  ctx.strokeStyle = '#3a2e1e';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx + Math.cos(hourAngle) * 4, cy + Math.sin(hourAngle) * 4);
  ctx.stroke();
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx + Math.cos(minAngle) * 6, cy + Math.sin(minAngle) * 6);
  ctx.stroke();
}

function getAgentPos(agent, animStates) {
  const isClass = typeof agent.getPosition === 'function';
  if (isClass) {
    return agent.getPosition();
  }

  const anim = animStates?.get(agent.id);
  if (anim) {
    const phase = anim.animPhase;
    const stateTimer = anim.stateTimer;
    const exprKey = getExpressionFromState(agent.state);
    const expr = EXPRESSIONS[exprKey] || EXPRESSIONS.idle;

    // Calculate animation offset based on expression
    let offsetX = 0;
    let offsetY = 0;
    switch (expr.anim) {
      case 'breathe':
        offsetX = 0;
        offsetY = Math.sin(phase) * 0.5;
        break;
      case 'float':
        offsetX = Math.sin(phase * 0.5) * 1;
        offsetY = Math.sin(phase * 0.7) * 2 - 1;
        break;
      case 'type':
        offsetX = Math.sin(phase * 8) * 0.8;
        offsetY = Math.abs(Math.sin(phase * 6)) * -1;
        break;
      case 'lean':
        offsetX = Math.sin(phase * 0.3) * 2 + 2;
        offsetY = Math.sin(phase * 0.5) * 0.5;
        break;
      case 'cast':
        offsetX = Math.sin(phase * 3) * 2;
        offsetY = Math.sin(phase * 2) * -3;
        break;
      case 'walk':
        offsetX = Math.sin(phase * 4) * 1.5;
        offsetY = Math.abs(Math.sin(phase * 4)) * -1.5;
        break;
      case 'jump':
        offsetX = 0;
        offsetY = Math.abs(Math.sin(phase * 3)) * -4;
        break;
    }

    // Bounce
    const bounceOffset = Math.sin(stateTimer * 0.003 + phase) * 1;

    return {
      x: anim.px + offsetX,
      y: anim.py + bounceOffset + offsetY
    };
  }

  return {
    x: agent.px ?? agent.x * CELL_SIZE,
    y: agent.py ?? agent.y * CELL_SIZE
  };
}

function getAgentSprite(agent) {
  if (typeof agent.getSprite === 'function') {
    return agent.getSprite();
  }
  return SPRITES[agent.spriteName || agent.role || 'subagent'];
}

function getAgentExpression(agent) {
  if (agent.expression) {
    return EXPRESSIONS[agent.expression] || EXPRESSIONS.idle;
  }
  return EXPRESSIONS[getExpressionFromState(agent.state)] || EXPRESSIONS.idle;
}

function isAgentBlinking(agent, animStates) {
  if (typeof agent.getPosition === 'function') {
    return agent.isBlinking;
  }
  const anim = animStates?.get(agent.id);
  return anim?.isBlinking ?? false;
}

function getAgentAnimPhase(agent, animStates) {
  if (typeof agent.getPosition === 'function') {
    return agent.animPhase;
  }
  const anim = animStates?.get(agent.id);
  return anim?.animPhase ?? 0;
}

function getAgentWorkProgress(agent) {
  if (agent.currentTask?.progress !== undefined) {
    return agent.currentTask.progress;
  }
  if (agent.workProgress !== undefined) {
    return agent.workProgress;
  }
  return 0;
}

function getAgentDialog(agent) {
  if (agent.dialog?.text) {
    return agent.dialog.text;
  }
  if (typeof agent.dialog === 'string') {
    return agent.dialog;
  }
  return null;
}

function drawAgent(ctx, agent, isSelected, time, animStates) {
  const pos = getAgentPos(agent, animStates);
  const sprite = getAgentSprite(agent);
  const scale = 2;
  const expr = getAgentExpression(agent);
  const animPhase = getAgentAnimPhase(agent, animStates);

  // Expression-based glow
  if (expr.glow) {
    const glowRadius = 18 + Math.sin(time * 0.04 + animPhase) * 4;
    const glowAlpha = 0.15 + Math.sin(time * 0.03) * 0.05;
    const gradient = ctx.createRadialGradient(
      pos.x + 16, pos.y + 16, 4,
      pos.x + 16, pos.y + 16, glowRadius
    );
    const glowColor = agent.color;
    gradient.addColorStop(0, glowColor + Math.floor(glowAlpha * 255).toString(16).padStart(2, '0'));
    gradient.addColorStop(1, glowColor + '00');
    ctx.fillStyle = gradient;
    ctx.fillRect(pos.x - 16, pos.y - 16, 64, 64);
  }

  // Selection highlight (soft glow instead of harsh border)
  if (isSelected) {
    ctx.shadowColor = agent.color;
    ctx.shadowBlur = 20;
    ctx.strokeStyle = agent.color + '80';
    ctx.lineWidth = 2;
    ctx.strokeRect(pos.x - 2, pos.y - 2, 16 * scale + 4, 16 * scale + 4);
    ctx.shadowBlur = 0;
  }

  // Draw sprite
  drawSprite(ctx, sprite, pos.x, pos.y, agent.color, scale);

  // Blink overlay (draw closed eyes)
  if (isAgentBlinking(agent, animStates)) {
    ctx.fillStyle = agent.color;
    ctx.fillRect(pos.x + 6, pos.y + 6, 4, 2);
    ctx.fillRect(pos.x + 22, pos.y + 6, 4, 2);
  }

  // Work progress bar
  const progress = getAgentWorkProgress(agent);
  if (agent.state === 'working' && progress > 0) {
    const barWidth = 28;
    const barHeight = 4;
    const barX = pos.x + 2;
    const barY = pos.y - 10;

    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(barX, barY, barWidth, barHeight);

    ctx.fillStyle = agent.color;
    ctx.fillRect(barX, barY, barWidth * (progress / 100), barHeight);

    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 0.5;
    ctx.strokeRect(barX, barY, barWidth, barHeight);
  }

  // State expression emoji above head
  if (expr.emoji) {
    const emojiY = pos.y - 14 + Math.sin(time * 0.05 + animPhase) * 2;
    ctx.font = '12px "Segoe UI Emoji", "Apple Color Emoji", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(expr.emoji, pos.x + 16, emojiY);

    // Expression bubble background
    const emojiWidth = ctx.measureText(expr.emoji).width;
    ctx.fillStyle = 'rgba(30, 24, 37, 0.6)';
    ctx.beginPath();
    ctx.arc(pos.x + 16, emojiY - 5, emojiWidth * 0.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillText(expr.emoji, pos.x + 16, emojiY);
  }

  // Dialog bubble (chat or task)
  const dialogText = getAgentDialog(agent);
  if (dialogText) {
    drawDialogBubble(ctx, pos.x + 16, pos.y - 6, dialogText, agent.color);
  }

  // Name tag with soft background
  const nameText = agent.name;
  ctx.font = '7px "Press Start 2P", "Noto Sans SC", sans-serif';
  ctx.textAlign = 'center';
  const nameWidth = ctx.measureText(nameText).width;

  // Soft name pill
  const pillWidth = nameWidth + 10;
  const pillX = pos.x + 16 - pillWidth / 2;
  const pillY = pos.y + 38;
  ctx.fillStyle = 'rgba(30, 24, 37, 0.7)';
  ctx.beginPath();
  ctx.moveTo(pillX + 2, pillY);
  ctx.lineTo(pillX + pillWidth - 2, pillY);
  ctx.quadraticCurveTo(pillX + pillWidth, pillY, pillX + pillWidth, pillY + 2);
  ctx.lineTo(pillX + pillWidth, pillY + 8);
  ctx.quadraticCurveTo(pillX + pillWidth, pillY + 10, pillX + pillWidth - 2, pillY + 10);
  ctx.lineTo(pillX + 2, pillY + 10);
  ctx.quadraticCurveTo(pillX, pillY + 10, pillX, pillY + 8);
  ctx.lineTo(pillX, pillY + 2);
  ctx.quadraticCurveTo(pillX, pillY, pillX + 2, pillY);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = agent.color + '40';
  ctx.lineWidth = 0.5;
  ctx.stroke();

  ctx.fillStyle = '#d0c0e0';
  ctx.fillText(nameText, pos.x + 16, pillY + 8);

  // Small state indicator dot
  const stateColors = {
    idle: '#6b7280',
    moving: '#7b9bd1',
    working: '#d4a574',
    reporting: '#7cb89a'
  };
  ctx.fillStyle = stateColors[agent.state] || '#6b7280';
  ctx.beginPath();
  ctx.arc(pos.x + 30, pos.y - 2, 2.5, 0, Math.PI * 2);
  ctx.fill();
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

function drawDialogBubble(ctx, x, y, text, color) {
  const padding = 6;
  const maxWidth = 120;
  ctx.font = '7px "Noto Sans SC", sans-serif';

  let displayText = text;
  if (displayText.length > 20) {
    displayText = displayText.substring(0, 17) + '...';
  }

  const textWidth = Math.min(ctx.measureText(displayText).width, maxWidth);
  const boxWidth = textWidth + padding * 2;
  const boxHeight = 18;

  // Soft bubble background
  ctx.fillStyle = 'rgba(30, 24, 37, 0.85)';
  const bx = x - boxWidth / 2;
  const by = y - boxHeight;
  ctx.beginPath();
  ctx.moveTo(bx + 4, by);
  ctx.lineTo(bx + boxWidth - 4, by);
  ctx.quadraticCurveTo(bx + boxWidth, by, bx + boxWidth, by + 4);
  ctx.lineTo(bx + boxWidth, by + boxHeight - 4);
  ctx.quadraticCurveTo(bx + boxWidth, by + boxHeight, bx + boxWidth - 4, by + boxHeight);
  ctx.lineTo(bx + 4, by + boxHeight);
  ctx.quadraticCurveTo(bx, by + boxHeight, bx, by + boxHeight - 4);
  ctx.lineTo(bx, by + 4);
  ctx.quadraticCurveTo(bx, by, bx + 4, by);
  ctx.closePath();
  ctx.fill();

  // Border with agent color
  ctx.strokeStyle = color + '60';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Small triangle pointer
  ctx.fillStyle = 'rgba(30, 24, 37, 0.85)';
  ctx.beginPath();
  ctx.moveTo(x - 3, y);
  ctx.lineTo(x + 3, y);
  ctx.lineTo(x, y + 4);
  ctx.closePath();
  ctx.fill();

  // Text
  ctx.fillStyle = '#f0e6d3';
  ctx.textAlign = 'center';
  ctx.fillText(displayText, x, y - boxHeight + 12);
}

function getMessageColor(msg) {
  if (typeof msg.getColor === 'function') {
    return msg.getColor();
  }
  const colors = {
    task: '#7b9bd1',
    report: '#7cb89a',
    tool_call: '#d4a574',
    result: '#c9a0dc',
    broadcast: '#e8a0b0'
  };
  return colors[msg.type] || '#b8a9c9';
}

function drawMessages(ctx, messages, agents, time, animStates) {
  for (const msg of messages) {
    const fromAgent = agents.find(a => a.id === msg.from);
    const toAgent = agents.find(a => a.id === msg.to);

    if (!fromAgent) continue;

    const fromPos = getAgentPos(fromAgent, animStates);
    const startX = fromPos.x + 16;
    const startY = fromPos.y + 16;

    const progress = msg.progress !== undefined ? msg.progress : 0.5;
    const msgColor = getMessageColor(msg);

    let endX, endY;
    if (toAgent) {
      const toPos = getAgentPos(toAgent, animStates);
      endX = toPos.x + 16;
      endY = toPos.y + 16;
    } else {
      const angle = progress * Math.PI * 4 + time * 0.02;
      const radius = progress * 50;
      endX = startX + Math.cos(angle) * radius;
      endY = startY + Math.sin(angle) * radius;
    }

    const curX = startX + (endX - startX) * progress;
    const curY = startY + (endY - startY) * progress;

    // Soft trail
    ctx.strokeStyle = msgColor + '40';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([2, 4]);
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(curX, curY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Glowing particle
    ctx.shadowColor = msgColor;
    ctx.shadowBlur = 6;
    ctx.fillStyle = msgColor;
    ctx.beginPath();
    ctx.arc(curX, curY, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Tiny sparkle for tool calls
    if (msg.type === 'tool_call') {
      for (let i = 0; i < 2; i++) {
        const sa = time * 0.1 + i * Math.PI;
        const sd = 6;
        ctx.fillStyle = msgColor + '80';
        ctx.fillRect(curX + Math.cos(sa) * sd - 1, curY + Math.sin(sa) * sd - 1, 2, 2);
      }
    }
  }
}

function drawLabels(ctx) {
  ctx.font = '8px "Press Start 2P", sans-serif';
  ctx.textAlign = 'center';

  ctx.fillStyle = 'rgba(123, 155, 209, 0.5)';
  ctx.fillText('CLAUDE', 22 * CELL_SIZE, 4 * CELL_SIZE);

  ctx.fillStyle = 'rgba(124, 184, 154, 0.4)';
  ctx.fillText('TEAM', 10 * CELL_SIZE, 8 * CELL_SIZE);

  ctx.fillStyle = 'rgba(212, 165, 116, 0.5)';
  ctx.fillText('TOOLS', 35.5 * CELL_SIZE, 6 * CELL_SIZE);
}

function drawAtmosphereParticles(ctx, time) {
  for (const p of ATMOSPHERE_PARTICLES) {
    const px = p.x + Math.sin(time * 0.01 + p.phase) * 10;
    const py = (p.y + time * p.speedY) % CANVAS_HEIGHT;
    const actualY = py < 0 ? py + CANVAS_HEIGHT : py;

    const flicker = Math.sin(time * 0.02 + p.phase) * 0.2 + 0.8;
    ctx.fillStyle = `rgba(245, 230, 200, ${p.opacity * flicker})`;
    ctx.beginPath();
    ctx.arc(px, actualY, p.size, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawVignette(ctx) {
  const gradient = ctx.createRadialGradient(
    CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, CANVAS_WIDTH * 0.3,
    CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, CANVAS_WIDTH * 0.7
  );
  gradient.addColorStop(0, 'rgba(30, 24, 37, 0)');
  gradient.addColorStop(1, 'rgba(30, 24, 37, 0.3)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
}
