/**
 * AeroCurator – Dashboard Logic
 */

(async () => {
    if (!Auth.guard()) return;
    setActiveNav("dashboard");
    initTopbar();
    initSidebarToggle();

    try {
        const [statsRes, reportRes] = await Promise.all([
            Api.getDashboardStats(),
            Api.getReportsData(),
        ]);

        const s = statsRes.data;

        // Stat cards
        document.getElementById("stat-items").textContent     = s.total_items.toLocaleString();
        document.getElementById("stat-value").textContent     = fmt$$(s.total_value);
        document.getElementById("stat-purchases").textContent = fmt$$(s.purchases_this_month);
        document.getElementById("stat-sales").textContent     = fmt$$(s.sales_this_month);

        // Alert banner
        if (s.low_stock_count > 0) {
            const banner = document.getElementById("alert-banner");
            banner.classList.remove("hidden");
            document.getElementById("alert-banner-text").textContent =
                `${s.low_stock_count} component${s.low_stock_count > 1 ? "s are" : " is"} below reorder threshold`;
            document.getElementById("topbar-alert-dot").classList.remove("hidden");
            const badge = document.getElementById("sidebar-alert-badge");
            badge.textContent = s.low_stock_count;
            badge.classList.remove("hidden");
        }

        // Recent purchases table
        const purchasesEl = document.getElementById("table-recent-purchases");
        if (s.recent_purchases.length === 0) {
            purchasesEl.innerHTML = emptyState("shopping_cart", "No purchases yet");
        } else {
            purchasesEl.innerHTML = `
                <table class="data-table">
                    <thead><tr>
                        <th>Component</th><th>Supplier</th><th>Qty</th><th>Total</th>
                    </tr></thead>
                    <tbody>
                        ${s.recent_purchases.map(p => `
                        <tr>
                            <td class="font-semibold">${p.component}</td>
                            <td class="text-on-surface-variant">${p.supplier}</td>
                            <td>${p.quantity}</td>
                            <td class="text-green-400 font-semibold">${fmt$$(p.total_cost)}</td>
                        </tr>`).join("")}
                    </tbody>
                </table>`;
        }

        // Recent sales table
        const salesEl = document.getElementById("table-recent-sales");
        if (s.recent_sales.length === 0) {
            salesEl.innerHTML = emptyState("point_of_sale", "No sales yet");
        } else {
            salesEl.innerHTML = `
                <table class="data-table">
                    <thead><tr>
                        <th>Component</th><th>Customer</th><th>Qty</th><th>Revenue</th>
                    </tr></thead>
                    <tbody>
                        ${s.recent_sales.map(s => `
                        <tr>
                            <td class="font-semibold">${s.component}</td>
                            <td class="text-on-surface-variant">${s.customer || "—"}</td>
                            <td>${s.quantity}</td>
                            <td class="text-yellow-400 font-semibold">${fmt$$(s.total_price)}</td>
                        </tr>`).join("")}
                    </tbody>
                </table>`;
        }

        // Charts
        const r = reportRes.data;
        const chartDefaults = {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: { grid: { color: "rgba(64,72,93,0.3)" }, ticks: { color: "#a3aac4", font: { family: "Manrope", size: 11 } } },
                y: { grid: { color: "rgba(64,72,93,0.3)" }, ticks: { color: "#a3aac4", font: { family: "Manrope", size: 11 } } }
            }
        };

        // Sales chart
        const salesLabels  = r.monthly_sales.map(m => m.month);
        const salesData    = r.monthly_sales.map(m => m.revenue);
        new Chart(document.getElementById("chart-sales"), {
            type: "line",
            data: {
                labels: salesLabels.length ? salesLabels : ["No data"],
                datasets: [{
                    data: salesData.length ? salesData : [0],
                    borderColor: "#93aaff",
                    backgroundColor: "rgba(147,170,255,0.08)",
                    fill: true, tension: 0.4,
                    pointBackgroundColor: "#93aaff", pointRadius: 4,
                }]
            },
            options: chartDefaults
        });

        // Purchase chart
        const purchaseLabels = r.monthly_purchases.map(m => m.month);
        const purchaseData   = r.monthly_purchases.map(m => m.cost);
        new Chart(document.getElementById("chart-purchases"), {
            type: "bar",
            data: {
                labels: purchaseLabels.length ? purchaseLabels : ["No data"],
                datasets: [{
                    data: purchaseData.length ? purchaseData : [0],
                    backgroundColor: "rgba(74,222,128,0.5)",
                    borderColor: "#4ade80",
                    borderWidth: 1, borderRadius: 6,
                }]
            },
            options: chartDefaults
        });

    } catch (error) {
        showToast("Failed to load dashboard: " + error.message, "error");
    }
})();
