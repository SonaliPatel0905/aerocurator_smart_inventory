/**
 * AeroCurator – Base Dashboard Class
 * Shared logic for both Admin and User dashboards to avoid duplication.
 */
class BaseDashboard {
    constructor(pageName) {
        this.pageName = pageName;
        this.user = Auth.getUser();
    }

    async init() {
        if (!Auth.guard()) return;
        setActiveNav(this.pageName);
        initTopbar();
        initSidebarToggle();
        await this.loadStats();
        await this.loadRecentActivity();
        this.setupEventListeners();
    }

    async loadStats() {
        try {
            const res = await Api.getDashboardStats();
            this.renderStats(res.data);
        } catch (e) {
            showToast("Failed to load dashboard stats", "error");
        }
    }

    renderStats(stats) {
        // Implementation varies by dashboard, but some stats might be shared
        const itemsEl = document.getElementById("stat-items");
        const valueEl = document.getElementById("stat-value");
        if (itemsEl) itemsEl.textContent = stats.total_items.toLocaleString();
        if (valueEl) valueEl.textContent = fmt$$(stats.total_value);
    }

    async loadRecentActivity() {
        // Shared boilerplate for loading the two main tables
        try {
            const res = await Api.getDashboardStats();
            this.renderRecentPurchases(res.data.recent_purchases);
            this.renderRecentSales(res.data.recent_sales);
        } catch (e) {
            console.error("Recent activity error:", e);
        }
    }

    renderRecentPurchases(data) {
        const wrap = document.getElementById("table-recent-purchases");
        if (!wrap) return;
        if (!data || data.length === 0) {
            wrap.innerHTML = emptyState("shopping_cart", "No recent purchases");
            return;
        }
        wrap.innerHTML = `
            <table class="data-table-mini">
                <thead><tr><th>Component</th><th>Qty</th><th>Total</th></tr></thead>
                <tbody>
                    ${data.map(p => `
                        <tr>
                            <td class="font-medium">${p.component_id?.name || p.component?.name || '—'}</td>
                            <td>${p.quantity}</td>
                            <td class="text-primary font-bold">${fmt$$(p.total_cost)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    }

    renderRecentSales(data) {
        const wrap = document.getElementById("table-recent-sales");
        if (!wrap) return;
        if (!data || data.length === 0) {
            wrap.innerHTML = emptyState("point_of_sale", "No recent sales");
            return;
        }
        wrap.innerHTML = `
            <table class="data-table-mini">
                <thead><tr><th>Component</th><th>Qty</th><th>Total</th></tr></thead>
                <tbody>
                    ${data.map(s => `
                        <tr>
                            <td class="font-medium">${s.component_id?.name || s.component?.name || '—'}</td>
                            <td>${s.quantity}</td>
                            <td class="text-primary font-bold">${fmt$$(s.total_price)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    }

    setupEventListeners() {
        // To be overridden by subclasses
    }
}
