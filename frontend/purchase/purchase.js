/**
 * AeroCurator – Purchase Module Controller
 * Refactored into a Class system with MongoDB ObjectId compatibility.
 */
class PurchaseManager {
    constructor() {
        this.inventoryItems = [];
    }

    async init() {
        if (!Auth.guard()) return;
        setActiveNav("purchase");
        initTopbar();
        initSidebarToggle();

        // Set default date to today
        const dateInput = document.getElementById("p-date");
        if (dateInput) dateInput.value = new Date().toISOString().split("T")[0];

        // Enforce View-Only permissions for non-admins
        if (!Auth.isAdmin()) {
            const formContainer = document.getElementById("purchase-form")?.closest('.xl\\:col-span-1');
            if (formContainer) {
                formContainer.classList.add("hidden");
            }
            const historyContainer = document.querySelector('.xl\\:col-span-2');
            if (historyContainer) {
                historyContainer.classList.remove('xl:col-span-2');
                historyContainer.classList.add('xl:col-span-3'); // Expand history to full width
            }
        }

        // Live total preview
        ["p-quantity", "p-cost"].forEach(id => {
            document.getElementById(id)?.addEventListener("input", () => this.updateTotal());
        });

        await this.loadComponents();
        await this.loadPurchases();

        document.getElementById("purchase-form")?.addEventListener("submit", (e) => this.handleSubmit(e));
    }

    updateTotal() {
        const qty  = parseFloat(document.getElementById("p-quantity").value) || 0;
        const cost = parseFloat(document.getElementById("p-cost").value)     || 0;
        const totalEl = document.getElementById("p-total");
        if (totalEl) totalEl.textContent = fmt$$(qty * cost);
    }

    async loadComponents() {
        try {
            const res = await Api.getInventory();
            this.inventoryItems = res.data;
            const sel = document.getElementById("p-component");
            if (!sel) return;

            // Maintain placeholder
            while (sel.options.length > 1) sel.remove(1);

            this.inventoryItems.forEach(item => {
                const opt = document.createElement("option");
                // Use id (renamed from _id in backend toJSON)
                opt.value = item.id;
                opt.textContent = `${item.name} (Hangar Qty: ${item.quantity})`;
                sel.appendChild(opt);
            });
        } catch (e) {
            showToast("Failed to sync inventory catalog: " + e.message, "error");
        }
    }

    async loadPurchases() {
        renderSpinner("purchase-table-wrap");
        try {
            const res = await Api.getPurchases();
            const rows = res.data;
            const countEl = document.getElementById("purchase-count");
            if (countEl) countEl.textContent = `${rows.length} record${rows.length !== 1 ? "s" : ""}`;

            const wrap = document.getElementById("purchase-table-wrap");
            if (!wrap) return;

            if (rows.length === 0) {
                wrap.innerHTML = emptyState("shopping_cart", "No procurement records found.");
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
                                <p class="font-bold">${p.component_id?.name || 'Unknown Component'}</p>
                                <p class="text-[10px] text-on-surface-variant uppercase tracking-tighter">${p.component_id?.sku || "NO SKU"}</p>
                            </td>
                            <td class="text-on-surface-variant">${p.supplier}</td>
                            <td class="font-bold text-green-400">+${p.quantity.toLocaleString()}</td>
                            <td>${fmt$$(p.cost_per_unit)}</td>
                            <td class="font-bold text-green-400">${fmt$$(p.total_cost)}</td>
                            <td class="text-on-surface-variant text-xs italic">${p.notes || "—"}</td>
                        </tr>`).join("")}
                    </tbody>
                </table>
                </div>`;
        } catch (e) {
            document.getElementById("purchase-table-wrap").innerHTML =
                emptyState("error", "Transaction log unreachable: " + e.message);
        }
    }

    async handleSubmit(e) {
        e.preventDefault();
        
        // Validation
        const compId = document.getElementById("p-component").value;
        const qty = parseInt(document.getElementById("p-quantity").value);
        const cost = parseFloat(document.getElementById("p-cost").value);

        if (!compId || compId === "placeholder") {
            showToast("Please select a component from the hangar.", "error");
            return;
        }

        if (isNaN(qty) || qty <= 0 || isNaN(cost) || cost < 0) {
            showToast("Invalid quantity or unit cost.", "error");
            return;
        }

        const payload = {
            supplier:      document.getElementById("p-supplier").value.trim(),
            component_id:  compId, // STRING (ObjectId), NOT parseInt()
            quantity:      qty,
            cost_per_unit: cost,
            date:          document.getElementById("p-date").value,
            notes:         document.getElementById("p-notes").value.trim(),
        };

        const btn = e.target.querySelector('button[type="submit"]');
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner-mini"></span> Recording...';

        try {
            await Api.addPurchase(payload);
            showToast("Procurement record finalized. Stock updated.", "success");
            e.target.reset();
            document.getElementById("p-date").value = new Date().toISOString().split("T")[0];
            this.updateTotal();
            await this.loadComponents();
            await this.loadPurchases();
        } catch (err) {
            showToast(err.message, "error");
        } finally {
            btn.disabled = false;
            btn.innerHTML = '<span class="material-symbols-outlined">add_shopping_cart</span> Record Purchase';
        }
    }
}

// Global initialization
window.purchaseManager = new PurchaseManager();
window.onload = () => window.purchaseManager.init();
