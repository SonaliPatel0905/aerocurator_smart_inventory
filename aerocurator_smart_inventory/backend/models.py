"""
AeroCurator – Database Models & Schema
SQLite database helpers with parameterized queries.
"""

import sqlite3
import bcrypt
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "database.db")


def get_db():
    """Return a database connection with row_factory for dict-like access."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init_db():
    """Initialize the database schema and seed default data."""
    conn = get_db()
    cur = conn.cursor()

    # ── Users ──────────────────────────────────────────────────────────────────
    cur.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id            INTEGER PRIMARY KEY AUTOINCREMENT,
            name          TEXT    NOT NULL DEFAULT '',
            email         TEXT    NOT NULL UNIQUE,
            password_hash TEXT    NOT NULL,
            role          TEXT    NOT NULL DEFAULT 'user'
                          CHECK(role IN ('admin','user')),
            created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
        )
    """)

    # ── Migrate: add 'name' column if it doesn't exist yet ────────────────────
    existing_cols = [r[1] for r in cur.execute("PRAGMA table_info(users)").fetchall()]
    if "name" not in existing_cols:
        cur.execute("ALTER TABLE users ADD COLUMN name TEXT NOT NULL DEFAULT ''")
        conn.commit()

    # ── Inventory ─────────────────────────────────────────────────────────────
    cur.execute("""
        CREATE TABLE IF NOT EXISTS inventory (
            id                  INTEGER PRIMARY KEY AUTOINCREMENT,
            name                TEXT    NOT NULL,
            category            TEXT    NOT NULL,
            sku                 TEXT    UNIQUE,
            quantity            INTEGER NOT NULL DEFAULT 0,
            price               REAL    NOT NULL DEFAULT 0.0,
            low_stock_threshold INTEGER NOT NULL DEFAULT 10,
            created_at          TEXT    NOT NULL DEFAULT (datetime('now')),
            updated_at          TEXT    NOT NULL DEFAULT (datetime('now'))
        )
    """)

    # ── Purchases ─────────────────────────────────────────────────────────────
    cur.execute("""
        CREATE TABLE IF NOT EXISTS purchases (
            id             INTEGER PRIMARY KEY AUTOINCREMENT,
            supplier       TEXT    NOT NULL,
            component_id   INTEGER NOT NULL REFERENCES inventory(id),
            quantity       INTEGER NOT NULL,
            cost_per_unit  REAL    NOT NULL,
            total_cost     REAL    NOT NULL,
            date           TEXT    NOT NULL DEFAULT (date('now')),
            notes          TEXT    DEFAULT ''
        )
    """)

    # ── Sales ─────────────────────────────────────────────────────────────────
    cur.execute("""
        CREATE TABLE IF NOT EXISTS sales (
            id             INTEGER PRIMARY KEY AUTOINCREMENT,
            component_id   INTEGER NOT NULL REFERENCES inventory(id),
            quantity       INTEGER NOT NULL,
            price_per_unit REAL    NOT NULL,
            total_price    REAL    NOT NULL,
            date           TEXT    NOT NULL DEFAULT (date('now')),
            customer       TEXT    DEFAULT ''
        )
    """)

    conn.commit()

    # ── Seed default admin user (only if users table is empty) ────────────────
    row = cur.execute("SELECT COUNT(*) as cnt FROM users").fetchone()
    if row["cnt"] == 0:
        _seed_data(cur)
        conn.commit()

    conn.close()


def _seed_data(cur):
    """Insert demo admin, user, and 12 starter drone components."""

    # Default admin
    admin_hash = bcrypt.hashpw(b"admin123", bcrypt.gensalt()).decode()
    cur.execute(
        "INSERT INTO users (name, email, password_hash, role) VALUES (?,?,?,?)",
        ("AeroCurator Admin", "admin@aerocurator.io", admin_hash, "admin"),
    )

    # Default regular user
    user_hash = bcrypt.hashpw(b"user1234", bcrypt.gensalt()).decode()
    cur.execute(
        "INSERT INTO users (name, email, password_hash, role) VALUES (?,?,?,?)",
        ("Pilot User", "pilot@aerocurator.io", user_hash, "user"),
    )

    # Seed inventory – realistic drone components
    components = [
        ("LiPo Battery 6S 5000mAh",       "Power",       "AC-BAT-001",  45,  89.99,  8),
        ("Brushless Motor 2306 2450KV",    "Propulsion",  "AC-MOT-001",  120, 34.50,  15),
        ("30x30 ESC 45A BLHeli32",         "Electronics", "AC-ESC-001",  78,  28.00,  10),
        ("Carbon Fiber Frame 5\" FPV",     "Structure",   "AC-FRM-001",  22,  65.00,  5),
        ("Flight Controller F7 Stack",     "Electronics", "AC-FC-001",   18,  110.00, 5),
        ("FPV Camera 1200TVL",             "Optics",      "AC-CAM-001",  55,  42.00,  10),
        ("Video Transmitter 800mW",        "RF Systems",  "AC-VTX-001",  33,  38.50,  8),
        ("5\" Propellers HQ 3-Blade",      "Propulsion",  "AC-PROP-001", 300, 4.99,   50),
        ("RC Receiver FrSky XM+",          "RF Systems",  "AC-RCV-001",  60,  19.99,  12),
        ("GPS Module M8N",                 "Navigation",  "AC-GPS-001",  7,   45.00,  10),
        ("LiPo Charger 400W Dual Port",    "Power",       "AC-CHR-001",  14,  85.00,  5),
        ("XT60 Connectors (10 pairs)",     "Electronics", "AC-CON-001",  200, 6.99,   30),
    ]

    cur.executemany(
        """INSERT INTO inventory
           (name, category, sku, quantity, price, low_stock_threshold)
           VALUES (?,?,?,?,?,?)""",
        components,
    )

    # Seed a few purchases
    purchases = [
        ("DronePartsHub",   1,  20, 82.00,  1640.00, "2026-03-15"),
        ("AeroSupply Co",   2,  50, 32.00,  1600.00, "2026-03-18"),
        ("TechFlight Store",3,  30, 25.00,  750.00,  "2026-03-20"),
        ("DronePartsHub",   5,  10, 105.00, 1050.00, "2026-04-01"),
        ("AeroSupply Co",   8,  200,4.50,   900.00,  "2026-04-05"),
    ]
    cur.executemany(
        """INSERT INTO purchases
           (supplier, component_id, quantity, cost_per_unit, total_cost, date)
           VALUES (?,?,?,?,?,?)""",
        purchases,
    )

    # Seed a few sales
    sales = [
        (1,  5,  92.00,  460.00, "2026-03-22", "AeroFleet Inc"),
        (2,  20, 38.00,  760.00, "2026-03-25", "SkyRace Team"),
        (8,  80, 5.50,   440.00, "2026-04-02", "FPV Club"),
        (3,  10, 32.00,  320.00, "2026-04-08", "TechPilots LLC"),
        (6,  15, 48.00,  720.00, "2026-04-10", "AeroFleet Inc"),
    ]
    cur.executemany(
        """INSERT INTO sales
           (component_id, quantity, price_per_unit, total_price, date, customer)
           VALUES (?,?,?,?,?,?)""",
        sales,
    )


# ── Helper query functions ──────────────────────────────────────────────────

def rows_to_list(rows):
    """Convert sqlite3.Row list → plain list of dicts."""
    return [dict(r) for r in rows]


def get_inventory_item(conn, item_id):
    return conn.execute(
        "SELECT * FROM inventory WHERE id = ?", (item_id,)
    ).fetchone()


def update_stock(conn, item_id, delta):
    """Add delta (positive=increase, negative=decrease) to stock.
    Raises ValueError if result would be negative."""
    row = get_inventory_item(conn, item_id)
    if row is None:
        raise ValueError(f"Inventory item {item_id} not found")
    new_qty = row["quantity"] + delta
    if new_qty < 0:
        raise ValueError(
            f"Insufficient stock. Available: {row['quantity']}, Requested: {-delta}"
        )
    conn.execute(
        "UPDATE inventory SET quantity = ?, updated_at = datetime('now') WHERE id = ?",
        (new_qty, item_id),
    )
    return new_qty
