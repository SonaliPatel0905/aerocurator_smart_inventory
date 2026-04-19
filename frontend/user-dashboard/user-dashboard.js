/**
 * AeroCurator – User Dashboard Controller
 * Focuses on quick search and inventory browsing without administrative overhead.
 */
class UserDashboard extends BaseDashboard {
    constructor() {
        super("dashboard");
        this.inventory = [];
    }

    async init() {
        await super.init();
        await this.loadInventory();
    }

    async loadInventory() {
        renderSpinner("table-user-inventory");
        try {
            const res = await Api.getInventory();
            this.inventory = res.data;
            this.renderInventory(this.inventory);
        } catch (e) {
            document.getElementById("table-user-inventory").innerHTML = 
                emptyState("error", "Failed to fetch inventory catalog.");
        }
    }

    renderInventory(items) {
        const wrap = document.getElementById("table-user-inventory");
        if (!wrap) return;
        if (items.length === 0) {
            wrap.innerHTML = emptyState("inventory_2", "No components found in the system.");
            return;
        }

        wrap.innerHTML = `
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Component</th>
                        <th>SKU</th>
                        <th>Category</th>
                        <th>Status</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${items.slice(0, 10).map(item => `
                        <tr>
                            <td><p class="font-bold">${item.name}</p></td>
                            <td><span class="chip chip-user">${item.sku || '—'}</span></td>
                            <td class="text-on-surface-variant">${item.category}</td>
                            <td>${stockChip(item.quantity, item.low_stock_threshold)}</td>
                            <td>
                                <div class="flex gap-3">
                                    <a href="/inventory" class="text-xs text-on-surface-variant hover:text-white transition-colors" title="View Details">
                                        <span class="material-symbols-outlined text-[18px]">info</span>
                                    </a>
                                    <a href="/orders?action=new&id=${item.id}" class="text-xs text-primary font-bold hover:underline flex items-center gap-1">
                                        <span class="material-symbols-outlined text-[16px]">add_task</span> Request Stock
                                    </a>
                                </div>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    }

    setupEventListeners() {
        const searchInput = document.getElementById("quick-search");
        if (searchInput) {
            searchInput.addEventListener("input", (e) => {
                const q = e.target.value.toLowerCase();
                const filtered = this.inventory.filter(i => 
                    i.name.toLowerCase().includes(q) || 
                    (i.sku && i.sku.toLowerCase().includes(q))
                );
                this.renderInventory(filtered);
            });
        }
    }

    renderStats(stats) {
        // Users only see specific stats
        const itemsEl = document.getElementById("stat-items");
        if (itemsEl) itemsEl.textContent = stats.total_items.toLocaleString();
    }

    async loadRecentActivity() {
        // Users don't see purchase/sale tables
    }
}

// Global initialization
window.dashboard = new UserDashboard();
window.onload = () => window.dashboard.init();
