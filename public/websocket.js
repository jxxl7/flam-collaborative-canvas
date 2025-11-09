export function connectWebSocket() {
  const ws = new WebSocket('ws://localhost:3000');
  ws.onopen = () => {
    console.log('WebSocket connected');
  };
  ws.onerror = (e) => {
    console.error('WebSocket error', e);
  };
  return ws;
}
