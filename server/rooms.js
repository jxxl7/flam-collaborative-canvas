// Store connected users
const connectedUsers = new Map();

function handleRoomConnection(ws, wss) {
  let userId = null;

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message.toString());

      // Track user on first message
      if (data.userId && !userId) {
        userId = data.userId;
        connectedUsers.set(userId, {
          ws,
          color: data.color,
          username: data.username,
          icon: data.icon,
          tool: data.tool
        });

        // Notify others of new user
        wss.clients.forEach((client) => {
          if (client !== ws && client.readyState === 1) {
            client.send(JSON.stringify({
              type: 'user-joined',
              userId: data.userId,
              color: data.color,
              username: data.username,
              icon: data.icon,
              tool: data.tool
            }));
          }
        });

        // Send list of existing users to new client
        connectedUsers.forEach((user, id) => {
          if (id !== userId && user.ws.readyState === 1) {
            ws.send(JSON.stringify({
              type: 'user-joined',
              userId: id,
              color: user.color,
              username: user.username,
              icon: user.icon,
              tool: user.tool
            }));
          }
        });
      }

      // Update user info if provided
      if (data.type === 'user-info' && userId) {
        const user = connectedUsers.get(userId);
        if (user) {
          if (data.color) user.color = data.color;
          if (data.username) user.username = data.username;
          if (data.icon) user.icon = data.icon;
          if (data.tool) user.tool = data.tool;
        }
      }

      // For cursor messages, broadcast to all other clients (not sender)
      // For other messages (draw, user-info), broadcast to all
      if (data.type === 'cursor') {
        wss.clients.forEach((client) => {
          if (client !== ws && client.readyState === 1) { // 1 = OPEN
            client.send(message);
          }
        });
      } else {
        // Broadcast to all clients including sender
        wss.clients.forEach((client) => {
          if (client.readyState === 1) { // 1 = OPEN
            client.send(message);
          }
        });
      }
    } catch (e) {
      // If not JSON, broadcast as-is
      wss.clients.forEach((client) => {
        if (client.readyState === 1) { // 1 = OPEN
          client.send(message);
        }
      });
    }
  });

  ws.on('close', () => {
    if (userId) {
      // Notify others that user left
      wss.clients.forEach((client) => {
        if (client.readyState === 1) {
          client.send(JSON.stringify({
            type: 'user-left',
            userId: userId
          }));
        }
      });
      connectedUsers.delete(userId);
    }
    console.log('Client disconnected:', userId);
  });
}

module.exports = { handleRoomConnection };
