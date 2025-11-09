// Enhanced user panel management with icons, activity status, and presence indicators

let usersList = null;
let currentUserId = null;
let users = new Map();

// Professional icon pool for users (using initials as fallback)
const userIcons = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T'];

// Generate a professional username
function generateUsername() {
  const names = ['Alex', 'Jordan', 'Taylor', 'Morgan', 'Casey', 'Riley', 'Avery', 'Quinn', 'Blake', 'Cameron'];
  const surnames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez'];
  const name = names[Math.floor(Math.random() * names.length)];
  const surname = surnames[Math.floor(Math.random() * surnames.length)];
  return `${name} ${surname}`;
}

// Generate a unique professional color for the user
function generateRandomColor() {
  const colors = [
    '#2563eb', '#0ea5e9', '#10b981', '#8b5cf6', '#f59e0b',
    '#ef4444', '#06b6d4', '#14b8a6', '#a855f7', '#f97316',
    '#3b82f6', '#6366f1', '#ec4899', '#84cc16', '#22c55e',
    '#64748b', '#475569', '#334155', '#1e293b', '#0f172a'
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}

// Get a random icon
export function getRandomIcon() {
  return userIcons[Math.floor(Math.random() * userIcons.length)];
}

// Get icon for a specific user
export function getUserIconForId(userId) {
  const user = users.get(userId);
  return user?.icon || getRandomIcon();
}

export function initUserPanel(userId) {
  currentUserId = userId;
  usersList = document.getElementById('users-list');
  if (!usersList) {
    console.warn('Users list element not found');
    return;
  }
}

export function addUser(userId, userData = null, isOwn = false) {
  if (users.has(userId)) {
    updateUser(userId, userData);
    return;
  }

  const userItem = document.createElement('div');
  userItem.className = `user-item ${isOwn ? 'own-user' : ''}`;
  userItem.id = `user-${userId}`;
  userItem.setAttribute('data-user-id', userId);

  const color = userData?.color || generateRandomColor();
  const username = userData?.username || generateUsername();
  const tool = userData?.tool || 'brush';
  const isDrawing = userData?.isDrawing || false;

  // Get initials for avatar (always use initials, not icons)
  const initials = username.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

  userItem.innerHTML = `
    <div class="user-avatar" style="background: ${color};">
      <span class="user-icon">${initials}</span>
      ${isOwn ? '<span class="user-crown">●</span>' : ''}
      ${isDrawing ? '<span class="user-activity-indicator"></span>' : ''}
    </div>
    <div class="user-info">
      <div class="user-name-row">
        <span class="user-name">${username}</span>
        <span class="user-tool-icon">${tool === 'eraser' ? 'E' : 'B'}</span>
      </div>
      <div class="user-status">
        <span class="status-dot" style="background: ${color}"></span>
        <span class="status-text">${isDrawing ? 'Drawing...' : 'Online'}</span>
      </div>
    </div>
  `;

  // Add animation on mount
  userItem.style.opacity = '0';
  userItem.style.transform = 'translateX(-20px)';
  usersList.appendChild(userItem);

  // Animate in
  requestAnimationFrame(() => {
    userItem.style.transition = 'all 0.3s ease-out';
    userItem.style.opacity = '1';
    userItem.style.transform = 'translateX(0)';
  });

  users.set(userId, {
    element: userItem,
    color,
    username,
    icon: initials,
    tool,
    isOwn,
    isDrawing: false
  });
}

export function removeUser(userId) {
  const user = users.get(userId);
  if (user && user.element) {
    // Animate out
    user.element.style.transition = 'all 0.3s ease-out';
    user.element.style.opacity = '0';
    user.element.style.transform = 'translateX(-20px)';

    setTimeout(() => {
      if (user.element && user.element.parentNode) {
        user.element.remove();
      }
    }, 300);
  }
  users.delete(userId);
}

export function updateUser(userId, userData) {
  const user = users.get(userId);
  if (!user) {
    addUser(userId, userData);
    return;
  }

  let updated = false;

  if (userData?.color && userData.color !== user.color) {
    user.color = userData.color;
    const avatar = user.element.querySelector('.user-avatar');
    if (avatar) {
      avatar.style.background = `linear-gradient(135deg, ${userData.color} 0%, ${darken(userData.color)} 100%)`;
    }
    const dot = user.element.querySelector('.status-dot');
    if (dot) dot.style.background = userData.color;
    updated = true;
  }

  if (userData?.username && userData.username !== user.username) {
    user.username = userData.username;
    const nameEl = user.element.querySelector('.user-name');
    if (nameEl) nameEl.textContent = userData.username;
    updated = true;
  }

  if (userData?.icon && userData.icon !== user.icon) {
    user.icon = userData.icon;
    // Update initials if username changed
    const initials = user.username.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    const iconEl = user.element.querySelector('.user-icon');
    if (iconEl) iconEl.textContent = initials;
    updated = true;
  }

  if (userData?.tool !== undefined && userData.tool !== user.tool) {
    user.tool = userData.tool;
    const toolIcon = user.element.querySelector('.user-tool-icon');
    if (toolIcon) {
      toolIcon.textContent = userData.tool === 'eraser' ? 'E' : 'B';
    }
    updated = true;
  }

  // Update drawing status
  if (userData?.isDrawing !== undefined) {
    const wasDrawing = user.isDrawing;
    user.isDrawing = userData.isDrawing;

    const indicator = user.element.querySelector('.user-activity-indicator');
    const statusText = user.element.querySelector('.status-text');

    if (userData.isDrawing) {
      if (!indicator) {
        const avatar = user.element.querySelector('.user-avatar');
        if (avatar) {
          const newIndicator = document.createElement('span');
          newIndicator.className = 'user-activity-indicator';
          avatar.appendChild(newIndicator);
        }
      }
      if (statusText) statusText.textContent = 'Drawing...';
      user.element.classList.add('user-drawing');
    } else {
      if (indicator) indicator.remove();
      if (statusText) statusText.textContent = 'Online';
      user.element.classList.remove('user-drawing');
    }

    updated = true;
  }

  // Pulse animation on update
  if (updated) {
    user.element.style.animation = 'none';
    requestAnimationFrame(() => {
      user.element.style.animation = 'user-pulse 0.5s ease-out';
    });
  }
}

function darken(hex) {
  const c = parseInt(hex.replace('#', ''), 16);
  const amt = 0x20;
  const r = Math.max(0, ((c >> 16) & 0xff) - amt);
  const g = Math.max(0, ((c >> 8) & 0xff) - amt);
  const b = Math.max(0, (c & 0xff) - amt);
  return '#' + (r << 16 | g << 8 | b).toString(16).padStart(6, '0');
}

export function getUserColor(userId) {
  const user = users.get(userId);
  return user?.color || generateRandomColor();
}

export function getUserIcon(userId) {
  const user = users.get(userId);
  return user?.icon || getRandomIcon();
}

export function getUserData(userId) {
  return users.get(userId);
}
