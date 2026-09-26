/* ============================================================
   WOSB Storage Layer — localStorage-based data persistence
   Replaces Supabase. All data stored in browser localStorage.
============================================================ */

const DB_KEY = 'wosb_database_v1';
const SESSION_KEY = 'wosb_session';
const THEME_KEY = 'app_theme';
const VIEWER_NICK_KEY = 'viewer_nickname';
const MY_CLAN_KEY = 'guild_my_clan';
const LAST_CLAN_KEY = 'guild_last_clan';
const CLAN_PASS_KEY = 'clan_pass';
const CLAN_ADMIN_PASS_KEY = 'clan_admin_pass';
const GAME_STORAGE_KEY = 'selected_game_id';

const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];

const CLAN_FLAGS = {
    neutral: '🏴',
    pirate:  '🏴‍☠️',
    spain:   '🇪🇸',
    england: '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
    russia:  '🇷🇺'
};

const TRADE_CATEGORIES = [
    { id: 'ship', name: 'Корабли', icon: '🚢' },
    { id: 'resource', name: 'Ресурсы', icon: '📦' },
    { id: 'cannon', name: 'Пушки', icon: '🔫' },
    { id: 'ammo', name: 'Боеприпасы', icon: '💥' },
    { id: 'other', name: 'Прочее', icon: '🔧' }
];

/* ============ DEFAULT DATA ============ */
function getDefaultDB() {
    return {
        games: {
            wosb: { id: 'wosb', name: 'World of Sea Battle', logo: '⚓', enabled: true, bg: '' }
        },
        clans: {
            aov: {
                id: 'aov', name: 'АОВ', game_id: 'wosb', alliance_id: null,
                leader_nick: 'Адмирал', description: 'Гильдия АОВ',
                rules: 'Правила гильдии АОВ', password: 'aov', admin_password: 'aov_admin',
                discord: '', phone: '', image: '', flag: 'russia',
                admins: '', members: '', news: 'Добро пожаловать в АОВ!',
                created_at: new Date().toISOString()
            },
            k: {
                id: 'k', name: '-К-', game_id: 'wosb', alliance_id: null,
                leader_nick: 'Командор', description: 'Гильдия К',
                rules: 'Правила гильдии К', password: 'k', admin_password: 'k_admin',
                discord: '', phone: '', image: '', flag: 'neutral',
                admins: '', members: '', news: 'Добро пожаловать в К!',
                created_at: new Date().toISOString()
            }
        },
        alliances: {},
        site_admins: [
            { email: 'admin@wosb.ru', password: 'admin', role: 'owner', nickname: 'Владелец', clan_id: null }
        ],
        site_settings: {
            id: 'main',
            vk_community: 'worldofseabattle',
            discord_webhook: ''
        },
        enemies: [],
        friends: [],
        neutral: [],
        personal: [],
        builds: [],
        events: [],
        clan_events: [],
        treasury: [],
        applications: [],
        clan_requests: [],
        trades: [],
        resource_prices: [
            { id: 'wood', name: 'Дерево', code: 'wood', group: 'basic', price: 10, emoji: '🪵', image_url: '' },
            { id: 'iron', name: 'Железо', code: 'iron', group: 'basic', price: 25, emoji: '⛓️', image_url: '' },
            { id: 'cloth', name: 'Ткань', code: 'cloth', group: 'basic', price: 15, emoji: '🧵', image_url: '' },
            { id: 'rope', name: 'Канат', code: 'rope', group: 'basic', price: 12, emoji: '🪢', image_url: '' },
            { id: 'tar', name: 'Смола', code: 'tar', group: 'basic', price: 18, emoji: '🛢️', image_url: '' },
            { id: 'gold', name: 'Золото', code: 'gold', group: 'precious', price: 100, emoji: '🪙', image_url: '' }
        ],
        ship_recipes: [],
        discounts: [],
        ships: [
            { id: 1, name: 'Шлюп', level: 1, type: 'fast', durability: 500, guns: 4, image: '' },
            { id: 2, name: 'Бриг', level: 2, type: 'combat', durability: 800, guns: 8, image: '' },
            { id: 3, name: 'Фрегат', level: 3, type: 'combat', durability: 1200, guns: 12, image: '' },
            { id: 4, name: 'Галеон', level: 4, type: 'transport', durability: 1500, guns: 10, image: '' },
            { id: 5, name: 'Линейный корабль', level: 5, type: 'heavy', durability: 2500, guns: 20, image: '' },
            { id: 6, name: 'Броненосец', level: 6, type: 'heavy', durability: 3500, guns: 24, image: '' },
            { id: 7, name: 'Флагман', level: 7, type: 'imperial', durability: 5000, guns: 30, image: '' }
        ],
        map_settings: {
            id: 'main', title: 'Карта мира', detailed_url: '', clean_url: '',
            default_view: 'detailed', hint: 'Колёсико — приблизить, ЛКМ — перетащить, Esc — выйти'
        },
        factions: [
            { id: 'spain', name: 'Испания', type: 'empire', color: '#ffd479', description: 'Испанская империя' },
            { id: 'england', name: 'Англия', type: 'empire', color: '#7db9ff', description: 'Британская империя' },
            { id: 'russia', name: 'Россия', type: 'empire', color: '#ff7a7a', description: 'Российская империя' },
            { id: 'pirates', name: 'Пираты', type: 'pirate', color: '#6ee7a7', description: 'Свободные пираты' }
        ],
        ports: [],
        ship_ranks: [],
        faq: [
            { id: 1, question: 'Как вступить в гильдию?', answer: 'Заполни форму заявки на главной странице.', sort_order: 0 },
            { id: 2, question: 'Что такое союз?', answer: 'Союз — это объединение нескольких гильдий для совместной игры.', sort_order: 1 }
        ],
        partners: [],
        tactics: [],
        chat_messages: [],
        notifications: [],
        admin_log: [],
        view_history: [],
        online_users: []
    };
}

/* ============ CORE DB FUNCTIONS ============ */
function loadDB() {
    try {
        const raw = localStorage.getItem(DB_KEY);
        if (!raw) {
            const def = getDefaultDB();
            saveDB(def);
            return def;
        }
        return JSON.parse(raw);
    } catch (e) {
        console.error('DB load error:', e);
        const def = getDefaultDB();
        saveDB(def);
        return def;
    }
}

function saveDB(db) {
    try {
        localStorage.setItem(DB_KEY, JSON.stringify(db));
    } catch (e) {
        console.error('DB save error:', e);
        alert('Не удалось сохранить данные. Возможно, превышен лимит localStorage (5 МБ).');
    }
}

let _db = null;
function db() {
    if (!_db) _db = loadDB();
    return _db;
}
function persist() { saveDB(db()); }

/* ============ TABLE OPERATIONS ============ */
function tableGet(name) {
    const d = db();
    if (Array.isArray(d[name])) return [...d[name]];
    if (d[name] && typeof d[name] === 'object') return Object.values(d[name]);
    return [];
}
function tableGetById(name, id) {
    const d = db();
    if (Array.isArray(d[name])) return d[name].find(r => r.id === id);
    return d[name] ? d[name][id] : null;
}
function tableInsert(name, row) {
    const d = db();
    if (!row.id) row.id = Date.now() + '_' + Math.random().toString(36).substr(2, 6);
    if (!row.created_at) row.created_at = new Date().toISOString();
    if (Array.isArray(d[name])) {
        d[name].push(row);
    } else {
        d[name] = d[name] || {};
        d[name][row.id] = row;
    }
    persist();
    return row;
}
function tableUpdate(name, id, updates) {
    const d = db();
    if (Array.isArray(d[name])) {
        const i = d[name].findIndex(r => r.id === id);
        if (i >= 0) { d[name][i] = { ...d[name][i], ...updates }; persist(); return d[name][i]; }
    } else {
        if (d[name] && d[name][id]) { d[name][id] = { ...d[name][id], ...updates }; persist(); return d[name][id]; }
    }
    return null;
}
function tableDelete(name, id) {
    const d = db();
    if (Array.isArray(d[name])) {
        d[name] = d[name].filter(r => r.id !== id);
    } else {
        if (d[name]) delete d[name][id];
    }
    persist();
}

/* ============ CLAN OPERATIONS ============ */
function getClans(gameId) {
    return tableGet('clans').filter(c => !gameId || c.game_id === gameId);
}
function getClan(id) {
    return tableGetById('clans', id);
}
function saveClan(id, data) {
    return tableUpdate('clans', id, data);
}
function createClan(data) {
    return tableInsert('clans', data);
}
function deleteClan(id) {
    tableDelete('clans', id);
    // Also delete related data
    ['enemies','friends','neutral','personal','builds','events','treasury','applications'].forEach(t => {
        const d = db();
        if (Array.isArray(d[t])) d[t] = d[t].filter(r => r.clan !== id && r.clan_id !== id);
    });
    persist();
}

/* ============ LIST OPERATIONS (enemies, friends, etc) ============ */
function getList(clanId, listName) {
    return tableGet(listName).filter(r => r.clan === clanId);
}
function addToList(clanId, listName, item) {
    return tableInsert(listName, { ...item, clan: clanId });
}
function removeFromList(listName, itemId) {
    tableDelete(listName, itemId);
}
function moveItem(listName, itemId, targetList) {
    const d = db();
    const item = d[listName].find(r => r.id === itemId);
    if (!item) return;
    d[listName] = d[listName].filter(r => r.id !== itemId);
    d[targetList] = d[targetList] || [];
    item.clan = item.clan;
    d[targetList].push(item);
    persist();
}

/* ============ BUILDS ============ */
function getBuilds(clanId, type) {
    return tableGet('builds').filter(b => b.clan === clanId && (!type || b.type === type));
}
function addBuild(build) { return tableInsert('builds', build); }
function updateBuild(id, data) { return tableUpdate('builds', id, data); }
function deleteBuild(id) { tableDelete('builds', id); }

/* ============ EVENTS ============ */
function getEvents(clanId) {
    return tableGet('events').filter(e => e.is_shared || e.clan === clanId);
}
function addEvent(ev) { return tableInsert('events', ev); }
function deleteEvent(id) { tableDelete('events', id); }

/* ============ TREASURY ============ */
function getTreasury(clanId) {
    return tableGet('treasury').filter(t => t.clan === clanId);
}
function addTreasury(item) { return tableInsert('treasury', item); }

/* ============ APPLICATIONS ============ */
function getApplications(clanId) {
    return tableGet('applications').filter(a => !clanId || a.target_clan === clanId);
}
function addApplication(app) { return tableInsert('applications', app); }
function updateApplication(id, data) { return tableUpdate('applications', id, data); }

/* ============ TRADES ============ */
function getTrades(filters = {}) {
    let trades = tableGet('trades');
    if (filters.clan) trades = trades.filter(t => t.clan === filters.clan);
    if (filters.type && filters.type !== 'all') trades = trades.filter(t => t.type === filters.type);
    if (filters.status && filters.status !== 'all') trades = trades.filter(t => t.status === filters.status);
    if (filters.category && filters.category !== 'all') trades = trades.filter(t => t.category === filters.category);
    if (filters.onlyShips) trades = trades.filter(t => t.category === 'ship');
    if (filters.onlyMine) {
        const nick = getViewerNick();
        trades = trades.filter(t => t.author === nick);
    }
    return trades;
}
function addTrade(trade) { return tableInsert('trades', trade); }
function updateTrade(id, data) { return tableUpdate('trades', id, data); }
function deleteTrade(id) { tableDelete('trades', id); }

/* ============ SHIPS ============ */
function getShips() { return tableGet('ships'); }
function getShip(id) { return tableGetById('ships', id); }
function saveShip(ship) {
    if (ship.id) return tableUpdate('ships', ship.id, ship);
    return tableInsert('ships', ship);
}

/* ============ RESOURCES ============ */
function getResourcePrices() { return tableGet('resource_prices'); }
function saveResourcePrice(res) {
    if (res.id && db().resource_prices.find(r => r.id === res.id)) {
        return tableUpdate('resource_prices', res.id, res);
    }
    return tableInsert('resource_prices', res);
}
function deleteResourcePrice(id) { tableDelete('resource_prices', id); }

/* ============ RECIPES ============ */
function getRecipes(shipId) {
    return tableGet('ship_recipes').filter(r => r.ship_id === shipId);
}
function saveRecipe(recipe) { return tableInsert('ship_recipes', recipe); }
function deleteRecipe(id) { tableDelete('ship_recipes', id); }

/* ============ DISCOUNTS ============ */
function getDiscounts() { return tableGet('discounts'); }
function addDiscount(d) { return tableInsert('discounts', d); }
function deleteDiscount(id) { tableDelete('discounts', id); }

/* ============ MAP ============ */
function getMapSettings() { return db().map_settings || getDefaultDB().map_settings; }
function saveMapSettings(data) {
    db().map_settings = { ...db().map_settings, ...data };
    persist();
}

/* ============ FACTIONS & PORTS ============ */
function getFactions() { return tableGet('factions'); }
function getPorts() { return tableGet('ports'); }
function addPort(port) { return tableInsert('ports', port); }
function deletePort(id) { tableDelete('ports', id); }

/* ============ FAQ ============ */
function getFaq() { return tableGet('faq'); }
function addFaq(item) { return tableInsert('faq', item); }
function deleteFaq(id) { tableDelete('faq', id); }

/* ============ PARTNERS ============ */
function getPartners() { return tableGet('partners'); }
function addPartner(p) { return tableInsert('partners', p); }
function deletePartner(id) { tableDelete('partners', id); }

/* ============ TACTICS ============ */
function getTactics() { return tableGet('tactics'); }
function addTactic(t) { return tableInsert('tactics', t); }
function deleteTactic(id) { tableDelete('tactics', id); }

/* ============ ALLIANCES ============ */
function getAlliances() { return Object.values(db().alliances || {}); }
function createAlliance(data) {
    const d = db();
    d.alliances = d.alliances || {};
    d.alliances[data.id] = data;
    persist();
    return data;
}
function deleteAlliance(id) {
    const d = db();
    if (d.alliances) delete d.alliances[id];
    persist();
}

/* ============ GAMES ============ */
function getGames() { return Object.values(db().games || {}).filter(g => g.enabled); }
function getAllGames() { return Object.values(db().games || {}); }
function addGame(data) {
    const d = db();
    d.games = d.games || {};
    d.games[data.id] = data;
    persist();
    return data;
}

/* ============ SITE ADMINS ============ */
function getSiteAdmins() { return tableGet('site_admins'); }
function addSiteAdmin(admin) { return tableInsert('site_admins', admin); }
function deleteSiteAdmin(email) {
    const d = db();
    d.site_admins = d.site_admins.filter(a => a.email !== email);
    persist();
}
function updateSiteAdmin(email, data) {
    const d = db();
    const i = d.site_admins.findIndex(a => a.email === email);
    if (i >= 0) { d.site_admins[i] = { ...d.site_admins[i], ...data }; persist(); return d.site_admins[i]; }
    return null;
}

/* ============ SETTINGS ============ */
function getSettings() { return db().site_settings || getDefaultDB().site_settings; }
function saveSettings(data) {
    db().site_settings = { ...db().site_settings, ...data };
    persist();
}

/* ============ SESSION ============ */
function getSession() {
    try { return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null'); } catch(e) { return null; }
}
function setSession(s) { localStorage.setItem(SESSION_KEY, JSON.stringify(s)); }
function clearSession() { localStorage.removeItem(SESSION_KEY); }

function loginAdmin(email, password) {
    const admins = getSiteAdmins();
    const admin = admins.find(a => a.email === email && a.password === password);
    if (admin) {
        setSession({ email: admin.email, role: admin.role, nickname: admin.nickname, clan_id: admin.clan_id });
        return admin;
    }
    return null;
}

function loginClan(clanId, password) {
    const clan = getClan(clanId);
    if (!clan) return null;
    if (clan.password === password) return { role: 'member', clan: clanId };
    if (clan.admin_password === password) {
        localStorage.setItem(MY_CLAN_KEY, clanId);
        return { role: 'admin', clan: clanId };
    }
    return null;
}

/* ============ VIEWER ============ */
function getViewerNick() {
    return localStorage.getItem(VIEWER_NICK_KEY) || ('guest_' + Math.random().toString(36).substr(2, 6));
}
function setViewerNick(nick) {
    localStorage.setItem(VIEWER_NICK_KEY, nick);
}

/* ============ CHAT ============ */
function getChatMessages(channel) {
    return tableGet('chat_messages').filter(m => {
        if (channel === 'guild') return m.clan_id === (window.currentClan || '') && !m.recipient;
        if (channel === 'general') return !m.clan_id && !m.recipient;
        if (channel === 'leaders') return m.clan_id === '__leaders__' && !m.recipient;
        return false;
    });
}
function sendChatMessage(channel, text) {
    const msg = {
        channel,
        clan_id: channel === 'guild' ? (window.currentClan || '') : (channel === 'leaders' ? '__leaders__' : null),
        nickname: getViewerNick(),
        text,
        created_at: new Date().toISOString()
    };
    return tableInsert('chat_messages', msg);
}

/* ============ NOTIFICATIONS ============ */
function getNotifications(nick) {
    return tableGet('notifications').filter(n => n.user_nickname === nick);
}
function addNotification(nick, type, title, body) {
    return tableInsert('notifications', { user_nickname: nick, type, title, body, read: false });
}

/* ============ ONLINE ============ */
function heartbeat() {
    const d = db();
    const nick = getViewerNick();
    const now = Date.now();
    if (!d.online_users) d.online_users = [];
    const existing = d.online_users.find(u => u.nickname === nick);
    if (existing) {
        existing.last_seen = now;
        existing.page = window.location.pathname;
    } else {
        d.online_users.push({ nickname: nick, last_seen: now, page: window.location.pathname });
    }
    // Remove stale
    d.online_users = d.online_users.filter(u => now - u.last_seen < 90000);
    persist();
}
function getOnlineUsers() {
    const now = Date.now();
    return tableGet('online_users').filter(u => now - u.last_seen < 90000);
}

/* ============ ADMIN LOG ============ */
function logAdminAction(action, target, details) {
    tableInsert('admin_log', {
        admin_nickname: getViewerNick(),
        action, target, details
    });
}

/* ============ EXPORT / IMPORT ============ */
function exportData() {
    const raw = localStorage.getItem(DB_KEY);
    return raw || '{}';
}
function importData(json) {
    try {
        const data = JSON.parse(json);
        localStorage.setItem(DB_KEY, JSON.stringify(data));
        _db = null;
        return true;
    } catch(e) {
        console.error('Import error:', e);
        return false;
    }
}
function resetData() {
    localStorage.removeItem(DB_KEY);
    _db = null;
    loadDB();
}

/* ============ STATS ============ */
function getStats() {
    const d = db();
    return {
        enemies: (d.enemies || []).length,
        friends: (d.friends || []).length,
        neutral: (d.neutral || []).length,
        personal: (d.personal || []).length,
        pvp: (d.builds || []).filter(b => b.type === 'pvp').length,
        pb: (d.builds || []).filter(b => b.type === 'pb').length,
        clans: Object.keys(d.clans || {}).length,
        trades: (d.trades || []).filter(t => t.status === 'active').length
    };
}

console.log('📦 storage.js loaded — localStorage data layer ready');
