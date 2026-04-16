/**
 * AeroCurator – Sales Module Logic
 */

let inventoryItems = [];

(async () => {
    if (!Auth.guard()) return;
    setActiveNav("sales");
    initTopbar();
    initSidebarToggle();

    document.getElementById("s-date").value = new Date().toISOString().split("T")[0];

    ["s-quantity", "s-price"].forEach(id => {
        document.getElementById(id).addEventListener("input", updateTotal);
    });

    document.getElementById("s-component").addEventListener("change", onComponentChange);

    await loadComponents();
    await loadSales();

    document.getElementById("sale-form").addEventListener("submit", handleSubmit);
})();

function updateTotal() {
    const qty   = parseFloat(document.getElementById("s-quantity").value) || 0;
    const price = parseFloat(document.getElementById("s-price").value)    || 0;
    document.getElementById("s-total").textContent = fmt$$(qty * price);
}

function onComponentChange() {
    const id   = parseInt(document.getElementById("s-component").value);
    const item = inventoryItems.find(i => i.id === id);
    const indicator = document.getElementById("stock-indicator");
    if (item) {
        indicator.classList.remove("hidden");
        const avail = document.getElementById("stock-available");
        avail.textContent = item.quantity;
        avail.className = `font-bold ${item.quantity === 0 ? "text-error" : item.quantity <= item.low_stock_threshold ? "text-yellow-400" : "text-green-400"}`;
        // Pre-fill price with inventory price
        document.getElementById("s-price").value = item.price;
        updateTotal();
    } else {
        indicator.classList.add("hidden");
    }
}

async function loadComponents() {
    try {
        const res = await Api.getInventory();
        inventoryItems = res.data;
        const sel = document.getElementById("s-component");
        // Clear existing options except the placeholder
        while (sel.options.length > 1) sel.remove(1);
        res.data.forEach(item => {
            const opt = document.createElement("option");
            opt.value       = item.id;
            opt.textContent = `${item.name} (Stock: ${item.quantity})`;
            opt.disabled    = item.quantity === 0;
            sel.appendChild(opt);
        });
    } catch (e) {
        showToast("Failed to load components: " + e.message, "error");
    }
}

async function loadSales() {
    renderSpinner("sales-table-wrap");
    try {
        const res  = await Api.getSales();
        const rows = res.data;
        document.getElementById("sales-count").textContent = `${rows.length} record${rows.length !== 1 ? "s" : ""}`;

        const wrap = document.getElementById("sales-table-wrap");
        if (rows.length === 0) {
            wrap.innerHTML = emptyState("point_of_sale", "No sales recorded yet");
            return;
        }

        wrap.innerHTML = `
            <div style="overflow-x:auto">
            <table class="data-table">
                <thead><tr>
                    <th>Date</th><th>Component</th><th>Customer</th>
                    <th>Qty</th><th>Price/Unit</th><th>Revenue</th>
                </tr></thead>
                <tbody>
                    ${rows.map(s => `
                    <tr>
                        <td class="text-on-surface-variant">${fmtDate(s.date)}</td>
                        <td>
                            <p class="font-semibold">${s.component_name}</p>
                            <p class="text-xs text-on-surface-variant">${s.sku || ""}</p>
                        </td>
                        <td class="text-on-surface-variant">${s.customer || "—"}</td>
                        <td class="font-bold text-error">-${s.quantity}</td>
                        <td>${fmt$$(s.price_per_unit)}</td>
                        <td class="font-semibold text-yellow-400">${fmt$$(s.total_price)}</td>
                    </tr>`).join("")}
                </tbody>
            </table>
            </div>`;
    } catch (e) {
        document.getElementById("sales-table-wrap").innerHTML =
            emptyState("error", "Failed to load sales: " + e.message);
    }
}

async function handleSubmit(e) {
    e.preventDefault();
    const compId = parseInt(document.getElementById("s-component").value);
    const qty    = parseInt(document.getElementById("s-quantity").value);
    const item   = inventoryItems.find(i => i.id === compId);

    // Client-side guard against over-selling
    if (item && qty > item.quantity) {
        showToast(`Insufficient stock. Only ${item.quantity} units available.`, "error");
        return;
    }

    const payload = {
        component_id:   compId,
        quantity:       qty,
        price_per_unit: parseFloat(document.getElementById("s-price").value),
        date:           document.getElementById("s-date").value,
        customer:       document.getElementById("s-customer").value.trim(),
    };

    try {
        await Api.addSale(payload);
        showToast("Sale recorded! Stock updated.", "success");
        document.getElementById("sale-form").reset();
        document.getElementById("s-date").value = new Date().toISOString().split("T")[0];
        document.getElementById("s-total").textContent = "$0.00";
        document.getElementById("stock-indicator").classList.add("hidden");
        await loadComponents();
        await loadSales();
    } catch (err) {
        showToast(err.message, "error");
    }
}
