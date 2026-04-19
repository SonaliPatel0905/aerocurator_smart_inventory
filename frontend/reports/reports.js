/**
 * AeroCurator – Reports & Analytics Controller
 * Refactored into a Class system for advanced insights and modular rendering.
 */
class ReportsManager {
    constructor() {
        this.palette = [
            "#93aaff", "#849df2", "#4ade80", "#facc15", "#f87171",
            "#38bdf8", "#a78bfa", "#fb923c", "#34d399", "#e879f9"
        ];
        this.charts = {};
    }

    async init() {
        if (!Auth.guard()) return;
        setActiveNav("reports");
        initTopbar();
        initSidebarToggle();

        try {
            const res = await Api.getReportsData();
            this.renderReports(res.data);
        } catch (e) {
            const main = document.getElementById("reports-main");
            if (main) {
                main.innerHTML = emptyState("error", "Analytics engine failure: " + e.message);
            }
        }
    }

    renderReports(data) {
        const main = document.getElementById("reports-main");
        if (!main) return;

        main.innerHTML = `
            <!-- Charts Row -->
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                <div class="section-card">
                    <p class="text-xs font-bold tracking-widest uppercase text-on-surface-variant mb-1">Monthly Procurement & Sales</p>
                    <div class="chart-container" style="height:250px"><canvas id="chart-pvs"></canvas></div>
                </div>
                <div class="section-card">
                    <p class="text-xs font-bold tracking-widest uppercase text-on-surface-variant mb-1">Hangar Value by Category</p>
                    <p class="text-2xl font-bold text-primary mb-4" id="total-value">—</p>
                    <div class="chart-container" style="height:250px"><canvas id="chart-category"></canvas></div>
                </div>
            </div>

            <!-- Tables Row -->
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <!-- Top Components -->
                <div class="section-card">
                    <p class="text-xs font-bold tracking-widest uppercase text-on-surface-variant mb-4">High Performance Components</p>
                    <div id="top-components-table"></div>
                </div>
                <!-- Category Breakdown Table -->
                <div class="section-card">
                    <p class="text-xs font-bold tracking-widest uppercase text-on-surface-variant mb-4">Detailed Category Analysis</p>
                    <div id="category-table"></div>
                </div>
            </div>
        `;

        this.initCategoryDonut(data.category_breakdown);
        this.initPvsChart(data.monthly_purchases, data.monthly_sales);
        this.renderTopComponents(data.top_components);
        this.renderCategoryBreakdown(data.category_breakdown);
    }

    initCategoryDonut(breakdown) {
        const totalValue = breakdown.reduce((a, c) => a + c.total_value, 0);
        const valEl = document.getElementById("total-value");
        if (valEl) valEl.textContent = fmt$$(totalValue);

        const ctx = document.getElementById("chart-category")?.getContext("2d");
        if (!ctx) return;

        new Chart(ctx, {
            type: "doughnut",
            data: {
                labels: breakdown.length ? breakdown.map(c => c.category) : ["No data"],
                datasets: [{
                    data: breakdown.length ? breakdown.map(c => c.total_value) : [1],
                    backgroundColor: this.palette,
                    borderColor: "#0f1930", borderWidth: 3,
                }]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                cutout: "70%",
                plugins: {
                    legend: {
                        display: true, position: "right",
                        labels: { color: "#a3aac4", font: { family: "Manrope", size: 10 }, boxWidth: 10 }
                    }
                }
            }
        });
    }

    initPvsChart(purchases, sales) {
        const allMonths = [...new Set([
            ...purchases.map(m => m.month),
            ...sales.map(m => m.month),
        ])].sort();

        const pCosts = allMonths.map(m => (purchases.find(x => x.month === m)?.cost || 0));
        const sRevs  = allMonths.map(m => (sales.find(x => x.month === m)?.revenue || 0));

        const ctx = document.getElementById("chart-pvs")?.getContext("2d");
        if (!ctx) return;

        new Chart(ctx, {
            type: "bar",
            data: {
                labels: allMonths.length ? allMonths : ["Launch"],
                datasets: [
                    {
                        label: "Procurement",
                        data: pCosts,
                        backgroundColor: "rgba(74,222,128,0.4)",
                        borderColor: "#4ade80", borderWidth: 1, borderRadius: 4,
                    },
                    {
                        label: "Revenue",
                        data: sRevs,
                        backgroundColor: "rgba(250,204,21,0.4)",
                        borderColor: "#facc15", borderWidth: 1, borderRadius: 4,
                    }
                ]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: { legend: { display: true, labels: { color: "#a3aac4", font: { size: 10 } } } },
                scales: {
                    x: { grid: { display: false }, ticks: { color: "#6d758c", font: { size: 10 } } },
                    y: { grid: { color: "rgba(255,255,255,0.05)" }, ticks: { color: "#6d758c", font: { size: 10 }, callback: v => "$" + Number(v).toLocaleString() } }
                }
            }
        });
    }

    renderTopComponents(items) {
        const wrap = document.getElementById("top-components-table");
        if (!wrap) return;

        if (items.length === 0) {
            wrap.innerHTML = emptyState("monitoring", "No sales trajectory data yet.");
            return;
        }

        wrap.innerHTML = `
            <table class="data-table">
                <thead><tr><th>Rank</th><th>Component</th><th>Sold</th><th>Revenue</th></tr></thead>
                <tbody>
                    ${items.map((c, i) => `
                        <tr>
                            <td><span class="chip chip-${i === 0 ? 'admin' : 'user'}">#${i + 1}</span></td>
                            <td><p class="font-bold">${c.name}</p><p class="text-[10px] text-on-surface-variant uppercase tracking-tighter">${c.category}</p></td>
                            <td class="font-bold text-primary">${c.total_sold.toLocaleString()}</td>
                            <td class="text-yellow-400 font-bold">${fmt$$(c.total_revenue)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    }

    renderCategoryBreakdown(data) {
        const wrap = document.getElementById("category-table");
        if (!wrap) return;

        if (data.length === 0) {
            wrap.innerHTML = emptyState("category", "No category data indexed.");
            return;
        }

        wrap.innerHTML = `
            <table class="data-table">
                <thead><tr><th>Category</th><th>Items</th><th>Stock</th><th>Value</th></tr></thead>
                <tbody>
                    ${data.map(c => `
                        <tr>
                            <td class="font-bold">${c.category}</td>
                            <td class="text-on-surface-variant">${c.item_count}</td>
                            <td class="font-bold">${c.total_qty.toLocaleString()}</td>
                            <td class="text-primary font-bold">${fmt$$(c.total_value)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    }
}

// Init
window.reportsManager = new ReportsManager();
window.onload = () => window.reportsManager.init();
