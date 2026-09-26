/* ============================================================
   Admin Panel — all admin logic
============================================================ */

const $ = id => document.getElementById(id);
function on(id, ev, fn) { const el = $(id); if (el) el.addEventListener(ev, fn); }
function escapeHtml(s) { return String(s||'').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];

/* ============ SESSION CHECK ============ */
function checkAdmin() {
    const session = getSession();
    if (!session) {
        // Try auto-login for owner
        const admins = getSiteAdmins();
        if (admins.length === 1 && admins[0].email === 'admin@wosb.ru' && admins[0].password === 'admin') {
            // Allow access for default admin
            return;
        }
        alert('Войдите как администратор');
        location.href = 'wosb.html';
    }
}

/* ============ THEME ============ */
function applyTheme(t) { document.documentElement.setAttribute('data-theme', t); localStorage.setItem('app_theme', t); }
function toggleTheme() { applyTheme((document.documentElement.getAttribute('data-theme')||'dark') === 'dark' ? 'light' : 'dark'); }
applyTheme(localStorage.getItem('app_theme') || 'dark');
on('themeToggle', 'click', toggleTheme);

/* ============ SIDEBAR NAV ============ */
document.querySelectorAll('#adminSidebar .side-item').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('#adminSidebar .side-item').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        document.querySelectorAll('.admin-section').forEach(s => s.classList.remove('active'));
        $('sec-' + btn.dataset.section).classList.add('active');
        refreshAdminSection(btn.dataset.section);
    });
});

function refreshAdminSection(section) {
    switch (section) {
        case 'guilds': renderClanAdmin(); break;
        case 'alliances': renderAlliancesAdmin(); break;
        case 'games': renderGamesAdmin(); break;
        case 'ships': renderShipsAdmin(); break;
        case 'pricing': renderPricingAdmin(); break;
        case 'recipes': renderRecipesAdmin(); break;
        case 'factions': renderFactionsAdmin(); break;
        case 'partners': renderPartnersAdmin(); break;
        case 'faq': renderFaqAdmin(); break;
        case 'tactics': renderTacticsAdmin(); break;
        case 'online': renderAdminOnline(); break;
        case 'admins': renderSiteAdminsAdmin(); break;
        case 'settings': loadSettings(); break;
    }
}

/* ============ GUILDS MANAGEMENT ============ */
function renderClanAdmin() {
    const clans = getClans();
    const sel = $('adminClanSelect');
    sel.innerHTML = '<option value="">— Новая гильдия —</option>' +
        clans.map(c => `<option value="${escapeHtml(c.id)}">${escapeHtml(c.name)}</option>`).join('');
    const games = getAllGames();
    $('adminClanGame').innerHTML = games.map(g => `<option value="${escapeHtml(g.id)}">${escapeHtml(g.name)}</option>`).join('');
    const alliances = getAlliances();
    $('adminClanAlliance').innerHTML = '<option value="">— Нет —</option>' +
        alliances.map(a => `<option value="${escapeHtml(a.id)}">${escapeHtml(a.name)}</option>`).join('');
    updateAdminFields();
}

function updateAdminFields() {
    const id = $('adminClanSelect').value;
    if (!id) {
        ['adminClanName','adminClanLeader','adminClanDesc','adminClanRules','adminClanNews','adminClanPass','adminClanAdminPass','adminClanDiscord','adminClanPhone','adminClanImage','adminClanAdmins','adminClanMembers'].forEach(f => $(f).value = '');
        return;
    }
    const clan = getClan(id);
    if (!clan) return;
    $('adminClanName').value = clan.name || '';
    $('adminClanGame').value = clan.game_id || 'wosb';
    $('adminClanAlliance').value = clan.alliance_id || '';
    $('adminClanLeader').value = clan.leader_nick || '';
    $('adminClanDesc').value = clan.description || '';
    $('adminClanRules').value = clan.rules || '';
    $('adminClanNews').value = clan.news || '';
    $('adminClanPass').value = clan.password || '';
    $('adminClanAdminPass').value = clan.admin_password || '';
    $('adminClanDiscord').value = clan.discord || '';
    $('adminClanPhone').value = clan.phone || '';
    $('adminClanImage').value = clan.image || '';
    $('adminClanFlag').value = clan.flag || 'neutral';
    $('adminClanAdmins').value = clan.admins || '';
    $('adminClanMembers').value = clan.members || '';
}
on('adminClanSelect', 'change', updateAdminFields);

on('saveClanBtn', 'click', () => {
    const id = $('adminClanSelect').value;
    const data = {
        name: $('adminClanName').value.trim(),
        game_id: $('adminClanGame').value,
        alliance_id: $('adminClanAlliance').value || null,
        leader_nick: $('adminClanLeader').value.trim(),
        description: $('adminClanDesc').value.trim(),
        rules: $('adminClanRules').value.trim(),
        news: $('adminClanNews').value.trim(),
        password: $('adminClanPass').value,
        admin_password: $('adminClanAdminPass').value,
        discord: $('adminClanDiscord').value.trim(),
        phone: $('adminClanPhone').value.trim(),
        image: $('adminClanImage').value.trim(),
        flag: $('adminClanFlag').value,
        admins: $('adminClanAdmins').value,
        members: $('adminClanMembers').value
    };
    if (!data.name) { alert('Введите название'); return; }
    if (id) {
        saveClan(id, data);
        alert('✅ Гильдия сохранена');
    } else {
        const newId = data.name.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 10) || 'clan_' + Date.now();
        createClan({ id: newId, ...data });
        alert('✅ Гильдия создана');
        renderClanAdmin();
    }
});

on('newClanBtn', 'click', () => { $('adminClanSelect').value = ''; updateAdminFields(); });
on('deleteClanBtn', 'click', () => {
    const id = $('adminClanSelect').value;
    if (!id) { alert('Выберите гильдию'); return; }
    if (!confirm('Удалить гильдию и все связанные данные?')) return;
    deleteClan(id);
    renderClanAdmin();
    alert('✅ Гильдия удалена');
});

/* ============ ALLIANCES ============ */
on('createAllianceBtn', 'click', () => {
    const id = $('newAllianceId').value.trim();
    const name = $('newAllianceName').value.trim();
    if (!id || !name) { alert('Заполните ID и название'); return; }
    createAlliance({ id, name, description: $('newAllianceDesc').value.trim() });
    $('newAllianceId').value = ''; $('newAllianceName').value = ''; $('newAllianceDesc').value = '';
    renderAlliancesAdmin();
});

function renderAlliancesAdmin() {
    const alliances = getAlliances();
    if (!alliances.length) {
        $('allianceAdminList').innerHTML = '<div class="empty">Пока нет союзов</div>';
        return;
    }
    $('allianceAdminList').innerHTML = alliances.map(a => `
        <div class="admin-item">
            <div style="flex:1;">
                <b>🤝 ${escapeHtml(a.name)}</b>
                <span style="color:var(--muted);font-size:11px;"> [${escapeHtml(a.id)}]</span>
                ${a.description ? '<div style="font-size:13px;color:var(--muted);">' + escapeHtml(a.description) + '</div>' : ''}
            </div>
            <div class="actions">
                <button onclick="deleteAllianceItem('${escapeHtml(a.id)}')">🗑</button>
            </div>
        </div>
    `).join('');
}
window.deleteAllianceItem = function(id) { if (confirm('Удалить союз?')) { deleteAlliance(id); renderAlliancesAdmin(); } };

/* ============ GAMES ============ */
on('addGameBtn', 'click', () => {
    const id = $('newGameId').value.trim();
    const name = $('newGameName').value.trim();
    if (!id || !name) { alert('Заполните ID и название'); return; }
    addGame({ id, name, logo: $('newGameLogo').value.trim() || '🎮', enabled: true, bg: '' });
    $('newGameId').value = ''; $('newGameName').value = ''; $('newGameLogo').value = '';
    renderGamesAdmin();
});

function renderGamesAdmin() {
    const games = getAllGames();
    if (!games.length) {
        $('gamesAdminList').innerHTML = '<div class="empty">Пока нет игр</div>';
        return;
    }
    $('gamesAdminList').innerHTML = games.map(g => `
        <div class="admin-item">
            <div class="partner-logo">${g.logo || '🎮'}</div>
            <div style="flex:1;">
                <b>${escapeHtml(g.name)}</b>
                <span style="color:var(--muted);font-size:11px;"> [${escapeHtml(g.id)}]</span>
                ${g.enabled ? '<span style="color:var(--green);"> ✓ Активна</span>' : '<span style="color:var(--red);"> ✗ Выключена</span>'}
            </div>
        </div>
    `).join('');
}

/* ============ SHIPS ============ */
on('addShipBtn', 'click', () => {
    const name = $('newShipName').value.trim();
    if (!name) { alert('Введите название'); return; }
    saveShip({
        name,
        level: parseInt($('newShipLevel').value),
        type: $('newShipType').value,
        durability: parseInt($('newShipDur').value) || 0,
        guns: parseInt($('newShipGuns').value) || 0,
        image: ''
    });
    $('newShipName').value = '';
    renderShipsAdmin();
});

function renderShipsAdmin() {
    const ships = getShips();
    if (!ships.length) {
        $('shipsAdminGrid').innerHTML = '<div class="empty">Кораблей пока нет</div>';
        return;
    }
    const typeLabels = { fast: '⚡', combat: '⚔️', transport: '📦', heavy: '🛡', imperial: '👑' };
    $('shipsAdminGrid').innerHTML = ships.sort((a,b) => b.level - a.level).map(s => `
        <div class="ship-card">
            <div class="ship-name">${escapeHtml(s.name)}</div>
            <div class="ship-stats">
                <span>Ур. ${ROMAN[s.level] || s.level}</span>
                <span>${typeLabels[s.type] || ''} ${s.type}</span>
                <span>💪 ${s.durability || '—'}</span>
                <span>🔫 ${s.guns || '—'}</span>
            </div>
            <button class="btn-sm big-btn danger" onclick="deleteShipItem('${escapeHtml(s.id)}')">🗑 Удалить</button>
        </div>
    `).join('');
}
window.deleteShipItem = function(id) { if (confirm('Удалить корабль?')) { tableDelete('ships', id); renderShipsAdmin(); } };

/* ============ PRICING ============ */
on('addResBtn', 'click', () => {
    const id = $('newResId').value.trim();
    const name = $('newResName').value.trim();
    if (!id || !name) { alert('Заполните ID и название'); return; }
    saveResourcePrice({
        id, name,
        price: parseInt($('newResPrice').value) || 0,
        emoji: $('newResEmoji').value.trim() || '📦',
        group: $('newResGroup').value,
        image_url: ''
    });
    $('newResId').value = ''; $('newResName').value = ''; $('newResPrice').value = '10';
    renderPricingAdmin();
});

function renderPricingAdmin() {
    const resources = getResourcePrices();
    if (!resources.length) {
        $('pricingAdminTable').innerHTML = '<tr><td colspan="4" class="empty">Ресурсов пока нет</td></tr>';
        return;
    }
    $('pricingAdminTable').innerHTML = resources.map(r => `
        <tr>
            <td>${r.emoji || ''} ${escapeHtml(r.name)}</td>
            <td>${escapeHtml(r.group || 'basic')}</td>
            <td class="gold-text">${r.price} 🪙</td>
            <td><button class="btn-sm big-btn danger" onclick="deleteResItem('${escapeHtml(r.id)}')">🗑</button></td>
        </tr>
    `).join('');
}
window.deleteResItem = function(id) { deleteResourcePrice(id); renderPricingAdmin(); };

/* ============ RECIPES & DISCOUNTS ============ */
function fillRecipeSelects() {
    const ships = getShips();
    $('recipeShipSelect').innerHTML = '<option value="">— Выберите —</option>' +
        ships.map(s => `<option value="${escapeHtml(s.name)}">${escapeHtml(s.name)}</option>`).join('');
    const resources = getResourcePrices();
    $('recipeResSelect').innerHTML = '<option value="">— Выберите —</option>' +
        resources.map(r => `<option value="${escapeHtml(r.id)}">${r.emoji || ''} ${escapeHtml(r.name)}</option>`).join('');
}

on('addRecipeBtn', 'click', () => {
    const shipId = $('recipeShipSelect').value;
    const resId = $('recipeResSelect').value;
    const qty = parseInt($('recipeQty').value) || 1;
    if (!shipId || !resId) { alert('Выберите корабль и ресурс'); return; }
    saveRecipe({ ship_id: shipId, resource_id: resId, quantity: qty });
    $('recipeQty').value = '1';
    renderRecipesAdmin();
});

on('clearRecipeBtn', 'click', () => {
    const shipId = $('recipeShipSelect').value;
    if (!shipId) return;
    if (!confirm('Очистить рецепт для ' + shipId + '?')) return;
    const d = db();
    d.ship_recipes = d.ship_recipes.filter(r => r.ship_id !== shipId);
    persist();
    renderRecipesAdmin();
});

function renderRecipesAdmin() {
    fillRecipeSelects();
    const shipId = $('recipeShipSelect').value;
    if (!shipId) { $('recipeTable').innerHTML = '<tr><td colspan="3" class="empty">Выберите корабль</td></tr>'; return; }
    const recipes = getRecipes(shipId);
    const resources = getResourcePrices();
    if (!recipes.length) { $('recipeTable').innerHTML = '<tr><td colspan="3" class="empty">Рецепт пуст</td></tr>'; return; }
    $('recipeTable').innerHTML = recipes.map(r => {
        const res = resources.find(x => x.id === r.resource_id);
        return `<tr>
            <td>${res ? (res.emoji || '') + ' ' + escapeHtml(res.name) : escapeHtml(r.resource_id)}</td>
            <td>${r.quantity}</td>
            <td><button class="btn-sm big-btn danger" onclick="deleteRecipeItem('${escapeHtml(r.id)}')">🗑</button></td>
        </tr>`;
    }).join('');
}
window.deleteRecipeItem = function(id) { deleteRecipe(id); renderRecipesAdmin(); };

on('recipeShipSelect', 'change', renderRecipesAdmin);

on('addDiscountBtn', 'click', () => {
    const name = $('newDiscountName').value.trim();
    if (!name) { alert('Введите название скидки'); return; }
    addDiscount({
        name,
        type: 'percent',
        percent: parseInt($('newDiscountPercent').value) || 0,
        active: true
    });
    $('newDiscountName').value = ''; $('newDiscountPercent').value = '10';
    renderDiscounts();
});

function renderDiscounts() {
    const discounts = getDiscounts();
    if (!discounts.length) { $('discountsList').innerHTML = '<div class="empty">Скидок пока нет</div>'; return; }
    $('discountsList').innerHTML = discounts.map(d => `
        <div class="admin-item">
            <div style="flex:1;">
                <b>${escapeHtml(d.name)}</b> — ${d.percent}% ${d.active ? '✅' : '❌'}
            </div>
            <div class="actions">
                <button onclick="deleteDiscountItem('${escapeHtml(d.id)}')">🗑</button>
            </div>
        </div>
    `).join('');
}
window.deleteDiscountItem = function(id) { deleteDiscount(id); renderDiscounts(); };

/* ============ FACTIONS & PORTS ============ */
function renderFactionsAdmin() {
    const factions = getFactions();
    $('factionsAdminList').innerHTML = factions.map(f => `
        <div class="admin-item">
            <div style="width:24px;height:24px;border-radius:6px;background:${f.color || '#888'};flex-shrink:0;"></div>
            <div style="flex:1;"><b>${escapeHtml(f.name)}</b> <span style="color:var(--muted);">${escapeHtml(f.type || '')}</span></div>
        </div>
    `).join('');

    // Fill port faction select
    $('newPortFaction').innerHTML = factions.map(f => `<option value="${escapeHtml(f.id)}">${escapeHtml(f.name)}</option>`).join('');
    renderPortsAdmin();
}

on('addPortBtn', 'click', () => {
    const name = $('newPortName').value.trim();
    if (!name) { alert('Введите название порта'); return; }
    addPort({
        name,
        type: $('newPortType').value,
        faction: $('newPortFaction').value,
        region: $('newPortRegion').value.trim(),
        can_capture: false,
        description: ''
    });
    $('newPortName').value = ''; $('newPortRegion').value = '';
    renderPortsAdmin();
});

function renderPortsAdmin() {
    const ports = getPorts();
    if (!ports.length) { $('portsAdminList').innerHTML = '<div class="empty">Портов пока нет</div>'; return; }
    $('portsAdminList').innerHTML = ports.map(p => `
        <div class="admin-item">
            <div style="flex:1;">
                <b>${escapeHtml(p.name)}</b>
                <span style="color:var(--muted);font-size:12px;"> · ${escapeHtml(p.type || '')} · ${escapeHtml(p.faction || '')} · ${escapeHtml(p.region || '')}</span>
            </div>
            <div class="actions">
                <button onclick="deletePortItem('${escapeHtml(p.id)}')">🗑</button>
            </div>
        </div>
    `).join('');
}
window.deletePortItem = function(id) { deletePort(id); renderPortsAdmin(); };

/* ============ MAP ============ */
function loadMap() {
    const settings = getMapSettings();
    $('mapTitle').value = settings.title || '';
    $('mapDetailedUrl').value = settings.detailed_url || '';
    $('mapCleanUrl').value = settings.clean_url || '';
    $('mapDefaultView').value = settings.default_view || 'detailed';
    $('mapHint').value = settings.hint || '';
}
on('saveMapBtn', 'click', () => {
    saveMapSettings({
        title: $('mapTitle').value,
        detailed_url: $('mapDetailedUrl').value.trim(),
        clean_url: $('mapCleanUrl').value.trim(),
        default_view: $('mapDefaultView').value,
        hint: $('mapHint').value
    });
    alert('✅ Карта сохранена');
});

/* ============ PARTNERS ============ */
on('addPartnerBtn', 'click', () => {
    const name = $('newPartnerName').value.trim();
    const url = $('newPartnerUrl').value.trim();
    if (!name || !url) { alert('Заполните название и ссылку'); return; }
    addPartner({
        name, url,
        description: $('newPartnerDesc').value.trim(),
        logo: $('newPartnerLogo').value.trim() || '🤝'
    });
    $('newPartnerName').value = ''; $('newPartnerUrl').value = ''; $('newPartnerDesc').value = ''; $('newPartnerLogo').value = '';
    renderPartnersAdmin();
});

function renderPartnersAdmin() {
    const partners = getPartners();
    if (!partners.length) { $('partnersAdminList').innerHTML = '<div class="empty">Партнёров пока нет</div>'; return; }
    $('partnersAdminList').innerHTML = partners.map(p => `
        <div class="admin-item">
            <div class="partner-logo">${p.logo || '🤝'}</div>
            <div style="flex:1;">
                <b>${escapeHtml(p.name)}</b>
                <div style="font-size:12px;color:var(--muted);">${escapeHtml(p.description || '')}</div>
                <div style="font-size:11px;color:var(--accent);">${escapeHtml(p.url)}</div>
            </div>
            <div class="actions">
                <button onclick="deletePartnerItem('${escapeHtml(p.id)}')">🗑</button>
            </div>
        </div>
    `).join('');
}
window.deletePartnerItem = function(id) { deletePartner(id); renderPartnersAdmin(); };

/* ============ FAQ ============ */
on('addFaqBtn', 'click', () => {
    const q = $('newFaqQ').value.trim();
    const a = $('newFaqA').value.trim();
    if (!q || !a) { alert('Заполните вопрос и ответ'); return; }
    addFaq({ question: q, answer: a, sort_order: getFaq().length });
    $('newFaqQ').value = ''; $('newFaqA').value = '';
    renderFaqAdmin();
});

function renderFaqAdmin() {
    const faq = getFaq();
    if (!faq.length) { $('faqAdminList').innerHTML = '<div class="empty">FAQ пуст</div>'; return; }
    $('faqAdminList').innerHTML = faq.map(f => `
        <div class="admin-item">
            <div style="flex:1;">
                <b>${escapeHtml(f.question)}</b>
                <div style="font-size:13px;color:var(--muted);">${escapeHtml(f.answer)}</div>
            </div>
            <div class="actions">
                <button onclick="deleteFaqItem('${escapeHtml(f.id)}')">🗑</button>
            </div>
        </div>
    `).join('');
}
window.deleteFaqItem = function(id) { deleteFaq(id); renderFaqAdmin(); };

/* ============ TACTICS ============ */
on('addTacticBtn', 'click', () => {
    const id = $('newTacticId').value.trim();
    const title = $('newTacticTitle').value.trim();
    if (!id || !title) { alert('Заполните ID и заголовок'); return; }
    addTactic({
        id, title,
        icon: $('newTacticIcon').value.trim() || '📖',
        content: $('newTacticContent').value,
        sort_order: getTactics().length
    });
    $('newTacticId').value = ''; $('newTacticTitle').value = ''; $('newTacticIcon').value = ''; $('newTacticContent').value = '';
    renderTacticsAdmin();
});

function renderTacticsAdmin() {
    const tactics = getTactics();
    if (!tactics.length) { $('tacticsAdminList').innerHTML = '<div class="empty">Разделов пока нет</div>'; return; }
    $('tacticsAdminList').innerHTML = tactics.map(t => `
        <div class="admin-item">
            <div style="flex:1;">
                <b>${t.icon || '📖'} ${escapeHtml(t.title)}</b>
                <div style="font-size:11px;color:var(--muted);">[${escapeHtml(t.id)}]</div>
            </div>
            <div class="actions">
                <button onclick="deleteTacticItem('${escapeHtml(t.id)}')">🗑</button>
            </div>
        </div>
    `).join('');
}
window.deleteTacticItem = function(id) { deleteTactic(id); renderTacticsAdmin(); };

/* ============ ONLINE ============ */
function renderAdminOnline() {
    const online = getOnlineUsers();
    if (!online.length) { $('adminOnlineList').innerHTML = '<div class="empty">Сейчас никого нет</div>'; return; }
    $('adminOnlineList').innerHTML = online.map(u => `
        <div class="online-item">
            <span>🟢</span>
            <span class="online-nick">${escapeHtml(u.nickname)}</span>
            <span style="font-size:12px;color:var(--muted);">${escapeHtml(u.page || '')}</span>
        </div>
    `).join('');
}
on('adminOnlineRefresh', 'click', renderAdminOnline);

/* ============ SITE ADMINS ============ */
on('addAdminBtn', 'click', () => {
    const nick = $('newAdminNick').value.trim();
    const email = $('newAdminEmail').value.trim();
    const pass = $('newAdminPass').value;
    if (!nick || !email || !pass) { alert('Заполните все поля'); return; }
    addSiteAdmin({
        nickname: nick,
        email: email.toLowerCase(),
        password: pass,
        role: $('newAdminRole').value,
        clan_id: $('newAdminClan').value || null
    });
    $('newAdminNick').value = ''; $('newAdminEmail').value = ''; $('newAdminPass').value = '';
    renderSiteAdminsAdmin();
});

function renderSiteAdminsAdmin() {
    const admins = getSiteAdmins();
    const clans = getClans();
    // Fill clan select
    $('newAdminClan').innerHTML = '<option value="">— Без привязки —</option>' +
        clans.map(c => `<option value="${escapeHtml(c.id)}">${escapeHtml(c.name)}</option>`).join('');

    if (!admins.length) { $('siteAdminsList').innerHTML = '<div class="empty">Админов нет</div>'; return; }
    const roleLabels = { owner: '👑 Владелец', admin: '⚙️ Админ', mod: '🎖 Глава Клана' };
    $('siteAdminsList').innerHTML = admins.sort((a,b) => {
        const order = { owner: 0, admin: 1, mod: 2 };
        return (order[a.role] ?? 9) - (order[b.role] ?? 9);
    }).map(a => {
        const clan = a.clan_id && clans.find(c => c.id === a.clan_id);
        return `<div class="admin-item">
            <div class="partner-logo">${a.role === 'owner' ? '👑' : a.role === 'admin' ? '⚙️' : '🎖'}</div>
            <div style="flex:1;">
                <b>${escapeHtml(a.nickname)}</b>
                <span style="color:var(--muted);font-size:12px;"> · ${escapeHtml(a.email)}</span>
                <div style="font-size:12px;">
                    <span class="gold-text">${roleLabels[a.role] || a.role}</span>
                    ${clan ? ' · 🏰 ' + escapeHtml(clan.name) : ''}
                </div>
            </div>
            <div class="actions">
                <button onclick="deleteSiteAdminItem('${escapeHtml(a.email)}')">🗑</button>
            </div>
        </div>`;
    }).join('');
}
window.deleteSiteAdminItem = function(email) {
    if (!confirm('Удалить админа?')) return;
    deleteSiteAdmin(email);
    renderSiteAdminsAdmin();
};

/* ============ SETTINGS ============ */
function loadSettings() {
    const settings = getSettings();
    $('settingsVk').value = settings.vk_community || '';
    $('settingsWebhook').value = settings.discord_webhook || '';
}
on('saveSettingsBtn', 'click', () => {
    saveSettings({
        vk_community: $('settingsVk').value.trim(),
        discord_webhook: $('settingsWebhook').value.trim()
    });
    alert('✅ Настройки сохранены');
});

/* ============ EXPORT / IMPORT / RESET ============ */
on('exportBtn', 'click', () => {
    const data = exportData();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'wosb_backup_' + new Date().toISOString().slice(0,10) + '.json';
    a.click();
    URL.revokeObjectURL(url);
});

on('importBtn', 'click', () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.addEventListener('change', e => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = ev => {
            if (importData(ev.target.result)) {
                alert('✅ Данные импортированы');
                location.reload();
            } else {
                alert('❌ Ошибка импорта');
            }
        };
        reader.readAsText(file);
    });
    input.click();
});

on('resetBtn', 'click', () => {
    if (!confirm('Сбросить все данные к значениям по умолчанию?')) return;
    if (!confirm('Точно? Это удалит все гильдии, билды, заявки и т.д.')) return;
    resetData();
    alert('✅ Данные сброшены');
    location.reload();
});

/* ============ INIT ============ */
function init() {
    checkAdmin();
    renderClanAdmin();
    renderAlliancesAdmin();
    renderGamesAdmin();
    renderShipsAdmin();
    renderPricingAdmin();
    fillRecipeSelects();
    renderRecipesAdmin();
    renderDiscounts();
    renderFactionsAdmin();
    loadMap();
    renderPartnersAdmin();
    renderFaqAdmin();
    renderTacticsAdmin();
    renderAdminOnline();
    renderSiteAdminsAdmin();
    loadSettings();
    heartbeat();
    setInterval(heartbeat, 30000);
    console.log('⚙️ Admin panel loaded');
}

init();
