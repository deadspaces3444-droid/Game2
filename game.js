/* ============================================================
   game.js — общий скелет (v3.0.0)
   Минимальный JS: темы, навигация, heartbeat, формы
============================================================ */
(function() {
    'use strict';

    const GAME_ID = window.GAME_ID;
    const $ = id => document.getElementById(id);

    // ─── Тема ───
    function applyTheme(t) {
        document.documentElement.setAttribute('data-theme', t);
        localStorage.setItem('app_theme', t);
    }
    applyTheme(localStorage.getItem('app_theme') || 'dark');
    const themeToggle = $('themeToggle');
    if (themeToggle) themeToggle.addEventListener('click', () => {
        const cur = document.documentElement.getAttribute('data-theme') || 'dark';
        applyTheme(cur === 'dark' ? 'light' : 'dark');
    });

    // ─── Экраны ───
    function showScreen(name) {
        ['home', 'clan', 'admin'].forEach(s => {
            const el = $('screen-' + s);
            if (el) el.hidden = s !== name;
        });
        window.scrollTo(0, 0);
    }

    // ─── API хелпер ───
    async function api(path, method = 'GET', body = null) {
        const opts = { method, headers: { 'Content-Type': 'application/json' } };
        if (body) opts.body = JSON.stringify(body);
        try {
            const r = await fetch(path, opts);
            const data = await r.json();
            if (!r.ok) throw new Error(data.error || 'API error');
            return data;
        } catch (e) {
            console.error('API:', path, e);
            return null;
        }
    }

    // ─── Утилиты ───
    function escapeHtml(s) {
        return String(s || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
    }

    // ─── Состояние ───
    let currentClan = null;
    let viewerNick = localStorage.getItem('viewer_nickname') || '';
    let heartbeatTimer = null;

    // ─── Загрузка гильдий ───
    async function loadClans() {
        const clans = await api(`/api/${GAME_ID}/clans`);
        const grid = $('clanGrid');
        if (!grid) return;
        if (!clans || !clans.length) {
            grid.innerHTML = '<div class="empty">В этой игре пока нет гильдий</div>';
            return;
        }
        grid.innerHTML = clans.map(c => `
            <button class="clan-card" data-clan="${escapeHtml(c.id)}">
                ${c.image ? `<img src="${escapeHtml(c.image)}" alt="${escapeHtml(c.name)}" onerror="this.style.display='none'">` : ''}
                <span class="clan-name">${escapeHtml(c.name)}</span>
                <span class="clan-desc">${escapeHtml(c.description || '')}</span>
            </button>
        `).join('');
        grid.querySelectorAll('.clan-card').forEach(card => {
            card.addEventListener('click', () => openClan(card.dataset.clan));
        });
    }

    // ─── Открытие гильдии ───
    async function openClan(clanId) {
        currentClan = clanId;
        const clan = await api(`/api/${GAME_ID}/clan/${clanId}`);
        if (!clan) return;
        const titleEl = $('clanTitle');
        if (titleEl) titleEl.textContent = clan.name || clanId;
        showScreen('clan');
        loadClanData(clanId);
    }

    async function loadClanData(clanId) {
        // Списки
        const lists = await api(`/api/${GAME_ID}/clan/${clanId}/lists`);
        if (lists) {
            ['enemies', 'friends', 'neutral', 'personal'].forEach(tab => {
                const el = $(`list-${tab}`);
                if (el && lists[tab]) {
                    el.innerHTML = lists[tab].length
                        ? lists[tab].map(i => `<div class="list-item">${escapeHtml(i.player_guild || '')} ${escapeHtml(i.nickname || '')}</div>`).join('')
                        : '<p class="empty">Список пуст</p>';
                }
            });
        }
        // Билды
        const builds = await api(`/api/${GAME_ID}/clan/${clanId}/builds`);
        if (builds) {
            const pvpEl = $('buildsPvp');
            const pbEl = $('buildsPb');
            if (pvpEl) pvpEl.innerHTML = (builds.pvp || []).length
                ? builds.pvp.map(b => `<div class="build-item">${escapeHtml(b.ship_name || 'Билд')} — ${escapeHtml(b.upgrades || '')}</div>`).join('')
                : '<p class="empty">Билдов нет</p>';
            if (pbEl) pbEl.innerHTML = (builds.pb || []).length
                ? builds.pb.map(b => `<div class="build-item">${escapeHtml(b.ship_name || 'Билд')} — ${escapeHtml(b.upgrades || '')}</div>`).join('')
                : '<p class="empty">Билдов нет</p>';
        }
        // События
        const events = await api(`/api/${GAME_ID}/clan/${clanId}/events`);
        const eventsEl = $('eventsList');
        if (eventsEl) eventsEl.innerHTML = (events || []).length
            ? events.map(e => `<div class="event-item">${escapeHtml(e.title || '')} — ${escapeHtml(e.description || '')}</div>`).join('')
            : '<p class="empty">Событий нет</p>';
        // Казна
        const treasury = await api(`/api/${GAME_ID}/clan/${clanId}/treasury`);
        const tEl = $('treasuryList');
        if (tEl) tEl.innerHTML = (treasury || []).length
            ? treasury.map(t => `<div class="treasury-item">${escapeHtml(t.description || '')}: ${t.amount || 0} 🪙</div>`).join('')
            : '<p class="empty">Записей нет</p>';
        sendHeartbeat();
    }

    // ─── Heartbeat ───
    function sendHeartbeat() {
        if (!viewerNick) return;
        api(`/api/${GAME_ID}/heartbeat`, 'POST', { nickname: viewerNick, clan_id: currentClan });
    }
    function startHeartbeat() {
        if (heartbeatTimer) clearInterval(heartbeatTimer);
        sendHeartbeat();
        heartbeatTimer = setInterval(sendHeartbeat, 30000);
    }

    // ─── Кнопки навигации ───
    const backBtn = $('clanBackBtn');
    if (backBtn) backBtn.addEventListener('click', () => {
        currentClan = null;
        showScreen('home');
        loadClans();
    });

    const leaveBtn = $('clanLeaveBtn');
    if (leaveBtn) leaveBtn.addEventListener('click', () => {
        localStorage.removeItem('guild_my_clan');
        localStorage.removeItem('clan_pass');
        currentClan = null;
        showScreen('home');
        loadClans();
    });

    // ─── Сайдбар гильдии ───
    document.querySelectorAll('.side-item').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.side-item').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            document.querySelectorAll('.clan-section').forEach(s => s.classList.remove('active'));
            const section = $('section-' + btn.dataset.section);
            if (section) section.classList.add('active');
        });
    });

    // ─── Вкладки списков ───
    document.querySelectorAll('.tab').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.tab').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            const tc = $('tab-' + btn.dataset.tab);
            if (tc) tc.classList.add('active');
        });
    });

    // ─── Карта: переключение ───
    document.querySelectorAll('.map-toggle-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.map-toggle-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const mapImg = $('mapImg');
            if (mapImg) {
                mapImg.src = btn.dataset.view === 'clean'
                    ? '/static/images/map/clean.jpg'
                    : '/static/images/map/detailed.jpg';
            }
        });
    });

    // ─── Админ-навигация ───
    document.querySelectorAll('.admin-nav-item').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.admin-nav-item').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            document.querySelectorAll('.admin-panel').forEach(p => {
                p.classList.toggle('active', p.dataset.panel === btn.dataset.panel);
                p.hidden = p.dataset.panel !== btn.dataset.panel;
            });
        });
    });

    const adminBackHome = $('adminBackHome');
    if (adminBackHome) adminBackHome.addEventListener('click', () => {
        showScreen('home');
        loadClans();
    });

    // ─── Вход админа ───
    const adminBtn = $('adminBtn');
    const loginBtn = $('loginBtn');
    const logoutBtn = $('logoutBtn');

    async function checkAuth() {
        const me = await api('/api/auth/me');
        if (me && me.authenticated) {
            if (adminBtn) adminBtn.hidden = false;
            if (loginBtn) loginBtn.hidden = true;
            if (logoutBtn) logoutBtn.hidden = false;
            viewerNick = me.nickname || viewerNick;
        }
    }

    if (loginBtn) loginBtn.addEventListener('click', () => {
        const modal = $('loginModal');
        if (modal) modal.hidden = false;
    });
    if (adminBtn) adminBtn.addEventListener('click', () => showScreen('admin'));
    if (logoutBtn) logoutBtn.addEventListener('click', async () => {
        await api('/api/auth/logout', 'POST');
        if (adminBtn) adminBtn.hidden = true;
        if (loginBtn) loginBtn.hidden = false;
        if (logoutBtn) logoutBtn.hidden = true;
        showScreen('home');
    });

    const loginSubmit = $('loginSubmitBtn');
    if (loginSubmit) loginSubmit.addEventListener('click', async () => {
        const email = $('loginEmail').value.trim().toLowerCase();
        const password = $('loginPassword').value;
        const errEl = $('loginError');
        if (errEl) { errEl.textContent = ''; }
        const result = await api('/api/auth/login', 'POST', { email, password });
        if (result && result.ok) {
            $('loginModal').hidden = true;
            if (adminBtn) adminBtn.hidden = false;
            if (loginBtn) loginBtn.hidden = true;
            if (logoutBtn) logoutBtn.hidden = false;
            viewerNick = result.nickname || viewerNick;
            showScreen('admin');
        } else {
            if (errEl) errEl.textContent = (result && result.error) || 'Ошибка входа';
        }
    });
    const loginCancel = $('loginCancelBtn');
    if (loginCancel) loginCancel.addEventListener('click', () => { $('loginModal').hidden = true; });

    // ─── Чат ───
    const chatSendBtn = $('chatSendBtn');
    if (chatSendBtn) chatSendBtn.addEventListener('click', () => {
        const input = $('chatInput');
        const text = input.value.trim();
        if (!text || !currentClan) return;
        // TODO: отправка через API
        const msgs = $('chatMessages');
        if (msgs) {
            const div = document.createElement('div');
            div.innerHTML = `<b>${escapeHtml(viewerNick || 'Аноним')}</b>: ${escapeHtml(text)}`;
            msgs.appendChild(div);
            msgs.scrollTop = msgs.scrollHeight;
        }
        input.value = '';
    });

    // ─── Заявка в гильдию ───
    const applyBtn = $('applySubmitBtn');
    if (applyBtn) applyBtn.addEventListener('click', async () => {
        const nickname = $('applyNickname').value.trim();
        const reason = $('applyReason').value.trim();
        if (!nickname || !reason) {
            alert('Заполните обязательные поля');
            return;
        }
        const result = await api(`/api/${GAME_ID}/apply`, 'POST', {
            nickname,
            age: $('applyAge').value.trim(),
            experience: $('applyExperience').value.trim(),
            contact: $('applyContact').value.trim(),
            clan_id: $('applyClanSelect').value,
            reason
        });
        if (result && result.ok) {
            alert('Заявка отправлена!');
            ['applyNickname','applyAge','applyExperience','applyContact','applyReason'].forEach(id => { const el = $(id); if (el) el.value = ''; });
        } else {
            alert('Ошибка: ' + ((result && result.error) || 'неизвестная'));
        }
    });

    // ─── Онлайн ───
    const onlineRefresh = $('onlineRefreshBtn');
    if (onlineRefresh) onlineRefresh.addEventListener('click', async () => {
        const online = await api(`/api/${GAME_ID}/online`);
        const el = $('onlineList');
        if (el) el.innerHTML = (online || []).length
            ? online.map(o => `<div class="online-item">🟢 ${escapeHtml(o.nickname)}</div>`).join('')
            : '<p class="empty">Никого нет</p>';
    });

    // ─── Старт ───
    checkAuth();
    loadClans();
    startHeartbeat();

    // Сохраняем ник, если уже есть
    if (viewerNick) localStorage.setItem('viewer_nickname', viewerNick);

    console.log('🚀 game.js loaded for', GAME_ID);
})();
