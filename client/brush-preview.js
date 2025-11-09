// Brush preview system - shows preview circle/square following the mouse pointer

let brushPreview = null;
let canvas = null;
let currentTool = 'brush';
let currentColor = '#FF6B6B';
let currentSize = 5;
let isDrawing = false;
let isVisible = false;

// Initialize brush preview
export function initBrushPreview(canvasElement) {
  canvas = canvasElement;

  // Create preview element
  brushPreview = document.createElement('div');
  brushPreview.className = 'brush-preview brush-preview-circle';
  brushPreview.style.display = 'none';
  brushPreview.style.pointerEvents = 'none';
  document.body.appendChild(brushPreview);

  return {
    updatePosition,
    updateTool,
    updateColor,
    updateSize,
    show,
    hide,
    setDrawing
  };
}

// Update preview position
export function updatePosition(x, y) {
  if (!brushPreview || !canvas) return;

  const rect = canvas.getBoundingClientRect();
  const scrollX = window.pageXOffset || document.documentElement.scrollLeft;
  const scrollY = window.pageYOffset || document.documentElement.scrollTop;

  // Calculate scale factors for responsive canvas
  const scaleX = rect.width / canvas.width;
  const scaleY = rect.height / canvas.height;

  // Convert canvas coordinates to screen coordinates
  const screenX = (x * scaleX) + rect.left + scrollX;
  const screenY = (y * scaleY) + rect.top + scrollY;

  const size = currentSize;
  brushPreview.style.left = `${screenX - size / 2}px`;
  brushPreview.style.top = `${screenY - size / 2}px`;
  brushPreview.style.width = `${size}px`;
  brushPreview.style.height = `${size}px`;
}

// Update tool (brush = circle, eraser = square)
export function updateTool(tool) {
  currentTool = tool;
  if (!brushPreview) return;

  if (tool === 'eraser') {
    brushPreview.classList.add('eraser-preview');
    brushPreview.classList.remove('brush-preview-circle');
  } else {
    brushPreview.classList.remove('eraser-preview');
    brushPreview.classList.add('brush-preview-circle');
  }
}

// Update color
export function updateColor(color) {
  currentColor = color;
  if (!brushPreview) return;

  // Set color with opacity
  const rgb = hexToRgb(color);
  if (rgb) {
    brushPreview.style.backgroundColor = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.4)`;
    brushPreview.style.borderColor = color;
    brushPreview.style.setProperty('--preview-color', color);
  }
}

// Update size
export function updateSize(size) {
  currentSize = size;
  if (!brushPreview) return;

  brushPreview.style.width = `${size}px`;
  brushPreview.style.height = `${size}px`;
  brushPreview.style.setProperty('--preview-size', `${size}px`);
}

// Show preview
export function show() {
  if (!brushPreview) return;
  brushPreview.style.display = 'block';
  isVisible = true;
}

// Hide preview
export function hide() {
  if (!brushPreview) return;
  brushPreview.style.display = 'none';
  isVisible = false;
}

// Set drawing state (adds glow effect)
export function setDrawing(drawing) {
  isDrawing = drawing;
  if (!brushPreview) return;

  if (drawing) {
    brushPreview.classList.add('drawing');
  } else {
    brushPreview.classList.remove('drawing');
  }
}

// Helper to convert hex to RGB
function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}
