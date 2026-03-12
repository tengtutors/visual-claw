# Interior Design Workflow

This document explains how to use the local interior design tool and how to move a layout from design-time into the shipped Visual Claw experience.

## Purpose

The interior design tool is for planning the office map outside the extension UI. It gives you a fast way to test furniture placement, discover better interaction points, and export layout ideas before updating runtime code.

Tool location:

- [tools/interior-design.html](/Users/teng/visual%20claw/tools/interior-design.html)

Runtime source of truth:

- [src/lib/tile-map.js](/Users/teng/visual%20claw/src/lib/tile-map.js)

## What The Tool Supports

- furniture catalog grouped by category
- click-to-place workflow
- drag-to-move editing
- delete mode
- undo support
- import/export of layout JSON
- property editing for selected items
- visual tagging of interactive furniture candidates

## Recommended Workflow

1. Open the tool in a browser.
2. Click `Load Defaults` to start from the current shipped layout.
3. Rearrange furniture or add new pieces from the catalog.
4. Decide which pieces are decorative and which should be interactive.
5. Export the layout JSON.
6. Copy the approved layout into [src/lib/tile-map.js](/Users/teng/visual%20claw/src/lib/tile-map.js).
7. Add or update matching entries in `INTERACTIVE_FURNITURE` when a furniture piece should open a panel.
8. Rebuild and verify in the extension.

## How The Runtime Map Works

The shipped office map is composed from these parts:

- `buildFloorGrid()` creates the floor tiles
- `FURNITURE_OBJECTS` defines every placed item
- `INTERACTIVE_FURNITURE` assigns actions, labels, and icons to clickable items
- `hitTestFurniture()` powers click detection in the Pixi scene

The renderer uses [src/pixi/scene/officeScene.js](/Users/teng/visual%20claw/src/pixi/scene/officeScene.js) to draw those objects and highlight interactive items.

## Translating Exported Layout Into Code

Each runtime furniture object usually needs:

- `id`
- `src`
- `x`
- `y`
- `collision`
- `zAnchor`

Guidelines:

- Use `collision: null` for wall art, rugs, cups, monitors, and other non-blocking decor.
- Use a collision rectangle for desks, shelves, plants, coolers, and other movement blockers.
- Set a high `zAnchor` for objects that sit visually on top of furniture.
- Keep IDs stable so interaction mappings do not break.

## Adding A New Interactive Object

To make a furniture piece clickable:

1. Add the furniture item to `FURNITURE_OBJECTS`.
2. Add a matching key to `INTERACTIVE_FURNITURE`.
3. Give it:
   - `action`
   - `label`
   - `icon`
4. Make sure [src/components/FurniturePanel.jsx](/Users/teng/visual%20claw/src/components/FurniturePanel.jsx) supports that action.

If the action does not exist in `FurniturePanel.jsx`, the panel will fall back to a generic "not implemented" message.

## Relationship To The Workspace File Server

Some interactive panels rely on local helper endpoints served by:

- [tools/workspace-file-server.js](/Users/teng/visual%20claw/tools/workspace-file-server.js)

This server is optional, but it enables:

- model discovery
- agent workspace metadata
- reading allowed files from agent workspaces
- writing to a small safe allowlist of workspace files

Without it, the office still renders, but file-based interactions are limited.

## Practical Advice

- Start from defaults unless you intentionally want a brand new room composition.
- Treat the layout as UX, not only decoration.
- Keep the most important interactive objects easy to spot and easy to click.
- Update README notes whenever a new furniture action becomes part of the main workflow.
