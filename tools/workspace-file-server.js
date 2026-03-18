#!/usr/bin/env node
/**
 * Tiny HTTP server that serves OpenClaw workspace files.
 * Runs on localhost:18790 alongside the OpenClaw gateway (18789).
 *
 * Endpoints:
 *   GET  /agents                          → list of agents with workspace paths
 *   GET  /file?agent=<id>&path=<relpath>  → read a file from an agent's workspace
 *   POST /file?agent=<id>&path=<relpath>  → write a file (body: { content })
 *
 * Usage:
 *   node tools/workspace-file-server.js
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 18790;
const OPENCLAW_CONFIG = path.join(require('os').homedir(), '.openclaw', 'openclaw.json');
const OFFICE_LAYOUT_PATH = path.join(__dirname, '..', 'public', 'data', 'office-layout.json');
const OPENCLAW_BIN = '/opt/homebrew/bin/openclaw';

function loadConfig() {
  try {
    return JSON.parse(fs.readFileSync(OPENCLAW_CONFIG, 'utf-8'));
  } catch {
    return null;
  }
}

function getAgents(config) {
  const agents = config?.agents?.list || [];
  return agents.map(a => ({
    id: a.id,
    name: a.name,
    workspace: a.workspace,
    model: typeof a.model === 'string' ? a.model : a.model?.primary || 'unknown',
  }));
}

function readWorkspaceFile(agents, agentId, relPath) {
  const agent = agents.find(a => a.id === agentId);
  if (!agent) return { error: 'Agent not found', status: 404 };

  // Security: prevent path traversal
  const resolved = path.resolve(agent.workspace, relPath);
  if (!resolved.startsWith(path.resolve(agent.workspace))) {
    return { error: 'Path traversal not allowed', status: 403 };
  }

  try {
    const content = fs.readFileSync(resolved, 'utf-8');
    return { content, path: resolved };
  } catch (err) {
    return { error: `File not found: ${relPath}`, status: 404 };
  }
}

function readOfficeLayout() {
  try {
    return JSON.parse(fs.readFileSync(OFFICE_LAYOUT_PATH, 'utf-8'));
  } catch {
    return null;
  }
}

function isValidLayoutItem(item) {
  return item
    && typeof item.id === 'string'
    && item.src
    && Number.isFinite(item.src.x)
    && Number.isFinite(item.src.y)
    && Number.isFinite(item.src.w)
    && Number.isFinite(item.src.h)
    && Number.isFinite(item.x)
    && Number.isFinite(item.y);
}

function writeOfficeLayout(layout) {
  if (!Array.isArray(layout) || layout.some((item) => !isValidLayoutItem(item))) {
    return { error: 'Layout must be an array of furniture items with id, src, x, and y', status: 400 };
  }

  fs.mkdirSync(path.dirname(OFFICE_LAYOUT_PATH), { recursive: true });
  fs.writeFileSync(OFFICE_LAYOUT_PATH, JSON.stringify(layout, null, 2) + '\n', 'utf-8');
  return { ok: true };
}

function toHttpUrl(value) {
  if (!value || typeof value !== 'string') return null;
  try {
    const parsed = new URL(value);
    if (parsed.protocol === 'ws:') parsed.protocol = 'http:';
    if (parsed.protocol === 'wss:') parsed.protocol = 'https:';
    return parsed.toString().replace(/\/$/, '');
  } catch {
    return null;
  }
}

function toWsUrl(value) {
  if (!value || typeof value !== 'string') return null;
  try {
    const parsed = new URL(value);
    if (parsed.protocol === 'http:') parsed.protocol = 'ws:';
    if (parsed.protocol === 'https:') parsed.protocol = 'wss:';
    return parsed.toString().replace(/\/$/, '');
  } catch {
    return null;
  }
}

function getGatewayConfig(config) {
  const gateway = config?.gateway || {};
  const token = gateway?.auth?.token || '';
  const host = gateway?.host || '127.0.0.1';
  const port = Number.isFinite(Number(gateway?.port)) ? Number(gateway.port) : 18789;

  const httpUrl = toHttpUrl(gateway.url)
    || toHttpUrl(gateway.httpUrl)
    || (gateway.wsUrl ? toHttpUrl(gateway.wsUrl) : null)
    || `http://${host}:${port}`;

  const wsUrl = toWsUrl(gateway.wsUrl)
    || toWsUrl(gateway.url)
    || `${httpUrl.replace(/^http:/, 'ws:').replace(/^https:/, 'wss:')}`;

  return {
    token,
    httpUrl,
    wsUrl,
    candidates: [
      { wsUrl, token },
      { wsUrl: wsUrl.replace('127.0.0.1', 'localhost'), token },
      { wsUrl: 'ws://127.0.0.1:18789', token },
      { wsUrl: 'ws://localhost:18789', token },
    ].filter((entry, index, arr) => entry.wsUrl && arr.findIndex((other) => other.wsUrl === entry.wsUrl && other.token === entry.token) === index),
  };
}

const server = http.createServer((req, res) => {
  // CORS headers for Chrome extension
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://localhost:${PORT}`);

  if (url.pathname === '/agents') {
    const config = loadConfig();
    if (!config) {
      res.writeHead(500);
      res.end(JSON.stringify({ error: 'Could not read openclaw.json' }));
      return;
    }
    const agents = getAgents(config);
    // Return agent list with hasSoul/hasIdentity flags
    const result = agents.map(a => {
      const hasSoul = fs.existsSync(path.join(a.workspace, 'SOUL.md'));
      const hasIdentity = fs.existsSync(path.join(a.workspace, 'IDENTITY.md'));
      return { ...a, hasSoul, hasIdentity, workspace: undefined };
    });
    res.writeHead(200);
    res.end(JSON.stringify(result));
    return;
  }

  if (url.pathname === '/models') {
    const config = loadConfig();
    if (!config) {
      res.writeHead(500);
      res.end(JSON.stringify({ error: 'Could not read openclaw.json' }));
      return;
    }
    // Return all configured models from openclaw.json
    const models = [];
    const defaults = config?.agents?.defaults?.models || {};
    for (const modelId of Object.keys(defaults)) {
      models.push(modelId);
    }
    // Also add models from providers
    const providers = config?.models?.providers || {};
    for (const [provName, prov] of Object.entries(providers)) {
      for (const m of (prov.models || [])) {
        const fullId = `${provName}/${m.id}`;
        if (!models.includes(fullId)) models.push(fullId);
      }
    }
    // Add agent-specific models
    for (const a of (config?.agents?.list || [])) {
      const mid = typeof a.model === 'string' ? a.model : a.model?.primary;
      if (mid && !models.includes(mid)) models.push(mid);
      const fallbacks = typeof a.model === 'object' ? (a.model.fallbacks || []) : [];
      for (const fb of fallbacks) {
        if (!models.includes(fb)) models.push(fb);
      }
    }
    res.writeHead(200);
    res.end(JSON.stringify(models));
    return;
  }

  if (url.pathname === '/gateway-config') {
    const config = loadConfig();
    if (!config) {
      res.writeHead(404);
      res.end(JSON.stringify({
        error: 'Could not read openclaw.json',
        candidates: [
          { wsUrl: 'ws://127.0.0.1:18789', token: '' },
          { wsUrl: 'ws://localhost:18789', token: '' },
        ],
      }));
      return;
    }
    const gatewayConfig = getGatewayConfig(config);
    res.writeHead(200);
    res.end(JSON.stringify(gatewayConfig));
    return;
  }

  if (url.pathname === '/office-layout' && req.method === 'GET') {
    const layout = readOfficeLayout();
    if (!layout) {
      res.writeHead(404);
      res.end(JSON.stringify({ error: 'office-layout.json not found' }));
      return;
    }
    res.writeHead(200);
    res.end(JSON.stringify(layout));
    return;
  }

  if (url.pathname === '/office-layout' && req.method === 'POST') {
    let body = '';
    req.on('data', (chunk) => { body += chunk; });
    req.on('end', () => {
      try {
        const parsed = JSON.parse(body);
        const layout = Array.isArray(parsed) ? parsed : parsed.layout;
        const result = writeOfficeLayout(layout);
        if (result.error) {
          res.writeHead(result.status);
          res.end(JSON.stringify({ error: result.error }));
          return;
        }
        res.writeHead(200);
        res.end(JSON.stringify({ ok: true, path: OFFICE_LAYOUT_PATH, count: layout.length }));
      } catch (err) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  if (url.pathname === '/create-agent' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const { name, model, botToken, task } = JSON.parse(body);
        if (!name || !name.trim()) {
          res.writeHead(400);
          res.end(JSON.stringify({ error: 'Agent name is required' }));
          return;
        }

        const agentId = name.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-');
        const workspacePath = path.join(require('os').homedir(), '.openclaw', `workspace-${agentId}`);
        const { execFile } = require('child_process');
        const steps = [];

        function runStep(cmd, args, label) {
          return new Promise((resolve, reject) => {
            execFile(cmd, args, { timeout: 15000 }, (err, stdout, stderr) => {
              if (err) {
                reject(new Error(`${label}: ${stderr || err.message}`));
              } else {
                steps.push(label);
                resolve(stdout);
              }
            });
          });
        }

        (async () => {
          // Step 1: Create the agent
          const addArgs = ['agents', 'add', agentId, '--workspace', workspacePath, '--non-interactive'];
          if (model) addArgs.push('--model', model);
          await runStep(OPENCLAW_BIN, addArgs, 'Agent created');

          // Step 2: Create workspace files
          fs.mkdirSync(workspacePath, { recursive: true });
          if (task) {
            fs.writeFileSync(path.join(workspacePath, 'AGENTS.md'), `# Task\n\n${task}\n`, 'utf-8');
          }
          const identityContent = `# ${name.trim()}\n\nRole: AI Agent\n`;
          if (!fs.existsSync(path.join(workspacePath, 'IDENTITY.md'))) {
            fs.writeFileSync(path.join(workspacePath, 'IDENTITY.md'), identityContent, 'utf-8');
          }
          steps.push('Workspace initialized');

          // Step 3: Configure Telegram channel + routing binding if bot token provided
          if (botToken && botToken.trim()) {
            await runStep(OPENCLAW_BIN, [
              'channels', 'add',
              '--channel', 'telegram',
              '--token', botToken.trim(),
              '--account', agentId,
            ], 'Telegram channel configured');

            // Add routing binding so messages go to this agent, not the default
            const currentConfig = loadConfig();
            if (currentConfig) {
              if (!currentConfig.bindings) currentConfig.bindings = [];
              const exists = currentConfig.bindings.some(
                b => b.agentId === agentId && b.match?.channel === 'telegram'
              );
              if (!exists) {
                currentConfig.bindings.push({
                  agentId,
                  match: { channel: 'telegram', accountId: agentId },
                });
                fs.writeFileSync(OPENCLAW_CONFIG, JSON.stringify(currentConfig, null, 2) + '\n', 'utf-8');
                steps.push('Routing binding added');
              }
            }
          }

          // Step 4: Restart gateway to pick up new agent + channel
          await runStep(OPENCLAW_BIN, ['gateway', 'restart'], 'Gateway restarted');

          res.writeHead(200);
          res.end(JSON.stringify({
            ok: true,
            agentId,
            workspace: workspacePath,
            steps,
            message: `Agent "${name.trim()}" deployed (${steps.join(' → ')})`,
          }));
        })().catch(err => {
          res.writeHead(500);
          res.end(JSON.stringify({
            error: err.message,
            completedSteps: steps,
          }));
        });
      } catch (err) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  if (url.pathname === '/delete-agent' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const { agentId } = JSON.parse(body);
        if (!agentId || !agentId.trim()) {
          res.writeHead(400);
          res.end(JSON.stringify({ error: 'agentId is required' }));
          return;
        }
        const { execFile } = require('child_process');
        execFile(OPENCLAW_BIN, ['agents', 'delete', agentId.trim(), '--force'], { timeout: 15000 }, (err, stdout, stderr) => {
          if (err) {
            res.writeHead(500);
            res.end(JSON.stringify({ error: stderr || err.message }));
            return;
          }
          // Restart gateway to reflect removal
          execFile(OPENCLAW_BIN, ['gateway', 'restart'], { timeout: 15000 }, () => {});
          res.writeHead(200);
          res.end(JSON.stringify({ ok: true, message: `Agent "${agentId}" deleted` }));
        });
      } catch (err) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // ── Cron job management ──
  if (url.pathname === '/cron' && req.method === 'GET') {
    const { execFile } = require('child_process');
    execFile(OPENCLAW_BIN, ['cron', 'list', '--json'], { timeout: 15000, maxBuffer: 1024 * 1024 }, (err, stdout, stderr) => {
      if (err) {
        res.writeHead(500);
        res.end(JSON.stringify({ error: stderr || err.message }));
        return;
      }
      try {
        const data = JSON.parse(stdout);
        res.writeHead(200);
        res.end(JSON.stringify(data));
      } catch {
        res.writeHead(200);
        res.end(JSON.stringify({ jobs: [] }));
      }
    });
    return;
  }

  if (url.pathname === '/cron-toggle' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const { id, enabled } = JSON.parse(body);
        const cmd = enabled ? 'enable' : 'disable';
        const { execFile } = require('child_process');
        execFile(OPENCLAW_BIN, ['cron', cmd, id], { timeout: 15000 }, (err, stdout, stderr) => {
          if (err) {
            res.writeHead(500);
            res.end(JSON.stringify({ error: stderr || err.message }));
            return;
          }
          res.writeHead(200);
          res.end(JSON.stringify({ ok: true }));
        });
      } catch (err) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  if (url.pathname === '/cron-delete' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const { id } = JSON.parse(body);
        const { execFile } = require('child_process');
        execFile(OPENCLAW_BIN, ['cron', 'rm', id], { timeout: 15000 }, (err, stdout, stderr) => {
          if (err) {
            res.writeHead(500);
            res.end(JSON.stringify({ error: stderr || err.message }));
            return;
          }
          res.writeHead(200);
          res.end(JSON.stringify({ ok: true }));
        });
      } catch (err) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  if (url.pathname === '/cron-add' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const { name, schedule, message, agent } = JSON.parse(body);
        if (!name || !schedule || !message) {
          res.writeHead(400);
          res.end(JSON.stringify({ error: 'name, schedule, and message are required' }));
          return;
        }
        const args = ['cron', 'add', '--name', name, '--message', message, '--json'];
        if (agent) args.push('--agent', agent);
        // Parse schedule: "every X" or cron expression
        if (schedule.startsWith('every ')) {
          args.push('--every', schedule.replace('every ', ''));
        } else {
          args.push('--cron', schedule);
        }
        const { execFile } = require('child_process');
        execFile(OPENCLAW_BIN, args, { timeout: 15000 }, (err, stdout, stderr) => {
          if (err) {
            res.writeHead(500);
            res.end(JSON.stringify({ error: stderr || err.message }));
            return;
          }
          res.writeHead(200);
          res.end(JSON.stringify({ ok: true }));
        });
      } catch (err) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  if (url.pathname === '/gateway-restart' && req.method === 'POST') {
    const { execFile } = require('child_process');
    execFile(OPENCLAW_BIN, ['gateway', 'restart'], { timeout: 15000 }, (err, stdout, stderr) => {
      if (err) {
        res.writeHead(500);
        res.end(JSON.stringify({ error: stderr || err.message }));
        return;
      }
      res.writeHead(200);
      res.end(JSON.stringify({ ok: true, message: 'Gateway restarted' }));
    });
    return;
  }

  if (url.pathname === '/file' && req.method === 'GET') {
    const config = loadConfig();
    if (!config) {
      res.writeHead(500);
      res.end(JSON.stringify({ error: 'Could not read openclaw.json' }));
      return;
    }
    const agents = getAgents(config);
    const agentId = url.searchParams.get('agent');
    const filePath = url.searchParams.get('path');
    if (!agentId || !filePath) {
      res.writeHead(400);
      res.end(JSON.stringify({ error: 'Missing agent or path parameter' }));
      return;
    }
    const result = readWorkspaceFile(agents, agentId, filePath);
    if (result.error) {
      res.writeHead(result.status);
      res.end(JSON.stringify({ error: result.error }));
    } else {
      res.writeHead(200);
      res.end(JSON.stringify({ content: result.content }));
    }
    return;
  }

  if (url.pathname === '/file' && req.method === 'POST') {
    const config = loadConfig();
    if (!config) {
      res.writeHead(500);
      res.end(JSON.stringify({ error: 'Could not read openclaw.json' }));
      return;
    }
    const agents = getAgents(config);
    const agentId = url.searchParams.get('agent');
    const filePath = url.searchParams.get('path');
    if (!agentId || !filePath) {
      res.writeHead(400);
      res.end(JSON.stringify({ error: 'Missing agent or path parameter' }));
      return;
    }
    // Only allow writing known safe files
    const WRITABLE = ['SOUL.md', 'IDENTITY.md', 'TOOLS.md', 'USER.md', 'MEMORY.md'];
    if (!WRITABLE.includes(filePath)) {
      res.writeHead(403);
      res.end(JSON.stringify({ error: `Writing ${filePath} not allowed. Writable: ${WRITABLE.join(', ')}` }));
      return;
    }
    const agent = agents.find(a => a.id === agentId);
    if (!agent) {
      res.writeHead(404);
      res.end(JSON.stringify({ error: 'Agent not found' }));
      return;
    }
    const resolved = path.resolve(agent.workspace, filePath);
    if (!resolved.startsWith(path.resolve(agent.workspace))) {
      res.writeHead(403);
      res.end(JSON.stringify({ error: 'Path traversal not allowed' }));
      return;
    }
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const { content } = JSON.parse(body);
        if (typeof content !== 'string') {
          res.writeHead(400);
          res.end(JSON.stringify({ error: 'Body must be { content: string }' }));
          return;
        }
        fs.writeFileSync(resolved, content, 'utf-8');
        res.writeHead(200);
        res.end(JSON.stringify({ ok: true, path: resolved }));
      } catch (err) {
        res.writeHead(500);
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  res.writeHead(404);
  res.end(JSON.stringify({ error: 'Not found' }));
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`Workspace file server running on http://127.0.0.1:${PORT}`);
  console.log(`Serving ${getAgents(loadConfig()).length} agents`);
});
