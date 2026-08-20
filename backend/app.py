# ===================================
# 爱情纪念网站 - 后端服务（Flask + SQLite）
# 管理后台配套 API：登录 / 配置管理 / 资源管理（音乐与图片）
# ===================================
import os
import json
import uuid
import secrets
from functools import wraps

from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.utils import secure_filename

from database import get_connection, init_db, DEFAULT_CONFIGS

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
UPLOAD_DIR = os.path.join(BASE_DIR, 'uploads')

# 允许上传的资源类型
ALLOWED_IMAGE_EXT = {'.jpg', '.jpeg', '.png', '.gif', '.webp'}
ALLOWED_MUSIC_EXT = {'.mp3', '.wav', '.ogg', '.m4a'}

app = Flask(__name__)
CORS(app)  # 允许前端站点（GitHub Pages）跨域访问

# 登录会话持久化到数据库：服务重启后 token 仍然有效，无需重新登录
def save_session(token, username):
    conn = get_connection()
    try:
        conn.execute(
            'INSERT INTO admin_session (token, username) VALUES (?, ?) '
            'ON CONFLICT(token) DO UPDATE SET username = excluded.username',
            (token, username)
        )
        conn.commit()
    finally:
        conn.close()


def get_session_user(token):
    """根据 token 返回用户名；不存在则返回 None"""
    if not token:
        return None
    conn = get_connection()
    try:
        row = conn.execute(
            'SELECT username FROM admin_session WHERE token = ?', (token,)
        ).fetchone()
        return row['username'] if row else None
    finally:
        conn.close()


def delete_session(token):
    conn = get_connection()
    try:
        conn.execute('DELETE FROM admin_session WHERE token = ?', (token,))
        conn.commit()
    finally:
        conn.close()

# 默认管理员账号（可通过环境变量覆盖，首次启动时写入数据库）
DEFAULT_ADMIN_USERNAME = os.environ.get('ADMIN_USERNAME', 'admin')
DEFAULT_ADMIN_PASSWORD = os.environ.get('ADMIN_PASSWORD', 'admin123')


# ---------------------------------------------------------
# 工具函数
# ---------------------------------------------------------
def ok(data=None, message='ok'):
    return jsonify({'code': 200, 'message': message, 'data': data})


def fail(code, message, data=None):
    """返回错误响应，HTTP 状态码与业务 code 保持一致"""
    return jsonify({'code': code, 'message': message, 'data': data}), code


def require_auth(fn):
    """登录鉴权装饰器：请求头需携带 Authorization: Bearer <token>"""
    @wraps(fn)
    def wrapper(*args, **kwargs):
        auth = request.headers.get('Authorization', '')
        token = auth.replace('Bearer ', '').strip() if auth.startswith('Bearer ') else ''
        if not get_session_user(token):
            return fail(401, '未登录或登录已过期')
        return fn(*args, **kwargs)
    return wrapper


def to_dict(row):
    """将数据库行转换为字典"""
    return dict(row)


# ---------------------------------------------------------
# 认证接口
# ---------------------------------------------------------
@app.route('/api/auth/login', methods=['POST'])
def login():
    data = request.get_json(silent=True) or {}
    username = (data.get('username') or '').strip()
    password = data.get('password') or ''

    conn = get_connection()
    try:
        user = conn.execute(
            'SELECT * FROM admin_user WHERE username = ?', (username,)
        ).fetchone()
    finally:
        conn.close()

    if not user or not check_password_hash(user['password_hash'], password):
        return fail(401, '用户名或密码错误')

    token = secrets.token_hex(32)
    save_session(token, username)
    return ok({'token': token, 'username': username}, '登录成功')


@app.route('/api/auth/verify', methods=['GET'])
def verify():
    auth = request.headers.get('Authorization', '')
    token = auth.replace('Bearer ', '').strip() if auth.startswith('Bearer ') else ''
    username = get_session_user(token)
    if not username:
        return fail(401, '未登录或登录已过期')
    return ok({'username': username}, '验证通过')


@app.route('/api/auth/logout', methods=['POST'])
@require_auth
def logout():
    auth = request.headers.get('Authorization', '')
    token = auth.replace('Bearer ', '').strip()
    delete_session(token)
    return ok(message='已退出登录')


# ---------------------------------------------------------
# 配置接口
# ---------------------------------------------------------
@app.route('/api/config/all', methods=['GET'])
def get_all_configs():
    """返回全部配置（公开接口，供前端展示页读取）"""
    conn = get_connection()
    try:
        rows = conn.execute(
            'SELECT config_key AS configKey, config_value AS configValue '
            'FROM site_config ORDER BY id'
        ).fetchall()
    finally:
        conn.close()
    return ok([to_dict(r) for r in rows])


@app.route('/api/config/<key>', methods=['PUT'])
@require_auth
def update_config(key):
    data = request.get_json(silent=True) or {}
    value = data.get('configValue')
    if value is None:
        return fail(400, 'configValue 不能为空')

    conn = get_connection()
    try:
        conn.execute(
            'INSERT INTO site_config (config_key, config_value, updated_at) '
            "VALUES (?, ?, datetime('now', 'localtime')) "
            'ON CONFLICT(config_key) DO UPDATE SET config_value = excluded.config_value, '
            'updated_at = excluded.updated_at',
            (key, str(value))
        )
        conn.commit()
    finally:
        conn.close()
    return ok({'configKey': key, 'configValue': str(value)}, '保存成功')


@app.route('/api/config/batch', methods=['PUT'])
@require_auth
def update_configs_batch():
    """批量保存配置（情书、时间线等多字段一次提交）"""
    data = request.get_json(silent=True) or {}
    configs = data.get('configs')
    if not isinstance(configs, list) or not configs:
        return fail(400, 'configs 不能为空')

    conn = get_connection()
    try:
        for item in configs:
            key = item.get('configKey')
            value = item.get('configValue')
            if not key or value is None:
                continue
            conn.execute(
                'INSERT INTO site_config (config_key, config_value, updated_at) '
                "VALUES (?, ?, datetime('now', 'localtime')) "
                'ON CONFLICT(config_key) DO UPDATE SET config_value = excluded.config_value, '
                'updated_at = excluded.updated_at',
                (key, str(value))
            )
        conn.commit()
    finally:
        conn.close()
    return ok(message='批量保存成功')


# ---------------------------------------------------------
# 资源接口（音乐 / 图片）
# ---------------------------------------------------------
@app.route('/api/resource/list', methods=['GET'])
def list_resources():
    """按类型列出资源（公开接口，供前端展示页读取）"""
    res_type = request.args.get('type', '')
    if res_type not in ('music', 'image'):
        return fail(400, 'type 必须为 music 或 image')

    conn = get_connection()
    try:
        rows = conn.execute(
            'SELECT id, type, resource_name AS resourceName, url_path AS urlPath, '
            'sort_order AS sortOrder, is_enabled AS isEnabled '
            'FROM resource WHERE type = ? ORDER BY sort_order ASC, id ASC',
            (res_type,)
        ).fetchall()
    finally:
        conn.close()
    return ok([to_dict(r) for r in rows])


@app.route('/api/resource/upload', methods=['POST'])
@require_auth
def upload_resource():
    """上传音乐或图片资源（multipart/form-data）"""
    res_type = request.form.get('type', '')
    if res_type not in ('music', 'image'):
        return fail(400, 'type 必须为 music 或 image')

    file = request.files.get('file')
    if not file or not file.filename:
        return fail(400, '未选择文件')

    ext = os.path.splitext(file.filename)[1].lower()
    allowed = ALLOWED_MUSIC_EXT if res_type == 'music' else ALLOWED_IMAGE_EXT
    if ext not in allowed:
        return fail(400, f'不支持的文件类型: {ext}')

    # 保存文件到 uploads/<type>/<uuid><ext>
    type_dir = os.path.join(UPLOAD_DIR, res_type)
    os.makedirs(type_dir, exist_ok=True)
    filename = f"{uuid.uuid4().hex}{ext}"
    file.save(os.path.join(type_dir, filename))
    url_path = f'/uploads/{res_type}/{filename}'

    resource_name = (request.form.get('resourceName') or file.filename).strip()
    sort_order = int(request.form.get('sortOrder') or 0)
    is_enabled = 1 if request.form.get('isEnabled', '1') not in ('0', 'false') else 0

    conn = get_connection()
    try:
        cur = conn.execute(
            'INSERT INTO resource (type, resource_name, url_path, sort_order, is_enabled) '
            'VALUES (?, ?, ?, ?, ?)',
            (res_type, resource_name, url_path, sort_order, is_enabled)
        )
        conn.commit()
        new_id = cur.lastrowid
    finally:
        conn.close()

    return ok({'id': new_id, 'urlPath': url_path}, '上传成功')


@app.route('/api/resource/<int:rid>', methods=['PUT'])
@require_auth
def update_resource(rid):
    """更新资源信息（名称 / 排序 / 启用状态）"""
    data = request.get_json(silent=True) or {}

    conn = get_connection()
    try:
        row = conn.execute('SELECT * FROM resource WHERE id = ?', (rid,)).fetchone()
        if not row:
            return fail(404, '资源不存在')

        resource_name = data.get('resourceName', row['resource_name'])
        sort_order = data.get('sortOrder', row['sort_order'])
        is_enabled = data.get('isEnabled', row['is_enabled'])

        conn.execute(
            'UPDATE resource SET resource_name = ?, sort_order = ?, is_enabled = ? WHERE id = ?',
            (resource_name, int(sort_order), int(is_enabled), rid)
        )
        conn.commit()
    finally:
        conn.close()
    return ok(message='更新成功')


@app.route('/api/resource/<int:rid>', methods=['DELETE'])
@require_auth
def delete_resource(rid):
    """删除资源（同时删除文件）"""
    conn = get_connection()
    try:
        row = conn.execute('SELECT * FROM resource WHERE id = ?', (rid,)).fetchone()
        if not row:
            return fail(404, '资源不存在')
        conn.execute('DELETE FROM resource WHERE id = ?', (rid,))
        conn.commit()
    finally:
        conn.close()

    # 删除物理文件（失败不影响接口返回）
    file_path = os.path.join(BASE_DIR, row['url_path'].lstrip('/'))
    if os.path.isfile(file_path):
        try:
            os.remove(file_path)
        except OSError:
            pass
    return ok(message='删除成功')


@app.route('/api/uploads/<path:filename>')
def serve_upload(filename):
    """公开访问上传的文件（urlPath 前缀 /uploads/，配合前端 CONFIG_API_BASE + urlPath 使用）"""
    return send_from_directory(UPLOAD_DIR, filename)


# ---------------------------------------------------------
# 服务入口
# ---------------------------------------------------------
def ensure_admin_account():
    """确保默认管理员账号存在且密码有效（首次启动创建；修复历史空密码）"""
    conn = get_connection()
    try:
        row = conn.execute(
            'SELECT id, password_hash FROM admin_user '
            'WHERE username = ? LIMIT 1', (DEFAULT_ADMIN_USERNAME,)
        ).fetchone()
        password_hash = generate_password_hash(DEFAULT_ADMIN_PASSWORD)
        if not row:
            conn.execute(
                'INSERT INTO admin_user (username, password_hash) VALUES (?, ?)',
                (DEFAULT_ADMIN_USERNAME, password_hash)
            )
            conn.commit()
            print(f'已创建默认管理员账号: {DEFAULT_ADMIN_USERNAME}')
        elif not row['password_hash']:
            conn.execute(
                'UPDATE admin_user SET password_hash = ? WHERE id = ?',
                (password_hash, row['id'])
            )
            conn.commit()
            print(f'已修复管理员账号密码: {DEFAULT_ADMIN_USERNAME}')
    finally:
        conn.close()


def ensure_missing_configs():
    """为存量数据库补充新增的默认配置项（如 letter.list 情书历史记录）"""
    conn = get_connection()
    try:
        existing = {row['config_key'] for row in conn.execute('SELECT config_key FROM site_config').fetchall()}
        added = 0
        for key, value in DEFAULT_CONFIGS.items():
            if key not in existing:
                conn.execute(
                    'INSERT INTO site_config (config_key, config_value) VALUES (?, ?)',
                    (key, value)
                )
                added += 1
        conn.commit()
        if added:
            print(f'已补充 {added} 项默认配置: {[k for k in DEFAULT_CONFIGS if k not in existing]}')
    finally:
        conn.close()


if __name__ == '__main__':
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    init_db()
    ensure_missing_configs()
    ensure_admin_account()
    print('=' * 50)
    print('爱情纪念网站后端服务已启动')
    print('API 地址: http://localhost:8080/api')
    print(f'默认管理员: {DEFAULT_ADMIN_USERNAME}（密码可通过环境变量 ADMIN_PASSWORD 修改）')
    print('=' * 50)
    app.run(host='0.0.0.0', port=8080, debug=True)
