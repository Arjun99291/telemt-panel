const API = window.location.origin + '/api';
let token = localStorage.getItem('token');

// Pages
const loginPage = document.getElementById('login-page');
const dashboardPage = document.getElementById('dashboard-page');

// Init
if (token) {
  showDashboard();
} else {
  showLogin();
}

function showLogin() {
  loginPage.classList.remove('hidden');
  dashboardPage.classList.add('hidden');
}

function showDashboard() {
  loginPage.classList.add('hidden');
  dashboardPage.classList.remove('hidden');
  const username = localStorage.getItem('username') || 'admin';
  document.getElementById('user-info').textContent = username;
  loadProxies();
}

// Login
document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const username = document.getElementById('login-username').value;
  const password = document.getElementById('login-password').value;
  const errorEl = document.getElementById('login-error');
  errorEl.textContent = '';

  try {
    const res = await fetch(API + '/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    token = data.token;
    localStorage.setItem('token', token);
    localStorage.setItem('username', data.username);
    showDashboard();
  } catch (err) {
    errorEl.textContent = err.message;
  }
});

// Logout
document.getElementById('logout-btn').addEventListener('click', () => {
  token = null;
  localStorage.removeItem('token');
  localStorage.removeItem('username');
  showLogin();
});

// API helper
async function api(path, method = 'GET', body = null) {
  const opts = {
    method,
    headers: {
      'Authorization': 'Bearer ' + token,
      'Content-Type': 'application/json',
    },
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(API + path, opts);
  if (res.status === 401) {
    token = null;
    localStorage.removeItem('token');
    showLogin();
    throw new Error('Session expired');
  }
  const data = await res.json();
  if (!res.ok) throw new Error(data.error);
  return data;
}

// Format bytes
function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

// Load proxies
async function loadProxies() {
  try {
    const proxies = await api('/proxies');
    const grid = document.getElementById('proxy-list');
    const empty = document.getElementById('no-proxies');

    if (proxies.length === 0) {
      grid.innerHTML = '';
      empty.classList.remove('hidden');
      return;
    }

    empty.classList.add('hidden');
    grid.innerHTML = proxies.map(p => `
      <div class="proxy-card" data-id="${p.id}">
        <div class="proxy-header">
          <span class="proxy-name">${esc(p.name)}</span>
          <span class="status-badge status-${p.status}">${p.status}</span>
        </div>
        <div class="proxy-info">
          <span class="label">Domain</span>
          <span class="value">${esc(p.domain)}</span>
          <span class="label">External Port</span>
          <span class="value">${p.internal_port}</span>
          <span class="label">Traffic RX</span>
          <span class="value">${formatBytes(p.traffic_rx || 0)}</span>
          <span class="label">Traffic TX</span>
          <span class="value">${formatBytes(p.traffic_tx || 0)}</span>
        </div>
        <div class="proxy-link-box" onclick="copyLink('${esc(p.proxy_link)}')" title="Click to copy">
          ${esc(p.proxy_link)}
        </div>
        <div class="proxy-actions">
          ${p.status === 'running'
            ? `<button class="btn-warning btn-sm" onclick="proxyAction(${p.id}, 'stop')">Stop</button>`
            : `<button class="btn-success btn-sm" onclick="proxyAction(${p.id}, 'start')">Start</button>`
          }
          <button class="btn-secondary btn-sm" onclick="copyLink('${esc(p.proxy_link)}')">Copy Link</button>
          <button class="btn-danger btn-sm" onclick="deleteProxy(${p.id}, '${esc(p.name)}')">Delete</button>
        </div>
      </div>
    `).join('');
  } catch (err) {
    toast('Error: ' + err.message);
  }
}

function esc(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// Create proxy
document.getElementById('create-btn').addEventListener('click', async () => {
  const nameInput = document.getElementById('proxy-name');
  const name = nameInput.value.trim();
  if (!name) { toast('Enter proxy name'); return; }

  const btn = document.getElementById('create-btn');
  btn.disabled = true;
  btn.textContent = 'Creating...';

  try {
    await api('/proxies', 'POST', { name });
    nameInput.value = '';
    toast('Proxy created!');
    await loadProxies();
  } catch (err) {
    toast('Error: ' + err.message);
  } finally {
    btn.disabled = false;
    btn.textContent = '+ Create Proxy';
  }
});

// Proxy actions
async function proxyAction(id, action) {
  try {
    await api(`/proxies/${id}/${action}`, 'POST');
    toast(`Proxy ${action}ed`);
    await loadProxies();
  } catch (err) {
    toast('Error: ' + err.message);
  }
}

async function deleteProxy(id, name) {
  if (!confirm(`Delete proxy "${name}"?`)) return;
  try {
    await api(`/proxies/${id}`, 'DELETE');
    toast('Proxy deleted');
    await loadProxies();
  } catch (err) {
    toast('Error: ' + err.message);
  }
}

// Copy link — works over HTTP too
function copyLink(link) {
  const ta = document.createElement('textarea');
  ta.value = link;
  ta.style.position = 'fixed';
  ta.style.left = '-9999px';
  document.body.appendChild(ta);
  ta.focus();
  ta.select();
  try {
    document.execCommand('copy');
    toast('Link copied!');
  } catch {
    toast('Copy failed — select manually');
  }
  document.body.removeChild(ta);
}

// Refresh
document.getElementById('refresh-btn').addEventListener('click', loadProxies);

// Toast
function toast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.remove('hidden');
  clearTimeout(el._timer);
  el._timer = setTimeout(() => el.classList.add('hidden'), 3000);
}

// Auto refresh every 30s
setInterval(loadProxies, 30000);
