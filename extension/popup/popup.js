const API_BASE = 'https://amazon-auto-extension.onrender.com';
let currentProductData = null;

// DOM Elements
const views = {
    auth: document.getElementById('auth-view'),
    dashboard: document.getElementById('dashboard-view'),
    logs: document.getElementById('logs-view')
};

const forms = {
    login: document.getElementById('login-form'),
    register: document.getElementById('register-form')
};

const btns = {
    logout: document.getElementById('logout-btn'),
    track: document.getElementById('track-btn'),
    refresh: document.getElementById('refresh-btn'),
    refreshLogs: document.getElementById('refresh-logs-btn')
};

const cpSection = document.getElementById('current-product-section');
const productsList = document.getElementById('products-list');

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    setupEventListeners();
    
    // Check auth status
    const token = await getToken();
    if (token) {
        showView('dashboard');
        loadDashboard(token);
    } else {
        showView('auth');
    }
});

function setupEventListeners() {
    // Auth Tabs
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', (e) => {
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.auth-form').forEach(f => f.classList.add('hidden'));
            
            e.target.classList.add('active');
            document.getElementById(e.target.dataset.target).classList.remove('hidden');
        });
    });

    // App Nav Tabs
    document.querySelectorAll('.app-tab').forEach(tab => {
        tab.addEventListener('click', (e) => {
            document.querySelectorAll('.app-tab').forEach(t => t.classList.remove('active'));
            
            e.target.classList.add('active');
            const targetView = e.target.dataset.target.replace('-view', '');
            showView(targetView);
            
            if (targetView === 'dashboard') {
                getToken().then(t => { if(t) loadDashboard(t); });
            } else if (targetView === 'logs') {
                getToken().then(t => { if(t) fetchLogs(t); });
            }
        });
    });

    // Login Submit
    forms.login.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        const errorEl = document.getElementById('login-error');
        
        try {
            const res = await fetch(`${API_BASE}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            
            const data = await res.json();
            if (!res.ok) throw new Error(data.detail || 'Login failed');
            
            await setToken(data.access_token);
            showView('dashboard');
            loadDashboard(data.access_token);
        } catch (err) {
            errorEl.textContent = err.message;
        }
    });

    // Register Submit
    forms.register.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('register-name').value;
        const email = document.getElementById('register-email').value;
        const password = document.getElementById('register-password').value;
        const errorEl = document.getElementById('register-error');
        
        try {
            const res = await fetch(`${API_BASE}/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email, password })
            });
            
            const data = await res.json();
            if (!res.ok) throw new Error(data.detail || 'Registration failed');
            
            // Auto login after register
            document.querySelector('[data-target="login-form"]').click();
            document.getElementById('login-email').value = email;
            document.getElementById('login-password').value = password;
        } catch (err) {
            errorEl.textContent = err.message;
        }
    });

    // Logout
    btns.logout.addEventListener('click', async () => {
        await chrome.storage.local.remove('token');
        showView('auth');
    });

    // Track Button
    btns.track.addEventListener('click', async () => {
        if (!currentProductData) return;
        
        const targetPrice = document.getElementById('cp-target-price').value;
        const payload = { ...currentProductData, target_price: targetPrice || null };
        const token = await getToken();
        
        const btn = btns.track;
        btn.textContent = 'Adding...';
        btn.disabled = true;
        
        try {
            const res = await fetch(`${API_BASE}/products/`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });
            
            if (!res.ok) throw new Error('Failed to track product');
            
            cpSection.classList.add('hidden');
            loadDashboard(token); // Refresh list
        } catch (err) {
            console.error(err);
            btn.textContent = 'Error';
            setTimeout(() => {
                btn.textContent = 'Track This Product';
                btn.disabled = false;
            }, 2000);
        }
    });
    
    // Refresh List
    btns.refresh.addEventListener('click', async () => {
        const token = await getToken();
        if(token) loadDashboard(token);
    });
    
    // Refresh Logs
    btns.refreshLogs.addEventListener('click', async () => {
        const token = await getToken();
        if(token) fetchLogs(token);
    });
}

// Navigation
function showView(viewName) {
    Object.values(views).forEach(v => v.classList.add('hidden'));
    
    if (views[viewName]) {
        views[viewName].classList.remove('hidden');
    }
    
    const appNav = document.getElementById('app-nav');
    
    if (viewName === 'dashboard' || viewName === 'logs') {
        btns.logout.classList.remove('hidden');
        appNav.classList.remove('hidden');
    } else {
        btns.logout.classList.add('hidden');
        appNav.classList.add('hidden');
    }
}

// Token Management
async function getToken() {
    const data = await chrome.storage.local.get('token');
    return data.token;
}

async function setToken(token) {
    await chrome.storage.local.set({ token });
}

// Dashboard Logic
async function loadDashboard(token) {
    checkCurrentTab();
    await fetchTrackedProducts(token);
}

async function checkCurrentTab() {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const tab = tabs[0];
        if (tab && tab.url && tab.url.includes('amazon.')) {
            chrome.tabs.sendMessage(tab.id, { action: 'fetch_product_info' }, (response) => {
                if (response && response.product_title) {
                    currentProductData = response;
                    renderCurrentProduct(response);
                }
            });
        } else {
            cpSection.classList.add('hidden');
        }
    });
}

function renderCurrentProduct(data) {
    cpSection.classList.remove('hidden');
    document.getElementById('cp-title').textContent = data.product_title;
    document.getElementById('cp-price').textContent = data.last_price;
    
    const availEl = document.getElementById('cp-availability');
    availEl.textContent = data.availability;
    
    if (data.availability.toLowerCase().includes('out')) {
        availEl.classList.add('out-of-stock');
    } else {
        availEl.classList.remove('out-of-stock');
    }
    
    btns.track.textContent = 'Track This Product';
    btns.track.disabled = false;
}

async function fetchTrackedProducts(token) {
    productsList.innerHTML = '<div class="loading-spinner">Loading products...</div>';
    
    try {
        const res = await fetch(`${API_BASE}/products/`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!res.ok) {
            if (res.status === 401) {
                await chrome.storage.local.remove('token');
                showView('auth');
                return;
            }
            throw new Error('Failed to fetch products');
        }
        
        const products = await res.json();
        renderProducts(products);
    } catch (err) {
        productsList.innerHTML = `<div class="error-msg" style="text-align:center;">${err.message}</div>`;
    }
}

function renderProducts(products) {
    if (!products || products.length === 0) {
        productsList.innerHTML = '<div style="text-align:center; color:var(--text-muted); font-size:0.875rem; padding: 20px;">No products tracked yet.</div>';
        return;
    }
    
    productsList.innerHTML = '';
    products.forEach(p => {
        const div = document.createElement('div');
        div.className = 'product-item';
        div.innerHTML = `
            <div class="product-title truncate-text" title="${p.product_title}">${p.product_title}</div>
            <div class="product-meta">
                <span>${p.last_price}</span>
                ${p.target_price ? `<span class="target-price">Target: ${p.target_price}</span>` : '<span>-</span>'}
            </div>
        `;
        div.addEventListener('click', () => {
            chrome.tabs.create({ url: p.product_url });
        });
        productsList.appendChild(div);
    });
}

// Logs Logic
async function fetchLogs(token) {
    const logsList = document.getElementById('logs-list');
    logsList.innerHTML = '<div class="loading-spinner">Loading history...</div>';
    
    try {
        const res = await fetch(`${API_BASE}/history/`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!res.ok) throw new Error('Failed to fetch logs');
        
        const logs = await res.json();
        renderLogs(logs);
    } catch (err) {
        logsList.innerHTML = `<div class="error-msg" style="text-align:center;">${err.message}</div>`;
    }
}

function renderLogs(logs) {
    const logsList = document.getElementById('logs-list');
    
    if (!logs || logs.length === 0) {
        logsList.innerHTML = '<div style="text-align:center; color:var(--text-muted); font-size:0.875rem; padding: 20px;">No event history yet.</div>';
        return;
    }
    
    logsList.innerHTML = '';
    logs.forEach(log => {
        const div = document.createElement('div');
        div.className = 'log-item';
        div.innerHTML = `
            <span class="log-status">${log.status}</span>
            <p class="log-msg">${log.message}</p>
        `;
        logsList.appendChild(div);
    });
}
