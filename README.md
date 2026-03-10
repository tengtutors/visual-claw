# OpenClaw Agent Workspace Monitor

A Chrome extension that visualizes your [OpenClaw](https://openclaw.dev) AI agents as pixel-art characters in a Singapore-themed office. Watch your agents walk between rooms, use tools, think, and respond in real time.

## Features

- **Pixel office workspace** — animated canvas with 4 rooms: Work Area, Meeting Room, Break Room (Singapore-themed), and Washroom
- **Real-time agent tracking** — connects to your local OpenClaw gateway via WebSocket
- **State-to-room mapping** — agents walk to different rooms based on what they're doing
- **Subagent support** — spawned subagents appear as separate characters
- **Task labels** — see what each agent is currently doing
- **Tool indicators** — emoji icons when agents use tools
- **RPG skill sheet** — click any agent to see their stats, skills, and recent activity
- **Demo mode** — toggle demo mode to see 8 mock agents if no gateway is running
- **Singapore culture** — mahjong table, kopi station, Merlion poster, chope tissue table

## Installation

### Prerequisites

- Node.js 18+
- Google Chrome
- [OpenClaw](https://openclaw.dev) gateway running locally

### Setup

1. **Clone the repo**
   ```bash
   git clone <repo-url>
   cd openclaw-agent-workspace-monitor
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure your OpenClaw gateway token**

   Find your gateway auth token:
   ```bash
   node -e "const c=require(require('os').homedir()+'/.openclaw/openclaw.json'); console.log(c.gateway?.auth?.token || 'no token found')"
   ```

   Create a `.env` file in the project root:
   ```bash
   echo "OPENCLAW_AUTH_TOKEN=your_token_here" > .env
   ```

4. **Configure agent display names** (optional)

   Edit `src/lib/store.jsx` and update the `AGENT_DISPLAY_NAMES` map:
   ```js
   const AGENT_DISPLAY_NAMES = {
     main: 'My Bot',
     second: 'Helper Bot',
   };
   ```

5. **Build**
   ```bash
   npm run build
   ```

6. **Load in Chrome**
   - Go to `chrome://extensions/`
   - Enable **Developer mode** (top-right toggle)
   - Click **Load unpacked**
   - Select the `dist/` folder

7. **Open the extension**
   - Click the extension icon → opens the **side panel**
   - Or right-click the icon → "Open Full Dashboard" for a full-page view

### Development

Auto-rebuild on file changes:
```bash
npm run watch
```

Then reload the extension in Chrome (`chrome://extensions/` → refresh icon).

## Connecting to OpenClaw

The extension connects to your local OpenClaw gateway via WebSocket. Make sure:

1. **OpenClaw gateway is running** — typically on `localhost:18789`
2. **Auth token is set** — the `.env` file must contain your gateway token
3. **Demo mode is off** — uncheck "Demo Mode" in the extension UI

### How it works

The extension subscribes to the gateway's WebSocket event stream and maps agent run events to visual states:

| Gateway Event | Stream | Pixel Office Room |
|---|---|---|
| Run started | `lifecycle` (start) | Work Area |
| Using a tool | `tool` | Work Area + tool icon |
| LLM thinking | `thinking` | Meeting Room |
| Writing response | `assistant` | Work Area + task text |
| Context compaction | `compaction` | Break Room |
| Run finished | `lifecycle` (end) | Break Room |
| Run error | `lifecycle` (error) | Washroom |

### Custom gateway port

If your gateway runs on a different port, edit `src/lib/constants.js`:

```js
export const OPENCLAW_WS_URL = 'ws://localhost:YOUR_PORT';
export const OPENCLAW_API_URL = 'http://localhost:YOUR_PORT';
```

Then rebuild with `npm run build`.

## Project Structure

```
src/
├── lib/
│   ├── constants.js           # Config, URLs, state definitions
│   ├── store.jsx              # React state management
│   ├── openclaw-connection.js # Gateway WebSocket client
│   ├── office-map.js          # Room layout and furniture
│   ├── movement.js            # Agent movement controller
│   ├── sprite-renderer.js     # Canvas pixel art rendering
│   └── mock-data.js           # Demo mode mock agents
├── components/
│   ├── WorkspaceCanvas.jsx    # Main canvas component
│   ├── AgentSkillSheet.jsx    # RPG stat panel on click
│   ├── EventLog.jsx           # Activity feed
│   ├── DemoControls.jsx       # Demo mode toggle
│   └── StatusBar.jsx          # Agent count pills
├── sidepanel/                 # Chrome side panel entry
├── dashboard/                 # Full-page dashboard entry
└── background/                # Service worker
```

## License

MIT
