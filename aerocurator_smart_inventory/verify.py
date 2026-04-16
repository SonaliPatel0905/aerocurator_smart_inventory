# -*- coding: utf-8 -*-
"""Quick verification of page routes + /api/ endpoints"""
import sys, urllib.request, urllib.error, json
sys.stdout.reconfigure(encoding='utf-8')

BASE = "http://localhost:5000"

def req(method, path, body=None, token=None):
    try:
        h = {"Content-Type": "application/json"}
        if token:
            h["Authorization"] = f"Bearer {token}"
        d = json.dumps(body).encode() if body is not None else None
        r = urllib.request.Request(BASE + path, data=d, headers=h, method=method)
        res = urllib.request.urlopen(r)
        return res.status, json.loads(res.read())
    except urllib.error.HTTPError as e:
        try:    return e.code, json.loads(e.read())
        except: return e.code, {}
    except Exception as ex:
        return 0, {"error": str(ex)}

passed = 0
failed = 0

def test(label, ok, info=""):
    global passed, failed
    if ok:
        passed += 1
        print(f"  [PASS]  {label}" + (f"  =>  {info}" if info else ""))
    else:
        failed += 1
        print(f"  [FAIL]  {label}" + (f"  =>  {info}" if info else ""))

print("\n=== PAGE ROUTES (must all return HTTP 200) ===")
for route in ["/", "/signup", "/dashboard", "/inventory", "/purchase",
              "/sales", "/alerts", "/reports", "/profile", "/users"]:
    s, _ = req("GET", route)
    test(f"GET {route}", s == 200, f"HTTP {s}")

print("\n=== AUTH ===")
s, d = req("POST", "/login", {"email": "admin@aerocurator.io", "password": "admin123"})
test("POST /login (admin)", s == 200, f"name={d.get('data',{}).get('name','?')}")
tk = d.get("data", {}).get("token", "")

s, d = req("POST", "/login", {"email": "pilot@aerocurator.io", "password": "user1234"})
test("POST /login (user)", s == 200, f"name={d.get('data',{}).get('name','?')}")
user_tk = d.get("data", {}).get("token", "")

s, d = req("GET", "/me", token=tk)
test("GET /me", s == 200, f"role={d.get('data',{}).get('role','?')}")

print("\n=== /api/ DATA ROUTES ===")
s, d = req("GET", "/api/inventory", token=tk)
inv = d.get("data", [])
test("GET /api/inventory", s == 200, f"{len(inv)} items")

s, d = req("POST", "/api/inventory/add", {
    "name": "Verify ESC", "category": "Electronics",
    "sku": "VER-001", "quantity": 10, "price": 29.99, "low_stock_threshold": 3
}, token=tk)
test("POST /api/inventory/add (admin)", s == 201, f"id={d.get('data',{}).get('id','?')}")
new_id = d.get("data", {}).get("id")

s, _ = req("POST", "/api/inventory/add",
           {"name": "F", "category": "F", "quantity": 1, "price": 1}, token=user_tk)
test("POST /api/inventory/add (user -> 403)", s == 403)

if new_id:
    s, d = req("PUT", f"/api/inventory/update/{new_id}", {"quantity": 20}, token=tk)
    test("PUT /api/inventory/update", s == 200, f"qty={d.get('data',{}).get('quantity','?')}")
    s, d = req("DELETE", f"/api/inventory/delete/{new_id}", token=tk)
    test("DELETE /api/inventory/delete", s == 200, d.get("message", ""))

s, d = req("GET", "/api/inventory/categories", token=tk)
test("GET /api/inventory/categories", s == 200, str(d.get("data", [])))

s, d = req("GET", "/api/inventory?search=Battery", token=tk)
test("GET /api/inventory?search=Battery", s == 200, f"{len(d.get('data',[]))} matches")

s, d = req("GET", "/api/purchases", token=tk)
test("GET /api/purchases", s == 200, f"{len(d.get('data',[]))} records")

s, d = req("POST", "/api/purchase", {
    "supplier": "Verify Supply", "component_id": 1, "quantity": 2,
    "cost_per_unit": 50.0, "date": "2026-04-16"
}, token=tk)
test("POST /api/purchase", s == 201, f"total={d.get('data',{}).get('total_cost','?')}")

s, d = req("GET", "/api/sales", token=tk)
test("GET /api/sales", s == 200, f"{len(d.get('data',[]))} records")

s, d = req("POST", "/api/sales", {
    "component_id": 2, "quantity": 1, "price_per_unit": 42.0,
    "date": "2026-04-16", "customer": "Verify Corp"
}, token=tk)
test("POST /api/sales", s == 201, f"total={d.get('data',{}).get('total_price','?')}")

s, d = req("GET", "/api/alerts", token=tk)
test("GET /api/alerts", s == 200, f"{len(d.get('data',[]))} low-stock")

s, d = req("GET", "/api/dashboard/stats", token=tk)
st = d.get("data", {})
test("GET /api/dashboard/stats", s == 200,
     f"items={st.get('total_items','?')} value=${st.get('total_value','?')}")

s, d = req("GET", "/api/reports/data", token=tk)
rd = d.get("data", {})
test("GET /api/reports/data", s == 200,
     f"cats={len(rd.get('category_breakdown',[]))} months={len(rd.get('monthly_sales',[]))}")

s, d = req("GET", "/api/users", token=tk)
test("GET /api/users (admin)", s == 200, f"{len(d.get('data',[]))} users")

s, d = req("GET", "/api/users", token=user_tk)
test("GET /api/users (user -> 403)", s == 403)

print("\n=== PROFILE ===")
s, d = req("PUT", "/profile", {"name": "AeroCurator Admin"}, token=tk)
test("PUT /profile (update name)", s == 200, f"name={d.get('data',{}).get('name','?')}")

print("\n" + "=" * 50)
total = passed + failed
print(f"  Results: {passed}/{total} passed  |  {failed} failed")
print("=" * 50)
if not failed:
    print("  All routes verified! System fully operational.\n")
else:
    print("\n  Failed:")
    # re-run to show failures (they already printed above)
sys.exit(0 if failed == 0 else 1)
