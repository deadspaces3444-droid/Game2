/* ============================================================
   Landing page logic — game selection, theme
============================================================ */

// Theme
function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('app_theme', theme);
}
function toggleTheme() {
    const cur = document.documentElement.getAttribute('data-theme') || 'dark';
    applyTheme(cur === 'dark' ? 'light' : 'dark');
}
applyTheme(localStorage.getItem('app_theme') || 'dark');
document.getElementById('themeToggle').addEventListener('click', toggleTheme);

// Render game cards
function renderGameCards() {
    const container = document.getElementById('gameCards');
    const games = getGames();

    if (!games.length) {
        container.innerHTML = '<p style="color: var(--muted);">Игр пока нет</p>';
        return;
    }

    container.innerHTML = '';

    // Add each enabled game
    games.forEach(game => {
        const card = document.createElement('a');
        card.className = 'game-card';
        card.href = `wosb.html?game=${game.id}`;
        card.innerHTML = `
            <div class="game-card-icon">${game.logo || '🎮'}</div>
            <div class="game-card-name">${escapeHtml(game.name)}</div>
            <div class="game-card-desc">Гильдии · Карта · Рынок</div>
        `;
        container.appendChild(card);
    });

    // Add placeholder for future games
    const future = document.createElement('div');
    future.className = 'game-card disabled';
    future.innerHTML = `
        <div class="game-card-soon">Скоро</div>
        <div class="game-card-icon">🏴‍☠️</div>
        <div class="game-card-name">Pirates</div>
        <div class="game-card-desc">В разработке</div>
    `;
    container.appendChild(future);
}

// Utils
function escapeHtml(str) {
    return String(str || '').replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
}

// Init
renderGameCards();
console.log('🚢 Landing page loaded');
