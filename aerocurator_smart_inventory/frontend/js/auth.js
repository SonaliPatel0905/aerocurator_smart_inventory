/**
 * AeroCurator – Auth & UI Utilities
 * Shared helpers used by all pages.
 */

// ── Session Helpers ──────────────────────────────────────────────────────

const Auth = {
    /** Called on every protected page to guard access */
    guard() {
        const token = localStorage.getItem("ac_token");
        if (!token) {
            window.location.href = "/";
            return false;
        }
        return true;
    },

    getUser() {
        try {
            return JSON.parse(localStorage.getItem("ac_user") || "{}");
        } catch { return {}; }
    },

    isAdmin() {
        return this.getUser().role === "admin";
    },

    /** Store session after login */
    setSession(token, name, email, role) {
        localStorage.setItem("ac_token", token);
        localStorage.setItem("ac_user", JSON.stringify({ token, name, email, role }));
    },

    /** Clear session and redirect to login */
    async logout() {
        try { await Api.logout(); } catch {}
        localStorage.removeItem("ac_token");
        localStorage.removeItem("ac_user");
        window.location.href = "/";
    },
};


// ── Toast Notifications ──────────────────────────────────────────────────

function showToast(message, type = "info") {
    let container = document.getElementById("toast-container");
    if (!container) {
        container = document.createElement("div");
        container.id = "toast-container";
        document.body.appendChild(container);
    }

    const icons = { success: "check_circle", error: "error", info: "info" };
    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <span class="material-symbols-outlined icon-filled" style="font-size:18px">${icons[type] || "info"}</span>
        <span>${message}</span>
    `;
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.animation = "fadeOut 0.3s ease forwards";
        setTimeout(() => toast.remove(), 320);
    }, 3500);
}


// ── Sidebar Active State ─────────────────────────────────────────────────

function setActiveNav(pageName) {
    document.querySelectorAll("#sidebar .nav-link").forEach(link => {
        link.classList.toggle("active", link.dataset.page === pageName);
    });
}


// ── Top Navbar User Info ─────────────────────────────────────────────────

function initTopbar() {
    const user      = Auth.getUser();
    const nameEl    = document.getElementById("topbar-name");
    const emailEl   = document.getElementById("topbar-email");
    const roleEl    = document.getElementById("topbar-role");
    const logoutBtn = document.getElementById("btn-logout");
    const avatarEl  = document.getElementById("topbar-avatar-initials");

    // Display name (fall back to email prefix)
    const displayName = user.name || (user.email ? user.email.split("@")[0] : "—");
    if (nameEl)  nameEl.textContent  = displayName;
    if (emailEl) emailEl.textContent = user.email || "";

    // Role chip
    if (roleEl) {
        roleEl.textContent = user.role || "user";
        roleEl.className   = `chip chip-${user.role === "admin" ? "admin" : "user"}`;
    }

    // Avatar initials
    if (avatarEl) {
        const parts    = displayName.trim().split(" ");
        const initials = parts.length >= 2
            ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
            : displayName.substring(0, 2).toUpperCase();
        avatarEl.textContent = initials;
    }

    if (logoutBtn) logoutBtn.addEventListener("click", () => Auth.logout());

    // Hide admin-only elements for non-admin users
    if (user.role !== "admin") {
        document.querySelectorAll(".admin-only").forEach(el => el.style.display = "none");
    }
}


// ── Sidebar Toggle (mobile) ──────────────────────────────────────────────

function initSidebarToggle() {
    const btn = document.getElementById("btn-sidebar-toggle");
    const sidebar = document.getElementById("sidebar");
    const overlay = document.getElementById("sidebar-overlay");
    if (btn && sidebar) {
        btn.addEventListener("click", () => {
            sidebar.classList.toggle("open");
            if (overlay) overlay.classList.toggle("hidden");
        });
    }
    if (overlay) {
        overlay.addEventListener("click", () => {
            sidebar.classList.remove("open");
            overlay.classList.add("hidden");
        });
    }
}


// ── Format Helpers ───────────────────────────────────────────────────────

function fmt$$(amount) {
    return "$" + Number(amount || 0).toLocaleString("en-US", {
        minimumFractionDigits: 2, maximumFractionDigits: 2
    });
}

function fmtDate(dateStr) {
    if (!dateStr) return "—";
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

function stockChip(qty, threshold) {
    if (qty === 0)         return `<span class="chip chip-out-stock">Out of Stock</span>`;
    if (qty <= threshold)  return `<span class="chip chip-low-stock">Low Stock</span>`;
    return `<span class="chip chip-in-stock">In Stock</span>`;
}

function emptyState(icon, text) {
    return `<div class="empty-state">
        <span class="material-symbols-outlined">${icon}</span>
        <p>${text}</p>
    </div>`;
}

// ── Render loading spinner ───────────────────────────────────────────────

function renderSpinner(containerId) {
    const el = document.getElementById(containerId);
    if (el) el.innerHTML = `<div class="spinner"></div>`;
}

// ── Confirm dialog ───────────────────────────────────────────────────────

function confirmAction(message) {
    return window.confirm(message);
}
