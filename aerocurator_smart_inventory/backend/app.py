"""
AeroCurator – Flask REST API + Static Frontend Server
Run: python app.py
Visit: http://localhost:5000
"""

import os
import secrets
import functools
from datetime import datetime

import bcrypt
from flask import Flask, request, jsonify, g, send_from_directory, redirect
from flask_cors import CORS

from models import (
    init_db, get_db, rows_to_list,
    get_inventory_item, update_stock
)

# Resolve the frontend directory (one level up from backend/)
FRONTEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "frontend"))

app = Flask(__name__)
app.secret_key = secrets.token_hex(32)
CORS(app, resources={r"/*": {"origins": "*"}})

# ── Simple in-memory token store (sufficient for local dev) ────────────────
# token → { "user_id": int, "email": str, "role": str }
TOKEN_STORE: dict = {}


# ════════════════════════════════════════════════════════════════════════════
# Auth helpers
# ════════════════════════════════════════════════════════════════════════════

def require_auth(f):
    """Decorator: validates Bearer token and injects g.current_user."""
    @functools.wraps(f)
    def wrapper(*args, **kwargs):
        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            return jsonify({"error": "Missing or invalid Authorization header"}), 401
        token = auth_header[7:]
        user = TOKEN_STORE.get(token)
        if not user:
            return jsonify({"error": "Invalid or expired token"}), 401
        g.current_user = user
        return f(*args, **kwargs)
    return wrapper


def require_admin(f):
    """Decorator: requires admin role (must be applied after require_auth)."""
    @functools.wraps(f)
    def wrapper(*args, **kwargs):
        if g.current_user.get("role") != "admin":
            return jsonify({"error": "Admin access required"}), 403
        return f(*args, **kwargs)
    return wrapper


def ok(data=None, message="success", status=200):
    body = {"status": "ok", "message": message}
    if data is not None:
        body["data"] = data
    return jsonify(body), status


def err(message, status=400):
    return jsonify({"status": "error", "message": message}), status


# ════════════════════════════════════════════════════════════════════════════
# Auth Routes
# ════════════════════════════════════════════════════════════════════════════

@app.route("/register", methods=["POST"])
def register():
    body = request.get_json(silent=True) or {}
    name     = (body.get("name") or "").strip()
    email    = (body.get("email") or "").strip().lower()
    password = body.get("password") or ""
    confirm  = body.get("confirm_password") or ""
    role     = body.get("role", "user")

    # ── Validate ───────────────────────────────────────────────────────────────
    if not name:
        return err("Full name is required")
    if len(name) < 2:
        return err("Name must be at least 2 characters")
    if not email or not password:
        return err("Email and password are required")
    if role not in ("admin", "user"):
        return err("Role must be 'admin' or 'user'")
    if len(password) < 6:
        return err("Password must be at least 6 characters")
    if confirm and confirm != password:
        return err("Passwords do not match")

    pw_hash = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()
    conn = get_db()
    try:
        cur = conn.execute(
            "INSERT INTO users (name, email, password_hash, role) VALUES (?,?,?,?)",
            (name, email, pw_hash, role)
        )
        conn.commit()
        new_id = cur.lastrowid
    except Exception:
        conn.close()
        return err("Email already registered", 409)
    row = conn.execute("SELECT id, name, email, role, created_at FROM users WHERE id=?", (new_id,)).fetchone()
    conn.close()
    return ok(dict(row), "Account created successfully", 201)


@app.route("/login", methods=["POST"])
def login():
    body = request.get_json(silent=True) or {}
    email    = (body.get("email") or "").strip().lower()
    password = body.get("password") or ""

    if not email or not password:
        return err("Email and password are required")

    conn = get_db()
    row = conn.execute(
        "SELECT * FROM users WHERE email = ?", (email,)
    ).fetchone()
    conn.close()

    if not row or not bcrypt.checkpw(password.encode(), row["password_hash"].encode()):
        return err("Invalid credentials", 401)

    token = secrets.token_hex(32)
    TOKEN_STORE[token] = {
        "user_id": row["id"],
        "name":    row["name"],
        "email":   row["email"],
        "role":    row["role"],
    }
    return ok({
        "token": token,
        "name":  row["name"],
        "email": row["email"],
        "role":  row["role"],
    })


@app.route("/logout", methods=["POST"])
@require_auth
def logout():
    auth_header = request.headers.get("Authorization", "")
    token = auth_header[7:]
    TOKEN_STORE.pop(token, None)
    return ok(message="Logged out")


@app.route("/me", methods=["GET"])
@require_auth
def me():
    conn = get_db()
    row  = conn.execute(
        "SELECT id, name, email, role, created_at FROM users WHERE id=?",
        (g.current_user["user_id"],)
    ).fetchone()
    conn.close()
    return ok(dict(row) if row else g.current_user)


@app.route("/profile", methods=["PUT"])
@require_auth
def update_profile():
    """Update current user's display name."""
    body = request.get_json(silent=True) or {}
    name = (body.get("name") or "").strip()
    if len(name) < 2:
        return err("Name must be at least 2 characters")

    conn = get_db()
    conn.execute(
        "UPDATE users SET name=? WHERE id=?",
        (name, g.current_user["user_id"])
    )
    conn.commit()
    # Patch the in-memory token store so initTopbar stays in sync
    for t, u in TOKEN_STORE.items():
        if u["user_id"] == g.current_user["user_id"]:
            u["name"] = name
    row = conn.execute(
        "SELECT id, name, email, role FROM users WHERE id=?",
        (g.current_user["user_id"],)
    ).fetchone()
    conn.close()
    return ok(dict(row), "Profile updated")


@app.route("/profile/password", methods=["PUT"])
@require_auth
def change_password():
    """Change current user's password (requires current password)."""
    body      = request.get_json(silent=True) or {}
    current   = body.get("current_password") or ""
    new_pw    = body.get("new_password")     or ""
    confirm   = body.get("confirm_password") or ""

    if not current or not new_pw:
        return err("Current and new password are required")
    if len(new_pw) < 6:
        return err("New password must be at least 6 characters")
    if new_pw != confirm:
        return err("Passwords do not match")

    conn = get_db()
    row  = conn.execute("SELECT * FROM users WHERE id=?", (g.current_user["user_id"],)).fetchone()
    if not row or not bcrypt.checkpw(current.encode(), row["password_hash"].encode()):
        conn.close()
        return err("Current password is incorrect", 401)

    pw_hash = bcrypt.hashpw(new_pw.encode(), bcrypt.gensalt()).decode()
    conn.execute("UPDATE users SET password_hash=? WHERE id=?", (pw_hash, g.current_user["user_id"]))
    conn.commit()
    conn.close()
    return ok(message="Password changed successfully")


# ── User Management (Admin only) ────────────────────────────────────────

@app.route("/api/users", methods=["GET"])
@require_auth
@require_admin
def list_users():
    """List all registered users (admin only)."""
    conn  = get_db()
    rows  = conn.execute(
        "SELECT id, name, email, role, created_at FROM users ORDER BY created_at DESC"
    ).fetchall()
    conn.close()
    return ok(rows_to_list(rows))


@app.route("/api/users/<int:user_id>/role", methods=["PUT"])
@require_auth
@require_admin
def update_user_role(user_id):
    """Change a user's role (admin only). Cannot change own role."""
    if user_id == g.current_user["user_id"]:
        return err("You cannot change your own role")
    body = request.get_json(silent=True) or {}
    role = body.get("role")
    if role not in ("admin", "user"):
        return err("Role must be 'admin' or 'user'")
    conn = get_db()
    conn.execute("UPDATE users SET role=? WHERE id=?", (role, user_id))
    conn.commit()
    # Patch TOKEN_STORE for this user if they're logged in
    for t, u in TOKEN_STORE.items():
        if u["user_id"] == user_id:
            u["role"] = role
    row = conn.execute("SELECT id, name, email, role FROM users WHERE id=?", (user_id,)).fetchone()
    conn.close()
    if not row:
        return err("User not found", 404)
    return ok(dict(row), "Role updated")


@app.route("/api/users/<int:user_id>", methods=["DELETE"])
@require_auth
@require_admin
def delete_user(user_id):
    """Delete a user account (admin only). Cannot delete self."""
    if user_id == g.current_user["user_id"]:
        return err("You cannot delete your own account")
    conn = get_db()
    row  = conn.execute("SELECT id FROM users WHERE id=?", (user_id,)).fetchone()
    if not row:
        conn.close()
        return err("User not found", 404)
    conn.execute("DELETE FROM users WHERE id=?", (user_id,))
    conn.commit()
    conn.close()
    # Evict any active tokens for this user
    to_remove = [t for t, u in TOKEN_STORE.items() if u["user_id"] == user_id]
    for t in to_remove:
        TOKEN_STORE.pop(t, None)
    return ok(message="User deleted")


# ════════════════════════════════════════════════════════════════════════════
# Inventory Routes
# ════════════════════════════════════════════════════════════════════════════

@app.route("/api/inventory", methods=["GET"])
@require_auth
def get_inventory():
    category = request.args.get("category")
    search = request.args.get("search")
    conn = get_db()
    query = "SELECT * FROM inventory WHERE 1=1"
    params = []
    if category:
        query += " AND category = ?"
        params.append(category)
    if search:
        query += " AND (name LIKE ? OR sku LIKE ?)"
        params += [f"%{search}%", f"%{search}%"]
    query += " ORDER BY name"
    rows = conn.execute(query, params).fetchall()
    conn.close()
    return ok(rows_to_list(rows))


@app.route("/api/inventory/add", methods=["POST"])
@require_auth
@require_admin
def add_inventory():
    body = request.get_json(silent=True) or {}
    name = (body.get("name") or "").strip()
    category = (body.get("category") or "").strip()
    sku = (body.get("sku") or "").strip() or None
    quantity = body.get("quantity", 0)
    price = body.get("price", 0.0)
    threshold = body.get("low_stock_threshold", 10)

    if not name or not category:
        return err("Name and category are required")
    try:
        quantity = int(quantity)
        price = float(price)
        threshold = int(threshold)
    except (ValueError, TypeError):
        return err("quantity, price, and low_stock_threshold must be numbers")

    conn = get_db()
    try:
        cur = conn.execute(
            """INSERT INTO inventory
               (name, category, sku, quantity, price, low_stock_threshold)
               VALUES (?,?,?,?,?,?)""",
            (name, category, sku, quantity, price, threshold)
        )
        conn.commit()
        new_id = cur.lastrowid
    except Exception as e:
        conn.close()
        return err(str(e))
    row = get_inventory_item(conn, new_id)
    conn.close()
    return ok(dict(row), "Item added", 201)


@app.route("/api/inventory/update/<int:item_id>", methods=["PUT"])
@require_auth
@require_admin
def update_inventory(item_id):
    body = request.get_json(silent=True) or {}
    conn = get_db()
    row = get_inventory_item(conn, item_id)
    if not row:
        conn.close()
        return err("Item not found", 404)

    name = (body.get("name") or row["name"]).strip()
    category = (body.get("category") or row["category"]).strip()
    sku = body.get("sku", row["sku"])
    quantity = body.get("quantity", row["quantity"])
    price = body.get("price", row["price"])
    threshold = body.get("low_stock_threshold", row["low_stock_threshold"])

    try:
        quantity = int(quantity)
        price = float(price)
        threshold = int(threshold)
    except (ValueError, TypeError):
        conn.close()
        return err("Invalid numeric field")

    conn.execute(
        """UPDATE inventory
           SET name=?, category=?, sku=?, quantity=?, price=?,
               low_stock_threshold=?, updated_at=datetime('now')
           WHERE id=?""",
        (name, category, sku, quantity, price, threshold, item_id)
    )
    conn.commit()
    updated = get_inventory_item(conn, item_id)
    conn.close()
    return ok(dict(updated), "Item updated")


@app.route("/api/inventory/delete/<int:item_id>", methods=["DELETE"])
@require_auth
@require_admin
def delete_inventory(item_id):
    conn = get_db()
    row = get_inventory_item(conn, item_id)
    if not row:
        conn.close()
        return err("Item not found", 404)
    conn.execute("DELETE FROM inventory WHERE id = ?", (item_id,))
    conn.commit()
    conn.close()
    return ok(message="Item deleted")


@app.route("/api/inventory/categories", methods=["GET"])
@require_auth
def get_categories():
    conn = get_db()
    rows = conn.execute(
        "SELECT DISTINCT category FROM inventory ORDER BY category"
    ).fetchall()
    conn.close()
    return ok([r["category"] for r in rows])


# ════════════════════════════════════════════════════════════════════════════
# Purchase Routes
# ════════════════════════════════════════════════════════════════════════════

@app.route("/api/purchases", methods=["GET"])
@require_auth
def get_purchases():
    conn = get_db()
    rows = conn.execute("""
        SELECT p.*, i.name as component_name, i.sku
        FROM purchases p
        JOIN inventory i ON i.id = p.component_id
        ORDER BY p.date DESC, p.id DESC
    """).fetchall()
    conn.close()
    return ok(rows_to_list(rows))


@app.route("/api/purchase", methods=["POST"])
@require_auth
def add_purchase():
    body = request.get_json(silent=True) or {}
    supplier = (body.get("supplier") or "").strip()
    component_id = body.get("component_id")
    quantity = body.get("quantity")
    cost_per_unit = body.get("cost_per_unit")
    date = body.get("date") or datetime.utcnow().date().isoformat()
    notes = (body.get("notes") or "").strip()

    if not supplier or not component_id or not quantity or cost_per_unit is None:
        return err("supplier, component_id, quantity, cost_per_unit are required")
    try:
        component_id = int(component_id)
        quantity = int(quantity)
        cost_per_unit = float(cost_per_unit)
    except (ValueError, TypeError):
        return err("Invalid numeric values")
    if quantity <= 0:
        return err("Quantity must be positive")

    total_cost = round(quantity * cost_per_unit, 2)

    conn = get_db()
    if not get_inventory_item(conn, component_id):
        conn.close()
        return err("Component not found", 404)

    try:
        update_stock(conn, component_id, quantity)
        cur = conn.execute(
            """INSERT INTO purchases
               (supplier, component_id, quantity, cost_per_unit, total_cost, date, notes)
               VALUES (?,?,?,?,?,?,?)""",
            (supplier, component_id, quantity, cost_per_unit, total_cost, date, notes)
        )
        conn.commit()
        new_id = cur.lastrowid
    except ValueError as ve:
        conn.close()
        return err(str(ve))

    row = conn.execute("SELECT * FROM purchases WHERE id=?", (new_id,)).fetchone()
    conn.close()
    return ok(dict(row), "Purchase recorded", 201)


# ════════════════════════════════════════════════════════════════════════════
# Sales Routes
# ════════════════════════════════════════════════════════════════════════════

@app.route("/api/sales", methods=["GET"])
@require_auth
def get_sales():
    conn = get_db()
    rows = conn.execute("""
        SELECT s.*, i.name as component_name, i.sku
        FROM sales s
        JOIN inventory i ON i.id = s.component_id
        ORDER BY s.date DESC, s.id DESC
    """).fetchall()
    conn.close()
    return ok(rows_to_list(rows))


@app.route("/api/sales", methods=["POST"])
@require_auth
def add_sale():
    body = request.get_json(silent=True) or {}
    component_id = body.get("component_id")
    quantity = body.get("quantity")
    price_per_unit = body.get("price_per_unit")
    date = body.get("date") or datetime.utcnow().date().isoformat()
    customer = (body.get("customer") or "").strip()

    if not component_id or not quantity or price_per_unit is None:
        return err("component_id, quantity, price_per_unit are required")
    try:
        component_id = int(component_id)
        quantity = int(quantity)
        price_per_unit = float(price_per_unit)
    except (ValueError, TypeError):
        return err("Invalid numeric values")
    if quantity <= 0:
        return err("Quantity must be positive")

    total_price = round(quantity * price_per_unit, 2)

    conn = get_db()
    try:
        update_stock(conn, component_id, -quantity)  # negative = decrease
        cur = conn.execute(
            """INSERT INTO sales
               (component_id, quantity, price_per_unit, total_price, date, customer)
               VALUES (?,?,?,?,?,?)""",
            (component_id, quantity, price_per_unit, total_price, date, customer)
        )
        conn.commit()
        new_id = cur.lastrowid
    except ValueError as ve:
        conn.rollback()
        conn.close()
        return err(str(ve), 409)

    row = conn.execute("SELECT * FROM sales WHERE id=?", (new_id,)).fetchone()
    conn.close()
    return ok(dict(row), "Sale recorded", 201)


# ════════════════════════════════════════════════════════════════════════════
# Alerts Route
# ════════════════════════════════════════════════════════════════════════════

@app.route("/api/alerts", methods=["GET"])
@require_auth
def get_alerts():
    conn = get_db()
    rows = conn.execute("""
        SELECT *,
               CASE
                   WHEN quantity = 0 THEN 'critical'
                   WHEN quantity <= low_stock_threshold * 0.5 THEN 'warning'
                   ELSE 'low'
               END as severity
        FROM inventory
        WHERE quantity <= low_stock_threshold
        ORDER BY quantity ASC
    """).fetchall()
    conn.close()
    return ok(rows_to_list(rows))


# ════════════════════════════════════════════════════════════════════════════
# Dashboard & Reports
# ════════════════════════════════════════════════════════════════════════════

@app.route("/api/dashboard/stats", methods=["GET"])
@require_auth
def dashboard_stats():
    conn = get_db()

    total_items = conn.execute(
        "SELECT COUNT(*) as c FROM inventory"
    ).fetchone()["c"]

    total_value = conn.execute(
        "SELECT COALESCE(SUM(quantity*price),0) as v FROM inventory"
    ).fetchone()["v"]

    month = datetime.utcnow().strftime("%Y-%m")
    purchases_month = conn.execute(
        "SELECT COALESCE(SUM(total_cost),0) as v FROM purchases WHERE date LIKE ?",
        (f"{month}%",)
    ).fetchone()["v"]

    sales_month = conn.execute(
        "SELECT COALESCE(SUM(total_price),0) as v FROM sales WHERE date LIKE ?",
        (f"{month}%",)
    ).fetchone()["v"]

    low_stock_count = conn.execute(
        "SELECT COUNT(*) as c FROM inventory WHERE quantity <= low_stock_threshold"
    ).fetchone()["c"]

    recent_purchases = rows_to_list(conn.execute("""
        SELECT p.date, p.supplier, i.name as component, p.quantity, p.total_cost
        FROM purchases p JOIN inventory i ON i.id=p.component_id
        ORDER BY p.date DESC, p.id DESC LIMIT 5
    """).fetchall())

    recent_sales = rows_to_list(conn.execute("""
        SELECT s.date, s.customer, i.name as component, s.quantity, s.total_price
        FROM sales s JOIN inventory i ON i.id=s.component_id
        ORDER BY s.date DESC, s.id DESC LIMIT 5
    """).fetchall())

    conn.close()
    return ok({
        "total_items": total_items,
        "total_value": round(total_value, 2),
        "purchases_this_month": round(purchases_month, 2),
        "sales_this_month": round(sales_month, 2),
        "low_stock_count": low_stock_count,
        "recent_purchases": recent_purchases,
        "recent_sales": recent_sales,
    })


@app.route("/api/reports/data", methods=["GET"])
@require_auth
def reports_data():
    conn = get_db()

    # Category breakdown
    cat_rows = rows_to_list(conn.execute("""
        SELECT category, COUNT(*) as item_count,
               SUM(quantity) as total_qty,
               SUM(quantity*price) as total_value
        FROM inventory GROUP BY category ORDER BY total_value DESC
    """).fetchall())

    # Monthly sales (last 6 months)
    monthly_sales = rows_to_list(conn.execute("""
        SELECT strftime('%Y-%m', date) as month,
               SUM(total_price) as revenue,
               SUM(quantity) as units_sold
        FROM sales
        GROUP BY month
        ORDER BY month ASC
        LIMIT 6
    """).fetchall())

    # Top 5 selling components
    top_components = rows_to_list(conn.execute("""
        SELECT i.name, i.category, SUM(s.quantity) as total_sold,
               SUM(s.total_price) as total_revenue
        FROM sales s JOIN inventory i ON i.id=s.component_id
        GROUP BY s.component_id ORDER BY total_sold DESC LIMIT 5
    """).fetchall())

    # Monthly purchases (last 6 months)
    monthly_purchases = rows_to_list(conn.execute("""
        SELECT strftime('%Y-%m', date) as month,
               SUM(total_cost) as cost,
               SUM(quantity) as units_bought
        FROM purchases
        GROUP BY month ORDER BY month ASC LIMIT 6
    """).fetchall())

    conn.close()
    return ok({
        "category_breakdown": cat_rows,
        "monthly_sales": monthly_sales,
        "monthly_purchases": monthly_purchases,
        "top_components": top_components,
    })


# ════════════════════════════════════════════════════════════════════════════
# Frontend Static File Serving
# ════════════════════════════════════════════════════════════════════════════

@app.route("/", methods=["GET"])
def serve_login():
    """Root → Login page."""
    return send_from_directory(FRONTEND_DIR, "index.html")


@app.route("/dashboard")
def serve_dashboard():
    return send_from_directory(os.path.join(FRONTEND_DIR, "dashboard"), "dashboard.html")


@app.route("/inventory")
def serve_inventory():
    return send_from_directory(os.path.join(FRONTEND_DIR, "inventory"), "inventory.html")


@app.route("/purchase")
def serve_purchase():
    return send_from_directory(os.path.join(FRONTEND_DIR, "purchase"), "purchase.html")


@app.route("/sales")
def serve_sales():
    return send_from_directory(os.path.join(FRONTEND_DIR, "sales"), "sales.html")


@app.route("/alerts")
def serve_alerts():
    return send_from_directory(os.path.join(FRONTEND_DIR, "alerts"), "alerts.html")


@app.route("/reports")
def serve_reports():
    return send_from_directory(os.path.join(FRONTEND_DIR, "reports"), "reports.html")


@app.route("/signup")
def serve_signup():
    return send_from_directory(os.path.join(FRONTEND_DIR, "signup"), "signup.html")


@app.route("/static/signup/<path:filename>")
def serve_signup_js(filename):
    return send_from_directory(os.path.join(FRONTEND_DIR, "signup"), filename)


@app.route("/profile")
def serve_profile():
    return send_from_directory(os.path.join(FRONTEND_DIR, "profile"), "profile.html")


@app.route("/static/profile/<path:filename>")
def serve_profile_js(filename):
    return send_from_directory(os.path.join(FRONTEND_DIR, "profile"), filename)


@app.route("/users")
def serve_users():
    return send_from_directory(os.path.join(FRONTEND_DIR, "users"), "users.html")


@app.route("/static/users/<path:filename>")
def serve_users_js(filename):
    return send_from_directory(os.path.join(FRONTEND_DIR, "users"), filename)


# Serve any static asset (css, js, images) under /frontend/
@app.route("/static/css/<path:filename>")
def serve_css(filename):
    return send_from_directory(os.path.join(FRONTEND_DIR, "css"), filename)


@app.route("/static/js/<path:filename>")
def serve_js(filename):
    return send_from_directory(os.path.join(FRONTEND_DIR, "js"), filename)


@app.route("/static/dashboard/<path:filename>")
def serve_dashboard_js(filename):
    return send_from_directory(os.path.join(FRONTEND_DIR, "dashboard"), filename)


@app.route("/static/inventory/<path:filename>")
def serve_inventory_js(filename):
    return send_from_directory(os.path.join(FRONTEND_DIR, "inventory"), filename)


@app.route("/static/purchase/<path:filename>")
def serve_purchase_js(filename):
    return send_from_directory(os.path.join(FRONTEND_DIR, "purchase"), filename)


@app.route("/static/sales/<path:filename>")
def serve_sales_js(filename):
    return send_from_directory(os.path.join(FRONTEND_DIR, "sales"), filename)


@app.route("/static/alerts/<path:filename>")
def serve_alerts_js(filename):
    return send_from_directory(os.path.join(FRONTEND_DIR, "alerts"), filename)


@app.route("/static/reports/<path:filename>")
def serve_reports_js(filename):
    return send_from_directory(os.path.join(FRONTEND_DIR, "reports"), filename)


# ════════════════════════════════════════════════════════════════════════════
# App entry-point
# ════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    init_db()
    print("\n  [AeroCurator] API running at http://localhost:5000\n")
    print("  Default credentials:")
    print("    Admin  -> admin@aerocurator.io  / admin123")
    print("    User   -> pilot@aerocurator.io  / user1234\n")
    app.run(debug=True, port=5000)
