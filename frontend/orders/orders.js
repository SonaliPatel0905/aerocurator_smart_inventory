/**
 * AeroCurator – Order Requests Controller
 * Manages procurement requisitions for standard users and approvals for admins.
 */
class OrderManager {
    constructor() {
        this.requests = [];
        this.inventory = [];
        this.isAdmin = Auth.isAdmin();
    }

    async init() {
        if (!Auth.guard()) return;
        setActiveNav("orders");
        initTopbar();
        initSidebarToggle();

        await this.loadInventory();
        await this.loadRequests();
        this.setupEventListeners();
        
        // Handle auto-open if requested from dashboard
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('action') === 'new') {
            const compId = urlParams.get('id');
            if (compId) {
                const sel = document.getElementById("f-component");
                if (sel) sel.value = compId;
            }
            this.openModal();
        }
    }

    async loadInventory() {
        try {
            const res = await Api.getInventory();
            this.inventory = res.data;
            this.populateComponentSelect();
        } catch (e) {
            console.error("Failed to load inventory for list:", e);
        }
    }

    populateComponentSelect() {
        const sel = document.getElementById("f-component");
        if (!sel) return;
        while (sel.options.length > 1) sel.remove(1);
        this.inventory.forEach(item => {
            const opt = document.createElement("option");
            opt.value = item.id;
            opt.textContent = `${item.name} (Hangar Stock: ${item.quantity})`;
            sel.appendChild(opt);
        });
    }

    async loadRequests() {
        renderSpinner("orders-table-wrap");
        try {
            const res = await Api.getRequests();
            this.requests = res.data;
            this.renderTable(this.requests);
        } catch (e) {
            document.getElementById("orders-table-wrap").innerHTML =
                emptyState("error", "Request registry unreachable: " + e.message);
        }
    }

    renderTable(rows) {
        const wrap = document.getElementById("orders-table-wrap");
        if (!wrap) return;

        if (rows.length === 0) {
            wrap.innerHTML = emptyState("assignment", "No procurement requests found.");
            return;
        }

        wrap.innerHTML = `
            <div style="overflow-x:auto">
            <table class="data-table">
                <thead><tr>
                    <th>Requested On</th>
                    <th>Component</th>
                    ${this.isAdmin ? "<th>Requested By</th>" : ""}
                    <th>Qty</th>
                    <th>Status</th>
                    ${this.isAdmin ? "<th>Actions</th>" : ""}
                </tr></thead>
                <tbody>
                    ${rows.map(r => this.renderRow(r)).join('')}
                </tbody>
            </table>
            </div>
        `;
    }

    renderRow(r) {
        const statusColors = {
            pending: "chip-warning",
            approved: "chip-in-stock",
            denied: "chip-out-stock"
        };

        return `
            <tr>
                <td class="text-on-surface-variant">${fmtDate(r.created_at)}</td>
                <td>
                    <p class="font-bold">${r.component_id?.name || 'Unknown'}</p>
                    <p class="text-[10px] text-on-surface-variant uppercase tracking-tighter">${r.component_id?.sku || "NO SKU"}</p>
                </td>
                ${this.isAdmin ? `<td class="text-on-surface-variant">${r.user_id?.name || 'Unknown Pilot'}</td>` : ""}
                <td class="font-extrabold">${r.quantity.toLocaleString()}</td>
                <td><span class="chip ${statusColors[r.status] || ''}">${r.status}</span></td>
                ${this.isAdmin ? `
                <td>
                    ${r.status === 'pending' ? `
                        <div class="flex gap-2">
                            <button class="btn-icon text-green-400" onclick="orders.updateStatus('${r.id}', 'approved')" title="Approve">
                                <span class="material-symbols-outlined" style="font-size:18px">check_circle</span>
                            </button>
                            <button class="btn-icon text-error" onclick="orders.updateStatus('${r.id}', 'denied')" title="Deny">
                                <span class="material-symbols-outlined" style="font-size:18px">cancel</span>
                            </button>
                        </div>
                    ` : `<span class="text-[10px] text-on-surface-variant italic">Processed</span>`}
                </td>` : ""}
            </tr>
        `;
    }

    setupEventListeners() {
        document.getElementById("order-form")?.addEventListener("submit", (e) => this.handleSubmit(e));
        document.getElementById("btn-new-request")?.addEventListener("click", () => this.openModal());
        document.querySelectorAll("[data-close-modal]").forEach(btn => {
            btn.addEventListener("click", () => this.closeModal());
        });
    }

    openModal() {
        document.getElementById("order-modal").classList.add("open");
    }

    closeModal() {
        document.getElementById("order-modal").classList.remove("open");
        document.getElementById("order-form").reset();
    }

    async handleSubmit(e) {
        e.preventDefault();
        const payload = {
            component_id: document.getElementById("f-component").value,
            quantity: parseInt(document.getElementById("f-quantity").value),
            reason: document.getElementById("f-reason").value.trim()
        };

        if(!payload.component_id || !payload.quantity || !payload.reason) {
            showToast("All fields are mandatory for procurement transmit.", "error");
            return;
        }

        const btn = document.getElementById("modal-submit-btn");
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner-mini"></span> Transmitting...';

        try {
            await Api.createRequest(payload);
            showToast("Request formally transmitted to High Command.", "success");
            this.closeModal();
            await this.loadRequests();
        } catch (err) {
            showToast(err.message, "error");
        } finally {
            btn.disabled = false;
            btn.innerHTML = '<span class="material-symbols-outlined text-[18px]">send</span> Transmit Request';
        }
    }

    async updateStatus(id, status) {
        try {
            await Api.updateRequestStatus(id, status);
            showToast(`Request ${status} successfully. Registry updated.`, "success");
            await this.loadRequests();
        } catch (err) {
            showToast(err.message, "error");
        }
    }
}

// Init
window.orders = new OrderManager();
window.onload = () => window.orders.init();
