# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Pixel Agent Office — a pixel-art visualization of an AI agent office simulation. Agents (Claude, subagents, tool agents) move around an office map, pick up tasks, and communicate via a message bus. Rendered on a HTML5 Canvas with a Japanese RPG-inspired warm palette. The UI is in Chinese (zh-CN).

## Development Commands

| Command | Purpose |
|---------|---------|
| `npm run dev` | Runs the server + Vite dev server concurrently (recommended) |
| `npm run server` | Runs just the Express/WebSocket server on port 3001 |
| `npm run server:clean` | Windows PowerShell — kills port 3001 processes, then starts server |
| `npm run build` | Vite production build |
| `npm run preview` | Preview production build |

**No test framework, linter, or formatter is configured.** Vite dev server runs on port 3000. The backend server runs on port 3001.

## Architecture

### Dual-Mode Runtime

The app operates in two mutually exclusive modes controlled by a toggle in the header:

1. **Simulation Mode** (default): A self-contained game loop drives agent AI, task assignment, and movement. All state lives in `useOfficeState`.
2. **Live Mode**: The frontend connects via WebSocket to a local server (`ws://localhost:3001/ws`) that receives real-time events from Claude Code hooks. In this mode the simulation loop is paused and the UI mirrors external agent activity.

`App.jsx` decides which state source to use: `isLive ? liveState : simState`. When switching to live mode, `useOfficeState.initOffice()` is skipped.

### Agent Class Hierarchy

All agents extend the base `Agent` class (`src/core/Agent.js`):

- `Claude` (`src/core/Claude.js`) — sits at the main desk, receives tasks, analyzes them, splits complex tasks into subtasks, and broadcasts assignments via `MessageBus`.
- `Subagent` (`src/core/Subagent.js`) — picks up tasks, moves to work spots, completes them, reports back to Claude, then returns home.
- `ToolAgent` (`src/core/ToolAgent.js`) — executes tool calls (file_read, web_search, code_exec, etc.), stationed near the server rack.

Agents have a state machine (`idle → moving → working → reporting → idle`) and an expression system (`idle`, `thinking`, `coding`, `reading`, `tool_use`, `moving`, `reporting`) that drives canvas animations.

### Office Map & Pathfinding

`OfficeMap` (`src/core/OfficeMap.js`) is a 40×30 grid with A* pathfinding. Obstacles are marked for desks, the server area, and meeting room walls. Agents call `moveTo(x, y, officeMap)` to get a path and transition to `moving` state.

### Message Bus

`MessageBus` (`src/core/MessageBus.js`) handles inter-agent communication. Messages animate as glowing particles traveling from sender to receiver on the canvas. Delivered messages trigger callbacks subscribed by agent ID.

### Rendering

`OfficeCanvas` (`src/components/OfficeCanvas.jsx`) uses the raw Canvas 2D API with `imageSmoothingEnabled = false`. It is **not** a React component tree — it imperatively draws the entire scene (walls, floor, furniture, agents, messages, particles) in a single `render()` function triggered by `useEffect` when props change. Agent sprites are 16×16 pixel arrays defined in `src/core/sprites.js`.

### State Management

`useOfficeState` is a large custom hook that keeps all mutable game state in refs (`agentsRef`, `taskQueueRef`, `messageBusRef`, etc.) and copies a subset to React state every 5 frames for UI rendering. This avoids React re-render overhead for the 60fps game loop.

### Live Mode Server

`server/index.js` — Express + WebSocket server:
- `GET /api/health` — health check
- `GET /api/state` — current state snapshot
- `POST /api/events` — receive events from Claude Code hooks
- `GET /api/events?type=...` — query-param event receiver for hook compatibility
- `POST /api/clear` — clear all events
- WebSocket on `/ws` — broadcasts state updates to connected clients

`server/events.js` — `EventStore` class maintains state from events, reads/writes `.claude/agent-events.jsonl`, and processes event types: `subagent_start`, `subagent_stop`, `task_created`, `task_assigned`, `task_completed`, `tool_use`, `agent_message`, `chat_message`.

`server/hook-bridge.js` — reads hook JSON from stdin, normalizes field names (handles various hook payload shapes), and appends to `.claude/agent-events.jsonl`.

`server/send-chat.js` — helper script to send chat messages via HTTP POST with guaranteed UTF-8 encoding.

### Styling

- Tailwind CSS with a custom theme (`tailwind.config.js`) — colors like `pixel-dark`, `claude`, `subagent`, `tool`.
- `src/styles/pixel-theme.css` — CSS variables, custom scrollbar, RPG-style borders/buttons, status pills, chat bubbles, and keyframe animations.
- Google Fonts: `Noto Sans SC` (Chinese body) + `Press Start 2P` (pixel headings).

## Key Conventions

- Agent sprites support both class instances (simulation) and plain objects (live mode). `OfficeCanvas` checks `typeof agent.getPosition === 'function'` to branch behavior.
- The canvas uses a fixed logical size of 800×600 but scales via CSS `max-width/max-height: 100%`.
- Chinese locale is used throughout: `toLocaleTimeString('zh-CN', { hour12: false })`.

## gstack

For all web browsing, use the `/browse` skill from gstack. Never use `mcp__claude-in-chrome__*` tools.

Available gstack skills: `/office-hours`, `/plan-ceo-review`, `/plan-eng-review`, `/plan-design-review`, `/design-consultation`, `/design-shotgun`, `/design-html`, `/review`, `/ship`, `/land-and-deploy`, `/canary`, `/benchmark`, `/browse`, `/connect-chrome`, `/qa`, `/qa-only`, `/design-review`, `/setup-browser-cookies`, `/setup-deploy`, `/setup-gbrain`, `/retro`, `/investigate`, `/document-release`, `/document-generate`, `/codex`, `/cso`, `/autoplan`, `/plan-devex-review`, `/devex-review`, `/careful`, `/freeze`, `/guard`, `/unfreeze`, `/gstack-upgrade`, `/learn`.
