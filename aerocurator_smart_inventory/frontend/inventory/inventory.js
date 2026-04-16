/**
 * AeroCurator – Inventory Management Logic
 */

let allItems = [];
let editingId = null;

(async () => {
    if (!Auth.guard()) return;
    setActiveNav("inventory");
    initTopbar();
    initSidebarToggle();
    await loadCategories();
    await loadInventory();

    document.getElementById("search-input").addEventListener("input", () => renderTable(filterItems()));
    document.getElementById("category-filter").addEventListener("change", () => renderTable(filterItems()));
    document.getElementById("btn-add-item").addEventListener("click", () => openModal());
    document.getElementById("item-form").addEventListener("submit", handleSubmit);
})();

async function loadCategories() {
    try {
        const res = await Api.getCategories();
        const sel = document.getElementById("category-filter");
        res.data.forEach(cat => {
            const opt = document.createElement("option");
            opt.value = cat; opt.textContent = cat;
            sel.appendChild(opt);
        });
    } catch {}
}

async function loadInventory() {
    renderSpinner("inventory-table-wrap");
    try {
        const res = await Api.getInventory();
        allItems = res.data;
        renderTable(allItems);
    } catch (e) {
        document.getElementById("inventory-table-wrap").innerHTML =
            emptyState("error", "Failed to load inventory: " + e.message);
    }
}

function filterItems() {
    const q    = document.getElementById("search-input").value.toLowerCase();
    const cat  = document.getElementById("category-filter").value;
    return allItems.filter(item => {
        const matchQ   = !q || item.name.toLowerCase().includes(q) || (item.sku || "").toLowerCase().includes(q);
        const matchCat = !cat || item.category === cat;
        return matchQ && matchCat;
    });
}

function renderTable(items) {
    const wrap = document.getElementById("inventory-table-wrap");
    const isAdmin = Auth.isAdmin();

    if (items.length === 0) {
        wrap.innerHTML = emptyState("inventory_2", "No components found");
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
                <th>Unit Price</th>
                <th>Total Value</th>
                <th>Status</th>
                ${isAdmin ? "<th>Actions</th>" : ""}
            </tr></thead>
            <tbody>
                ${items.map(item => `
                <tr>
                    <td>
                        <p class="font-semibold">${item.name}</p>
                        <p class="text-xs text-on-surface-variant">Threshold: ${item.low_stock_threshold}</p>
                    </td>
                    <td><span class="chip chip-user">${item.sku || "—"}</span></td>
                    <td class="text-on-surface-variant">${item.category}</td>
                    <td class="font-bold">${item.quantity.toLocaleString()}</td>
                    <td>${fmt$$(item.price)}</td>
                    <td class="text-primary font-semibold">${fmt$$(item.quantity * item.price)}</td>
                    <td>${stockChip(item.quantity, item.low_stock_threshold)}</td>
                    ${isAdmin ? `
                    <td>
                        <div class="flex gap-2">
                            <button class="btn-icon" title="Edit" onclick="openModal(${item.id})">
                                <span class="material-symbols-outlined" style="font-size:18px">edit</span>
                            </button>
                            <button class="btn-danger" title="Delete" onclick="deleteItem(${item.id}, '${item.name}')">
                                <span class="material-symbols-outlined" style="font-size:16px">delete</span>
                            </button>
                        </div>
                    </td>` : ""}
                </tr>`).join("")}
            </tbody>
        </table>
        </div>
        <p class="text-xs text-on-surface-variant mt-3 px-1">${items.length} component${items.length !== 1 ? "s" : ""} found</p>
    `;
}

function openModal(id = null) {
    editingId = id;
    const modal = document.getElementById("item-modal");
    const title = document.getElementById("modal-title");
    const btn   = document.getElementById("modal-submit-btn");

    if (id) {
        const item = allItems.find(i => i.id === id);
        if (!item) return;
        title.textContent = "Edit Component";
        btn.innerHTML = '<span class="material-symbols-outlined text-[18px]">save</span> Update Component';
        document.getElementById("f-name").value      = item.name;
        document.getElementById("f-category").value  = item.category;
        document.getElementById("f-sku").value        = item.sku || "";
        document.getElementById("f-quantity").value   = item.quantity;
        document.getElementById("f-price").value      = item.price;
        document.getElementById("f-threshold").value  = item.low_stock_threshold;
    } else {
        title.textContent = "Add Component";
        btn.innerHTML = '<span class="material-symbols-outlined text-[18px]">add</span> Add Component';
        document.getElementById("item-form").reset();
        document.getElementById("f-threshold").value = 10;
    }
    modal.classList.add("open");
}

function closeModal() {
    document.getElementById("item-modal").classList.remove("open");
    editingId = null;
}

async function handleSubmit(e) {
    e.preventDefault();
    const payload = {
        name:                document.getElementById("f-name").value.trim(),
        category:            document.getElementById("f-category").value.trim(),
        sku:                 document.getElementById("f-sku").value.trim(),
        quantity:            parseInt(document.getElementById("f-quantity").value),
        price:               parseFloat(document.getElementById("f-price").value),
        low_stock_threshold: parseInt(document.getElementById("f-threshold").value),
    };

    try {
        if (editingId) {
            await Api.updateInventory(editingId, payload);
            showToast("Component updated successfully", "success");
        } else {
            await Api.addInventory(payload);
            showToast("Component added successfully", "success");
        }
        closeModal();
        await loadInventory();
        await loadCategories();
    } catch (err) {
        showToast(err.message, "error");
    }
}

async function deleteItem(id, name) {
    if (!confirmAction(`Delete "${name}"? This cannot be undone.`)) return;
    try {
        await Api.deleteInventory(id);
        showToast("Component deleted", "success");
        await loadInventory();
    } catch (err) {
        showToast(err.message, "error");
    }
}
