"""
Session history storage.

The browser detects blinks; it cannot remember them across visits. This keeps
finished sessions so the dashboard can show trends over days and weeks.

SQLite because a single file needs no server to install and the write volume
here is one row per session.
"""

import os
import sqlite3
import logging
from contextlib import contextmanager
from datetime import datetime, timedelta, timezone

logger = logging.getLogger(__name__)

DB_PATH = os.environ.get(
    "DRY_EYE_DB",
    os.path.join(os.path.dirname(os.path.abspath(__file__)), "sessions.db"),
)

SCHEMA = """
CREATE TABLE IF NOT EXISTS sessions (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    started_at        TEXT    NOT NULL,          -- ISO 8601, UTC
    ended_at          TEXT    NOT NULL,
    duration_seconds  INTEGER NOT NULL,
    blink_count       INTEGER NOT NULL DEFAULT 0,
    avg_blink_rate    REAL    NOT NULL DEFAULT 0,
    avg_ear           REAL    NOT NULL DEFAULT 0,
    min_ear           REAL    NOT NULL DEFAULT 0,
    fatigue_seconds   INTEGER NOT NULL DEFAULT 0,
    risk_level        TEXT    NOT NULL DEFAULT 'Low Risk',
    risk_score        INTEGER NOT NULL DEFAULT 0,
    health_score      INTEGER NOT NULL DEFAULT 0,
    calibrated        INTEGER NOT NULL DEFAULT 0, -- SQLite has no bool
    baseline_ear      REAL,
    ear_threshold     REAL,
    source            TEXT    NOT NULL DEFAULT 'browser',
    created_at        TEXT    NOT NULL
);

-- History is always queried newest-first over a date range.
CREATE INDEX IF NOT EXISTS idx_sessions_started_at ON sessions (started_at DESC);
"""

# Whitelist: request bodies are only allowed to set these.
WRITABLE = (
    "started_at", "ended_at", "duration_seconds", "blink_count",
    "avg_blink_rate", "avg_ear", "min_ear", "fatigue_seconds",
    "risk_level", "risk_score", "health_score",
    "calibrated", "baseline_ear", "ear_threshold", "source",
)


@contextmanager
def connect():
    """Row-dict connection with foreign keys on, always closed."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def init_db():
    with connect() as conn:
        conn.executescript(SCHEMA)
    logger.info("Session database ready at %s", DB_PATH)


def _row_to_dict(row):
    d = dict(row)
    d["calibrated"] = bool(d["calibrated"])
    return d


def insert_session(payload):
    """
    Store one finished session. Returns the stored row.

    Only whitelisted columns are read from the payload, so an unexpected field
    in the request body is ignored rather than reaching the query.
    """
    values = {k: payload.get(k) for k in WRITABLE if k in payload}
    values["created_at"] = datetime.now(timezone.utc).isoformat(timespec="seconds")
    values.setdefault("source", "browser")

    columns = ", ".join(values)
    placeholders = ", ".join(f":{k}" for k in values)

    with connect() as conn:
        cur = conn.execute(
            f"INSERT INTO sessions ({columns}) VALUES ({placeholders})", values
        )
        new_id = cur.lastrowid
        row = conn.execute("SELECT * FROM sessions WHERE id = ?", (new_id,)).fetchone()

    return _row_to_dict(row)


def list_sessions(days=30, limit=200):
    """Sessions from the last `days`, newest first."""
    since = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat(timespec="seconds")
    with connect() as conn:
        rows = conn.execute(
            "SELECT * FROM sessions WHERE started_at >= ? "
            "ORDER BY started_at DESC LIMIT ?",
            (since, limit),
        ).fetchall()
    return [_row_to_dict(r) for r in rows]


def daily_stats(days=7):
    """
    One row per day for charting. Days with no sessions are filled with zeros
    so the chart keeps an even x-axis instead of skipping gaps.
    """
    since_dt = datetime.now(timezone.utc) - timedelta(days=days - 1)
    since = since_dt.replace(hour=0, minute=0, second=0, microsecond=0)

    with connect() as conn:
        rows = conn.execute(
            """
            SELECT substr(started_at, 1, 10)   AS day,
                   COUNT(*)                    AS sessions,
                   SUM(blink_count)            AS blinks,
                   SUM(duration_seconds)       AS seconds,
                   AVG(avg_blink_rate)         AS avg_blink_rate,
                   AVG(health_score)           AS avg_health_score,
                   AVG(avg_ear)                AS avg_ear
            FROM sessions
            WHERE started_at >= ?
            GROUP BY day
            ORDER BY day ASC
            """,
            (since.isoformat(timespec="seconds"),),
        ).fetchall()

    by_day = {r["day"]: dict(r) for r in rows}

    out = []
    for offset in range(days):
        day = (since + timedelta(days=offset)).strftime("%Y-%m-%d")
        found = by_day.get(day)
        out.append({
            "day": day,
            "sessions": found["sessions"] if found else 0,
            "blinks": found["blinks"] or 0 if found else 0,
            "seconds": found["seconds"] or 0 if found else 0,
            "avg_blink_rate": round(found["avg_blink_rate"] or 0, 1) if found else 0,
            "avg_health_score": round(found["avg_health_score"] or 0) if found else 0,
            "avg_ear": round(found["avg_ear"] or 0, 3) if found else 0,
        })
    return out


def summary(days=7):
    """Totals across the window, for the headline figures."""
    since = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat(timespec="seconds")
    with connect() as conn:
        row = conn.execute(
            """
            SELECT COUNT(*)              AS sessions,
                   COALESCE(SUM(blink_count), 0)      AS total_blinks,
                   COALESCE(SUM(duration_seconds), 0) AS total_seconds,
                   COALESCE(AVG(avg_blink_rate), 0)   AS avg_blink_rate,
                   COALESCE(AVG(health_score), 0)     AS avg_health_score,
                   COALESCE(MIN(min_ear), 0)          AS lowest_ear
            FROM sessions WHERE started_at >= ?
            """,
            (since,),
        ).fetchone()

    d = dict(row)
    d["avg_blink_rate"] = round(d["avg_blink_rate"], 1)
    d["avg_health_score"] = round(d["avg_health_score"])
    d["lowest_ear"] = round(d["lowest_ear"], 3)
    d["days"] = days
    return d


def delete_session(session_id):
    with connect() as conn:
        cur = conn.execute("DELETE FROM sessions WHERE id = ?", (session_id,))
    return cur.rowcount > 0


def clear_all():
    with connect() as conn:
        conn.execute("DELETE FROM sessions")
