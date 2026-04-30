import sqlite3
from pathlib import Path

DB_PATH = Path("db/dashboard.db")


def get_connection() -> sqlite3.Connection:
    DB_PATH.parent.mkdir(exist_ok=True)
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = get_connection()
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS interactions (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            item_id     TEXT NOT NULL,
            item_type   TEXT NOT NULL,
            interaction TEXT NOT NULL,
            title       TEXT,
            url         TEXT,
            created_at  TEXT DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS notes (
            id           INTEGER PRIMARY KEY AUTOINCREMENT,
            context_id   TEXT NOT NULL,
            context_type TEXT NOT NULL,
            content      TEXT NOT NULL,
            created_at   TEXT DEFAULT (datetime('now')),
            updated_at   TEXT DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS highlights (
            id            INTEGER PRIMARY KEY AUTOINCREMENT,
            page_url      TEXT NOT NULL,
            selected_text TEXT NOT NULL,
            note          TEXT,
            color         TEXT DEFAULT 'yellow',
            created_at    TEXT DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS improvement_notes (
            id         INTEGER PRIMARY KEY AUTOINCREMENT,
            title      TEXT NOT NULL,
            content    TEXT NOT NULL,
            priority   TEXT DEFAULT 'medium',
            status     TEXT DEFAULT 'pending',
            created_at TEXT DEFAULT (datetime('now')),
            updated_at TEXT DEFAULT (datetime('now'))
        );
    """)
    conn.commit()
    conn.close()


# ── Interactions (like / dislike) ────────────────────────────────────────────

def toggle_interaction(item_id: str, item_type: str, interaction: str,
                       title: str = "", url: str = "") -> str | None:
    conn = get_connection()
    row = conn.execute(
        "SELECT id, interaction FROM interactions WHERE item_id=? AND item_type=?",
        (item_id, item_type)
    ).fetchone()

    if row:
        if row["interaction"] == interaction:
            conn.execute("DELETE FROM interactions WHERE id=?", (row["id"],))
            conn.commit()
            conn.close()
            return None
        conn.execute("UPDATE interactions SET interaction=? WHERE id=?",
                     (interaction, row["id"]))
    else:
        conn.execute(
            "INSERT INTO interactions (item_id, item_type, interaction, title, url) VALUES (?,?,?,?,?)",
            (item_id, item_type, interaction, title, url)
        )

    conn.commit()
    conn.close()
    return interaction


def get_interaction(item_id: str, item_type: str) -> str | None:
    conn = get_connection()
    row = conn.execute(
        "SELECT interaction FROM interactions WHERE item_id=? AND item_type=?",
        (item_id, item_type)
    ).fetchone()
    conn.close()
    return row["interaction"] if row else None


# ── Notes ─────────────────────────────────────────────────────────────────────

def save_note(context_id: str, context_type: str, content: str) -> int:
    conn = get_connection()
    cur = conn.execute(
        "INSERT INTO notes (context_id, context_type, content) VALUES (?,?,?)",
        (context_id, context_type, content)
    )
    note_id = cur.lastrowid
    conn.commit()
    conn.close()
    return note_id


def get_notes(context_id: str, context_type: str) -> list[dict]:
    conn = get_connection()
    rows = conn.execute(
        "SELECT * FROM notes WHERE context_id=? AND context_type=? ORDER BY created_at DESC",
        (context_id, context_type)
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def delete_note(note_id: int):
    conn = get_connection()
    conn.execute("DELETE FROM notes WHERE id=?", (note_id,))
    conn.commit()
    conn.close()


# ── Highlights ────────────────────────────────────────────────────────────────

def save_highlight(page_url: str, selected_text: str,
                   note: str = "", color: str = "yellow") -> int:
    conn = get_connection()
    cur = conn.execute(
        "INSERT INTO highlights (page_url, selected_text, note, color) VALUES (?,?,?,?)",
        (page_url, selected_text, note, color)
    )
    hid = cur.lastrowid
    conn.commit()
    conn.close()
    return hid


def get_highlights(page_url: str) -> list[dict]:
    conn = get_connection()
    rows = conn.execute(
        "SELECT * FROM highlights WHERE page_url=? ORDER BY created_at DESC",
        (page_url,)
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def delete_highlight(highlight_id: int):
    conn = get_connection()
    conn.execute("DELETE FROM highlights WHERE id=?", (highlight_id,))
    conn.commit()
    conn.close()


# ── Improvement Notes ─────────────────────────────────────────────────────────

def save_improvement(title: str, content: str, priority: str = "medium") -> int:
    conn = get_connection()
    cur = conn.execute(
        "INSERT INTO improvement_notes (title, content, priority) VALUES (?,?,?)",
        (title, content, priority)
    )
    iid = cur.lastrowid
    conn.commit()
    conn.close()
    return iid


def get_improvements() -> list[dict]:
    conn = get_connection()
    rows = conn.execute("""
        SELECT * FROM improvement_notes
        ORDER BY
            CASE priority WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END,
            created_at DESC
    """).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def update_improvement_status(improvement_id: int, status: str):
    conn = get_connection()
    conn.execute(
        "UPDATE improvement_notes SET status=?, updated_at=datetime('now') WHERE id=?",
        (status, improvement_id)
    )
    conn.commit()
    conn.close()


def delete_improvement(improvement_id: int):
    conn = get_connection()
    conn.execute("DELETE FROM improvement_notes WHERE id=?", (improvement_id,))
    conn.commit()
    conn.close()
