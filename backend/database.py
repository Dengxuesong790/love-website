# ===================================
# 数据库模块 - SQLite 初始化与默认数据
# ===================================
import os
import sqlite3
import json

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, 'love_website.db')


def get_connection():
    """获取数据库连接（行以字典形式返回）"""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


# ---------------------------------------------------------
# 默认配置（与 index.html 中内置内容保持一致）
# ---------------------------------------------------------
DEFAULT_CONFIGS = {
    'site.title': '王斐和邓雪松 - 我们的爱情故事',
    'site.couple_names': '王斐和邓雪松',
    'site.description': '我的爱意，都藏在这里',
    'site.start_date': '2026-04-11',
    'letter.title': '致我最爱的王斐',
    'letter.content': (
        '亲爱的斐：\n\n'
        '有些藏在心底的爱意与温柔，面对面我总是嘴笨难言，不知道该如何好好表达，'
        '所以写下这封信，认认真真诉说我对你的满心欢喜。\n\n'
        '何其有幸，此生能够遇见你、拥有你。我总觉得，我们的感情是世间最温柔美好的模样，'
        '没有猜忌与消耗，只有双向的包容与珍惜。我们始终懂得换位思考，体谅彼此的不易、'
        '在意彼此的情绪，把对方的感受牢牢放在心上。这种双向奔赴的爱意，安稳又治愈，'
        '让我笃定，你就是我这辈子最值得的偏爱。\n\n'
        '我真的超级喜欢你，喜欢你的温柔细腻，喜欢你的善良纯粹。长久以来，'
        '你一直无微不至地照顾我、迁就我，把细碎的日常都打理得温暖又美好。'
        '你总能精准捕捉我的情绪，包容我的小缺点，用满满的爱意包裹着我，让我时刻都被幸福包围。'
        '和你在一起的每一分每一秒，都是平淡日子里最珍贵的光，让我原本普通的生活，变得温柔又滚烫。\n\n'
        '我承认我不算完美，嘴笨不善言辞，不擅长说动听的情话，偶尔没能及时捕捉你的小情绪，'
        '不懂怎么熟练哄你开心。但我所有的迟钝和笨拙，从来都不代表我不在意你，'
        '恰恰相反，你是我最放在心上、最珍惜的人。\n\n'
        '我的满心欢喜、全部的温柔与真心，通通都给了你。我贪恋和你相处的所有时光，'
        '贪恋你的温柔、你的陪伴，贪恋这份双向包容、彼此珍惜的真挚感情。'
        '只要身边是你，平淡的三餐四季、琐碎的日常烟火，都变得格外有意义。\n\n'
        '未来的漫漫前路，我不想只做被你偏爱的人，更想成为好好偏爱你的人。'
        '我会慢慢学着细腻、学着温柔，用心呵护我们的感情，好好珍惜独一无二的你。'
        '往后余生，岁岁年年，我想一直陪着你，与你双向奔赴、岁岁相守。'
        '何其有幸遇见你，未来漫漫朝夕，还请我的满心欢喜，多多指教。\n\n'
        '永远爱你的\n邓雪松\n2026 年 8 月 18 日'
    ),
    'letter.signature': '永远爱你的\n邓雪松',
    'timeline.events': json.dumps([
        {'date': '2026-03-08', 'icon': '🌸', 'title': '相识', 'description': '第一次见面，心跳动的瞬间', 'note': '命运让我们相遇'},
        {'date': '2026-03-08', 'icon': '💕', 'title': '第一次约会', 'description': '一起度过的美好时光', 'note': '紧张又开心的约会'},
        {'date': '2026-04-11', 'icon': '💍', 'title': '告白', 'description': '把藏在心底的爱意说给你听', 'note': '从此以后，双向奔赴'}
    ], ensure_ascii=False),
}

# 需要保存在文本域中的键（多行文本）
TEXTAREA_KEYS = ('letter.content', 'letter.signature')


def _seed_configs(conn):
    """插入默认站点配置"""
    for key, value in DEFAULT_CONFIGS.items():
        conn.execute(
            'INSERT OR IGNORE INTO site_config (config_key, config_value) VALUES (?, ?)',
            (key, value)
        )


def init_db():
    """初始化数据库：建表 + 默认配置（仅在首次运行时写入）"""
    conn = get_connection()
    try:
        conn.execute('''
            CREATE TABLE IF NOT EXISTS admin_user (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT NOT NULL UNIQUE,
                password_hash TEXT NOT NULL,
                created_at TEXT DEFAULT (datetime('now', 'localtime'))
            )
        ''')
        conn.execute('''
            CREATE TABLE IF NOT EXISTS site_config (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                config_key TEXT NOT NULL UNIQUE,
                config_value TEXT,
                updated_at TEXT DEFAULT (datetime('now', 'localtime'))
            )
        ''')
        conn.execute('''
            CREATE TABLE IF NOT EXISTS resource (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                type TEXT NOT NULL,
                resource_name TEXT NOT NULL,
                url_path TEXT NOT NULL,
                sort_order INTEGER DEFAULT 0,
                is_enabled INTEGER DEFAULT 1,
                created_at TEXT DEFAULT (datetime('now', 'localtime'))
            )
        ''')
        conn.commit()

        # 默认配置仅在库为空时写入
        config_count = conn.execute('SELECT COUNT(*) AS c FROM site_config').fetchone()['c']
        if config_count == 0:
            _seed_configs(conn)
            conn.commit()
    finally:
        conn.close()
