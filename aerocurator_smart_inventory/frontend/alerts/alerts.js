/**
 * AeroCurator – Stock Alerts Logic
 */

(async () => {
    if (!Auth.guard()) return;
    setActiveNav("alerts");
    initTopbar();
    initSidebarToggle();
    await loadAlerts();
})();

async function loadAlerts() {
    renderSpinner("alerts-table-wrap");
    document.getElementById("count-critical").textContent = "—";
    document.getElementById("count-warning").textContent  = "—";
    document.getElementById("count-low").textContent      = "—";

    try {
        const res  = await Api.getAlerts();
        const rows = res.data;

        // Count by severity
        const critical = rows.filter(r => r.severity === "critical").length;
        const warning  = rows.filter(r => r.severity === "warning").length;
        const low      = rows.filter(r => r.severity === "low").length;

        document.getElementById("count-critical").textContent = critical;
        document.getElementById("count-warning").textContent  = warning;
        document.getElementById("count-low").textContent      = low;

        const wrap = document.getElementById("alerts-table-wrap");
        if (rows.length === 0) {
            wrap.innerHTML = `
                <div class="empty-state">
                    <span class="material-symbols-outlined" style="color:#4ade80;opacity:1;font-size:56px;font-variation-settings:'FILL' 1">check_circle</span>
                    <p class="text-green-400 font-bold text-lg">All systems nominal</p>
                    <p>All components are adequately stocked.</p>
                </div>`;
            return;
        }

        wrap.innerHTML = `
            <div style="overflow-x:auto">
            <table class="data-table">
                <thead><tr>
                    <th>Severity</th><th>Component</th><th>Category</th><th>SKU</th>
                    <th>In Stock</th><th>Threshold</th><th>Deficit</th><th>Action</th>
                </tr></thead>
                <tbody>
                    ${rows.map(item => {
                        const deficit = Math.max(0, item.low_stock_threshold - item.quantity);
                        const severityCls = item.severity === "critical" ? "chip-critical"
                                          : item.severity === "warning" ? "chip-warning" : "chip-low";
                        const severityLabel = item.severity === "critical" ? "Critical"
                                            : item.severity === "warning" ? "Warning" : "Low";
                        return `
                        <tr>
                            <td><span class="chip ${severityCls}">${severityLabel}</span></td>
                            <td class="font-semibold">${item.name}</td>
                            <td class="text-on-surface-variant">${item.category}</td>
                            <td><span class="chip chip-user">${item.sku || "—"}</span></td>
                            <td>
                                <span class="font-bold ${item.quantity === 0 ? "text-error" : "text-yellow-400"}">${item.quantity}</span>
                            </td>
                            <td class="text-on-surface-variant">${item.low_stock_threshold}</td>
                            <td class="text-error font-bold">${deficit > 0 ? "-" + deficit : "0"}</td>
                            <td>
                                <a href="/purchase" class="btn-primary" style="padding:6px 12px;font-size:0.75rem">
                                    <span class="material-symbols-outlined" style="font-size:14px">add_shopping_cart</span> Reorder
                                </a>
                            </td>
                        </tr>`;
                    }).join("")}
                </tbody>
            </table>
            </div>
            <p class="text-xs text-on-surface-variant mt-3 px-1">${rows.length} item${rows.length !== 1 ? "s" : ""} flagged</p>
        `;
    } catch (e) {
        document.getElementById("alerts-table-wrap").innerHTML =
            emptyState("error", "Failed to load alerts: " + e.message);
    }
}
