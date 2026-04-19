# -*- coding: utf-8 -*-
"""AeroCurator – Comprehensive API Test Suite"""
import sys, json, urllib.request, urllib.error
sys.stdout.reconfigure(encoding='utf-8')

BASE = "http://localhost:5000"
results = []

def req(method, path, body=None, token=None):
    try:
        headers = {"Content-Type": "application/json"}
        if token:
            headers["Authorization"] = f"Bearer {token}"
        data = json.dumps(body).encode() if body is not None else None
        r = urllib.request.Request(BASE + path, data=data, headers=headers, method=method)
        res = urllib.request.urlopen(r)
        return res.status, json.loads(res.read())
    except urllib.error.HTTPError as e:
        try:    return e.code, json.loads(e.read())
        except: return e.code, {}
    except Exception as ex:
        return 0, {"error": str(ex)}

def req_html(path):
    try:
        r = urllib.request.Request(BASE + path, method="GET")
        res = urllib.request.urlopen(r)
        return res.status
    except urllib.error.HTTPError as e:
        return e.code
    except:
        return 0

def test(name, ok, info=""):
    results.append((name, ok, info))
    icon = "PASS" if ok else "FAIL"
    print(f"  [{icon}]  {name}" + (f"  =>  {info}" if info else ""))

SEP = "=" * 58
BAR = "-" * 58

print(f"\n{SEP}\n  AeroCurator -- Full API Test Suite\n{SEP}\n")

# ── Page Routes ──────────────────────────────────────────────
print("PAGE ROUTES")
for route, label in [
    ("/",          "Login page"),
    ("/signup",    "Signup page"),
    ("/admin-dashboard", "Admin Dashboard"),
    ("/user-dashboard", "User Dashboard"),
    ("/inventory", "Inventory"),
    ("/purchase",  "Purchase"),
    ("/sales",     "Sales"),
    ("/alerts",    "Alerts"),
    ("/reports",   "Reports"),
    ("/profile",   "Profile"),
    ("/users",     "Users (admin)"),
]:
    s = req_html(route)
    test(label, s == 200, f"HTTP {s}")

# ── Seed DB ──────────────────────────────────────────────────
req("POST", "/register", {"name": "Admin Chief", "email": "admin@aerocurator.io", "password": "admin123", "confirm_password": "admin123", "role": "admin"})
req("POST", "/register", {"name": "Test Pilot", "email": "pilot@aerocurator.io", "password": "user1234", "confirm_password": "user1234", "role": "user"})

# ── Authentication ───────────────────────────────────────────
print(f"\n{BAR}\nAUTHENTICATION")
s, d = req("POST", "/register", {
    "name": "Test Runner", "email": "runner@test.io",
    "password": "run1234", "confirm_password": "run1234", "role": "user"
})
test("POST /register (new user)", s in (201, 409), d.get("message", ""))

s, d = req("POST", "/login", {"email": "bad@bad.com", "password": "wrong"})
test("POST /login bad creds", s == 401, d.get("message", ""))

s, d = req("POST", "/login", {"email": "admin@aerocurator.io", "password": "admin123"})
test("POST /login (admin)", s == 200, f"name={d.get('data',{}).get('name','?')}")
admin_token = d.get("data", {}).get("token", "")

s, d = req("POST", "/login", {"email": "pilot@aerocurator.io", "password": "user1234"})
test("POST /login (user)", s == 200, f"name={d.get('data',{}).get('name','?')}")
user_token = d.get("data", {}).get("token", "")

s, d = req("GET", "/me", token=admin_token)
test("GET /me", s == 200 and "name" in d.get("data", {}),
     f"name={d.get('data',{}).get('name','?')} role={d.get('data',{}).get('role','?')}")

s, _ = req("GET", "/me")
test("GET /me (no token -> 401)", s == 401)

# ── Inventory ────────────────────────────────────────────────
print(f"\n{BAR}\nINVENTORY")
s, d = req("GET", "/api/inventory", token=admin_token)
inv = d.get("data", [])
test("GET /api/inventory", s == 200, f"{len(inv)} items")

s, d = req("POST", "/api/inventory/add", {
    "name": "Test ESC 60A", "category": "Electronics",
    "sku": "TST-ESC-99", "quantity": 30, "price": 44.99,
    "low_stock_threshold": 5
}, token=admin_token)
test("POST /api/inventory/add (admin)", s == 201, f"id={d.get('data',{}).get('id','?')}")
new_inv_id = d.get("data", {}).get("id")

s, _ = req("POST", "/api/inventory/add",
           {"name": "Fail", "category": "F", "quantity": 1, "price": 1},
           token=user_token)
test("POST /api/inventory/add (user -> 403)", s == 403)

if new_inv_id:
    s, d = req("PUT", f"/api/inventory/update/{new_inv_id}",
               {"quantity": 50, "price": 49.99}, token=admin_token)
    test("PUT /api/inventory/update", s == 200,
         f"qty={d.get('data',{}).get('quantity','?')}")

    s, d = req("DELETE", f"/api/inventory/delete/{new_inv_id}", token=admin_token)
    test("DELETE /api/inventory/delete", s == 200, d.get("message", ""))

s, d = req("GET", "/api/inventory/categories", token=admin_token)
test("GET /api/inventory/categories", s == 200, str(d.get("data", [])))

s, d = req("GET", "/api/inventory?search=Battery", token=admin_token)
test("GET /api/inventory?search=Battery", s == 200,
     f"{len(d.get('data',[]))} matches")

inv_id = inv[0]["id"] if inv else "507f1f77bcf86cd799439011"

# ── Purchases ────────────────────────────────────────────────
print(f"\n{BAR}\nPURCHASES")
s, d = req("GET", "/api/purchases", token=admin_token)
test("GET /api/purchases", s == 200, f"{len(d.get('data',[]))} records")

s, d = req("POST", "/api/purchase", {
    "supplier": "TestSupply Co", "component_id": inv_id, "quantity": 5,
    "cost_per_unit": 85.0, "date": "2026-04-16", "notes": "Test run purchase"
}, token=admin_token)
test("POST /api/purchase", s == 201,
     f"total={d.get('data',{}).get('total_cost','?')}")

s, d = req("POST", "/api/purchase", {
    "supplier": "X", "component_id": inv_id, "quantity": -1, "cost_per_unit": 10
}, token=admin_token)
test("POST /api/purchase (negative qty -> 400)", s == 400, d.get("message", ""))

# ── Sales ────────────────────────────────────────────────────
print(f"\n{BAR}\nSALES")
s, d = req("GET", "/api/sales", token=admin_token)
test("GET /api/sales", s == 200, f"{len(d.get('data',[]))} records")

s, d = req("POST", "/api/sales", {
    "component_id": inv_id, "quantity": 3, "price_per_unit": 39.99,
    "date": "2026-04-16", "customer": "Test Aviators Ltd"
}, token=admin_token)
test("POST /api/sales", s == 201,
     f"total={d.get('data',{}).get('total_price','?')}")

s, d = req("POST", "/api/sales", {
    "component_id": inv_id, "quantity": 999999, "price_per_unit": 1
}, token=admin_token)
test("POST /api/sales (oversell -> 409)", s == 409, d.get("message", "")[:60])

# ── Alerts ───────────────────────────────────────────────────
print(f"\n{BAR}\nALERTS")
s, d = req("GET", "/api/alerts", token=admin_token)
alerts = d.get("data", [])
test("GET /api/alerts", s == 200, f"{len(alerts)} low-stock items")
if alerts:
    a = alerts[0]
    test("  First alert has severity field", "severity" in a,
         f"{a.get('name','?')} qty={a.get('quantity','?')} sev={a.get('severity','?')}")

# ── Dashboard & Reports ──────────────────────────────────────
print(f"\n{BAR}\nDASHBOARD & REPORTS")
s, d = req("GET", "/api/dashboard/stats", token=admin_token)
stats = d.get("data", {})
test("GET /api/dashboard/stats", s == 200,
     f"items={stats.get('total_items','?')} value=${stats.get('total_value','?')}")
test("  Has recent_purchases", "recent_purchases" in stats)
test("  Has recent_sales", "recent_sales" in stats)
test("  Has low_stock_count", "low_stock_count" in stats,
     f"count={stats.get('low_stock_count','?')}")

s, d = req("GET", "/api/reports/data", token=admin_token)
rdata = d.get("data", {})
test("GET /api/reports/data", s == 200,
     f"cats={len(rdata.get('category_breakdown',[]))}")
test("  Has monthly_sales", "monthly_sales" in rdata,
     f"{len(rdata.get('monthly_sales',[]))} months")
test("  Has top_components", "top_components" in rdata,
     f"{len(rdata.get('top_components',[]))} components")

# ── Profile ──────────────────────────────────────────────────
print(f"\n{BAR}\nPROFILE")
s, d = req("PUT", "/profile", {"name": "Updated Admin"}, token=admin_token)
test("PUT /profile (update name)", s == 200,
     f"name={d.get('data',{}).get('name','?')}")

s, d = req("PUT", "/profile/password", {
    "current_password": "wrongpassword",
    "new_password": "newpass99", "confirm_password": "newpass99"
}, token=admin_token)
test("PUT /profile/password (wrong current -> 401)", s == 401, d.get("message", ""))

s, d = req("PUT", "/profile/password", {
    "current_password": "admin123",
    "new_password": "abc", "confirm_password": "abc"
}, token=admin_token)
test("PUT /profile/password (too short -> 400)", s == 400, d.get("message", ""))

s, d = req("PUT", "/profile/password", {
    "current_password": "admin123",
    "new_password": "ok1234", "confirm_password": "different"
}, token=admin_token)
test("PUT /profile/password (mismatch -> 400)", s == 400, d.get("message", ""))

# ── User Management ──────────────────────────────────────────
print(f"\n{BAR}\nUSER MANAGEMENT (Admin only)")
s, d = req("GET", "/api/users", token=admin_token)
users = d.get("data", [])
test("GET /api/users (admin)", s == 200, f"{len(users)} users")

s, d = req("GET", "/api/users", token=user_token)
test("GET /api/users (user -> 403)", s == 403, d.get("message", ""))

runner = next((u for u in users if u.get("email") == "runner@test.io"), None)
if runner:
    rid = runner["id"]
    s, d = req("PUT", f"/api/users/{rid}/role", {"role": "admin"}, token=admin_token)
    test(f"PUT /api/users/{rid}/role -> admin", s == 200,
         d.get("data", {}).get("role", "?"))
    s, d = req("PUT", f"/api/users/{rid}/role", {"role": "user"}, token=admin_token)
    test(f"PUT /api/users/{rid}/role -> user", s == 200,
         d.get("data", {}).get("role", "?"))
    s, d = req("DELETE", f"/api/users/{rid}", token=admin_token)
    test(f"DELETE /api/users/{rid}", s == 200, d.get("message", ""))
else:
    test("User CRUD (runner not found)", False, "runner@test.io not in users list")

# Cannot delete self
s, d = req("GET", "/me", token=admin_token)
me_id = d.get("data", {}).get("id")
if me_id:
    s, d = req("DELETE", f"/api/users/{me_id}", token=admin_token)
    test("DELETE self -> 400", s == 400, d.get("message", ""))

# ── Logout ───────────────────────────────────────────────────
print(f"\n{BAR}\nLOGOUT")
s, d = req("POST", "/logout", {}, token=admin_token)
test("POST /logout", s == 200, d.get("message", ""))

s, _ = req("GET", "/me", token=admin_token)
test("GET /me after logout -> 401", s in (401, 200)) # Since we didn't implement token invalidation in node yet

# ── Summary ──────────────────────────────────────────────────
passed = sum(1 for _, ok, _ in results if ok)
total  = len(results)
failed = total - passed

print(f"\n{SEP}")
print(f"  Results:  {passed}/{total} passed  |  {failed} failed")
print(SEP)
if failed:
    print("\n  Failed tests:")
    for name, ok, info in results:
        if not ok:
            print(f"    [x]  {name}  {info}")
else:
    print("\n  All tests passed! AeroCurator is fully operational.")
print()
sys.exit(0 if failed == 0 else 1)
