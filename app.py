# -*- coding: utf-8 -*-
"""
WOSB Portal — мульти-игровой гильдийный портал.
Лендинг с выбором игры → отдельный скелет для каждой игры.
"""
import os, json, requests
from functools import wraps
from flask import Flask, render_template, request, jsonify, session, redirect, url_for, send_from_directory

app = Flask(__name__)
app.secret_key = os.environ.get('FLASK_SECRET_KEY', 'change-this-on-render')

# ─── Supabase конфиг ───
SUPABASE_URL = os.environ.get('SUPABASE_URL', '')
SUPABASE_ANON_KEY = os.environ.get('SUPABASE_KEY', '')
SUPABASE_SERVICE_KEY = os.environ.get('SUPABASE_SERVICE_KEY', SUPABASE_ANON_KEY)

# ─── Реестр игр ───
# Каждая игра — отдельный «скелет»: свои шаблоны, стили, данные
GAMES = {
    'wosb': {
        'id': 'wosb',
        'name': 'World of Sea Battle',
        'short': 'WOSB',
        'icon': '⚔️',
        'description': 'Морские сражения, торговля, гильдии и карта мира.',
        'color': '#3b82f6',
        'bg': 'images/wosb/hero-ship.jpg',
        'hero_video': 'images/wosb/hero.mp4',
        'templates_dir': 'games/wosb',
        'css': 'css/wosb.css',
        'js': 'js/wosb.js',
        'enabled': True,
    },
    # Пример добавления новой игры (пока выключена):
    # 'pirates': {
    #     'id': 'pirates',
    #     'name': 'Pirates of the Caribbean',
    #     'short': 'POTC',
    #     'icon': '🏴‍☠️',
    #     'description': 'Пиратские битвы и сокровища.',
    #     'color': '#dc2626',
    #     'bg': 'images/pirates/hero.jpg',
    #     'hero_video': 'images/pirates/hero.mp4',
    #     'templates_dir': 'games/pirates',
    #     'css': 'css/pirates.css',
    #     'js': 'js/pirates.js',
    #     'enabled': False,
    # },
}

# ─── Supabase REST клиент ───
def sb_headers(use_service=False):
    key = SUPABASE_SERVICE_KEY if use_service else SUPABASE_ANON_KEY
    return {
        'apikey': key,
        'Authorization': f'Bearer {key}',
        'Content-Type': 'application/json',
    }

def sb_select(table, columns='*', filters=None, use_service=False):
    url = f'{SUPABASE_URL}/rest/v1/{table}?select={columns}'
    if filters:
        for k, v in filters.items():
            url += f'&{k}=eq.{v}'
    try:
        r = requests.get(url, headers=sb_headers(use_service), timeout=10)
        if r.status_code == 200:
            return r.json()
    except Exception as e:
        print(f'sb_select error ({table}):', e)
    return []

def sb_rpc(fn, params, use_service=False):
    url = f'{SUPABASE_URL}/rest/v1/rpc/{fn}'
    try:
        r = requests.post(url, headers=sb_headers(use_service), json=params, timeout=10)
        if r.status_code == 200:
            return r.json()
    except Exception as e:
        print(f'sb_rpc error ({fn}):', e)
    return None

# ─── Декораторы ───
def game_required(f):
    @wraps(f)
    def wrapped(*args, **kwargs):
        game_id = kwargs.get('game_id')
        if game_id not in GAMES or not GAMES[game_id]['enabled']:
            return render_template('error.html', message='Игра не найдена'), 404
        return f(*args, **kwargs)
    return wrapped

def admin_required(f):
    @wraps(f)
    def wrapped(*args, **kwargs):
        if not session.get('admin_email'):
            return jsonify({'error': 'Не авторизован'}), 401
        return f(*args, **kwargs)
    return wrapped

# ═══════════════════════════════════════════
# ЛЕНДИНГ — выбор игры
# ═══════════════════════════════════════════
@app.route('/')
def landing():
    games = [g for g in GAMES.values() if g['enabled']]
    return render_template('landing.html', games=games)

# ═══════════════════════════════════════════
# ИГРОВОЙ ПОРТАЛ — отдельный скелет для каждой игры
# ═══════════════════════════════════════════
@app.route('/game/<game_id>')
@game_required
def game_home(game_id):
    game = GAMES[game_id]
    clans = sb_select('clans_public', 'id,name,description,image,flag,leader_nick,game_id',
                      filters={'game_id': f'eq.{game_id}'} if game_id else None)
    return render_template('game_base.html', game=game, page='home', clans=clans or [])

@app.route('/game/<game_id>/clan/<clan_id>')
@game_required
def game_clan(game_id, clan_id):
    game = GAMES[game_id]
    clan = sb_select('clans_public', '*', filters={'id': f'eq.{clan_id}'})
    clan = clan[0] if clan else {}
    return render_template('game_base.html', game=game, page='clan', clan=clan)

@app.route('/game/<game_id>/admin')
@game_required
def game_admin(game_id):
    game = GAMES[game_id]
    if not session.get('admin_email'):
        return render_template('game_base.html', game=game, page='admin_login')
    return render_template('game_base.html', game=game, page='admin')

# ═══════════════════════════════════════════
# API: Аутентификация
# ═══════════════════════════════════════════
@app.route('/api/auth/login', methods=['POST'])
def api_login():
    data = request.json or {}
    email = (data.get('email') or '').strip().lower()
    password = data.get('password', '')
    if not email or not password:
        return jsonify({'error': 'Укажите email и пароль'}), 400

    result = sb_rpc('verify_admin_login', {'p_email': email, 'p_password': password}, use_service=True)
    if result and not result.get('error'):
        session['admin_email'] = email
        session['admin_role'] = result.get('role', 'admin')
        session['admin_nick'] = result.get('nickname', '')
        session['admin_clan_id'] = result.get('clan_id')
        return jsonify({'ok': True, 'role': result.get('role'), 'nickname': result.get('nickname')})
    return jsonify({'error': 'Неверный email или пароль'}), 401

@app.route('/api/auth/logout', methods=['POST'])
def api_logout():
    session.clear()
    return jsonify({'ok': True})

@app.route('/api/auth/me')
def api_me():
    if not session.get('admin_email'):
        return jsonify({'authenticated': False})
    return jsonify({
        'authenticated': True,
        'email': session['admin_email'],
        'role': session.get('admin_role'),
        'nickname': session.get('admin_nick'),
        'clan_id': session.get('admin_clan_id'),
    })

# ═══════════════════════════════════════════
# API: Гильдии
# ═══════════════════════════════════════════
@app.route('/api/<game_id>/clans')
@game_required
def api_clans(game_id):
    clans = sb_select('clans_public', 'id,name,description,image,flag,leader_nick,game_id,alliance_id',
                      filters={'game_id': f'eq.{game_id}'})
    return jsonify(clans or [])

@app.route('/api/<game_id>/clan/<clan_id>')
@game_required
def api_clan_detail(game_id, clan_id):
    clan = sb_select('clans_public', '*', filters={'id': f'eq.{clan_id}'})
    if not clan:
        return jsonify({'error': 'Гильдия не найдена'}), 404
    return jsonify(clan[0])

@app.route('/api/<game_id>/clan/<clan_id>/lists')
@game_required
def api_clan_lists(game_id, clan_id):
    result = {}
    for tab in ['enemies', 'friends', 'neutral', 'personal']:
        result[tab] = sb_select(tab, '*', filters={'clan': f'eq.{clan_id}'})
    return jsonify(result)

@app.route('/api/<game_id>/clan/<clan_id>/builds')
@game_required
def api_clan_builds(game_id, clan_id):
    pvp = sb_select('builds', '*', filters={'clan': f'eq.{clan_id}', 'type': 'eq.pvp'})
    pb = sb_select('builds', '*', filters={'clan': f'eq.{clan_id}', 'type': 'eq.pb'})
    return jsonify({'pvp': pvp or [], 'pb': pb or []})

@app.route('/api/<game_id>/clan/<clan_id>/events')
@game_required
def api_clan_events(game_id, clan_id):
    events = sb_select('events', '*', filters={'clan': f'eq.{clan_id}'})
    return jsonify(events or [])

@app.route('/api/<game_id>/clan/<clan_id>/treasury')
@game_required
def api_clan_treasury(game_id, clan_id):
    treasury = sb_select('treasury', '*', filters={'clan': f'eq.{clan_id}'})
    return jsonify(treasury or [])

# ═══════════════════════════════════════════
# API: Рынок
# ═══════════════════════════════════════════
@app.route('/api/<game_id>/trades')
@game_required
def api_trades(game_id):
    trades = sb_select('trades', '*', filters={'game_id': f'eq.{game_id}', 'status': 'eq.active'})
    return jsonify(trades or [])

@app.route('/api/<game_id>/trades', methods=['POST'])
@game_required
def api_create_trade(game_id):
    data = request.json or {}
    data['game_id'] = game_id
    data['status'] = 'active'
    url = f'{SUPABASE_URL}/rest/v1/trades'
    try:
        r = requests.post(url, headers=sb_headers(), json=data, timeout=10)
        if r.status_code == 201:
            return jsonify(r.json()), 201
        return jsonify({'error': r.text}), r.status_code
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ═══════════════════════════════════════════
# API: Корабли
# ═══════════════════════════════════════════
@app.route('/api/<game_id>/ships')
@game_required
def api_ships(game_id):
    ships = sb_select('ship_recipes', '*', filters={'game_id': f'eq.{game_id}'})
    return jsonify(ships or [])

# ═══════════════════════════════════════════
# API: Ресурсы
# ═══════════════════════════════════════════
@app.route('/api/<game_id>/resources')
@game_required
def api_resources(game_id):
    resources = sb_select('resource_prices', '*', filters={'game_id': f'eq.{game_id}'})
    return jsonify(resources or [])

# ═══════════════════════════════════════════
# API: Карта
# ═══════════════════════════════════════════
@app.route('/api/<game_id>/map')
@game_required
def api_map(game_id):
    settings = sb_select('map_settings', '*', filters={'game_id': f'eq.{game_id}'})
    return jsonify(settings[0] if settings else {})

# ═══════════════════════════════════════════
# API: Фракции и порты
# ═══════════════════════════════════════════
@app.route('/api/<game_id>/factions')
@game_required
def api_factions(game_id):
    factions = sb_select('factions', '*', filters={'game_id': f'eq.{game_id}'})
    return jsonify(factions or [])

@app.route('/api/<game_id>/ports')
@game_required
def api_ports(game_id):
    ports = sb_select('ports', '*', filters={'game_id': f'eq.{game_id}'})
    return jsonify(ports or [])

# ═══════════════════════════════════════════
# API: Онлайн (heartbeat)
# ═══════════════════════════════════════════
@app.route('/api/<game_id>/heartbeat', methods=['POST'])
@game_required
def api_heartbeat(game_id):
    data = request.json or {}
    nickname = data.get('nickname', '')
    clan_id = data.get('clan_id', '')
    if not nickname:
        return jsonify({'error': 'Нет ника'}), 400
    payload = {
        'nickname': nickname,
        'clan_id': clan_id or None,
        'game_id': game_id,
        'last_seen': 'now()',
    }
    url = f'{SUPABASE_URL}/rest/v1/online_users'
    try:
        requests.post(url, headers=sb_headers(use_service=True), json=payload, timeout=5)
    except:
        pass
    return jsonify({'ok': True})

@app.route('/api/<game_id>/online')
@game_required
def api_online(game_id):
    online = sb_select('online_users', 'nickname,clan_id,last_seen',
                       filters={'game_id': f'eq.{game_id}'}, use_service=True)
    return jsonify(online or [])

# ═══════════════════════════════════════════
# API: Заявки в гильдию
# ═══════════════════════════════════════════
@app.route('/api/<game_id>/apply', methods=['POST'])
@game_required
def api_apply(game_id):
    data = request.json or {}
    data['game_id'] = game_id
    data['status'] = 'pending'
    url = f'{SUPABASE_URL}/rest/v1/clan_requests'
    try:
        r = requests.post(url, headers=sb_headers(), json=data, timeout=10)
        if r.status_code == 201:
            return jsonify({'ok': True}), 201
        return jsonify({'error': r.text}), r.status_code
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ═══════════════════════════════════════════
# API: Discord webhook
# ═══════════════════════════════════════════
@app.route('/api/<game_id>/discord', methods=['POST'])
@game_required
def api_discord_webhook(game_id):
    data = request.json or {}
    webhook_url = data.pop('webhook_url', '')
    if not webhook_url:
        settings = sb_select('site_settings', 'discord_webhook', use_service=True)
        webhook_url = settings[0].get('discord_webhook') if settings else ''
    if not webhook_url:
        return jsonify({'error': 'Webhook не настроен'}), 400
    try:
        r = requests.post(webhook_url, json=data, timeout=10)
        return jsonify({'ok': r.status_code == 204})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ═══════════════════════════════════════════
# API: Админка
# ═══════════════════════════════════════════
@app.route('/api/<game_id>/admin/clans')
@admin_required
@game_required
def api_admin_clans(game_id):
    clans = sb_select('clans', '*', filters={'game_id': f'eq.{game_id}'}, use_service=True)
    return jsonify(clans or [])

@app.route('/api/<game_id>/admin/clan', methods=['POST'])
@admin_required
@game_required
def api_admin_save_clan(game_id):
    data = request.json or {}
    data['game_id'] = game_id
    clan_id = data.pop('id', None)
    if clan_id:
        url = f'{SUPABASE_URL}/rest/v1/clans?id=eq.{clan_id}'
        try:
            r = requests.patch(url, headers=sb_headers(use_service=True), json=data, timeout=10)
            return jsonify({'ok': r.status_code == 200})
        except Exception as e:
            return jsonify({'error': str(e)}), 500
    else:
        url = f'{SUPABASE_URL}/rest/v1/clans'
        try:
            r = requests.post(url, headers=sb_headers(use_service=True), json=data, timeout=10)
            if r.status_code == 201:
                return jsonify(r.json()), 201
            return jsonify({'error': r.text}), r.status_code
        except Exception as e:
            return jsonify({'error': str(e)}), 500

@app.route('/api/<game_id>/admin/clan/<clan_id>', methods=['DELETE'])
@admin_required
@game_required
def api_admin_delete_clan(game_id, clan_id):
    # Удаляем связанные списки
    for tab in ['enemies', 'friends', 'neutral', 'personal']:
        url = f'{SUPABASE_URL}/rest/v1/{tab}?clan=eq.{clan_id}'
        requests.delete(url, headers=sb_headers(use_service=True), timeout=10)
    # Удаляем саму гильдию
    url = f'{SUPABASE_URL}/rest/v1/clans?id=eq.{clan_id}'
    try:
        r = requests.delete(url, headers=sb_headers(use_service=True), timeout=10)
        return jsonify({'ok': r.status_code == 204})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/admin/games', methods=['GET', 'POST'])
@admin_required
def api_admin_games():
    if request.method == 'POST':
        data = request.json or {}
        url = f'{SUPABASE_URL}/rest/v1/games'
        try:
            r = requests.post(url, headers=sb_headers(use_service=True), json=data, timeout=10)
            return jsonify({'ok': r.status_code == 201}), 201
        except Exception as e:
            return jsonify({'error': str(e)}), 500
    games = sb_select('games', '*', use_service=True)
    return jsonify(games or [])

# ═══════════════════════════════════════════
# Статика
# ═══════════════════════════════════════════
@app.route('/static/<path:path>')
def serve_static(path):
    return send_from_directory('static', path)

# ═══════════════════════════════════════════
# Запуск
# ═══════════════════════════════════════════
if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=os.environ.get('FLASK_DEBUG') == '1')
