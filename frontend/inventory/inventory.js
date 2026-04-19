/**
 * AeroCurator – Inventory Management Logic
 * Refactored into a Class system for better maintainability.
 */
class InventoryManager {
    constructor() {
        this.items = [];
        this.editingId = null;
        this.isAdmin = Auth.isAdmin();
    }

    async init() {
        if (!Auth.guard()) return;
        setActiveNav("inventory");
        initTopbar();
        initSidebarToggle();
        await this.loadCategories();
        await this.loadInventory();
        this.setupEventListeners();
        
        // Handle auto-open if redirected from dashboard
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('action') === 'add' && this.isAdmin) {
            this.openModal();
        }
    }

    async loadCategories() {
        try {
            const res = await Api.getCategories();
            const sel = document.getElementById("category-filter");
            if (!sel) return;
            // Clear existing except first
            while (sel.children.length > 1) sel.removeChild(sel.lastChild);
            res.data.forEach(cat => {
                const opt = document.createElement("option");
                opt.value = cat; opt.textContent = cat;
                sel.appendChild(opt);
            });
        } catch (e) { console.error("Category load failed:", e); }
    }

    async loadInventory() {
        renderSpinner("inventory-table-wrap");
        try {
            const res = await Api.getInventory();
            this.items = res.data;
            this.renderTable(this.items);
        } catch (e) {
            document.getElementById("inventory-table-wrap").innerHTML =
                emptyState("error", "Error connecting to storage: " + e.message);
        }
    }

    renderTable(items) {
        const wrap = document.getElementById("inventory-table-wrap");
        if (!wrap) return;

        if (items.length === 0) {
            wrap.innerHTML = emptyState("inventory_2", "No components found in the system.");
            return;
        }

        wrap.innerHTML = `
            <div style="overflow-x:auto">
            <table class="data-table">
                <thead><tr>
                    <th>Component</th>
                    <th>SKU</th>
                    <th>Category</th>
                    <th>Qty</th>
                    <th>Price</th>
                    <th>Total</th>
                    <th>Status</th>
                    ${this.isAdmin ? "<th>Actions</th>" : ""}
                </tr></thead>
                <tbody>
                    ${items.map(item => this.renderRow(item)).join('')}
                </tbody>
            </table>
            </div>
        `;
    }

    renderRow(item) {
        return `
            <tr>
                <td>
                    <p class="font-bold">${item.name}</p>
                    <p class="text-[10px] text-on-surface-variant uppercase tracking-widest">THRESHOLD: ${item.low_stock_threshold}</p>
                </td>
                <td><span class="chip chip-user">${item.sku || '—'}</span></td>
                <td class="text-on-surface-variant">${item.category}</td>
                <td class="font-extrabold">${item.quantity.toLocaleString()}</td>
                <td>${fmt$$(item.price)}</td>
                <td class="text-primary font-bold">${fmt$$(item.quantity * item.price)}</td>
                <td>${stockChip(item.quantity, item.low_stock_threshold)}</td>
                ${this.isAdmin ? `
                <td>
                    <div class="flex gap-2">
                        <button class="btn-icon" onclick="inventory.openModal('${item.id}')">
                            <span class="material-symbols-outlined" style="font-size:18px">edit</span>
                        </button>
                        <button class="btn-icon text-error" onclick="inventory.deleteItem('${item.id}', '${item.name}')">
                            <span class="material-symbols-outlined" style="font-size:18px">delete</span>
                        </button>
                    </div>
                </td>` : ""}
            </tr>
        `;
    }

    setupEventListeners() {
        document.getElementById("search-input")?.addEventListener("input", (e) => {
            this.filterItems();
        });
        document.getElementById("category-filter")?.addEventListener("change", () => {
            this.filterItems();
        });
        document.getElementById("item-form")?.addEventListener("submit", (e) => {
            this.handleSubmit(e);
        });
        // General modal close listeners
        document.querySelectorAll("[data-close-modal]").forEach(btn => {
            btn.addEventListener("click", () => this.closeModal());
        });
        document.getElementById("btn-add-item")?.addEventListener("click", () => this.openModal());
    }

    filterItems() {
        const q = document.getElementById("search-input").value.toLowerCase();
        const cat = document.getElementById("category-filter").value;
        const filtered = this.items.filter(i => {
            const matchQ = i.name.toLowerCase().includes(q) || (i.sku && i.sku.toLowerCase().includes(q));
            const matchCat = !cat || i.category === cat;
            return matchQ && matchCat;
        });
        this.renderTable(filtered);
    }

    openModal(id = null) {
        this.editingId = id;
        const modal = document.getElementById("item-modal");
        const title = document.getElementById("modal-title");
        const btn = document.getElementById("modal-submit-btn");
        const form = document.getElementById("item-form");

        if (!modal || !form) return;

        if (id) {
            const item = this.items.find(i => i.id === id);
            if (!item) return;
            title.textContent = "Modify Component";
            btn.innerHTML = '<span class="material-symbols-outlined">save</span> Update Item';
            document.getElementById("f-name").value = item.name;
            document.getElementById("f-category").value = item.category;
            document.getElementById("f-sku").value = item.sku || "";
            document.getElementById("f-quantity").value = item.quantity;
            document.getElementById("f-price").value = item.price;
            document.getElementById("f-threshold").value = item.low_stock_threshold;
        } else {
            title.textContent = "New Inventory Component";
            btn.innerHTML = '<span class="material-symbols-outlined">add</span> Create Item';
            form.reset();
            document.getElementById("f-threshold").value = 5;
        }
        modal.classList.add("open");
    }

    closeModal() {
        document.getElementById("item-modal").classList.remove("open");
        this.editingId = null;
    }

    async handleSubmit(e) {
        e.preventDefault();
        
        // Strict Frontend Validation
        const name = document.getElementById("f-name").value.trim();
        const category = document.getElementById("f-category").value.trim();
        const qty = parseInt(document.getElementById("f-quantity").value);
        const price = parseFloat(document.getElementById("f-price").value);
        const threshold = parseInt(document.getElementById("f-threshold").value);

        if (!name || !category) {
            showToast("Primary fields (Name/Category) are mandatory", "error");
            return;
        }

        if (isNaN(qty) || qty < 0 || isNaN(price) || price < 0) {
            showToast("Quantity and Price must be valid positive values", "error");
            return;
        }

        const payload = {
            name, category, 
            sku: document.getElementById("f-sku").value.trim(),
            quantity: qty, price: price, 
            low_stock_threshold: threshold || 0
        };

        const btn = document.getElementById("modal-submit-btn");
        btn.disabled = true;
        btn.innerHTML = '<div class="spinner-mini"></div> Processing...';

        try {
            if (this.editingId) {
                await Api.updateInventory(this.editingId, payload);
                showToast(`"${name}" updated successfully`, "success");
            } else {
                await Api.addInventory(payload);
                showToast(`"${name}" formally added to hangar.`, "success");
            }
            this.closeModal();
            await this.loadInventory();
            await this.loadCategories();
        } catch (err) {
            showToast(err.message, "error");
        } finally {
            btn.disabled = false;
        }
    }

    async deleteItem(id, name) {
        if (!confirmAction(`Confirm permanent deletion of "${name}"?`)) return;
        try {
            await Api.deleteInventory(id);
            showToast("Item purged from database", "success");
            await this.loadInventory();
        } catch (err) {
            showToast(err.message, "error");
        }
    }
}

// Init
window.inventory = new InventoryManager();
window.onload = () => window.inventory.init();
