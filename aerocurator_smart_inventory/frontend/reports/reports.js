/**
 * AeroCurator – Reports & Analytics Logic
 */

const PALETTE = [
    "#93aaff", "#849df2", "#4ade80", "#facc15", "#f87171",
    "#38bdf8", "#a78bfa", "#fb923c", "#34d399", "#e879f9"
];

(async () => {
    if (!Auth.guard()) return;
    setActiveNav("reports");
    initTopbar();
    initSidebarToggle();

    try {
        const res = await Api.getReportsData();
        const r   = res.data;
        renderReports(r);
    } catch (e) {
        document.getElementById("reports-main").innerHTML =
            `<div class="empty-state"><span class="material-symbols-outlined">error</span><p>${e.message}</p></div>`;
    }
})();

function renderReports(r) {
    const main = document.getElementById("reports-main");
    main.innerHTML = `
        <!-- Charts Row -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <!-- Revenue Trend -->
            <div class="section-card">
                <p class="text-xs font-bold tracking-widest uppercase text-on-surface-variant mb-1">Monthly Revenue</p>
                <p class="text-2xl font-bold text-yellow-400 mb-4" id="total-revenue">—</p>
                <div class="chart-container"><canvas id="chart-revenue"></canvas></div>
            </div>
            <!-- Category Donut -->
            <div class="section-card">
                <p class="text-xs font-bold tracking-widest uppercase text-on-surface-variant mb-1">Inventory by Category</p>
                <p class="text-2xl font-bold text-primary mb-4" id="total-value">—</p>
                <div class="chart-container"><canvas id="chart-category"></canvas></div>
            </div>
        </div>

        <!-- Purchase vs Sales Bar Chart -->
        <div class="section-card mb-6">
            <p class="text-xs font-bold tracking-widest uppercase text-on-surface-variant mb-4">Purchase vs Sales Cost (Monthly)</p>
            <div class="chart-container" style="height:220px"><canvas id="chart-pvs"></canvas></div>
        </div>

        <!-- Tables Row -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <!-- Top Components -->
            <div class="section-card">
                <p class="text-xs font-bold tracking-widest uppercase text-on-surface-variant mb-4">Top Selling Components</p>
                <div id="top-components-table"></div>
            </div>
            <!-- Category Breakdown Table -->
            <div class="section-card">
                <p class="text-xs font-bold tracking-widest uppercase text-on-surface-variant mb-4">Inventory Category Breakdown</p>
                <div id="category-table"></div>
            </div>
        </div>
    `;

    const chartOpts = (yLabel = "") => ({
        responsive: true, maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            tooltip: { bodyFont: { family: "Manrope" }, titleFont: { family: "Manrope" } }
        },
        scales: {
            x: { grid: { color: "rgba(64,72,93,0.3)" }, ticks: { color: "#a3aac4", font: { family: "Manrope", size: 11 } } },
            y: { grid: { color: "rgba(64,72,93,0.3)" }, ticks: { color: "#a3aac4", font: { family: "Manrope", size: 11 }, callback: v => "$" + Number(v).toLocaleString() } }
        }
    });

    // ── Revenue line chart ──────────────────────────────────────────
    const totalRevenue = r.monthly_sales.reduce((a, m) => a + m.revenue, 0);
    document.getElementById("total-revenue").textContent = fmt$$(totalRevenue);

    new Chart(document.getElementById("chart-revenue"), {
        type: "line",
        data: {
            labels: r.monthly_sales.length ? r.monthly_sales.map(m => m.month) : ["No data"],
            datasets: [{
                data: r.monthly_sales.length ? r.monthly_sales.map(m => m.revenue) : [0],
                borderColor: "#facc15", backgroundColor: "rgba(250,204,21,0.08)",
                fill: true, tension: 0.4, pointBackgroundColor: "#facc15", pointRadius: 5,
            }]
        },
        options: chartOpts()
    });

    // ── Category donut ──────────────────────────────────────────────
    const totalValue = r.category_breakdown.reduce((a, c) => a + c.total_value, 0);
    document.getElementById("total-value").textContent = fmt$$(totalValue);

    new Chart(document.getElementById("chart-category"), {
        type: "doughnut",
        data: {
            labels: r.category_breakdown.length ? r.category_breakdown.map(c => c.category) : ["No data"],
            datasets: [{
                data: r.category_breakdown.length ? r.category_breakdown.map(c => c.total_value) : [1],
                backgroundColor: PALETTE,
                borderColor: "#0f1930", borderWidth: 3,
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            cutout: "68%",
            plugins: {
                legend: {
                    display: true, position: "right",
                    labels: { color: "#a3aac4", font: { family: "Manrope", size: 11 }, boxWidth: 12, padding: 12 }
                },
                tooltip: { bodyFont: { family: "Manrope" }, titleFont: { family: "Manrope" } }
            }
        }
    });

    // ── Purchase vs Sales grouped bar ───────────────────────────────
    const allMonths = [...new Set([
        ...r.monthly_purchases.map(m => m.month),
        ...r.monthly_sales.map(m => m.month),
    ])].sort();

    const purchaseCosts = allMonths.map(m => {
        const f = r.monthly_purchases.find(x => x.month === m);
        return f ? f.cost : 0;
    });
    const salesRevs = allMonths.map(m => {
        const f = r.monthly_sales.find(x => x.month === m);
        return f ? f.revenue : 0;
    });

    new Chart(document.getElementById("chart-pvs"), {
        type: "bar",
        data: {
            labels: allMonths.length ? allMonths : ["No data"],
            datasets: [
                {
                    label: "Purchase Cost",
                    data: purchaseCosts,
                    backgroundColor: "rgba(74,222,128,0.5)",
                    borderColor: "#4ade80", borderWidth: 1, borderRadius: 5,
                },
                {
                    label: "Sales Revenue",
                    data: salesRevs,
                    backgroundColor: "rgba(250,204,21,0.5)",
                    borderColor: "#facc15", borderWidth: 1, borderRadius: 5,
                }
            ]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    labels: { color: "#a3aac4", font: { family: "Manrope", size: 11 }, boxWidth: 12 }
                },
                tooltip: { bodyFont: { family: "Manrope" }, titleFont: { family: "Manrope" } }
            },
            scales: {
                x: { grid: { color: "rgba(64,72,93,0.3)" }, ticks: { color: "#a3aac4", font: { family: "Manrope", size: 11 } } },
                y: { grid: { color: "rgba(64,72,93,0.3)" }, ticks: { color: "#a3aac4", font: { family: "Manrope", size: 11 }, callback: v => "$" + Number(v).toLocaleString() } }
            }
        }
    });

    // ── Top components table ────────────────────────────────────────
    const topEl = document.getElementById("top-components-table");
    if (r.top_components.length === 0) {
        topEl.innerHTML = emptyState("inventory_2", "No sales data yet");
    } else {
        topEl.innerHTML = `
            <table class="data-table">
                <thead><tr>
                    <th>Rank</th><th>Component</th><th>Category</th>
                    <th>Units Sold</th><th>Revenue</th>
                </tr></thead>
                <tbody>
                    ${r.top_components.map((c, i) => `
                    <tr>
                        <td>
                            <span class="chip chip-${i === 0?"admin":i===1?"warning":"low"}">#${i+1}</span>
                        </td>
                        <td class="font-semibold">${c.name}</td>
                        <td class="text-on-surface-variant">${c.category}</td>
                        <td class="font-bold text-primary">${c.total_sold}</td>
                        <td class="text-yellow-400 font-semibold">${fmt$$(c.total_revenue)}</td>
                    </tr>`).join("")}
                </tbody>
            </table>`;
    }

    // ── Category breakdown table ────────────────────────────────────
    const catEl = document.getElementById("category-table");
    if (r.category_breakdown.length === 0) {
        catEl.innerHTML = emptyState("category", "No inventory data");
    } else {
        catEl.innerHTML = `
            <table class="data-table">
                <thead><tr>
                    <th>Category</th><th>Items</th><th>Total Qty</th><th>Portfolio Value</th>
                </tr></thead>
                <tbody>
                    ${r.category_breakdown.map(c => `
                    <tr>
                        <td class="font-semibold">${c.category}</td>
                        <td class="text-on-surface-variant">${c.item_count}</td>
                        <td class="font-bold">${c.total_qty.toLocaleString()}</td>
                        <td class="text-primary font-semibold">${fmt$$(c.total_value)}</td>
                    </tr>`).join("")}
                </tbody>
            </table>`;
    }
}
