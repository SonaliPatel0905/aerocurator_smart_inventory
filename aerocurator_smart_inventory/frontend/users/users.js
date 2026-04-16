/**
 * AeroCurator – Users Management Logic (Admin only)
 */

let allUsers     = [];
let modalUserId  = null;
let modalNewRole = null;
let currentAdminId = null;

(async () => {
    if (!Auth.guard()) return;
    setActiveNav("users");
    initTopbar();
    initSidebarToggle();

    // Redirect non-admins
    if (!Auth.isAdmin()) {
        showToast("Admin access required", "error");
        setTimeout(() => window.location.href = "/dashboard", 1500);
        return;
    }

    currentAdminId = Auth.getUser().user_id || null;
    await loadUsers();
})();

async function loadUsers() {
    renderSpinner("users-table-wrap");
    document.getElementById("count-total").textContent = "—";
    document.getElementById("count-admin").textContent = "—";
    document.getElementById("count-users").textContent = "—";

    try {
        const res = await Api.listUsers();
        allUsers  = res.data;

        const adminCount = allUsers.filter(u => u.role === "admin").length;
        const userCount  = allUsers.filter(u => u.role === "user").length;

        document.getElementById("count-total").textContent = allUsers.length;
        document.getElementById("count-admin").textContent = adminCount;
        document.getElementById("count-users").textContent = userCount;

        renderTable(allUsers);
    } catch (e) {
        document.getElementById("users-table-wrap").innerHTML =
            emptyState("error", "Failed to load users: " + e.message);
    }
}

function renderTable(users) {
    const wrap = document.getElementById("users-table-wrap");
    if (users.length === 0) {
        wrap.innerHTML = emptyState("group", "No team members found");
        return;
    }

    const myId = Auth.getUser().user_id;

    wrap.innerHTML = `
        <div style="overflow-x:auto">
        <table class="data-table">
            <thead><tr>
                <th>Member</th><th>Email</th><th>Role</th><th>Joined</th><th>Actions</th>
            </tr></thead>
            <tbody>
                ${users.map(u => {
                    const isSelf    = u.id === myId;
                    const ini       = getInitials(u.name || u.email);
                    const joined    = fmtDate(u.created_at);
                    const isAdmin   = u.role === "admin";

                    return `
                    <tr>
                        <td>
                            <div class="flex items-center gap-3">
                                <div class="w-9 h-9 signature-gradient rounded-full flex items-center justify-center flex-shrink-0">
                                    <span class="text-[#001c5e] text-xs font-extrabold">${ini}</span>
                                </div>
                                <div>
                                    <p class="font-semibold">${u.name || "—"} ${isSelf ? '<span class="chip chip-user" style="font-size:10px;padding:2px 8px">You</span>' : ""}</p>
                                    <p class="text-xs text-on-surface-variant">#${u.id}</p>
                                </div>
                            </div>
                        </td>
                        <td class="text-on-surface-variant">${u.email}</td>
                        <td>
                            <span class="chip chip-${isAdmin ? "admin" : "user"}">${u.role}</span>
                        </td>
                        <td class="text-on-surface-variant">${joined}</td>
                        <td>
                            <div class="flex items-center gap-2">
                                ${!isSelf ? `
                                <button onclick="openRoleModal(${u.id}, '${u.name || u.email}', '${u.role}')"
                                    class="btn-icon" title="Change role" style="background:#1f2b49;border-radius:10px;padding:8px">
                                    <span class="material-symbols-outlined text-primary" style="font-size:16px">manage_accounts</span>
                                </button>
                                <button onclick="handleDelete(${u.id}, '${u.name || u.email}')"
                                    class="btn-icon" title="Remove user" style="background:rgba(255,110,132,0.1);border-radius:10px;padding:8px">
                                    <span class="material-symbols-outlined text-error" style="font-size:16px">person_remove</span>
                                </button>` : `
                                <span class="text-xs text-on-surface-variant">—</span>`}
                            </div>
                        </td>
                    </tr>`;
                }).join("")}
            </tbody>
        </table>
        </div>
        <p class="text-xs text-on-surface-variant mt-3 px-1">${users.length} account${users.length !== 1 ? "s" : ""} registered</p>
    `;
}

function getInitials(name) {
    const parts = (name || "?").trim().split(" ");
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return (name || "??").substring(0, 2).toUpperCase();
}

// ── Role Modal ──────────────────────────────────────────────────────────────

function openRoleModal(userId, userName, currentRole) {
    modalUserId  = userId;
    modalNewRole = currentRole;
    document.getElementById("modal-user-name").textContent = userName;
    setModalRole(currentRole);
    document.getElementById("role-modal").classList.remove("hidden");
}

function closeRoleModal() {
    document.getElementById("role-modal").classList.add("hidden");
    modalUserId  = null;
    modalNewRole = null;
}

function setModalRole(role) {
    modalNewRole = role;
    const activeClass   = "py-3 px-4 rounded-lg text-sm font-bold transition-all bg-primary text-on-primary";
    const inactiveClass = "py-3 px-4 rounded-lg text-sm font-bold transition-all text-on-surface-variant hover:bg-surface-bright";
    document.getElementById("modal-btn-user").className  = role === "user"  ? activeClass : inactiveClass;
    document.getElementById("modal-btn-admin").className = role === "admin" ? activeClass : inactiveClass;
}

async function confirmRoleChange() {
    if (!modalUserId || !modalNewRole) return;
    const btn = document.getElementById("modal-confirm-btn");
    btn.disabled = true; btn.textContent = "Saving…";

    try {
        await Api.updateUserRole(modalUserId, modalNewRole);
        showToast("Role updated successfully", "success");
        closeRoleModal();
        await loadUsers();
    } catch (err) {
        showToast(err.message, "error");
    }
    btn.disabled = false; btn.textContent = "Confirm";
}

// ── Delete User ─────────────────────────────────────────────────────────────

async function handleDelete(userId, userName) {
    if (!confirmAction(`Remove "${userName}" from the system? This action cannot be undone.`)) return;
    try {
        await Api.deleteUser(userId);
        showToast(`${userName} has been removed.`, "success");
        await loadUsers();
    } catch (err) {
        showToast(err.message, "error");
    }
}
