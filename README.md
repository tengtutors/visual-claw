# Visual Claw

Visual Claw is a Chrome extension that turns your OpenClaw agents into a living pixel-art workspace. It started as a monitoring view, and now also includes interactive office furniture, an agent detail panel, optional workspace file access, and a local interior design tool for evolving the office layout.

## What It Does

- Visualizes OpenClaw agents in real time inside a tile-based office
- Maps agent activity to rooms, movement, and status highlights
- Lets users click interactive furniture to open workspace panels
- Shows an RPG-style agent sheet with recent activity and editable workspace files
- Includes a browser-based interior design tool for rearranging furniture and planning new interactions

## Current Workflow

Visual Claw now has three layers that work together:

1. **OpenClaw gateway connection**
   - The extension connects to the local OpenClaw gateway over WebSocket.
   - Gateway events are translated into simplified workspace states such as `working`, `meeting`, `waiting`, and `blocked`.

2. **Workspace UI**
   - The side panel and dashboard render the same live office state.
   - Clicking an agent opens the skill sheet.
   - Clicking interactive furniture opens a panel tied to that object.

3. **Optional local tools**
   - `tools/workspace-file-server.js` exposes safe local endpoints for reading agent metadata and selected workspace files.
   - `tools/interior-design.html` is a standalone design surface for planning and exporting furniture layouts.

## Interactive Furniture Workflow

The office is no longer just decorative. Some furniture pieces are mapped to product actions in [src/lib/tile-map.js](/Users/teng/visual%20claw/src/lib/tile-map.js).

Current mappings:

- `computer_topleft` -> `Create Agent`
- `rug` -> `Gateway Setup`
- `cooler_left` -> `Scheduled Tasks`
- `vending_machine` -> `Workspace Settings`
- `bookshelf_right` -> `Event Log`

When you click one of those objects in the map:

- [src/components/PixiOfficeMap.jsx](/Users/teng/visual%20claw/src/components/PixiOfficeMap.jsx) hit-tests the furniture
- the matching action is looked up from `INTERACTIVE_FURNITURE`
- [src/components/FurniturePanel.jsx](/Users/teng/visual%20claw/src/components/FurniturePanel.jsx) renders the corresponding panel

This means the office layout now carries product meaning. Changing furniture placement can also change how users discover key actions.

## Installation

### Prerequisites

- Node.js 18+
- Google Chrome
- A local OpenClaw gateway

### Setup

1. Clone the repo.
   ```bash
   git clone <repo-url>
   cd visual-claw
   ```

2. Install dependencies.
   ```bash
   npm install
   ```

3. Add your OpenClaw gateway auth token to `.env`.
   ```bash
   OPENCLAW_AUTH_TOKEN=your_token_here
   ```

4. Build the extension.
   ```bash
   npm run build
   ```

5. Load `dist/` in Chrome via `chrome://extensions`.

## Development

Watch mode:

```bash
npm run watch
```

Then reload the unpacked extension in Chrome.

## Optional Local Services

### Workspace file server

Run this if you want the extension to read agent metadata, load model lists, or read and edit safe workspace files from the agent sheet.

```bash
node tools/workspace-file-server.js
```

What it provides:

- `GET /agents`
- `GET /models`
- `GET /file?agent=<id>&path=<relpath>`
- `POST /file?agent=<id>&path=<relpath>`

Notes:

- It runs on `http://127.0.0.1:18790`
- It reads agent workspaces from `~/.openclaw/openclaw.json`
- Writes are intentionally limited to `SOUL.md`, `IDENTITY.md`, `TOOLS.md`, `USER.md`, and `MEMORY.md`

If the server is not running, the extension still works as a visualizer, but file-based features will show fallback messages.

## Interior Design Tool

The interior design tool lives at [tools/interior-design.html](/Users/teng/visual%20claw/tools/interior-design.html). It is a standalone browser tool for planning furniture placement before copying the layout into the app.

Use it when you want to:

- rearrange the office visually
- test new furniture positions
- experiment with which objects should become interactive
- export a layout snapshot for later incorporation into `tile-map.js`

Basic usage:

1. Open `tools/interior-design.html` in a browser.
2. Select a furniture item from the catalog.
3. Click on the map to place it.
4. Drag placed items to refine their positions.
5. Click an item to edit coordinates or flip it.
6. Use `Export JSON` to copy the current layout.

Built-in controls:

- `Delete Mode` for removing items quickly
- `Undo`
- `Clear All`
- `Load Defaults`
- `Export JSON`
- `Import JSON`

## How To Incorporate A New Layout

The interior design tool does not automatically update the runtime map. Layout changes are incorporated manually into [src/lib/tile-map.js](/Users/teng/visual%20claw/src/lib/tile-map.js).

Recommended process:

1. Start from `Load Defaults` in the design tool so you are editing the current office baseline.
2. Make layout changes and export the JSON.
3. Translate the exported items into `FURNITURE_OBJECTS`.
4. For each object, define:
   - `id`
   - `src`
   - `x` and `y`
   - `collision` if the item should block movement
   - `zAnchor`
5. If the object should open a UI panel, add a matching entry to `INTERACTIVE_FURNITURE`.
6. Rebuild the extension and verify the layout in the side panel and dashboard.

When copying from the design tool into `tile-map.js`:

- `hasCollision: true` should usually become a collision rectangle sized from the source sprite and `TILE_SCALE`
- decorative items can keep `collision: null`
- table-top items and wall decor often need a higher or custom `zAnchor`
- interactive meaning is defined separately from placement, so placement alone will not make an item clickable

## Project Structure

```text
src/
  background/               Chrome extension service worker
  components/               React UI components and overlay panels
  dashboard/                Full-page dashboard entry
  lib/                      State, connection, movement, and tile-map definitions
  pixi/                     Pixi scene, asset loading, and character helpers
  sidepanel/                Chrome side panel entry

tools/
  interior-design.html      Standalone office layout editor
  workspace-file-server.js  Local helper server for workspace/model/file access
```

## Design Notes

- The source of truth for the shipped office layout is [src/lib/tile-map.js](/Users/teng/visual%20claw/src/lib/tile-map.js)
- The interior design tool is a planning and export tool, not the runtime renderer
- Interactive furniture is part of the UX architecture now, not just visual decoration

## License

MIT
