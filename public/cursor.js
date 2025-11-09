// Cursor management system for collaborative canvas

let cursorLayer = null;
let myCursor = null;
let myCursorLabel = null;
let remoteCursors = new Map();
let userId = null;
let userColor = null;
let username = null;
let userIcon = '🎨';
let currentTool = 'brush';
let currentBrushSize = 3;
let currentBrushColor = '#000000';
let canvas = null;
let ws = null;

// Generate a unique vibrant color for the user
function generateUserColor() {
  const colors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8',
    '#F7DC6F', '#BB8FCE', '#85C1E2', '#F8B739', '#E74C3C',
    '#1ABC9C', '#3498DB', '#9B59B6', '#E67E22', '#F39C12'
  ];
  const randomIndex = Math.floor(Math.random() * colors.length);
  return colors[randomIndex];
}

// Darken a hex color for borders
function darken(hex) {
  const c = parseInt(hex.replace('#', ''), 16);
  const amt = 0x20;
  const r = Math.max(0, ((c >> 16) & 0xff) - amt);
  const g = Math.max(0, ((c >> 8) & 0xff) - amt);
  const b = Math.max(0, (c & 0xff) - amt);
  return '#' + (r << 16 | g << 8 | b).toString(16).padStart(6, '0');
}

// Initialize cursor system
export function initCursors(canvasElement, websocket, userConfig = {}) {
  canvas = canvasElement;
  ws = websocket;

  // Get or generate user info
  userId = userConfig.userId || `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  userColor = userConfig.color || generateUserColor();
  username = userConfig.username || `User ${userId.substr(-4)}`;
  userIcon = userConfig.icon || '🎨';
  currentTool = userConfig.tool || 'brush';
  currentBrushSize = userConfig.brushSize || 5;
  currentBrushColor = userConfig.brushColor || '#2563eb';

  // Create cursor layer
  cursorLayer = document.createElement('div');
  cursorLayer.className = 'cursor-layer';
  document.body.appendChild(cursorLayer);

  // Create local cursor (for remote users only - local user uses default pointer)
  myCursor = document.createElement('div');
  myCursor.id = 'my-cursor';
  myCursor.className = 'my-cursor';
  myCursor.style.display = 'none';

  // Never hide default cursor for local user - always keep it visible

  myCursorLabel = document.createElement('div');
  myCursorLabel.className = 'cursor-label';
  myCursorLabel.innerText = username;

  myCursor.appendChild(myCursorLabel);
  cursorLayer.appendChild(myCursor);

  // Update cursor styling
  updateMyCursorStyle();

  // Send user info to server
  sendUserInfo();

  return {
    setTool,
    setBrushSize,
    setBrushColor,
    setUsername,
    updateCursorPosition,
    hideCursor,
    getUserId: () => userId,
    getUsername: () => username,
    getUserColor: () => userColor
  };
}

// Update local cursor styling
function updateMyCursorStyle() {
  if (!myCursor) return;

  myCursor.style.setProperty('--userColor', currentBrushColor);
  myCursor.style.setProperty('--userColorShadow', currentBrushColor + '90');
  myCursor.style.setProperty('--userColorDark', darken(currentBrushColor));

  // Update cursor size based on brush size
  const size = currentBrushSize * 10 + 18;
  myCursor.style.width = `${size}px`;
  myCursor.style.height = `${size}px`;

  // Update tool indicator (using text instead of emoji)
  const toolText = currentTool === 'eraser' ? 'E' : 'B';
  let iconElement = myCursor.querySelector('.cursor-icon');
  if (!iconElement) {
    // Create icon element if it doesn't exist
    iconElement = document.createElement('span');
    iconElement.className = 'cursor-icon';
    iconElement.style.fontSize = '12px';
    iconElement.style.lineHeight = '1';
    iconElement.style.display = 'flex';
    iconElement.style.alignItems = 'center';
    iconElement.style.justifyContent = 'center';
    iconElement.style.color = 'white';
    iconElement.style.fontWeight = '600';
    myCursor.insertBefore(iconElement, myCursorLabel);
  }
  iconElement.textContent = toolText;
}

// Show local cursor
export function showOwnCursor(x, y, isDrawing = false) {
  if (!myCursor || !canvas) return;

  // x and y are canvas coordinates
  // Allow some margin for cursor visibility near edges
  const margin = 10;
  if (x < -margin || x > canvas.width + margin || y < -margin || y > canvas.height + margin) {
    hideCursor();
    return;
  }

  // Clamp coordinates to canvas bounds for display
  const clampedX = Math.max(0, Math.min(canvas.width, x));
  const clampedY = Math.max(0, Math.min(canvas.height, y));

  myCursor.style.display = 'flex';
  myCursor.style.visibility = 'visible';
  myCursor.style.opacity = '1';

  // Convert canvas coordinates to page coordinates
  const rect = canvas.getBoundingClientRect();
  const scrollX = window.pageXOffset || document.documentElement.scrollLeft;
  const scrollY = window.pageYOffset || document.documentElement.scrollTop;

  // Calculate scale factors for responsive canvas
  const scaleX = rect.width / canvas.width;
  const scaleY = rect.height / canvas.height;

  const size = currentBrushSize * 10 + 18;
  // Convert canvas coordinates to screen coordinates (use clamped values for display)
  const offsetX = (clampedX * scaleX) + rect.left + scrollX - size / 2;
  const offsetY = (clampedY * scaleY) + rect.top + scrollY - size / 2;

  // Use transform for smoother positioning (better performance)
  myCursor.style.left = `${offsetX}px`;
  myCursor.style.top = `${offsetY}px`;
  myCursor.style.zIndex = '10000';
  // Force hardware acceleration
  myCursor.style.transform = 'translateZ(0)';

  // Don't hide default cursor - keep it visible for local user

  // Update drawing state
  if (isDrawing) {
    myCursor.classList.add('drawing');
    myCursorLabel.classList.add('drawing');
    myCursorLabel.innerText = `${username} (drawing...)`;
  } else {
    myCursor.classList.remove('drawing');
    myCursorLabel.classList.remove('drawing');
    myCursorLabel.innerText = username;
  }

  // Send cursor position to server (use x, y which are canvas coordinates)
  sendCursorPosition(x, y, isDrawing);
}

// Hide local cursor (for remote users only)
export function hideCursor() {
  if (myCursor) {
    myCursor.style.display = 'none';
    myCursor.style.visibility = 'hidden';
  }
  // Always keep default cursor visible - never hide it
}

// Show remote cursor
export function showRemoteCursor(id, x, y, color, remoteUsername, tool = 'brush', isDrawing = false, icon = '🎨') {
  let cur = remoteCursors.get(id);

  if (!cur) {
    cur = document.createElement('div');
    cur.id = `remote-cursor-${id}`;
    cur.className = 'remote-cursor';
    cursorLayer.appendChild(cur);

    // Create icon element
    const iconEl = document.createElement('div');
    iconEl.className = 'remote-cursor-icon';
    iconEl.textContent = icon;
    cur.appendChild(iconEl);

    // Create label
    const label = document.createElement('div');
    label.className = 'remote-label';
    cur.appendChild(label);

    remoteCursors.set(id, cur);
  }

  // Update styling
  cur.style.setProperty('--remoteColor', color);
  cur.style.setProperty('--remoteColorDark', darken(color));

  // Update position
  if (canvas) {
    const rect = canvas.getBoundingClientRect();
    const scrollX = window.pageXOffset || document.documentElement.scrollLeft;
    const scrollY = window.pageYOffset || document.documentElement.scrollTop;

    const offsetX = x + rect.left + scrollX - 16;
    const offsetY = y + rect.top + scrollY - 16;

    // Smooth position updates
    cur.style.left = `${offsetX}px`;
    cur.style.top = `${offsetY}px`;
    // Force hardware acceleration for smooth movement
    cur.style.transform = 'translateZ(0)';
  }

  // Update user icon
  const iconEl = cur.querySelector('.remote-cursor-icon');
  if (iconEl) {
    iconEl.textContent = icon;
  }

  // Update tool icon in label (using text instead of emoji)
  const toolIcon = tool === 'eraser' ? 'E' : 'B';

  // Update label
  const label = cur.querySelector('.remote-label');
  if (label) {
    if (isDrawing) {
      label.innerHTML = `<span class="label-username">${remoteUsername}</span> <span class="label-tool">${toolIcon}</span> <span class="label-status">drawing...</span>`;
      label.classList.add('drawing');
      cur.classList.add('drawing');
      cur.classList.remove('idle');
    } else {
      label.innerHTML = `<span class="label-username">${remoteUsername}</span> <span class="label-tool">${toolIcon}</span>`;
      label.classList.remove('drawing');
      cur.classList.remove('drawing');
    }
  }

  // Reset idle timeout
  clearTimeout(cur.idleTimeout);
  cur.idleTimeout = setTimeout(() => {
    cur.classList.add('idle');
    setTimeout(() => {
      if (cur && cur.classList.contains('idle')) {
        cur.classList.add('fade-out');
        setTimeout(() => {
          if (cur && cur.parentNode) {
            cur.remove();
            remoteCursors.delete(id);
          }
        }, 1000);
      }
    }, 2000);
  }, 3000); // Fade after 3 seconds of no updates
}

// Remove remote cursor
export function removeRemoteCursor(id) {
  const cur = remoteCursors.get(id);
  if (cur) {
    cur.remove();
    remoteCursors.delete(id);
  }
}

// Send cursor position to server
function sendCursorPosition(x, y, isDrawing) {
  if (!ws || ws.readyState !== WebSocket.OPEN) return;

  ws.send(JSON.stringify({
    type: 'cursor',
    userId,
    x,
    y,
    color: currentBrushColor,
    username,
    tool: currentTool,
    isDrawing,
    icon: getUserIcon()
  }));
}

// Get user icon
function getUserIcon() {
  return userIcon;
}

// Set user icon
export function setUserIcon(icon) {
  userIcon = icon;
}

// Send user info to server
function sendUserInfo() {
  if (!ws || ws.readyState !== WebSocket.OPEN) return;

  ws.send(JSON.stringify({
    type: 'user-info',
    userId,
    color: userColor,
    username,
    icon: getUserIcon(),
    tool: currentTool
  }));
}

// Set current tool
export function setTool(tool) {
  currentTool = tool;
  updateMyCursorStyle();
}

// Set brush size
export function setBrushSize(size) {
  currentBrushSize = size;
  updateMyCursorStyle();
}

// Set brush color
export function setBrushColor(color) {
  currentBrushColor = color;
  updateMyCursorStyle();
}

// Set username
export function setUsername(name) {
  username = name;
  if (myCursorLabel) {
    myCursorLabel.innerText = name;
  }
  sendUserInfo();
}

// Update cursor position (called from canvas events)
export function updateCursorPosition(x, y, isDrawing = false) {
  showOwnCursor(x, y, isDrawing);
}

// Handle remote cursor message
export function handleRemoteCursor(data) {
  if (data.userId === userId) return; // Ignore own cursor

  showRemoteCursor(
    data.userId,
    data.x,
    data.y,
    data.color || '#ff9800',
    data.username || 'Unknown',
    data.tool || 'brush',
    data.isDrawing || false,
    data.icon || '🎨'
  );
}

// Clean up
export function cleanup() {
  if (cursorLayer) {
    cursorLayer.remove();
  }
  remoteCursors.forEach((cur) => cur.remove());
  remoteCursors.clear();
}
