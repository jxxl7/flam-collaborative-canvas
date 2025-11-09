import { setupCanvas } from './canvas.js';
import { connectWebSocket } from './websocket.js';
import { initUserPanel, addUser } from './users.js';

window.onload = () => {
  const ws = connectWebSocket();
  const canvasControls = setupCanvas(ws);

  // Safety check - ensure canvas was initialized
  if (!canvasControls) {
    console.error('Canvas setup failed! Check console for errors.');
    return;
  }

  // Initialize user panel after canvas setup
  setTimeout(() => {
    if (canvasControls && canvasControls.getUserId) {
      const userId = canvasControls.getUserId();
      const username = canvasControls.getUsername();
      const userColor = canvasControls.getUserColor();

      initUserPanel(userId);
      // Get user icon from users module
      import('./users.js').then(({ getRandomIcon, getUserIconForId }) => {
        const icon = getRandomIcon();
        // Add own user with proper info
        addUser(userId, { color: userColor, username, icon }, true);

        // Update cursor system with icon
        import('./cursor.js').then(({ setUserIcon }) => {
          if (setUserIcon) setUserIcon(icon);
        });
      });
    }
  }, 200);

  // Handle user-info messages from server
  ws.addEventListener('message', (event) => {
    try {
      const data = JSON.parse(event.data);
      if (data.type === 'user-info') {
        addUser(data.userId, {
          color: data.color,
          username: data.username,
          icon: data.icon || '🎨',
          tool: data.tool || 'brush'
        }, false);
      } else if (data.type === 'user-joined') {
        addUser(data.userId, {
          color: data.color,
          username: data.username,
          icon: data.icon || '🎨',
          tool: data.tool || 'brush'
        }, false);
      } else if (data.type === 'user-left') {
        import('./users.js').then(({ removeUser }) => {
          removeUser(data.userId);
        });
        import('./cursor.js').then(({ removeRemoteCursor }) => {
          removeRemoteCursor(data.userId);
        });
      }
    } catch (e) {
      // Not a JSON message, ignore
    }
  });
};
