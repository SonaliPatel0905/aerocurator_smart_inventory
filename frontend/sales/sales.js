/**
 * AeroCurator – Sales Module Controller
 * Refactored into a Class system with MongoDB ObjectId compatibility and stock validation.
 */
class SalesManager {
    constructor() {
        this.inventoryItems = [];
    }

    async init() {
        if (!Auth.guard()) return;
        setActiveNav("sales");
        initTopbar();
        initSidebarToggle();

        const dateInput = document.getElementById("s-date");
        if (dateInput) dateInput.value = new Date().toISOString().split("T")[0];

        // Enforce View-Only permissions for non-admins
        if (!Auth.isAdmin()) {
            const formContainer = document.getElementById("sale-form")?.closest('.xl\\:col-span-1');
            if (formContainer) {
                formContainer.classList.add("hidden");
            }
            const historyContainer = document.querySelector('.xl\\:col-span-2');
            if (historyContainer) {
                historyContainer.classList.remove('xl:col-span-2');
                historyContainer.classList.add('xl:col-span-3'); // Expand history to full width
            }
        }

        ["s-quantity", "s-price"].forEach(id => {
            document.getElementById(id)?.addEventListener("input", () => this.updateTotal());
        });

        document.getElementById("s-component")?.addEventListener("change", (e) => this.onComponentChange(e));

        await this.loadComponents();
        await this.loadSales();

        document.getElementById("sale-form")?.addEventListener("submit", (e) => this.handleSubmit(e));
    }

    updateTotal() {
        const qty   = parseFloat(document.getElementById("s-quantity").value) || 0;
        const price = parseFloat(document.getElementById("s-price").value)    || 0;
        const totalEl = document.getElementById("s-total");
        if (totalEl) totalEl.textContent = fmt$$(qty * price);
    }

    onComponentChange(e) {
        const id = e.target.value;
        const item = this.inventoryItems.find(i => i.id === id);
        const indicator = document.getElementById("stock-indicator");
        
        if (item) {
            indicator?.classList.remove("hidden");
            const avail = document.getElementById("stock-available");
            if (avail) {
                avail.textContent = item.quantity;
                avail.className = `font-bold ${item.quantity === 0 ? "text-error" : item.quantity <= item.low_stock_threshold ? "text-yellow-400" : "text-green-400"}`;
            }
            // Pre-fill price with inventory price
            const priceInput = document.getElementById("s-price");
            if (priceInput) priceInput.value = item.price;
            this.updateTotal();
        } else {
            indicator?.classList.add("hidden");
        }
    }

    async loadComponents() {
        try {
            const res = await Api.getInventory();
            this.inventoryItems = res.data;
            const sel = document.getElementById("s-component");
            if (!sel) return;

            while (sel.options.length > 1) sel.remove(1);

            this.inventoryItems.forEach(item => {
                const opt = document.createElement("option");
                // FIX: Use _id instead of numeric id
                opt.value = item.id;
                opt.textContent = `${item.name} (Hangar Qty: ${item.quantity})`;
                opt.disabled    = item.quantity === 0;
                sel.appendChild(opt);
            });
        } catch (e) {
            showToast("Failed to load inventory for sales: " + e.message, "error");
        }
    }

    async loadSales() {
        renderSpinner("sales-table-wrap");
        try {
            const res  = await Api.getSales();
            const rows = res.data;
            const countEl = document.getElementById("sales-count");
            if (countEl) countEl.textContent = `${rows.length} record${rows.length !== 1 ? "s" : ""}`;

            const wrap = document.getElementById("sales-table-wrap");
            if (!wrap) return;

            if (rows.length === 0) {
                wrap.innerHTML = emptyState("point_of_sale", "No sales transactions recorded.");
                return;
            }

            wrap.innerHTML = `
                <div style="overflow-x:auto">
                <table class="data-table">
                    <thead><tr>
                        <th>Date</th><th>Component</th><th>Customer</th>
                        <th>Qty</th><th>Price/Unit</th><th>Total Revenue</th>
                    </tr></thead>
                    <tbody>
                        ${rows.map(s => `
                        <tr>
                            <td class="text-on-surface-variant">${fmtDate(s.date)}</td>
                            <td>
                                <p class="font-bold">${s.component_id?.name || 'Unknown Component'}</p>
                                <p class="text-[10px] text-on-surface-variant uppercase tracking-tighter">${s.component_id?.sku || "NO SKU"}</p>
                            </td>
                            <td class="text-on-surface-variant">${s.customer || "—"}</td>
                            <td class="font-bold text-success">${s.quantity.toLocaleString()}</td>
                            <td>${fmt$$(s.price_per_unit)}</td>
                            <td class="font-bold text-yellow-500">${fmt$$(s.total_price)}</td>
                        </tr>`).join("")}
                    </tbody>
                </table>
                </div>`;
        } catch (e) {
            document.getElementById("sales-table-wrap").innerHTML =
                emptyState("error", "Sales ledger unreachable: " + e.message);
        }
    }

    async handleSubmit(e) {
        e.preventDefault();
        const compId = document.getElementById("s-component").value;
        const qty    = parseInt(document.getElementById("s-quantity").value);
        const item   = this.inventoryItems.find(i => i.id === compId);

        if (!compId || compId === "placeholder") {
            showToast("Please select component to sell.", "error");
            return;
        }

        // Client-side guard against over-selling
        if (item && qty > item.quantity) {
            showToast(`Critical: Insufficient stock. Only ${item.quantity} units in hangar.`, "error");
            return;
        }

        const payload = {
            component_id:   compId, // STRING (ObjectId Hex)
            quantity:       qty,
            price_per_unit: parseFloat(document.getElementById("s-price").value),
            date:           document.getElementById("s-date").value,
            customer:       document.getElementById("s-customer").value.trim(),
        };

        const btn = e.target.querySelector('button[type="submit"]');
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner-mini"></span> Executing...';

        try {
            await Api.addSale(payload);
            showToast("Disbursement of component complete. Stock updated.", "success");
            e.target.reset();
            document.getElementById("s-date").value = new Date().toISOString().split("T")[0];
            this.updateTotal();
            document.getElementById("stock-indicator")?.classList.add("hidden");
            await this.loadComponents();
            await this.loadSales();
        } catch (err) {
            showToast(err.message, "error");
        } finally {
            btn.disabled = false;
            btn.innerHTML = '<span class="material-symbols-outlined">point_of_sale</span> Record Sale';
        }
    }
}

// Global initialization
window.salesManager = new SalesManager();
window.onload = () => window.salesManager.init();
