
'use strict';

// ─── Configuration ────────────────────────────────────────────────────────────
const CONFIG = {

  API_BASE: '',

  // Session ID — stable within this browser tab (no login required)
  SESSION_ID: (() => {
    let id = sessionStorage.getItem('vit_session');
    if (!id) {
      id = 'sess_' + Math.random().toString(36).slice(2, 11);
      sessionStorage.setItem('vit_session', id);
    }
    return id;
  })(),
};

// ─── API Layer ────────────────────────────────────────────────────────────────
const API = {
  async _fetch(path, options = {}) {
    const res = await fetch(CONFIG.API_BASE + path, {
      headers: { 'Content-Type': 'application/json' },
      ...options,
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'API error');
    return json;
  },

  // Buildings
  getBuildings: (category = 'all') =>
    API._fetch(`/api/buildings${category !== 'all' ? `?category=${category}` : ''}`),

  getBuilding: (id) =>
    API._fetch(`/api/buildings/${id}`),

  // Search
  search: (q) =>
    API._fetch(`/api/search?q=${encodeURIComponent(q)}`),

  // Pathfinder
  findPath: (startId, endId) =>
    API._fetch('/api/pathfinder', {
      method: 'POST',
      body: JSON.stringify({ startId, endId }),
    }),

  // Bookmarks
  getBookmarks: () =>
    API._fetch(`/api/bookmarks?sessionId=${CONFIG.SESSION_ID}`),

  addBookmark: (buildingId) =>
    API._fetch('/api/bookmarks', {
      method: 'POST',
      body: JSON.stringify({ sessionId: CONFIG.SESSION_ID, buildingId }),
    }),

  removeBookmark: (buildingId) =>
    API._fetch(`/api/bookmarks/${buildingId}?sessionId=${CONFIG.SESSION_ID}`, {
      method: 'DELETE',
    }),

  // Stats
  getStats: () =>
    API._fetch('/api/stats'),
};

// ─── Application State ────────────────────────────────────────────────────────
const State = {
  buildings: [],       // all buildings loaded from API
  filtered: [],        // currently displayed buildings
  selected: null,      // currently selected building object
  bookmarks: new Set(),// set of bookmarked building IDs
  activeCategory: 'all',
  zoom: 1,
  panX: 0,
  panY: 0,
  isDragging: false,
  dragStart: { x: 0, y: 0 },
  activePath: null,    // current pathfinder result
};

// ─── DOM References ───────────────────────────────────────────────────────────
const $ = id => document.getElementById(id);

const DOM = {
  loadingScreen: $('loadingScreen'),
  mainContainer: $('mainContainer'),
  buildingsList: $('buildingsList'),
  dotsLayer: $('dotsLayer'),
  pathsLayer: $('pathsLayer'),
  mapWrapper: $('mapWrapper'),
  searchInput: $('searchInput'),
  startBuilding: $('startBuilding'),
  endBuilding: $('endBuilding'),
  pathResult: $('pathResult'),
  notification: $('notification'),
  notificationText: $('notificationText'),
  categoryCards: document.querySelectorAll('.category-card'),
  // Building detail panel
  detailName: $('detailName'),
  detailCategory: $('detailCategory'),
  detailTimings: $('detailTimings'),
  detailStatus: $('detailStatus'),
  detailFacilities: $('detailFacilities'),
  detailContact: $('detailContact'),
  detailCapacity: $('detailCapacity'),
  detailDescription: $('detailDescription'),
  buildingDetails: $('buildingDetails'),
};

// ─── Notification ─────────────────────────────────────────────────────────────
let notifTimer;
function showNotification(msg, type = 'success') {
  DOM.notification.style.background = type === 'error' ? '#f44336' : '#4CAF50';
  DOM.notificationText.textContent = msg;
  DOM.notification.classList.add('show');
  clearTimeout(notifTimer);
  notifTimer = setTimeout(() => DOM.notification.classList.remove('show'), 3000);
}

// ─── Map Dots ─────────────────────────────────────────────────────────────────
function renderDots(buildings) {
  DOM.dotsLayer.innerHTML = '';
  buildings.forEach(b => {
    const dot = document.createElement('div');
    dot.className = 'map-dot';
    dot.dataset.id = b.id;

    // Position as % of map image
    dot.style.cssText = `
      position: absolute;
      left: ${b.x}%;
      top: ${b.y}%;
      width: 18px;
      height: 18px;
      border-radius: 50%;
      background: ${b.color || '#2196F3'};
      border: 3px solid white;
      box-shadow: 0 2px 8px rgba(0,0,0,0.4);
      cursor: pointer;
      transform: translate(-50%, -50%);
      transition: transform 0.2s ease, box-shadow 0.2s ease;
      z-index: 10;
    `;

    // Tooltip label
    const label = document.createElement('div');
    label.style.cssText = `
      position: absolute;
      bottom: 22px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(13,71,161,0.92);
      color: white;
      padding: 3px 8px;
      border-radius: 6px;
      font-size: 11px;
      font-family: 'Poppins', sans-serif;
      white-space: nowrap;
      pointer-events: none;
      opacity: 0;
      transition: opacity 0.2s ease;
    `;
    label.textContent = b.shortName;
    dot.appendChild(label);

    dot.addEventListener('mouseenter', () => {
      dot.style.transform = 'translate(-50%, -50%) scale(1.4)';
      dot.style.boxShadow = '0 4px 16px rgba(0,0,0,0.6)';
      label.style.opacity = '1';
    });
    dot.addEventListener('mouseleave', () => {
      if (State.selected?.id !== b.id) {
        dot.style.transform = 'translate(-50%, -50%) scale(1)';
        dot.style.boxShadow = '0 2px 8px rgba(0,0,0,0.4)';
      }
      label.style.opacity = '0';
    });
    dot.addEventListener('click', () => selectBuilding(b));

    DOM.dotsLayer.appendChild(dot);
  });
}

// ─── Building List (Left Sidebar) ─────────────────────────────────────────────
function renderBuildingsList(buildings) {
  DOM.buildingsList.innerHTML = '';
  if (!buildings.length) {
    DOM.buildingsList.innerHTML = '<p style="color:#999;font-size:0.9rem;text-align:center;padding:1rem;">No buildings found.</p>';
    return;
  }

  buildings.forEach(b => {
    const card = document.createElement('div');
    card.className = 'building-card';
    card.dataset.id = b.id;
    card.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:flex-start;">
        <div>
          <h4 style="font-size:0.95rem;font-weight:600;color:#1a237e;margin-bottom:4px;">${b.name}</h4>
          <span style="font-size:0.78rem;background:${b.color}22;color:${b.color};padding:2px 8px;border-radius:10px;font-weight:500;">${b.category}</span>
        </div>
        <span style="font-size:0.75rem;padding:3px 8px;border-radius:10px;font-weight:500;background:${b.status === 'open' ? '#e8f5e9' : '#ffebee'};color:${b.status === 'open' ? '#2e7d32' : '#c62828'};">
          ${b.status === 'open' ? '● Open' : '● Closed'}
        </span>
      </div>
      <p style="font-size:0.82rem;color:#666;margin-top:6px;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;">${b.description}</p>
    `;
    card.addEventListener('click', () => selectBuilding(b));
    DOM.buildingsList.appendChild(card);
  });
}

// ─── Select a Building ────────────────────────────────────────────────────────
function selectBuilding(building) {
  State.selected = building;

  // Highlight dot
  document.querySelectorAll('.map-dot').forEach(d => {
    d.style.transform = 'translate(-50%, -50%) scale(1)';
    d.style.border = '3px solid white';
  });
  const activeDot = document.querySelector(`.map-dot[data-id="${building.id}"]`);
  if (activeDot) {
    activeDot.style.transform = 'translate(-50%, -50%) scale(1.5)';
    activeDot.style.border = '3px solid #FFD700';
    activeDot.style.zIndex = '20';
  }

  // Highlight list card
  document.querySelectorAll('.building-card').forEach(c => c.classList.remove('active'));
  const activeCard = document.querySelector(`.building-card[data-id="${building.id}"]`);
  if (activeCard) {
    activeCard.classList.add('active');
    activeCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  // Populate detail panel
  DOM.detailName.textContent = building.name;
  DOM.detailCategory.textContent = building.category;
  DOM.detailTimings.textContent = building.timings;
  DOM.detailStatus.textContent = building.status === 'open' ? 'Open Now' : 'Closed';
  DOM.detailStatus.style.color = building.status === 'open' ? '#2e7d32' : '#c62828';
  DOM.detailFacilities.textContent = building.facilities.join(', ');
  DOM.detailContact.textContent = building.contact;
  DOM.detailCapacity.textContent = `${building.capacity.toLocaleString()} people`;
  DOM.detailDescription.textContent = building.description;

  // Update bookmark button
  updateBookmarkButton(building.id);
}

// ─── Detail Panel Bookmark Button ────────────────────────────────────────────
function updateBookmarkButton(buildingId) {
  const btn = document.querySelector('.action-buttons .btn-outline:nth-child(2)');
  if (!btn) return;
  const isBookmarked = State.bookmarks.has(buildingId);
  btn.innerHTML = `<i class="fas fa-${isBookmarked ? 'bookmark' : 'star'}"></i> ${isBookmarked ? 'Bookmarked' : 'Bookmark'}`;
  btn.style.background = isBookmarked ? '#fff8e1' : '';
  btn.style.borderColor = isBookmarked ? '#f9a825' : '';
  btn.style.color = isBookmarked ? '#f9a825' : '';
}

// ─── Path Drawing (SVG) ───────────────────────────────────────────────────────
function drawPath(steps) {
  const svg = DOM.pathsLayer;
  svg.innerHTML = '';

  if (!steps || steps.length < 2) return;

  const mapImg = document.querySelector('.campus-map');
  const w = mapImg.offsetWidth;
  const h = mapImg.offsetHeight;

  // Draw line segments
  for (let i = 0; i < steps.length - 1; i++) {
    const from = steps[i];
    const to = steps[i + 1];
    const x1 = (from.x / 100) * w;
    const y1 = (from.y / 100) * h;
    const x2 = (to.x / 100) * w;
    const y2 = (to.y / 100) * h;

    // Shadow line
    const shadow = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    shadow.setAttribute('x1', x1); shadow.setAttribute('y1', y1);
    shadow.setAttribute('x2', x2); shadow.setAttribute('y2', y2);
    shadow.setAttribute('stroke', 'rgba(0,0,0,0.2)');
    shadow.setAttribute('stroke-width', '6');
    shadow.setAttribute('stroke-linecap', 'round');
    svg.appendChild(shadow);

    // Main path line
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', x1); line.setAttribute('y1', y1);
    line.setAttribute('x2', x2); line.setAttribute('y2', y2);
    line.setAttribute('stroke', '#4CAF50');
    line.setAttribute('stroke-width', '4');
    line.setAttribute('stroke-linecap', 'round');
    line.setAttribute('stroke-dasharray', '12 6');
    svg.appendChild(line);
  }

  // Draw waypoint circles
  steps.forEach((step, i) => {
    const cx = (step.x / 100) * w;
    const cy = (step.y / 100) * h;

    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', cx);
    circle.setAttribute('cy', cy);
    circle.setAttribute('r', i === 0 || i === steps.length - 1 ? 10 : 6);
    circle.setAttribute('fill', i === 0 ? '#2196F3' : i === steps.length - 1 ? '#f44336' : '#4CAF50');
    circle.setAttribute('stroke', 'white');
    circle.setAttribute('stroke-width', '2');
    svg.appendChild(circle);
  });
}

function clearPath() {
  DOM.pathsLayer.innerHTML = '';
  DOM.pathResult.innerHTML = '';
  State.activePath = null;
}

// ─── Populate Route Dropdowns ─────────────────────────────────────────────────
function populateRouteSelects(buildings) {
  [DOM.startBuilding, DOM.endBuilding].forEach(sel => {
    const placeholder = sel.options[0];
    sel.innerHTML = '';
    sel.appendChild(placeholder);
    buildings.forEach(b => {
      const opt = document.createElement('option');
      opt.value = b.id;
      opt.textContent = b.name;
      sel.appendChild(opt);
    });
  });
}

// ─── Stats Rendering ──────────────────────────────────────────────────────────
async function loadStats() {
  try {
    const { data } = await API.getStats();
    const cards = document.querySelectorAll('.stat-card h4');
    if (cards[0]) cards[0].textContent = data.totalBuildings;
    if (cards[1]) cards[1].textContent = data.openNow;
    if (cards[2]) cards[2].textContent = data.totalCapacity.toLocaleString();
  } catch (e) {
    // stats are non-critical, silently fail
  }
}

// ─── Map Pan & Zoom ───────────────────────────────────────────────────────────
function applyTransform() {
  DOM.mapWrapper.style.transform = `scale(${State.zoom}) translate(${State.panX}px, ${State.panY}px)`;
  DOM.mapWrapper.style.transformOrigin = 'center center';
}

// ─── Init — Load Everything ───────────────────────────────────────────────────
async function init() {
  try {
    // Load buildings from backend
    const { data } = await API.getBuildings();
    State.buildings = data;
    State.filtered = data;

    renderDots(data);
    renderBuildingsList(data);
    populateRouteSelects(data);
    await loadStats();

    // Load bookmarks
    try {
      const bm = await API.getBookmarks();
      bm.data.forEach(b => State.bookmarks.add(b.id));
    } catch (_) {}

    // Hide loading screen
    setTimeout(() => {
      DOM.loadingScreen.style.opacity = '0';
      setTimeout(() => {
        DOM.loadingScreen.style.display = 'none';
        DOM.mainContainer.style.opacity = '1';
      }, 500);
    }, 2000);

  } catch (err) {
    console.error('Init failed:', err);
    // Fallback: hide loading screen even on error
    setTimeout(() => {
      DOM.loadingScreen.style.opacity = '0';
      setTimeout(() => DOM.loadingScreen.style.display = 'none', 500);
    }, 2500);
    showNotification('Could not load building data. Is the backend running?', 'error');
  }
}

// ─── Event Listeners ──────────────────────────────────────────────────────────

// Category filter
DOM.categoryCards.forEach(card => {
  card.addEventListener('click', async () => {
    DOM.categoryCards.forEach(c => c.classList.remove('active'));
    card.classList.add('active');
    State.activeCategory = card.dataset.category;

    try {
      const { data } = await API.getBuildings(State.activeCategory);
      State.filtered = data;
      renderDots(data);
      renderBuildingsList(data);
    } catch (e) {
      showNotification('Failed to filter buildings.', 'error');
    }
  });
});

// Search — debounced
let searchTimer;
DOM.searchInput.addEventListener('input', () => {
  clearTimeout(searchTimer);
  const q = DOM.searchInput.value.trim();

  if (q.length === 0) {
    // Reset to all
    State.filtered = State.buildings;
    renderDots(State.buildings);
    renderBuildingsList(State.buildings);
    return;
  }

  if (q.length < 2) return;

  searchTimer = setTimeout(async () => {
    try {
      const { data } = await API.search(q);
      State.filtered = data;
      renderDots(data);
      renderBuildingsList(data);
    } catch (e) {
      // If search API fails, do client-side fallback
      const term = q.toLowerCase();
      const fallback = State.buildings.filter(b =>
        b.name.toLowerCase().includes(term) ||
        b.category.toLowerCase().includes(term) ||
        b.facilities.some(f => f.toLowerCase().includes(term))
      );
      renderDots(fallback);
      renderBuildingsList(fallback);
    }
  }, 300);
});

// Search button click
document.querySelector('.search-btn').addEventListener('click', () => {
  DOM.searchInput.dispatchEvent(new Event('input'));
});

// Path Finder button (header)
$('pathFinderBtn').addEventListener('click', () => {
  document.querySelector('.path-finder-section').scrollIntoView({ behavior: 'smooth' });
});

// Find Path
$('findPathBtn').addEventListener('click', async () => {
  const startId = parseInt(DOM.startBuilding.value);
  const endId = parseInt(DOM.endBuilding.value);

  if (!startId || !endId) {
    showNotification('Please select both start and destination.', 'error');
    return;
  }

  try {
    $('findPathBtn').textContent = 'Finding…';
    $('findPathBtn').disabled = true;

    const { data } = await API.findPath(startId, endId);
    State.activePath = data;

    drawPath(data.steps);

    // Render step-by-step directions
    const steps = data.steps.map((s, i) => {
      const icon = i === 0 ? 'play' : i === data.steps.length - 1 ? 'flag-checkered' : 'arrow-right';
      return `<li><i class="fas fa-${icon}"></i> ${s.name}</li>`;
    }).join('');

    DOM.pathResult.innerHTML = `
      <h4><i class="fas fa-route"></i> Route Found</h4>
      <p style="font-size:0.85rem;color:#555;margin:4px 0;">
        From: <strong>${data.from.name}</strong><br>
        To: <strong>${data.to.name}</strong>
      </p>
      <p style="font-size:0.85rem;color:#2e7d32;font-weight:600;margin:8px 0;">
        <i class="fas fa-walking"></i> ${data.estimatedWalkTime} walk · ${data.stepCount - 1} segments
      </p>
      <ul class="path-steps">${steps}</ul>
    `;

    showNotification(`Route found! ~${data.estimatedWalkTime} walk.`);
  } catch (e) {
    showNotification(e.message || 'Could not find a path.', 'error');
    DOM.pathResult.innerHTML = `<p style="color:#c62828;font-size:0.9rem;"><i class="fas fa-times-circle"></i> ${e.message}</p>`;
  } finally {
    $('findPathBtn').innerHTML = '<i class="fas fa-directions"></i> Find Path';
    $('findPathBtn').disabled = false;
  }
});

// Clear Path
$('clearPathBtn').addEventListener('click', () => {
  clearPath();
  DOM.startBuilding.value = '';
  DOM.endBuilding.value = '';
  showNotification('Path cleared.');
});

// Reset View
$('resetBtn').addEventListener('click', () => {
  State.zoom = 1;
  State.panX = 0;
  State.panY = 0;
  applyTransform();
  DOM.mapWrapper.style.transition = 'transform 0.4s ease';
  setTimeout(() => DOM.mapWrapper.style.transition = '', 400);
  showNotification('Map view reset.');
});

// Zoom In / Out
$('zoomIn').addEventListener('click', () => {
  if (State.zoom < 3) { State.zoom = +(State.zoom + 0.25).toFixed(2); applyTransform(); }
});
$('zoomOut').addEventListener('click', () => {
  if (State.zoom > 0.5) { State.zoom = +(State.zoom - 0.25).toFixed(2); applyTransform(); }
});

// Scroll to zoom on map
DOM.mapWrapper.addEventListener('wheel', (e) => {
  e.preventDefault();
  const delta = e.deltaY < 0 ? 0.1 : -0.1;
  State.zoom = Math.min(3, Math.max(0.5, +(State.zoom + delta).toFixed(2)));
  applyTransform();
}, { passive: false });

// Mouse drag to pan
DOM.mapWrapper.addEventListener('mousedown', (e) => {
  State.isDragging = true;
  State.dragStart = { x: e.clientX - State.panX, y: e.clientY - State.panY };
  DOM.mapWrapper.style.cursor = 'grabbing';
});
window.addEventListener('mousemove', (e) => {
  if (!State.isDragging) return;
  State.panX = e.clientX - State.dragStart.x;
  State.panY = e.clientY - State.dragStart.y;
  applyTransform();
});
window.addEventListener('mouseup', () => {
  State.isDragging = false;
  DOM.mapWrapper.style.cursor = 'grab';
});

// Fullscreen
$('fullscreen').addEventListener('click', () => {
  const mapArea = document.querySelector('.map-area');
  if (!document.fullscreenElement) {
    mapArea.requestFullscreen?.();
  } else {
    document.exitFullscreen?.();
  }
});

// Close building details panel
$('closeDetails').addEventListener('click', () => {
  State.selected = null;
  document.querySelectorAll('.map-dot').forEach(d => {
    d.style.transform = 'translate(-50%, -50%) scale(1)';
    d.style.border = '3px solid white';
  });
  document.querySelectorAll('.building-card').forEach(c => c.classList.remove('active'));
  DOM.detailName.textContent = 'Select a Building';
  DOM.detailCategory.textContent = '---';
  DOM.detailDescription.textContent = 'Select a building to view details';
});

// Get Directions button (inside building detail panel)
document.querySelector('.action-buttons .btn-outline:first-child').addEventListener('click', () => {
  if (!State.selected) return;
  DOM.endBuilding.value = State.selected.id;
  document.querySelector('.path-finder-section').scrollIntoView({ behavior: 'smooth' });
  showNotification(`${State.selected.name} set as destination.`);
});

// Bookmark button (inside building detail panel)
document.querySelector('.action-buttons .btn-outline:nth-child(2)').addEventListener('click', async () => {
  if (!State.selected) return;
  const id = State.selected.id;
  try {
    if (State.bookmarks.has(id)) {
      await API.removeBookmark(id);
      State.bookmarks.delete(id);
      showNotification('Bookmark removed.');
    } else {
      await API.addBookmark(id);
      State.bookmarks.add(id);
      showNotification(`${State.selected.name} bookmarked!`);
    }
    updateBookmarkButton(id);
  } catch (e) {
    showNotification('Bookmark action failed.', 'error');
  }
});

// Share button (inside building detail panel)
document.querySelector('.action-buttons .btn-outline:nth-child(3)').addEventListener('click', () => {
  if (!State.selected) return;
  const text = `📍 ${State.selected.name} — VIT Chennai Campus`;
  if (navigator.share) {
    navigator.share({ title: text, text: `Find ${State.selected.name} on the VIT Chennai Campus Map.` });
  } else {
    navigator.clipboard?.writeText(text);
    showNotification('Building name copied to clipboard!');
  }
});

// Print Map
document.querySelectorAll('.action-btn')[0].addEventListener('click', () => window.print());

// Download Map (opens image in new tab)
document.querySelectorAll('.action-btn')[1].addEventListener('click', () => {
  const a = document.createElement('a');
  a.href = 'images/campus.png';
  a.download = 'vit-chennai-campus-map.png';
  a.click();
});

// Help button
$('helpBtn').addEventListener('click', () => {
  showNotification('Click any dot on the map or a building in the list to see details. Use Path Finder to get directions.');
});

// ─── Boot ─────────────────────────────────────────────────────────────────────
init();
