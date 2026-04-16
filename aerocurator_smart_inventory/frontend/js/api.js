/**
 * AeroCurator – API Client
 * Central Fetch wrapper that handles auth headers and error responses.
 * Data endpoints are namespaced under /api/ to avoid conflicts with page routes.
 */

const BASE_URL = "http://localhost:5000";

const Api = {
    _token() { return localStorage.getItem("ac_token") || ""; },

    _headers(extra = {}) {
        return {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${this._token()}`,
            ...extra,
        };
    },

    async _request(method, path, body = null) {
        const opts = { method, headers: this._headers() };
        if (body !== null) opts.body = JSON.stringify(body);
        const res = await fetch(`${BASE_URL}${path}`, opts);

        if (res.status === 401) {
            localStorage.removeItem("ac_token");
            localStorage.removeItem("ac_user");
            window.location.href = "/";
            return;
        }
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || `Request failed: ${res.status}`);
        return data;
    },

    get(path)        { return this._request("GET",    path); },
    post(path, body) { return this._request("POST",   path, body); },
    put(path, body)  { return this._request("PUT",    path, body); },
    delete(path)     { return this._request("DELETE", path); },

    // ── Auth (no /api prefix — no conflict with page routes) ───────────────
    login(email, password) { return this.post("/login",  { email, password }); },
    register(name, email, password, confirmPassword, role) {
        return this.post("/register", { name, email, password, confirm_password: confirmPassword, role });
    },
    logout()  { return this.post("/logout", {}); },
    me()      { return this.get("/me"); },

    // ── Profile (PUT — no conflict since page uses GET) ────────────────────
    updateProfile(name) { return this.put("/profile", { name }); },
    changePassword(currentPassword, newPassword, confirmPassword) {
        return this.put("/profile/password", {
            current_password: currentPassword,
            new_password:     newPassword,
            confirm_password: confirmPassword,
        });
    },

    // ── Inventory (/api/) ───────────────────────────────────────────────────
    getInventory(params = {}) {
        const q = new URLSearchParams(params).toString();
        return this.get(`/api/inventory${q ? "?" + q : ""}`);
    },
    addInventory(data)        { return this.post("/api/inventory/add", data); },
    updateInventory(id, data) { return this.put(`/api/inventory/update/${id}`, data); },
    deleteInventory(id)       { return this.delete(`/api/inventory/delete/${id}`); },
    getCategories()           { return this.get("/api/inventory/categories"); },

    // ── Purchases (/api/) ───────────────────────────────────────────────────
    getPurchases()     { return this.get("/api/purchases"); },
    addPurchase(data)  { return this.post("/api/purchase", data); },

    // ── Sales (/api/) ───────────────────────────────────────────────────────
    getSales()         { return this.get("/api/sales"); },
    addSale(data)      { return this.post("/api/sales", data); },

    // ── Alerts (/api/) ──────────────────────────────────────────────────────
    getAlerts()        { return this.get("/api/alerts"); },

    // ── Dashboard & Reports (/api/) ─────────────────────────────────────────
    getDashboardStats() { return this.get("/api/dashboard/stats"); },
    getReportsData()    { return this.get("/api/reports/data"); },

    // ── User Management (/api/) ─────────────────────────────────────────────
    listUsers()              { return this.get("/api/users"); },
    updateUserRole(id, role) { return this.put(`/api/users/${id}/role`, { role }); },
    deleteUser(id)           { return this.delete(`/api/users/${id}`); },
};
