// Cross-platform hook bridge for Claude Code
// Reads hook event JSON from stdin, writes normalized event to events file

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const EVENTS_FILE = path.join(__dirname, '..', '.claude', 'agent-events.jsonl');

const dir = path.dirname(EVENTS_FILE);
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => { input += chunk; });
process.stdin.on('end', () => {
  try {
    const hookData = JSON.parse(input);
    const eventType = process.argv[2] || 'unknown';

    // Debug: log raw hook data to stderr (won't break Claude Code)
    console.error(`[hook-bridge] raw event=${eventType} data=${JSON.stringify(hookData).substring(0, 200)}`);

    let normalizedEvent = null;

    switch (eventType) {
      case 'subagent_start': {
        // Claude Code hook payload may contain various field names
        const agentId = hookData.agent_id || hookData.agentId || hookData.id || hookData.request_id || 'unknown';
        // Try multiple possible name fields
        const name = hookData.agent_name || hookData.name || hookData.agentType || hookData.type || hookData.description || `Agent-${agentId.slice(0, 6)}`;
        normalizedEvent = {
          timestamp: new Date().toISOString(),
          type: 'subagent_start',
          data: {
            agentId,
            name,
            agentType: hookData.agentType || hookData.type || 'unknown',
            color: '#10b981'
          }
        };
        break;
      }

      case 'subagent_stop': {
        const agentId = hookData.agent_id || hookData.agentId || hookData.id || hookData.request_id || 'unknown';
        normalizedEvent = {
          timestamp: new Date().toISOString(),
          type: 'subagent_stop',
          data: {
            agentId
          }
        };
        break;
      }

      case 'task_created':
        normalizedEvent = {
          timestamp: new Date().toISOString(),
          type: 'task_created',
          data: {
            taskId: hookData.task_id || hookData.taskId || 't-' + Date.now(),
            description: hookData.task_description || hookData.description || 'Task',
            priority: hookData.priority || 3,
            taskType: hookData.task_type || 'simple',
            subtasks: hookData.subtasks || []
          }
        };
        break;

      case 'task_completed':
        normalizedEvent = {
          timestamp: new Date().toISOString(),
          type: 'task_completed',
          data: {
            taskId: hookData.task_id || hookData.taskId || 'unknown'
          }
        };
        break;

      case 'tool_use': {
        const toolName = hookData.tool_name || hookData.tool || 'unknown';
        const toolInput = hookData.tool_input || hookData.input
          ? JSON.stringify(hookData.tool_input || hookData.input).substring(0, 100)
          : '';
        normalizedEvent = {
          timestamp: new Date().toISOString(),
          type: 'tool_use',
          data: {
            tool: toolName,
            input: toolInput,
            agentId: 'claude'
          }
        };
        break;
      }
    }

    if (normalizedEvent) {
      fs.appendFileSync(EVENTS_FILE, JSON.stringify(normalizedEvent) + '\n');
      console.error(`[hook-bridge] ${eventType} -> ${EVENTS_FILE} (agent=${normalizedEvent.data.agentId || normalizedEvent.data.taskId || 'n/a'})`);
    }
  } catch (err) {
    console.error('[hook-bridge] error:', err.message);
  }
});
