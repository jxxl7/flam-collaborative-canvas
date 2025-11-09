# Architecture Overview

## Data Flow
1. User draws on canvas (mouse/touch event).
2. Draw data sent over WebSocket to server.
3. Server broadcasts event to all clients.
4. Each client updates their canvas.

## WebSocket Messages
- `{ type: 'draw', from: [x1, y1], to: [x2, y2] }`
- Extend as needed for undo, redo, user, etc.

## Undo/Redo
- Clients maintain a local history.
- Server relays relevant undo/redo events globally.

## Conflict Resolution
- Operations replayed in order.
- For complex cases (simultaneous undos etc.), reconverge based on received events.
