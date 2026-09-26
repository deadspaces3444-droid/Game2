/* ============================================================
   wosb.js — специфичный код для World of Sea Battle (v3.0.0)
============================================================ */
(function() {
    'use strict';

    // Загрузка кораблей WOSB
    async function loadShips() {
        const ships = await (await fetch(`/api/${window.GAME_ID}/ships`)).json();
        const selects = [
            document.getElementById('costShipSelect'),
            document.getElementById('calcShipSelect'),
            document.getElementById('clanCalcShipSelect')
        ];
        selects.forEach(sel => {
            if (!sel) return;
            sel.innerHTML = '<option value="">Выберите корабль</option>' +
                (ships || []).map(s => `<option value="${s.id}">${s.name} (ур.${s.level || 1})</option>`).join('');
        });
    }

    // Загрузка ресурсов
    async function loadResources() {
        const resources = await (await fetch(`/api/${window.GAME_ID}/resources`)).json();
        const tbody = document.querySelector('#resTable tbody');
        if (!tbody) return;
        if (!resources || !resources.length) {
            tbody.innerHTML = '<tr><td colspan="3" class="empty">Нет данных</td></tr>';
            return;
        }
        tbody.innerHTML = resources.map(r => `
            <tr>
                <td>${r.emoji || ''} ${r.name || r.id}</td>
                <td>${r.price || 0} 🪙</td>
                <td>${r.updated_at ? new Date(r.updated_at).toLocaleDateString('ru-RU') : '—'}</td>
            </tr>
        `).join('');
    }

    // Загрузка рынка
    async function loadTrades() {
        const trades = await (await fetch(`/api/${window.GAME_ID}/trades`)).json();
        const board = document.getElementById('marketBoard');
        if (!board) return;
        if (!trades || !trades.length) {
            board.innerHTML = '<p class="empty">Нет активных заявок</p>';
            return;
        }
        board.innerHTML = trades.map(t => `
            <div class="market-item ${t.type === 'buy' ? 'buy' : 'sell'}">
                <span class="market-icon">${t.type === 'buy' ? '🛒' : '💰'}</span>
                <span><b>${escapeHtml(t.title || '')}</b></span>
                <span>${t.quantity || 0} шт × ${t.price || 0} 🪙</span>
                <span>${escapeHtml(t.port || '')}</span>
            </div>
        `).join('');
    }

    // Карта
    async function loadMap() {
        const map = await (await fetch(`/api/${window.GAME_ID}/map`)).json();
        if (map && map.detailed_url) {
            const img = document.getElementById('mapImg');
            if (img) img.src = map.detailed_url;
        }
    }

    // Калькулятор сборки
    let calcItems = [];
    function renderCalc() {
        const tbody = document.querySelector('#calcTable tbody');
        if (!tbody) return;
        if (!calcItems.length) {
            tbody.innerHTML = '<tr><td colspan="4" class="empty">Добавьте компоненты</td></tr>';
            return;
        }
        let total = 0;
        tbody.innerHTML = calcItems.map((item, i) => {
            const sum = (item.price || 0) * (item.qty || 1);
            total += sum;
            return `<tr>
                <td>${escapeHtml(item.name)}</td>
                <td>${item.qty}</td>
                <td>${item.price || 0} 🪙</td>
                <td>${sum} 🪙</td>
            </tr>`;
        }).join('');
        const totalEl = document.getElementById('calcTotal');
        if (totalEl) totalEl.textContent = total;
        const itemsEl = document.getElementById('calcItems');
        if (itemsEl) itemsEl.textContent = calcItems.length;
    }

    const calcAddBtn = document.getElementById('calcAddBtn');
    if (calcAddBtn) calcAddBtn.addEventListener('click', () => {
        const name = prompt('Название компонента:');
        if (!name) return;
        const qty = parseInt(prompt('Количество:', '1') || '1', 10);
        const price = parseInt(prompt('Цена за единицу:', '0') || '0', 10);
        calcItems.push({ name, qty, price });
        renderCalc();
    });
    const calcClearBtn = document.getElementById('calcClearBtn');
    if (calcClearBtn) calcClearBtn.addEventListener('click', () => {
        calcItems = [];
        renderCalc();
    });

    function escapeHtml(s) {
        return String(s || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
    }

    // Старт
    document.addEventListener('DOMContentLoaded', () => {
        loadShips();
        loadResources();
        loadTrades();
        loadMap();
        console.log('⚔️ wosb.js loaded');
    });
})();

// CSS для WOSB (инъекция через JS, чтобы не плодить файлы)
