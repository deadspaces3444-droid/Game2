/* ============================================================
   WOSB Main Portal — all page logic
============================================================ */

const APP_VERSION = '3.0.0';
let currentClan = null;
let currentClanIsAdmin = false;
let isOwner = false, isAdmin = false, isMod = false, myAdminClanId = null;
let tradeFormType = 'buy';
let buildRows = [];
let pendingClanLogin = null;
let heartbeatTimer = null;

const $ = id => document.getElementById(id);
function on(id, ev, fn) { const el = $(id); if (el) el.addEventListener(ev, fn); }
function escapeHtml(s) { return String(s||'').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function flash(elId, text, color) { const el = $(elId); if (!el) return; el.textContent = text; el.style.color = color||''; setTimeout(() => el.textContent='', 2000); }

/* ============ THEME ============ */
function applyTheme(t) { document.documentElement.setAttribute('data-theme', t); localStorage.setItem('app_theme', t); }
function toggleTheme() { applyTheme((document.documentElement.getAttribute('data-theme')||'dark') === 'dark' ? 'light' : 'dark'); }
applyTheme(localStorage.getItem('app_theme') || 'dark');
on('themeToggle', 'click', toggleTheme);

/* ============ SESSION ============ */
function checkSession() {
    const session = getSession();
    if (session) {
        isOwner = session.role === 'owner';
        isAdmin = !!session.role;
        isMod = session.role === 'mod';
        myAdminClanId = session.clan_id;
        $('adminBtn').hidden = false;
        $('logoutBtn').hidden = false;
    }
    const myClan = localStorage.getItem('guild_my_clan');
    if (myClan) {
        currentClan = myClan;
        currentClanIsAdmin = true;
    }
}
on('adminBtn', 'click', () => location.href = 'admin.html');
on('logoutBtn', 'click', () => {
    clearSession();
    localStorage.removeItem('guild_my_clan');
    location.reload();
});

/* ============ STATS ============ */
function renderStats() {
    const stats = getStats();
    const items = [
        { label: 'Гильдий', value: stats.clans, icon: '🏰' },
        { label: 'Врагов', value: stats.enemies, icon: '🔴' },
        { label: 'Друзей', value: stats.friends, icon: '🟢' },
        { label: 'ПВП билдов', value: stats.pvp, icon: '⚔️' },
        { label: 'ПБ билдов', value: stats.pb, icon: '🛡' },
        { label: 'Заявок', value: stats.trades, icon: '🪙' }
    ];
    $('statsRow').innerHTML = items.map(s => `
        <div class="stat-card">
            <div class="stat-value">${s.icon} ${s.value}</div>
            <div class="stat-label">${s.label}</div>
        </div>
    `).join('');
}

/* ============ CLANS ============ */
function renderClans() {
    const clans = getClans('wosb');
    const grid = $('clanGrid');
    if (!clans.length) {
        grid.innerHTML = '<div class="empty">Гильдий пока нет</div>';
        return;
    }
    grid.innerHTML = '';
    clans.forEach(clan => {
        const card = document.createElement('div');
        card.className = 'clan-card';
        const logo = clan.image ? `<img src="${escapeHtml(clan.image)}" alt="${escapeHtml(clan.name)}">` : `<span>${CLAN_FLAGS[clan.flag] || '🏰'}</span>`;
        card.innerHTML = `
            <div class="clan-card-logo">${logo}</div>
            <div class="clan-card-name">${escapeHtml(clan.name)}</div>
            <div class="clan-card-desc">${escapeHtml(clan.description || '')}</div>
            <div class="clan-card-desc" style="color: var(--gold);">👑 ${escapeHtml(clan.leader_nick || '—')}</div>
        `;
        card.addEventListener('click', () => {
            localStorage.setItem('guild_last_clan', clan.id);
            location.href = `guild.html?clan=${clan.id}`;
        });
        grid.appendChild(card);
    });
}

on('addClanBtn', 'click', () => {
    const name = prompt('Название новой гильдии:');
    if (!name) return;
    const id = name.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 10) || 'clan_' + Date.now();
    createClan({
        id, name, game_id: 'wosb', alliance_id: null,
        leader_nick: '', description: '', rules: '',
        password: '', admin_password: '',
        discord: '', phone: '', image: '', flag: 'neutral',
        admins: '', members: '', news: ''
    });
    renderClans();
    renderStats();
});

/* ============ MAP ============ */
function renderMap() {
    const settings = getMapSettings();
    const view = localStorage.getItem('map_view') || settings.default_view || 'detailed';
    const url = view === 'clean' ? settings.clean_url : settings.detailed_url;
    const preview = $('mapPreview');
    if (url) {
        preview.innerHTML = `<img src="${escapeHtml(url)}" alt="Карта">`;
    } else {
        preview.innerHTML = '<div class="map-placeholder">🗺 Карта появится здесь (загрузите в админ-панели)</div>';
    }
    $('mapHint').textContent = '💡 ' + (settings.hint || 'Колёсико — приблизить, ЛКМ — перетащить');
    document.querySelectorAll('.map-view-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.view === view);
    });
}
on('mapDetailedBtn', 'click', () => { localStorage.setItem('map_view', 'detailed'); renderMap(); });
on('mapCleanBtn', 'click', () => { localStorage.setItem('map_view', 'clean'); renderMap(); });

/* ============ SHIP COST CALCULATOR ============ */
function fillShipSelects() {
    const ships = getShips();
    const scShip = $('scShipSelect');
    scShip.innerHTML = '<option value="">— Выберите —</option>' +
        ships.map(s => `<option value="${escapeHtml(s.name)}">${escapeHtml(s.name)} (ур. ${ROMAN[s.level] || s.level})</option>`).join('');

    const ports = getPorts();
    $('scCitySelect').innerHTML = '<option value="">— Любой —</option>' +
        ports.map(p => `<option value="${escapeHtml(p.name)}">${escapeHtml(p.name)}</option>`).join('');

    const factions = getFactions();
    $('scFactionSelect').innerHTML = '<option value="">— Любая —</option>' +
        factions.map(f => `<option value="${escapeHtml(f.id)}">${escapeHtml(f.name)}</option>`).join('');
}

on('scShipSelect', 'change', () => {
    const shipName = $('scShipSelect').value;
    if (!shipName) { $('scEmpty').hidden = false; $('scContent').hidden = true; return; }
    const recipes = getRecipes(shipName);
    if (!recipes.length) {
        $('scEmpty').hidden = false;
        $('scEmpty').textContent = 'Для этого корабля рецепт не задан.';
        $('scContent').hidden = true;
        return;
    }
    $('scEmpty').hidden = true;
    $('scContent').hidden = false;
    const tbody = $('scTbody');
    let baseSum = 0;
    tbody.innerHTML = recipes.map(r => {
        const res = getResourcePrices().find(x => x.id === r.resource_id);
        const price = res ? Number(res.price) || 0 : 0;
        const qty = Number(r.quantity) || 0;
        const sum = price * qty;
        baseSum += sum;
        return `<tr>
            <td>${res ? (res.emoji || '') + ' ' + escapeHtml(res.name) : escapeHtml(r.resource_id)}</td>
            <td>${qty}</td>
            <td>${price} 🪙</td>
            <td class="gold-text">${sum} 🪙</td>
        </tr>`;
    }).join('');
    const discounts = getDiscounts().filter(d => d.active);
    let discountSum = 0;
    // Simple discount calc
    discounts.forEach(d => {
        if (d.type === 'percent') discountSum += baseSum * (d.percent / 100);
    });
    $('scBase').textContent = baseSum.toLocaleString('ru-RU');
    $('scDiscount').textContent = '−' + discountSum.toLocaleString('ru-RU');
    $('scTotal').textContent = (baseSum - discountSum).toLocaleString('ru-RU');
});

/* ============ TRADE MARKET ============ */
function initTradeCategorySelect() {
    $('tmCategory').innerHTML = TRADE_CATEGORIES.map(c => `<option value="${c.id}">${c.icon} ${c.name}</option>`).join('');
}
function initTradeCategoryFilters() {
    const wrap = $('tmCatFilters');
    wrap.innerHTML = `<span class="tm-chip active" data-cat="all">Все категории</span>` +
        TRADE_CATEGORIES.map(c => `<span class="tm-chip" data-cat="${c.id}">${c.icon} ${c.name}</span>`).join('');
    wrap.querySelectorAll('.tm-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            wrap.querySelectorAll('.tm-chip').forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            renderTradeListings();
        });
    });
}
function renderTradeClanSelect() {
    const clans = getClans('wosb');
    $('tmClan').innerHTML = '<option value="">— Выберите гильдию —</option>' +
        clans.map(c => `<option value="${escapeHtml(c.id)}">${escapeHtml(c.name)}</option>`).join('');
    // Also fill application clan select
    $('appClan').innerHTML = '<option value="">— Выберите гильдию —</option>' +
        clans.map(c => `<option value="${escapeHtml(c.id)}">${escapeHtml(c.name)}</option>`).join('');
}

let tmCatFilter = 'all';

function updateTradeFormTotal() {
    const price = parseInt($('tmPrice').value) || 0;
    const qty = parseInt($('tmQty').value) || 0;
    $('tmTotal').textContent = (price * qty).toLocaleString('ru-RU') + ' 🪙';
}
on('tmPrice', 'input', updateTradeFormTotal);
on('tmQty', 'input', updateTradeFormTotal);

document.querySelectorAll('.tm-type-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.tm-type-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        tradeFormType = btn.dataset.type;
    });
});

on('tmPublish', 'click', () => {
    const name = $('tmName').value.trim();
    const price = parseInt($('tmPrice').value) || 0;
    const qty = parseInt($('tmQty').value) || 0;
    const author = $('tmAuthor').value.trim() || getViewerNick();
    if (!name) { alert('Укажите название'); return; }
    if (!price) { alert('Укажите цену'); return; }
    if (!qty) { alert('Укажите количество'); return; }
    addTrade({
        type: tradeFormType,
        clan: $('tmClan').value,
        category: $('tmCategory').value,
        name, price, qty,
        port: $('tmPort').value.trim(),
        author,
        note: $('tmNote').value.trim(),
        status: 'active',
        game_id: 'wosb'
    });
    $('tmName').value = ''; $('tmPrice').value = ''; $('tmNote').value = '';
    updateTradeFormTotal();
    renderTradeListings();
    renderTradeStats();
});

function renderTradeStats() {
    const trades = getTrades({ status: 'active' });
    const buys = trades.filter(t => t.type === 'buy');
    const sells = trades.filter(t => t.type === 'sell');
    const buySum = buys.reduce((s, t) => s + (t.price * t.qty), 0);
    const sellSum = sells.reduce((s, t) => s + (t.price * t.qty), 0);
    $('buyTotal').textContent = buySum.toLocaleString('ru-RU') + ' 🪙';
    $('buyCount').textContent = buys.length + ' заявок';
    $('sellTotal').textContent = sellSum.toLocaleString('ru-RU') + ' 🪙';
    $('sellCount').textContent = sells.length + ' заявок';
}

function renderTradeListings() {
    const search = $('tmSearch').value.trim().toLowerCase();
    const sort = $('tmSort').value;
    const onlyMine = $('tmOnlyMine').checked;
    const cat = document.querySelector('.tm-chip.active')?.dataset.cat || 'all';

    let trades = getTrades({ status: 'active' });
    if (cat !== 'all') trades = trades.filter(t => t.category === cat);
    if (search) trades = trades.filter(t => t.name.toLowerCase().includes(search));
    if (onlyMine) {
        const nick = getViewerNick();
        trades = trades.filter(t => t.author === nick);
    }

    switch (sort) {
        case 'old': trades.sort((a,b) => new Date(a.created_at) - new Date(b.created_at)); break;
        case 'price-asc': trades.sort((a,b) => a.price - b.price); break;
        case 'price-desc': trades.sort((a,b) => b.price - a.price); break;
        default: trades.sort((a,b) => new Date(b.created_at) - new Date(a.created_at));
    }

    const container = $('tmListings');
    if (!trades.length) {
        container.innerHTML = '<div class="empty">Заявок нет</div>';
        return;
    }
    const clans = getClans('wosb');
    container.innerHTML = trades.map(t => {
        const clan = clans.find(c => c.id === t.clan);
        const catInfo = TRADE_CATEGORIES.find(c => c.id === t.category);
        return `<div class="tm-listing ${t.type}">
            <div class="tm-listing-title">${t.type === 'buy' ? '🛒' : '💰'} ${escapeHtml(t.name)}</div>
            <div class="tm-listing-meta">
                ${clan ? '🏰 ' + escapeHtml(clan.name) : ''}
                ${catInfo ? ' · ' + catInfo.icon + ' ' + catInfo.name : ''}
                ${t.port ? ' · ⚓ ' + escapeHtml(t.port) : ''}
                · 👤 ${escapeHtml(t.author)}
            </div>
            <div class="tm-listing-price">${t.price.toLocaleString('ru-RU')} 🪙 × ${t.qty} = ${(t.price*t.qty).toLocaleString('ru-RU')} 🪙</div>
            ${t.note ? `<div style="font-size:13px;color:var(--muted);">${escapeHtml(t.note)}</div>` : ''}
            <div class="tm-listing-actions">
                <button onclick="completeTrade('${t.id}')">✅ Завершить</button>
                ${t.author === getViewerNick() ? `<button onclick="deleteTradeItem('${t.id}')">🗑 Удалить</button>` : ''}
            </div>
        </div>`;
    }).join('');
}

window.completeTrade = function(id) {
    updateTrade(id, { status: 'completed' });
    renderTradeListings();
    renderTradeStats();
};
window.deleteTradeItem = function(id) {
    if (!confirm('Удалить заявку?')) return;
    deleteTrade(id);
    renderTradeListings();
    renderTradeStats();
};

on('tmSearch', 'input', renderTradeListings);
on('tmOnlyMine', 'change', renderTradeListings);
on('tmSort', 'change', renderTradeListings);

/* ============ RESOURCES ============ */
function renderResources() {
    const resources = getResourcePrices();
    $('resTableBody').innerHTML = resources.map(r => `
        <tr>
            <td>${r.emoji || ''} ${escapeHtml(r.name)}</td>
            <td class="gold-text">${r.price} 🪙</td>
            <td>${new Date(r.created_at || Date.now()).toLocaleDateString('ru-RU')}</td>
        </tr>
    `).join('');
}

/* ============ SHIP BUILDER CALCULATOR ============ */
function fillBuildShipSelect() {
    const ships = getShips();
    $('buildShipSelect').innerHTML = '<option value="">— Выберите —</option>' +
        ships.map(s => `<option value="${escapeHtml(s.name)}">${escapeHtml(s.name)} (ур. ${ROMAN[s.level] || s.level})</option>`).join('');
}

on('buildAddComp', 'click', () => {
    const resources = getResourcePrices();
    const resName = prompt('Название компонента:', resources[0]?.name || '');
    if (!resName) return;
    const qty = parseInt(prompt('Количество:', '1')) || 1;
    buildRows.push({ id: Date.now(), name: resName, qty });
    renderBuildRows();
});

on('buildClear', 'click', () => { buildRows = []; renderBuildRows(); });
on('buildRecalc', 'click', renderBuildRows);
on('buildCopy', 'click', () => {
    const text = buildRows.map(r => `${r.name} ×${r.qty}`).join('\n');
    navigator.clipboard?.writeText(text);
    flash('buildTotal', 'Скопировано!', 'var(--green)');
});

function renderBuildRows() {
    const tbody = $('buildTbody');
    if (!buildRows.length) {
        tbody.innerHTML = '<tr><td colspan="4" class="empty">Нет компонентов. Нажми «➕ Добавить компонент».</td></tr>';
    } else {
        const resources = getResourcePrices();
        tbody.innerHTML = buildRows.map(r => {
            const res = resources.find(x => x.name.toLowerCase() === r.name.toLowerCase());
            const avg = res ? Number(res.price) || 0 : 0;
            const sum = avg * r.qty;
            return `<tr>
                <td>${escapeHtml(r.name)}</td>
                <td><input type="number" value="${r.qty}" min="1" style="width:80px;" onchange="updateBuildQty(${r.id}, this.value)"></td>
                <td>${avg} 🪙</td>
                <td class="gold-text">${sum} 🪙</td>
                <td><button class="btn-sm big-btn danger" onclick="removeBuildRow(${r.id})">🗑</button></td>
            </tr>`;
        }).join('');
    }
    const total = buildRows.reduce((s, r) => {
        const res = getResourcePrices().find(x => x.name.toLowerCase() === r.name.toLowerCase());
        return s + ((res ? Number(res.price)||0 : 0) * r.qty);
    }, 0);
    $('buildItems').textContent = buildRows.length;
    $('buildTotal').textContent = total.toLocaleString('ru-RU');
}

window.updateBuildQty = function(id, val) {
    const row = buildRows.find(r => r.id === id);
    if (row) { row.qty = Math.max(1, parseInt(val)||1); renderBuildRows(); }
};
window.removeBuildRow = function(id) {
    buildRows = buildRows.filter(r => r.id !== id);
    renderBuildRows();
};

/* ============ APPLICATION FORM ============ */
on('appSubmit', 'click', () => {
    const nick = $('appNick').value.trim();
    const why = $('appWhy').value.trim();
    if (!nick) { alert('Укажите никнейм'); return; }
    if (!why) { alert('Расскажите, почему хотите вступить'); return; }
    addApplication({
        nickname: nick,
        age: $('appAge').value.trim(),
        experience: $('appExp').value.trim(),
        contact: $('appContact').value.trim(),
        target_clan: $('appClan').value,
        why,
        status: 'new'
    });
    setViewerNick(nick);
    $('appNick').value = ''; $('appAge').value = ''; $('appExp').value = '';
    $('appContact').value = ''; $('appWhy').value = '';
    alert('✅ Заявка отправлена!');
});

/* ============ FAQ ============ */
function renderFaq() {
    const faq = getFaq();
    $('faqList').innerHTML = faq.length ? faq.map(f => `
        <details class="faq-item">
            <summary class="faq-q">${escapeHtml(f.question)}</summary>
            <div class="faq-a">${escapeHtml(f.answer)}</div>
        </details>
    `).join('') : '<div class="empty">Пока нет вопросов</div>';
}

/* ============ PARTNERS ============ */
function renderPartners() {
    const partners = getPartners();
    $('partnersList').innerHTML = partners.length ? partners.map(p => `
        <div class="partner-card">
            <div class="partner-logo">${p.logo || '🤝'}</div>
            <div>
                <div class="partner-name">${escapeHtml(p.name)}</div>
                <div class="partner-desc">${escapeHtml(p.description || '')}</div>
                <a href="${escapeHtml(p.url)}" target="_blank" class="partner-link">${escapeHtml(p.url)}</a>
            </div>
        </div>
    `).join('') : '<div class="empty">Партнёров пока нет</div>';
}

/* ============ ONLINE ============ */
on('onlineBtn', 'click', () => {
    const online = getOnlineUsers();
    alert('🟢 Сейчас на сайте: ' + online.length + '\n\n' + online.map(u => '• ' + u.nickname).join('\n'));
});

/* ============ NOTIFICATIONS ============ */
function renderNotifications() {
    const nick = getViewerNick();
    const notifs = getNotifications(nick);
    const unread = notifs.filter(n => !n.read).length;
    $('notifCount').textContent = unread;
    $('notifCount').style.display = unread ? 'inline' : 'none';
    const panel = $('notifPanel');
    panel.innerHTML = notifs.length ? notifs.slice(0, 10).map(n => `
        <div class="notif-item">
            <b>${escapeHtml(n.title)}</b>
            ${n.body ? '<div style="font-size:13px;color:var(--muted);">' + escapeHtml(n.body) + '</div>' : ''}
        </div>
    `).join('') : '<div class="empty">Нет уведомлений</div>';
}
on('notifBell', 'click', () => { $('notifPanel').hidden = !$('notifPanel').hidden; renderNotifications(); });

/* ============ HEARTBEAT ============ */
function startHeartbeat() {
    heartbeat();
    heartbeatTimer = setInterval(heartbeat, 30000);
}

/* ============ ADMIN LOGIN ============ */
on('adminLoginSubmit', 'click', () => {
    const email = $('adminLoginEmail').value.trim();
    const pass = $('adminLoginPass').value;
    const admin = loginAdmin(email, pass);
    if (admin) {
        $('adminLoginModal').hidden = true;
        location.href = 'admin.html';
    } else {
        alert('Неверный email или пароль');
    }
});

/* ============ INIT ============ */
function init() {
    const verEl = document.querySelector('.footer-right');
    if (verEl) verEl.textContent = 'v' + APP_VERSION;

    checkSession();
    renderStats();
    renderClans();
    renderMap();
    fillShipSelects();
    initTradeCategorySelect();
    initTradeCategoryFilters();
    renderTradeClanSelect();
    updateTradeFormTotal();
    renderTradeListings();
    renderTradeStats();
    renderResources();
    fillBuildShipSelect();
    renderFaq();
    renderPartners();
    renderNotifications();
    startHeartbeat();

    console.log('🚀 WOSB portal loaded v' + APP_VERSION);
}

init();
