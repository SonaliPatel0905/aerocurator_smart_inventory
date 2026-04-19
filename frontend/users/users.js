/**
 * AeroCurator – User Management Controller
 * Refactored into a Class system for security and clean state management.
 */
class UserManager {
    constructor() {
        this.users = [];
        this.modalUserId = null;
        this.modalNewRole = null;
    }

    async init() {
        if (!Auth.guard()) return;
        setActiveNav("users");
        initTopbar();
        initSidebarToggle();

        if (!Auth.isAdmin()) {
            showToast("Admin access required for member management", "error");
            setTimeout(() => window.location.href = "/user-dashboard", 1500);
            return;
        }

        await this.loadUsers();
        this.setupEventListeners();

        // Handle auto-open if redirected
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('action') === 'add') {
            this.showAddUserModal();
        }
    }

    async loadUsers() {
        renderSpinner("users-table-wrap");
        try {
            const res = await Api.listUsers();
            this.users = res.data;
            this.updateCounter(this.users);
            this.renderTable(this.users);
        } catch (e) {
            document.getElementById("users-table-wrap").innerHTML =
                emptyState("error", "Member database unreachable: " + e.message);
        }
    }

    updateCounter(users) {
        document.getElementById("count-total").textContent = users.length;
        document.getElementById("count-admin").textContent = users.filter(u => u.role === 'admin').length;
        document.getElementById("count-users").textContent = users.filter(u => u.role === 'user').length;
    }

    renderTable(users) {
        const wrap = document.getElementById("users-table-wrap");
        if (!wrap) return;

        const myId = Auth.getUser().id; // Ensure we use the right ID field from localstorage

        wrap.innerHTML = `
            <div style="overflow-x:auto">
            <table class="data-table">
                <thead><tr><th>Member</th><th>Email</th><th>Role</th><th>Status</th><th>Actions</th></tr></thead>
                <tbody>
                    ${users.map(u => this.renderRow(u, u.id === myId)).join('')}
                </tbody>
            </table>
            </div>
        `;
    }

    renderRow(u, isSelf) {
        const initials = (u.name || u.email).substring(0, 2).toUpperCase();
        return `
            <tr>
                <td>
                    <div class="flex items-center gap-3">
                        <div class="w-9 h-9 signature-gradient rounded-full flex items-center justify-center font-bold text-[#001c5e] text-xs">
                            ${initials}
                        </div>
                        <div>
                            <p class="font-bold">${u.name || '—'} ${isSelf ? '<span class="chip chip-user pb-0.5 ml-1" style="font-size:9px">YOU</span>' : ""}</p>
                            <p class="text-[10px] text-on-surface-variant uppercase tracking-tighter">UID: ${u.id}</p>
                        </div>
                    </div>
                </td>
                <td class="text-on-surface-variant text-sm">${u.email}</td>
                <td><span class="chip chip-${u.role === 'admin' ? 'admin' : 'user'}">${u.role}</span></td>
                <td><span class="flex items-center gap-1.5 text-green-400 text-xs font-bold"><span class="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></span> Active</span></td>
                <td>
                    ${!isSelf ? `
                        <div class="flex gap-2">
                             <button class="btn-icon" title="Change Role" onclick="userManager.openRoleModal('${u.id}', '${u.name}', '${u.role}')">
                                <span class="material-symbols-outlined" style="font-size:18px">manage_accounts</span>
                            </button>
                            <button class="btn-icon text-error" title="Terminate Account" onclick="userManager.handleDelete('${u.id}', '${u.name}')">
                                <span class="material-symbols-outlined" style="font-size:18px">person_remove</span>
                            </button>
                        </div>
                    ` : '<p class="text-[10px] text-on-surface-variant italic">Locked Profile</p>'}
                </td>
            </tr>
        `;
    }

    setupEventListeners() {
        document.getElementById("btn-show-add-user")?.addEventListener("click", () => this.showAddUserModal());
        document.getElementById("add-user-form")?.addEventListener("submit", (e) => this.handleAddUser(e));
    }

    showAddUserModal() {
        document.getElementById("add-user-modal").classList.remove("hidden");
    }

    async handleAddUser(e) {
        e.preventDefault();
        const payload = {
            name: document.getElementById("af-name").value.trim(),
            email: document.getElementById("af-email").value.trim(),
            password: document.getElementById("af-password").value,
            role: document.getElementById("af-role").value
        };

        const btn = e.target.querySelector('button[type="submit"]');
        btn.disabled = true;
        btn.textContent = "Deploying...";

        try {
            await Api.addUser(payload);
            showToast(`Member "${payload.name}" successfully added.`, "success");
            document.getElementById("add-user-modal").classList.add("hidden");
            e.target.reset();
            await this.loadUsers();
        } catch (err) {
            showToast(err.message, "error");
        } finally {
            btn.disabled = false;
            btn.textContent = "Register User";
        }
    }

    // Role Modal Logic
    openRoleModal(id, name, currentRole) {
        this.modalUserId = id;
        document.getElementById("modal-user-name").textContent = name;
        this.setModalRole(currentRole);
        document.getElementById("role-modal").classList.remove("hidden");
    }

    closeRoleModal() {
        document.getElementById("role-modal").classList.add("hidden");
    }

    setModalRole(role) {
        this.modalNewRole = role;
        const active = "bg-primary text-on-primary";
        const inactive = "text-on-surface-variant hover:bg-white/5";
        document.getElementById("modal-btn-user").className = `py-3 px-4 rounded-lg text-sm font-bold transition-all ${role === 'user' ? active : inactive}`;
        document.getElementById("modal-btn-admin").className = `py-3 px-4 rounded-lg text-sm font-bold transition-all ${role === 'admin' ? active : inactive}`;
    }

    async confirmRoleChange() {
        try {
            await Api.updateUserRole(this.modalUserId, this.modalNewRole);
            showToast("Account privileges updated.", "success");
            this.closeRoleModal();
            await this.loadUsers();
        } catch (err) {
            showToast(err.message, "error");
        }
    }

    async handleDelete(id, name) {
        if (!confirmAction(`Revoke access for "${name}"? This will terminate their session immediately.`)) return;
        try {
            await Api.deleteUser(id);
            showToast("Account deleted successfully.", "success");
            await this.loadUsers();
        } catch (err) {
            showToast(err.message, "error");
        }
    }
}

window.userManager = new UserManager();
window.onload = () => window.userManager.init();
