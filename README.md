# Visual Claw

Visual Claw is a Chrome extension that turns your OpenClaw AI agents into a living pixel-art office. Watch agents walk, idle, and work in real time — click them for details, rearrange the furniture, create custom avatars, and manage your agent fleet from the browser sidebar.

## What It Does

- Visualizes OpenClaw agents as animated pixel-art characters in a tile-based office
- Agents walk, idle, and work with directional sprite animations
- Chat reply snippets appear as speech bubbles above agents (20s with fade-out, up to 140 chars)
- Click agents to open an RPG-style skill sheet with activity, workspace files, and stats
- Click interactive furniture to open management panels
- Drag-and-drop interior design tool for rearranging the office
- Custom avatar editor with sprite sheet generation and flood-fill background removal

## Features

### Live Agent Visualization
Agents connected to the OpenClaw gateway appear as animated characters. Each agent has walk, idle, and work animations with four-directional movement. Agent state (working, meeting, waiting, blocked) is reflected visually with status colors and movement patterns.

### Custom Avatars
Create personalized pixel-art avatars for your agents using the built-in avatar editor. Upload any image, crop to a sprite-friendly format, and the editor generates a full animation sheet (walk, idle, work) with automatic flood-fill background removal.

### Chat Bubbles
When agents reply to messages, a snippet of their response appears as a speech bubble above their character. Bubbles stay visible for 20 seconds and fade out gracefully. Supports up to 140 characters of text.

### Interactive Furniture
Some furniture pieces are mapped to management panels:

| Object | Action |
|--------|--------|
| Blackboard | Edit Layout |

When you click a mapped object, its corresponding panel opens as an overlay.

### Interior Design
Rearrange the office layout with the drag-and-drop design tool. Place furniture, set collision zones, assign interactive actions, and save layouts that persist across sessions via the local file server.

### Agent Skill Sheet
Click any agent to view their profile — recent activity, current state, workspace files (SOUL.md, IDENTITY.md, etc.), and display name. Files can be viewed and edited directly from the panel.

## Architecture

Visual Claw has three layers:

1. **OpenClaw Gateway Connection**
   The extension connects to the local OpenClaw gateway over WebSocket. Gateway events are translated into workspace states (working, meeting, waiting, blocked) that drive character animations and status indicators.

2. **Chrome Extension UI**
   Available as both a side panel and a full-page dashboard. The same live office renders in both views. Clicking agents opens the skill sheet; clicking interactive furniture opens management panels.

3. **Local File Server** (optional)
   `tools/workspace-file-server.js` bridges the extension with the OpenClaw CLI and local filesystem. It provides endpoints for agent management, layout persistence, cron tasks, file access, and gateway control.

## Gateway Discovery

At startup the extension:

1. Asks the local file server for gateway details from `~/.openclaw/openclaw.json`
2. Receives the local WebSocket URL and auth token
3. Attempts the discovered gateway first
4. Falls back to standard localhost addresses if discovery is unavailable

This lets the same extension build work on different machines without re-baking a token.

## Installation

### Prerequisites

- Node.js 18+
- Google Chrome
- A local OpenClaw gateway, started with:
  ```bash
  openclaw gateway --auth password --password claw
  ```

### Setup

1. Clone the repo.
   ```bash
   git clone https://github.com/tengtutors/visual-claw.git
   cd visual-claw
   ```

2. Install dependencies.
   ```bash
   npm install
   ```

3. Build the extension.
   ```bash
   npm run build
   ```

4. Load `dist/` in Chrome via `chrome://extensions` (Developer mode → Load unpacked).

## Development

Watch mode:

```bash
npm run watch
```

Then reload the unpacked extension in Chrome after changes.

## Local File Server

Run this to enable agent management, layout persistence, and file editing:

```bash
node tools/workspace-file-server.js
```

The server runs on `http://127.0.0.1:18790` and provides:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/agents` | GET | List registered agents |
| `/gateway-config` | GET | Gateway connection details |
| `/office-layout` | GET/POST | Load or save furniture layout |
| `/file` | GET/POST | Read or edit agent workspace files |
| `/create-agent` | POST | Deploy a new agent (with Telegram channel + routing) |
| `/delete-agent` | POST | Remove an agent |
| `/gateway-restart` | POST | Restart the OpenClaw gateway |
| `/cron` | GET | List scheduled cron jobs |
| `/cron-add` | POST | Create a new cron job |
| `/cron-toggle` | POST | Enable or disable a cron job |
| `/cron-delete` | POST | Delete a cron job |

If the server is not running, the extension still works as a visualizer but management features show fallback messages.

## Tools

### Interior Design Editor
`tools/interior-design.html` — Standalone browser tool for planning furniture placement. Drag items from a catalog, set collisions and interactions, then export or save directly to the file server.

### Avatar Editor
`tools/avatar-editor.html` — Create custom agent avatars. Upload an image, crop it, and generate a full sprite sheet with walk/idle/work animations. Includes flood-fill background removal for clean transparency.

## Project Structure

```
src/
  background/               Chrome extension service worker
  components/               React UI — panels, skill sheet, map overlay
  dashboard/                Full-page dashboard entry
  lib/                      State, connection, movement, tile-map definitions
  pixi/                     PixiJS scene, character rendering, animations
  sidepanel/                Chrome side panel entry

tools/
  avatar-editor.html        Custom sprite avatar creator
  avatar-editor.js          Avatar editor logic
  interior-design.html      Drag-and-drop office layout editor
  interior-design.js        Layout editor logic
  workspace-file-server.js  Local bridge server for OpenClaw CLI + filesystem

public/
  data/                     Persisted office layout JSON
  sprites/                  Character sprite sheets and tilesets
  assets/                   Office tileset packs and room backgrounds
```

## License

MIT
