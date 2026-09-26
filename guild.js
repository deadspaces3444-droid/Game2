/* ============================================================
   Guild Page — all guild logic
============================================================ */

const $ = id => document.getElementById(id);
function on(id, ev, fn) { const el = $(id); if (el) el.addEventListener(ev, fn); }
function escapeHtml(s) { return String(s||'').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

const urlParams = new URLSearchParams(location.search);
const clanId = urlParams.get('clan') || localStorage.getItem('guild_last_clan') || 'aov';
window.currentClan = clanId;

const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];
const TRADE_CATEGORIES = [
    { id: 'ship', name: 'Корабли', icon: '🚢' },
    { id: 'resource', name: 'Ресурсы', icon: '📦' },
    { id: 'cannon', name: 'Пушки', icon: '🔫' },
    { id: 'ammo', name: 'Боеприпасы', icon: '💥' },
    { id: 'other', name: 'Прочее', icon: '🔧' }
];

let currentTab = 'lists';
let currentListTab = 'enemies';
let guildBuildRows = [];
let heartbeatTimer = null;
let chatRefreshTimer = null;

/* ============ THEME ============ */
function applyTheme(t) { document.documentElement.setAttribute('data-theme', t); localStorage.setItem('app_theme', t); }
function toggleTheme() { applyTheme((document.documentElement.getAttribute('data-theme')||'dark') === 'dark' ? 'light' : 'dark'); }
applyTheme(localStorage.getItem('app_theme') || 'dark');
on('themeToggle', 'click', toggleTheme);

/* ============ SESSION ============ */
function checkSession() {
    const session = getSession();
    if (session) {
        $('adminBtn').hidden = false;
        $('logoutBtn').hidden = false;
    }
    const myClan = localStorage.getItem('guild_my_clan');
    if (myClan === clanId) {
        $('adminBtn').hidden = false;
        $('logoutBtn').hidden = false;
    }
}
on('adminBtn', 'click', () => location.href = 'admin.html');
on('logoutBtn', 'click', () => {
    clearSession();
    localStorage.removeItem('guild_my_clan');
    location.href = 'wosb.html';
});

/* ============ TABS ============ */
document.querySelectorAll('#guildSidebar .side-item').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('#guildSidebar .side-item').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentTab = btn.dataset.tab;
        document.querySelectorAll('.tab-content').forEach(tc => tc.classList.remove('active'));
        $('tab-' + currentTab).classList.add('active');
        refreshTab();
    });
});

function refreshTab() {
    switch (currentTab) {
        case 'lists': renderList(); break;
        case 'events': renderEvents(); break;
        case 'treasury': renderTreasury(); break;
        case 'pvp': renderBuilds('pvp', 'pvpList'); break;
        case 'pb': renderBuilds('pb', 'pbList'); break;
        case 'ships': renderShips(); break;
        case 'builder': renderGuildBuilder(); break;
        case 'contacts': renderContacts(); break;
        case 'members': loadMembers(); break;
        case 'tactics': renderTactics(); break;
        case 'chat': renderChat(); break;
        case 'applications': renderApplications(); break;
        case 'online': renderOnline(); break;
    }
}

/* ============ GUILD HEADER ============ */
function loadGuildHeader() {
    const clan = getClan(clanId);
    if (!clan) { $('guildName').textContent = 'Гильдия не найдена'; return; }
    $('guildName').textContent = (clan.image ? '' : (CLAN_FLAGS[clan.flag] || '🏰') + ' ') + clan.name;
    $('guildDesc').textContent = clan.description || '';
}

/* ============ LISTS ============ */
document.querySelectorAll('[data-list]').forEach(tab => {
    tab.addEventListener('click', () => {
        document.querySelectorAll('[data-list]').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        currentListTab = tab.dataset.list;
        renderList();
    });
});

on('listAddBtn', 'click', () => {
    const guild = $('listAddGuild').value.trim();
    const nick = $('listAddNick').value.trim();
    if (!guild && !nick) { alert('Заполните гильдию или никнейм'); return; }
    addToList(clanId, currentListTab, { guild, nick });
    $('listAddGuild').value = ''; $('listAddNick').value = '';
    renderList();
});

function renderList() {
    const titles = { enemies: '🔴 Враги гильдии', friends: '🟢 Друзья — полное содействие', neutral: '⚪ Нейтралитет', personal: '🟡 Не трогать' };
    $('listTitle').textContent = titles[currentListTab] || '';
    const items = getList(clanId, currentListTab);
    if (!items.length) {
        $('listItems').innerHTML = '<div class="empty">Список пуст</div>';
        return;
    }
    $('listItems').innerHTML = items.map(item => `
        <li>
            <div class="info">
                <div class="nick">${escapeHtml(item.guild || '')} ${item.nick ? '· ' + escapeHtml(item.nick) : ''}</div>
            </div>
            <div class="flex gap-8">
                ${['enemies','friends','neutral','personal'].filter(l => l !== currentListTab).map(l => 
                    `<button class="btn-sm big-btn secondary" onclick="moveListItem('${item.id}','${l}')">${l === 'enemies' ? '🔴' : l === 'friends' ? '🟢' : l === 'neutral' ? '⚪' : '🟡'}</button>`
                ).join('')}
                <button class="btn-sm big-btn danger" onclick="removeListItem('${item.id}')">🗑</button>
            </div>
        </li>
    `).join('');
}

window.moveListItem = function(id, target) {
    moveItem(currentListTab, id, target);
    renderList();
};
window.removeListItem = function(id) {
    removeFromList(currentListTab, id);
    renderList();
};

/* ============ EVENTS ============ */
on('evAddBtn', 'click', () => {
    const title = $('evTitle').value.trim();
    const date = $('evDate').value;
    if (!title) { alert('Введите название'); return; }
    if (!date) { alert('Выберите дату'); return; }
    addEvent({
        title,
        event_date: date,
        description: $('evDesc').value.trim(),
        clan: clanId,
        is_shared: false
    });
    $('evTitle').value = ''; $('evDate').value = ''; $('evDesc').value = '';
    renderEvents();
});

function renderEvents() {
    const events = getEvents(clanId);
    if (!events.length) {
        $('eventsList').innerHTML = '<div class="empty">Событий пока нет</div>';
        return;
    }
    const now = Date.now();
    const mNames = ['ЯНВ','ФЕВ','МАР','АПР','МАЯ','ИЮН','ИЮЛ','АВГ','СЕН','ОКТ','НОЯ','ДЕК'];
    events.sort((a,b) => new Date(a.event_date) - new Date(b.event_date));
    $('eventsList').innerHTML = events.map(ev => {
        const d = new Date(ev.event_date);
        const isPast = d.getTime() < now;
        return `<div class="event-card ${isPast ? 'past' : ''}">
            <div class="event-date-block">
                <div class="event-day">${String(d.getDate()).padStart(2,'0')}</div>
                <div style="font-size:11px;color:var(--muted);">${mNames[d.getMonth()]}</div>
            </div>
            <div class="event-info">
                <div class="event-title">${escapeHtml(ev.title)}</div>
                ${ev.description ? `<div class="event-desc">${escapeHtml(ev.description)}</div>` : ''}
                ${ev.is_shared ? '<div style="font-size:11px;color:var(--gold);">🌐 Общее событие</div>' : ''}
            </div>
            <button class="btn-sm big-btn danger" onclick="deleteEventItem('${ev.id}')">🗑</button>
        </div>`;
    }).join('');
}
window.deleteEventItem = function(id) { deleteEvent(id); renderEvents(); };

/* ============ TREASURY ============ */
on('trAddBtn', 'click', () => {
    const amount = parseInt($('trAmount').value) || 0;
    if (!amount) { alert('Введите сумму'); return; }
    addTreasury({
        clan: clanId,
        type: $('trType').value,
        amount,
        description: $('trDesc').value.trim()
    });
    $('trAmount').value = ''; $('trDesc').value = '';
    renderTreasury();
});

function renderTreasury() {
    const items = getTreasury(clanId);
    const balance = items.reduce((s, t) => s + (t.type === 'income' ? t.amount : -t.amount), 0);
    $('treasuryBalance').textContent = balance.toLocaleString('ru-RU') + ' 🪙';
    if (!items.length) {
        $('treasuryList').innerHTML = '<div class="empty">Записей в казне пока нет</div>';
        return;
    }
    $('treasuryList').innerHTML = items.reverse().map(t => `
        <div class="treasury-item ${t.type}">
            <div>
                <b>${t.type === 'income' ? '➕' : '➖'} ${t.amount} 🪙</b>
                ${t.description ? '<div style="font-size:12px;color:var(--muted);">' + escapeHtml(t.description) + '</div>' : ''}
            </div>
            <div style="font-size:11px;color:var(--muted);">${new Date(t.created_at).toLocaleDateString('ru-RU')}</div>
        </div>
    `).join('');
}

/* ============ BUILDS ============ */
on('pvpAddBtn', 'click', () => addBuildFromForm('pvp', 'pvpShipName', 'pvpUpgrades', 'pvpGuns', 'pvpConsumables', 'pvpList'));
on('pbAddBtn', 'click', () => addBuildFromForm('pb', 'pbShipName', 'pbUpgrades', 'pbGuns', 'pbConsumables', 'pbList'));

function addBuildFromForm(type, shipId, upId, gunsId, consId, listId) {
    const shipName = $(shipId).value.trim();
    if (!shipName) { alert('Введите название корабля'); return; }
    addBuild({
        clan: clanId,
        type,
        ship_name: shipName,
        upgrades: $(upId).value.trim(),
        guns: $(gunsId).value.trim(),
        consumables: $(consId).value.trim(),
        crew: ''
    });
    $(shipId).value = ''; $(upId).value = ''; $(gunsId).value = ''; $(consId).value = '';
    renderBuilds(type, listId);
}

function renderBuilds(type, listId) {
    const builds = getBuilds(clanId, type);
    if (!builds.length) {
        $(listId).innerHTML = '<div class="empty">Билдов пока нет</div>';
        return;
    }
    $(listId).innerHTML = builds.map(b => `
        <div class="build-card">
            <div class="build-title">🚢 ${escapeHtml(b.ship_name)}</div>
            ${b.upgrades ? `<div class="build-details"><b>Апгрейды:</b> ${escapeHtml(b.upgrades)}</div>` : ''}
            ${b.guns ? `<div class="build-details"><b>Пушки:</b> ${escapeHtml(b.guns)}</div>` : ''}
            ${b.consumables ? `<div class="build-details"><b>Расходники:</b> ${escapeHtml(b.consumables)}</div>` : ''}
            ${b.crew ? `<div class="build-details"><b>Специалисты:</b> ${escapeHtml(b.crew)}</div>` : ''}
            <button class="btn-sm big-btn danger mt-10" onclick="deleteBuildItem('${b.id}')">🗑 Удалить</button>
        </div>
    `).join('');
}
window.deleteBuildItem = function(id) { deleteBuild(id); renderBuilds('pvp','pvpList'); renderBuilds('pb','pbList'); };

/* ============ SHIPS ============ */
function renderShips() {
    const levelFilter = $('shipFilterLevel').value;
    const typeFilter = $('shipFilterType').value;
    let ships = getShips();
    if (levelFilter !== 'all') ships = ships.filter(s => s.level === parseInt(levelFilter));
    if (typeFilter !== 'all') ships = ships.filter(s => s.type === typeFilter);
    ships.sort((a,b) => b.level - a.level);
    if (!ships.length) {
        $('shipsGrid').innerHTML = '<div class="empty">Кораблей не найдено</div>';
        return;
    }
    const typeLabels = { fast: '⚡ Быстроходный', combat: '⚔️ Боевой', transport: '📦 Транспорт', heavy: '🛡 Тяжёлый', imperial: '👑 Имперский' };
    $('shipsGrid').innerHTML = ships.map(s => `
        <div class="ship-card">
            <div class="ship-name">${escapeHtml(s.name)}</div>
            <div class="ship-stats">
                <span>Ур. ${ROMAN[s.level] || s.level}</span>
                <span>${typeLabels[s.type] || s.type}</span>
            </div>
            <div class="ship-stats">
                <span>💪 ${s.durability || '—'}</span>
                <span>🔫 ${s.guns || '—'}</span>
            </div>
        </div>
    `).join('');
}
on('shipFilterLevel', 'change', renderShips);
on('shipFilterType', 'change', renderShips);

/* ============ GUILD BUILDER ============ */
function fillGuildBuildSelect() {
    const ships = getShips();
    $('guildBuildShip').innerHTML = '<option value="">— Выберите корабль —</option>' +
        ships.map(s => `<option value="${escapeHtml(s.name)}">${escapeHtml(s.name)} (ур. ${ROMAN[s.level] || s.level})</option>`).join('');
}

on('guildBuildAdd', 'click', () => {
    const name = prompt('Название компонента:', '');
    if (!name) return;
    const qty = parseInt(prompt('Количество:', '1')) || 1;
    guildBuildRows.push({ id: Date.now(), name, qty });
    renderGuildBuilder();
});

on('guildBuildClear', 'click', () => { guildBuildRows = []; renderGuildBuilder(); });

function renderGuildBuilder() {
    const tbody = $('guildBuildTbody');
    if (!guildBuildRows.length) {
        tbody.innerHTML = '<tr><td colspan="4" class="empty">Нет компонентов</td></tr>';
    } else {
        const resources = getResourcePrices();
        tbody.innerHTML = guildBuildRows.map(r => {
            const res = resources.find(x => x.name.toLowerCase() === r.name.toLowerCase());
            const price = res ? Number(res.price)||0 : 0;
            return `<tr>
                <td>${escapeHtml(r.name)}</td>
                <td><input type="number" value="${r.qty}" min="1" style="width:70px;" onchange="updateGuildBuildQty(${r.id}, this.value)"></td>
                <td>${price} 🪙</td>
                <td class="gold-text">${price * r.qty} 🪙</td>
                <td><button class="btn-sm big-btn danger" onclick="removeGuildBuildRow(${r.id})">🗑</button></td>
            </tr>`;
        }).join('');
    }
    const total = guildBuildRows.reduce((s, r) => {
        const res = getResourcePrices().find(x => x.name.toLowerCase() === r.name.toLowerCase());
        return s + ((res ? Number(res.price)||0 : 0) * r.qty);
    }, 0);
    $('guildBuildItems').textContent = guildBuildRows.length;
    $('guildBuildTotal').textContent = total.toLocaleString('ru-RU');
}
window.updateGuildBuildQty = function(id, val) {
    const row = guildBuildRows.find(r => r.id === id);
    if (row) { row.qty = Math.max(1, parseInt(val)||1); renderGuildBuilder(); }
};
window.removeGuildBuildRow = function(id) {
    guildBuildRows = guildBuildRows.filter(r => r.id !== id);
    renderGuildBuilder();
};

/* ============ CONTACTS ============ */
function renderContacts() {
    const clans = getClans('wosb');
    $('contactsList').innerHTML = clans.map(c => `
        <div class="partner-card" style="margin-bottom: 12px;">
            <div class="partner-logo">${c.image ? `<img src="${escapeHtml(c.image)}" style="width:100%;height:100%;border-radius:10px;">` : CLAN_FLAGS[c.flag] || '🏰'}</div>
            <div>
                <div class="partner-name">${escapeHtml(c.name)}</div>
                <div class="partner-desc">👑 ${escapeHtml(c.leader_nick || '—')}</div>
                ${c.discord ? `<div class="partner-desc">💬 ${escapeHtml(c.discord)}</div>` : ''}
                ${c.phone ? `<div class="partner-desc">📞 ${escapeHtml(c.phone)}</div>` : ''}
            </div>
        </div>
    `).join('');
}

/* ============ MEMBERS ============ */
function loadMembers() {
    const clan = getClan(clanId);
    if (clan) {
        $('membersText').value = clan.members || '';
        $('adminsText').value = clan.admins || '';
    }
}
on('saveMembers', 'click', () => {
    saveClan(clanId, { members: $('membersText').value });
    alert('Участники сохранены');
});
on('saveAdmins', 'click', () => {
    saveClan(clanId, { admins: $('adminsText').value });
    alert('Адмиралы сохранены');
});

/* ============ TACTICS ============ */
function renderTactics() {
    const tactics = getTactics();
    if (!tactics.length) {
        $('tacticsList').innerHTML = '<div class="empty">Разделов тактики пока нет</div>';
        return;
    }
    tactics.sort((a,b) => (a.sort_order||0) - (b.sort_order||0));
    $('tacticsList').innerHTML = tactics.map(t => `
        <div class="build-card" style="margin-bottom: 12px;">
            <div class="build-title">${t.icon || '📖'} ${escapeHtml(t.title)}</div>
            <div class="build-details">${t.content || ''}</div>
        </div>
    `).join('');
}

/* ============ CHAT ============ */
function renderChat() {
    const messages = getChatMessages('guild');
    const container = $('chatMessages');
    if (!messages.length) {
        container.innerHTML = '<div class="empty">Сообщений пока нет</div>';
    } else {
        container.innerHTML = messages.map(m => `
            <div class="chat-msg">
                <div class="chat-msg-nick">${escapeHtml(m.nickname)}</div>
                <div class="chat-msg-text">${escapeHtml(m.text)}</div>
            </div>
        `).join('');
        container.scrollTop = container.scrollHeight;
    }
    // Poll for new messages
    clearInterval(chatRefreshTimer);
    chatRefreshTimer = setInterval(renderChat, 5000);
}

on('chatSend', 'click', () => {
    const text = $('chatInput').value.trim();
    if (!text) return;
    sendChatMessage('guild', text);
    $('chatInput').value = '';
    renderChat();
});
on('chatInput', 'keydown', e => { if (e.key === 'Enter') $('chatSend').click(); });

/* ============ APPLICATIONS ============ */
function renderApplications() {
    const apps = getApplications(clanId);
    if (!apps.length) {
        $('applicationsList').innerHTML = '<div class="empty">Заявок пока нет</div>';
        return;
    }
    $('applicationsList').innerHTML = apps.map(app => `
        <div class="application-card ${app.status || 'new'}">
            <div class="application-head">
                <div class="application-nick">👤 ${escapeHtml(app.nickname)}</div>
                <div style="font-size:11px;color:var(--muted);">${new Date(app.created_at).toLocaleString('ru-RU')}</div>
            </div>
            <div class="application-grid">
                <div><b>Возраст</b>${escapeHtml(app.age || '—')}</div>
                <div><b>Опыт</b>${escapeHtml(app.experience || '—')}</div>
                <div><b>Контакт</b>${escapeHtml(app.contact || '—')}</div>
            </div>
            ${app.why ? `<div style="font-size:13px;margin:8px 0;">${escapeHtml(app.why)}</div>` : ''}
            <div class="flex gap-8 mt-10">
                ${app.status !== 'approved' ? `<button class="big-btn success btn-sm" onclick="approveApp('${app.id}')">✅ Принять</button>` : ''}
                ${app.status !== 'rejected' ? `<button class="big-btn danger btn-sm" onclick="rejectApp('${app.id}')">❌ Отклонить</button>` : ''}
                <button class="big-btn secondary btn-sm" onclick="deleteApp('${app.id}')">🗑 Удалить</button>
            </div>
        </div>
    `).join('');
}
window.approveApp = function(id) { updateApplication(id, { status: 'approved' }); renderApplications(); };
window.rejectApp = function(id) { updateApplication(id, { status: 'rejected' }); renderApplications(); };
window.deleteApp = function(id) { tableDelete('applications', id); renderApplications(); };

/* ============ ONLINE ============ */
function renderOnline() {
    const online = getOnlineUsers();
    if (!online.length) {
        $('onlineList').innerHTML = '<div class="empty">Сейчас никого нет</div>';
        return;
    }
    const me = getViewerNick().toLowerCase();
    $('onlineList').innerHTML = online.map(u => {
        const isMe = u.nickname.toLowerCase() === me;
        return `<div class="online-item ${isMe ? 'me' : ''}">
            <span>${isMe ? '⭐' : '🟢'}</span>
            <span class="online-nick">${escapeHtml(u.nickname)}${isMe ? ' — вы' : ''}</span>
        </div>`;
    }).join('');
}
on('onlineRefresh', 'click', renderOnline);

/* ============ NOTIFICATIONS ============ */
on('notifBell', 'click', () => { $('notifPanel').hidden = !$('notifPanel').hidden; });

/* ============ HEARTBEAT ============ */
function startHeartbeat() {
    heartbeat();
    heartbeatTimer = setInterval(heartbeat, 30000);
}

/* ============ INIT ============ */
function init() {
    checkSession();
    loadGuildHeader();
    renderList();
    fillGuildBuildSelect();
    startHeartbeat();
    console.log('🏰 Guild page loaded for clan:', clanId);
}

init();
