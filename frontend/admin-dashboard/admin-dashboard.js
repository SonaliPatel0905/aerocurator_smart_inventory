/**
 * AeroCurator – Admin Dashboard Controller
 * Implements full analytical overview and management shortcuts.
 */
class AdminDashboard extends BaseDashboard {
    constructor() {
        super("dashboard");
        this.charts = { sales: null, purchases: null };
    }

    async init() {
        await super.init();
        await this.loadCharts();
    }

    async loadCharts() {
        try {
            const res = await Api.getReportsData();
            this.renderCharts(res.data);
        } catch (e) {
            console.error("Chart loading failed:", e);
        }
    }

    renderCharts(data) {
        const ctxSales = document.getElementById('chart-sales')?.getContext('2d');
        const ctxPurch = document.getElementById('chart-purchases')?.getContext('2d');

        if (ctxSales && data.monthly_sales) {
            if (this.charts.sales) this.charts.sales.destroy();
            this.charts.sales = new Chart(ctxSales, {
                type: 'line',
                data: {
                    labels: data.monthly_sales.map(m => m.month),
                    datasets: [{
                        label: 'Revenue',
                        data: data.monthly_sales.map(m => m.total),
                        borderColor: '#93aaff',
                        backgroundColor: 'rgba(147,170,255,0.1)',
                        fill: true,
                        tension: 0.4
                    }]
                },
                options: { responsive: true, maintainAspectRatio: false }
            });
        }

        if (ctxPurch && data.monthly_purchases) {
             // Purchases chart logic...
        }
    }

    setupEventListeners() {
        document.getElementById("btn-add-product")?.addEventListener("click", () => {
            window.location.href = "/inventory?action=add";
        });
        document.getElementById("btn-add-user")?.addEventListener("click", () => {
            window.location.href = "/users?action=add";
        });
    }

    renderStats(stats) {
        super.renderStats(stats);
        const purchEl = document.getElementById("stat-purchases");
        const salesEl = document.getElementById("stat-sales");
        
        // Month stats
        if (purchEl) purchEl.textContent = stats.monthly_purchases_count || 0;
        if (salesEl) salesEl.textContent = fmt$$(stats.monthly_revenue || 0);

        // Low stock banner
        const banner = document.getElementById("alert-banner");
        if (banner && stats.low_stock_count > 0) {
            banner.classList.remove("hidden");
            document.getElementById("alert-banner-text").textContent = `${stats.low_stock_count} components are low on stock!`;
        }

        // Pending Requests banner
        const reqBanner = document.getElementById("request-banner");
        if (reqBanner && stats.pending_requests_count > 0) {
            reqBanner.classList.remove("hidden");
            document.getElementById("request-banner-text").textContent = `You have ${stats.pending_requests_count} new procurement requests!`;
        }
    }
}

// Global initialization
window.dashboard = new AdminDashboard();
window.onload = () => window.dashboard.init();
