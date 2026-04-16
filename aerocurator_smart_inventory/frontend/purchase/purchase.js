/**
 * AeroCurator – Purchase Module Logic
 */

(async () => {
    if (!Auth.guard()) return;
    setActiveNav("purchase");
    initTopbar();
    initSidebarToggle();

    // Set default date to today
    document.getElementById("p-date").value = new Date().toISOString().split("T")[0];

    // Live total preview
    ["p-quantity", "p-cost"].forEach(id => {
        document.getElementById(id).addEventListener("input", updateTotal);
    });

    await loadComponents();
    await loadPurchases();

    document.getElementById("purchase-form").addEventListener("submit", handleSubmit);
})();

function updateTotal() {
    const qty  = parseFloat(document.getElementById("p-quantity").value) || 0;
    const cost = parseFloat(document.getElementById("p-cost").value)     || 0;
    document.getElementById("p-total").textContent = fmt$$(qty * cost);
}

async function loadComponents() {
    try {
        const res = await Api.getInventory();
        const sel = document.getElementById("p-component");
        res.data.forEach(item => {
            const opt = document.createElement("option");
            opt.value = item.id;
            opt.textContent = `${item.name} (Stock: ${item.quantity})`;
            sel.appendChild(opt);
        });
    } catch (e) {
        showToast("Failed to load components: " + e.message, "error");
    }
}

async function loadPurchases() {
    renderSpinner("purchase-table-wrap");
    try {
        const res = await Api.getPurchases();
        const rows = res.data;
        document.getElementById("purchase-count").textContent = `${rows.length} record${rows.length !== 1 ? "s" : ""}`;

        const wrap = document.getElementById("purchase-table-wrap");
        if (rows.length === 0) {
            wrap.innerHTML = emptyState("shopping_cart", "No purchases recorded yet");
            return;
        }

        wrap.innerHTML = `
            <div style="overflow-x:auto">
            <table class="data-table">
                <thead><tr>
                    <th>Date</th><th>Component</th><th>Supplier</th>
                    <th>Qty</th><th>Cost/Unit</th><th>Total</th><th>Notes</th>
                </tr></thead>
                <tbody>
                    ${rows.map(p => `
                    <tr>
                        <td class="text-on-surface-variant">${fmtDate(p.date)}</td>
                        <td>
                            <p class="font-semibold">${p.component_name}</p>
                            <p class="text-xs text-on-surface-variant">${p.sku || ""}</p>
                        </td>
                        <td class="text-on-surface-variant">${p.supplier}</td>
                        <td class="font-bold text-green-400">+${p.quantity}</td>
                        <td>${fmt$$(p.cost_per_unit)}</td>
                        <td class="font-semibold text-green-400">${fmt$$(p.total_cost)}</td>
                        <td class="text-on-surface-variant text-xs">${p.notes || "—"}</td>
                    </tr>`).join("")}
                </tbody>
            </table>
            </div>`;
    } catch (e) {
        document.getElementById("purchase-table-wrap").innerHTML =
            emptyState("error", "Failed to load purchases: " + e.message);
    }
}

async function handleSubmit(e) {
    e.preventDefault();
    const payload = {
        supplier:      document.getElementById("p-supplier").value.trim(),
        component_id:  parseInt(document.getElementById("p-component").value),
        quantity:      parseInt(document.getElementById("p-quantity").value),
        cost_per_unit: parseFloat(document.getElementById("p-cost").value),
        date:          document.getElementById("p-date").value,
        notes:         document.getElementById("p-notes").value.trim(),
    };

    try {
        await Api.addPurchase(payload);
        showToast("Purchase recorded! Stock updated.", "success");
        document.getElementById("purchase-form").reset();
        document.getElementById("p-date").value = new Date().toISOString().split("T")[0];
        document.getElementById("p-total").textContent = "$0.00";
        await loadComponents();
        await loadPurchases();
    } catch (err) {
        showToast(err.message, "error");
    }
}
