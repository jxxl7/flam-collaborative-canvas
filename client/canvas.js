import { initCursors, updateCursorPosition, setTool, setBrushSize, setBrushColor, handleRemoteCursor } from './cursor.js';
import { initBrushPreview, updatePosition, updateTool, updateColor, updateSize, show, hide, setDrawing } from './brush-preview.js';

export function setupCanvas(ws) {
  const canvas = document.getElementById('drawing-canvas');

  // Safety check - ensure canvas exists
  if (!canvas) {
    console.error('Canvas element not found! Check HTML for id="drawing-canvas"');
    return null;
  }

  const ctx = canvas.getContext('2d');

  // Safety check - ensure context is available
  if (!ctx) {
    console.error('Could not get 2D context from canvas!');
    return null;
  }

  let drawing = false;
  let lastPos = null;
  let currentTool = 'brush';
  let currentColor = '#2563eb'; // Professional blue default color
  let currentStrokeWidth = 5;

  // Ensure canvas maintains proper size
  function resizeCanvas() {
    const container = canvas.parentElement;
    const containerWidth = container.clientWidth - 40; // Account for padding
    const aspectRatio = canvas.height / canvas.width;
    const newWidth = Math.min(containerWidth, 1200);
    const newHeight = newWidth * aspectRatio;

    // Set CSS size
    canvas.style.width = `${newWidth}px`;
    canvas.style.height = `${newHeight}px`;
  }

  // Resize on load and window resize
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  // Initialize brush preview system
  const brushPreview = initBrushPreview(canvas);
  brushPreview.updateTool(currentTool);
  brushPreview.updateColor(currentColor);
  brushPreview.updateSize(currentStrokeWidth);

  // Initialize cursor system (for remote users only)
  const cursorControls = initCursors(canvas, ws, {
    brushColor: currentColor,
    brushSize: currentStrokeWidth
  });

  // Set up drawing context with proper defaults
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = currentColor;
  ctx.lineWidth = currentStrokeWidth;
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1.0;

  // Get UI elements
  const brushBtn = document.getElementById('brush');
  const eraserBtn = document.getElementById('eraser');
  const colorInput = document.getElementById('color');
  const colorPreview = document.getElementById('color-preview');
  const strokeSlider = document.getElementById('stroke-width');
  const sizePreview = document.getElementById('size-preview');

  // Update color preview
  function updateColorPreview() {
    colorPreview.style.background = currentColor;
    document.documentElement.style.setProperty('--current-color', currentColor);
  }

  // Update size preview
  function updateSizePreview() {
    sizePreview.style.width = `${Math.max(20, currentStrokeWidth * 4)}px`;
    sizePreview.style.height = `${Math.max(20, currentStrokeWidth * 4)}px`;
    sizePreview.textContent = currentStrokeWidth;
  }

  // Initialize previews
  updateColorPreview();
  updateSizePreview();

  // Tool selection
  brushBtn.addEventListener('click', () => {
    currentTool = 'brush';
    setTool('brush');
    brushPreview.updateTool('brush');
    ctx.globalCompositeOperation = 'source-over';
    brushBtn.classList.add('tool-btn-active');
    eraserBtn.classList.remove('tool-btn-active');
  });

  eraserBtn.addEventListener('click', () => {
    currentTool = 'eraser';
    setTool('eraser');
    brushPreview.updateTool('eraser');
    ctx.globalCompositeOperation = 'destination-out';
    eraserBtn.classList.add('tool-btn-active');
    brushBtn.classList.remove('tool-btn-active');
  });

  // Color picker
  colorInput.addEventListener('input', (e) => {
    currentColor = e.target.value;
    ctx.strokeStyle = currentColor;
    setBrushColor(currentColor);
    brushPreview.updateColor(currentColor);
    updateColorPreview();
    if (currentTool === 'brush') {
      ctx.globalCompositeOperation = 'source-over';
    }
  });

  // Stroke width
  strokeSlider.addEventListener('input', (e) => {
    currentStrokeWidth = parseInt(e.target.value);
    ctx.lineWidth = currentStrokeWidth;
    setBrushSize(currentStrokeWidth);
    brushPreview.updateSize(currentStrokeWidth);
    updateSizePreview();
  });

  // Undo/Redo buttons (placeholder functionality)
  document.getElementById('undo').addEventListener('click', () => {
    // TODO: Implement undo functionality
    console.log('Undo clicked');
  });

  document.getElementById('redo').addEventListener('click', () => {
    // TODO: Implement redo functionality
    console.log('Redo clicked');
  });

  // Helper to get canvas coordinates accounting for scaling
  function getCanvasCoordinates(e) {
    const rect = canvas.getBoundingClientRect();

    // Fallback to offsetX/offsetY if available (more reliable)
    if (e.offsetX !== undefined && e.offsetY !== undefined) {
      // Check if offset is within canvas bounds (handles scaled canvas)
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      return {
        x: e.offsetX * scaleX,
        y: e.offsetY * scaleY
      };
    }

    // Fallback calculation using clientX/clientY
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  }

  // Mouse events - ensure they're registered on the canvas
  canvas.addEventListener('mousedown', (e) => {
    e.preventDefault(); // Prevent default behavior
    drawing = true;
    const coords = getCanvasCoordinates(e);
    lastPos = [coords.x, coords.y];

    // Show brush preview with drawing effect
    brushPreview.setDrawing(true);
    brushPreview.updatePosition(coords.x, coords.y);
    brushPreview.show();

    // Draw initial dot - ensure context is set correctly
    ctx.save(); // Save current context state
    ctx.strokeStyle = currentColor;
    ctx.fillStyle = currentColor;
    ctx.lineWidth = currentStrokeWidth;
    ctx.globalCompositeOperation = currentTool === 'eraser' ? 'destination-out' : 'source-over';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.globalAlpha = 1.0;

    if (currentTool === 'eraser') {
      // For eraser, use destination-out
      ctx.beginPath();
      ctx.arc(coords.x, coords.y, currentStrokeWidth / 2, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // For brush, draw filled circle
      ctx.beginPath();
      ctx.arc(coords.x, coords.y, currentStrokeWidth / 2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore(); // Restore context state

    updateCursorPosition(coords.x, coords.y, true);
  });

  canvas.addEventListener('mousemove', (e) => {
    const coords = getCanvasCoordinates(e);

    // Update brush preview position
    brushPreview.updatePosition(coords.x, coords.y);
    brushPreview.show();

    // Always update cursor position (for remote users)
    updateCursorPosition(coords.x, coords.y, drawing);

    if (!drawing || !lastPos) return;

    // Ensure context settings are correct before drawing
    ctx.save();
    ctx.strokeStyle = currentColor;
    ctx.lineWidth = currentStrokeWidth;
    ctx.globalCompositeOperation = currentTool === 'eraser' ? 'destination-out' : 'source-over';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.globalAlpha = 1.0;

    // Draw the line
    ctx.beginPath();
    ctx.moveTo(lastPos[0], lastPos[1]);
    ctx.lineTo(coords.x, coords.y);
    ctx.stroke();
    ctx.restore();

    // Send to server for collaboration
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'draw',
        from: lastPos,
        to: [coords.x, coords.y],
        color: currentColor,
        lineWidth: currentStrokeWidth,
        tool: currentTool
      }));
    }

    lastPos = [coords.x, coords.y];
  });

  canvas.addEventListener('mouseup', (e) => {
    drawing = false;
    brushPreview.setDrawing(false);
    if (lastPos) {
      updateCursorPosition(lastPos[0], lastPos[1], false);
    }
  });

  canvas.addEventListener('mouseenter', (e) => {
    const coords = getCanvasCoordinates(e);
    brushPreview.updatePosition(coords.x, coords.y);
    brushPreview.show();
    updateCursorPosition(coords.x, coords.y, false);
  });

  canvas.addEventListener('mouseleave', () => {
    drawing = false;
    brushPreview.setDrawing(false);
    brushPreview.hide();
    cursorControls.hideCursor();
  });

  // Touch events for mobile support
  canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    const fakeEvent = { clientX: touch.clientX, clientY: touch.clientY };
    const coords = getCanvasCoordinates(fakeEvent);
    drawing = true;
    lastPos = [coords.x, coords.y];

    // Show brush preview with drawing effect
    brushPreview.setDrawing(true);
    brushPreview.updatePosition(coords.x, coords.y);
    brushPreview.show();

    // Draw initial dot
    ctx.strokeStyle = currentColor;
    ctx.lineWidth = currentStrokeWidth;
    ctx.globalCompositeOperation = currentTool === 'eraser' ? 'destination-out' : 'source-over';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.globalAlpha = 1.0;

    if (currentTool === 'eraser') {
      ctx.beginPath();
      ctx.arc(coords.x, coords.y, currentStrokeWidth / 2, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.arc(coords.x, coords.y, currentStrokeWidth / 2, 0, Math.PI * 2);
      ctx.fillStyle = currentColor;
      ctx.fill();
    }

    updateCursorPosition(coords.x, coords.y, true);
  });

  canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    const fakeEvent = { clientX: touch.clientX, clientY: touch.clientY };
    const coords = getCanvasCoordinates(fakeEvent);

    updateCursorPosition(coords.x, coords.y, drawing);

    if (!drawing) return;

    // Update brush preview position while drawing
    brushPreview.updatePosition(coords.x, coords.y);

    // Ensure context settings are correct before drawing
    ctx.strokeStyle = currentColor;
    ctx.lineWidth = currentStrokeWidth;
    ctx.globalCompositeOperation = currentTool === 'eraser' ? 'destination-out' : 'source-over';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.globalAlpha = 1.0;

    ctx.beginPath();
    ctx.moveTo(lastPos[0], lastPos[1]);
    ctx.lineTo(coords.x, coords.y);
    ctx.stroke();

    ws.send(JSON.stringify({
      type: 'draw',
      from: lastPos,
      to: [coords.x, coords.y],
      color: currentColor,
      lineWidth: currentStrokeWidth,
      tool: currentTool
    }));

    lastPos = [coords.x, coords.y];
  });

  canvas.addEventListener('touchend', () => {
    drawing = false;
    brushPreview.setDrawing(false);
    brushPreview.hide();
    if (lastPos) {
      updateCursorPosition(lastPos[0], lastPos[1], false);
    }
  });

  // Handle WebSocket messages
  ws.onmessage = (message) => {
    const data = JSON.parse(message.data);

    if (data.type === 'draw') {
      ctx.strokeStyle = data.color || currentColor;
      ctx.lineWidth = data.lineWidth || currentStrokeWidth;
      if (data.tool === 'eraser') {
        ctx.globalCompositeOperation = 'destination-out';
      } else {
        ctx.globalCompositeOperation = 'source-over';
      }
      ctx.beginPath();
      ctx.moveTo(data.from[0], data.from[1]);
      ctx.lineTo(data.to[0], data.to[1]);
      ctx.stroke();
      // Reset to local settings
      ctx.strokeStyle = currentColor;
      ctx.lineWidth = currentStrokeWidth;
      if (currentTool === 'eraser') {
        ctx.globalCompositeOperation = 'destination-out';
      } else {
        ctx.globalCompositeOperation = 'source-over';
      }
    } else if (data.type === 'cursor') {
      handleRemoteCursor(data);
      // Update user panel with activity
      import('./users.js').then(({ updateUser }) => {
        updateUser(data.userId, {
          tool: data.tool,
          isDrawing: data.isDrawing
        });
      });
    } else if (data.type === 'user-info') {
      // User info is handled in main.js
    } else if (data.type === 'user-joined') {
      // Handle user join
      import('./users.js').then(({ addUser }) => {
        addUser(data.userId, {
          color: data.color,
          username: data.username,
          icon: data.icon,
          tool: data.tool || 'brush'
        }, false);
      });
    } else if (data.type === 'user-left') {
      // Handle user leave
      import('./users.js').then(({ removeUser }) => {
        removeUser(data.userId);
      });
      import('./cursor.js').then(({ removeRemoteCursor }) => {
        removeRemoteCursor(data.userId);
      });
    }
  };

  return { cursorControls, getUserId: () => cursorControls.getUserId(), getUsername: () => cursorControls.getUsername(), getUserColor: () => cursorControls.getUserColor() };
}
