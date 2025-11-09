const http = require('http');
const WebSocket = require('ws');
const { handleRoomConnection } = require('./rooms');

const server = http.createServer();
const wss = new WebSocket.Server({ server });

wss.on('connection', (ws) => {
  console.log('Client connected');
  handleRoomConnection(ws, wss);
});

server.listen(3000, () => {
  console.log('Server is running on http://localhost:3000');
});
