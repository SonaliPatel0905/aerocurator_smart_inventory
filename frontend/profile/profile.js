/**
 * AeroCurator – Profile Manager Controller
 * Refactored into a Class system for identity management and session state syncing.
 */
class ProfileManager {
    constructor() {
        this.user = {};
    }

    async init() {
        if (!Auth.guard()) return;
        setActiveNav("profile");
        initTopbar();
        initSidebarToggle();

        // Ensure visibility of account-related nav links
        document.querySelectorAll("[data-page='profile'], [data-page='users']")
            .forEach(el => {
                const parent = el.closest(".hidden");
                if (parent) parent.classList.remove("hidden");
            });

        await this.loadProfile();
        this.setupEventListeners();
    }

    async loadProfile() {
        try {
            const res = await Api.me();
            this.user = res.data;
            this.render(this.user);
        } catch (e) {
            showToast("Sync failure with authentication service: " + e.message, "error");
        }
    }

    getInitials(name) {
        const parts = (name || "").trim().split(" ");
        if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
        return (name || "??").substring(0, 2).toUpperCase();
    }

    render(u) {
        const ini = this.getInitials(u.name || u.email);
        
        // Identity UI
        const avatarEl = document.getElementById("profile-avatar");
        const nameEl = document.getElementById("profile-name-display");
        const emailEl = document.getElementById("profile-email-display");
        const chipEl = document.getElementById("profile-role-chip");

        if (avatarEl) avatarEl.textContent = ini;
        if (nameEl) nameEl.textContent = u.name || "Aero Pilot";
        if (emailEl) emailEl.textContent = u.email;
        if (chipEl) {
            chipEl.textContent = u.role || "user";
            chipEl.className = `chip chip-${u.role === "admin" ? "admin" : "user"} mt-3 mx-auto`;
        }

        // Stats UI
        const joinedEl = document.getElementById("profile-joined");
        const accessEl = document.getElementById("profile-access");
        if (joinedEl) joinedEl.textContent = fmtDate(u.created_at);
        if (accessEl) accessEl.textContent = u.role === "admin" ? "Administrator Control — Full CRUD" : "Standard Operator — Catalog Access";

        // Form Defaults
        const nameInput = document.getElementById("edit-name");
        if (nameInput) nameInput.value = u.name || "";

        // Account Metadata Grid
        const gridEmail = document.getElementById("info-email");
        const gridRole = document.getElementById("info-role");
        const gridId = document.getElementById("info-id");
        const gridCreated = document.getElementById("info-created");

        if (gridEmail) gridEmail.textContent = u.email;
        if (gridRole) gridRole.textContent = (u.role || "user").toUpperCase();
        if (gridId) gridId.textContent = u.id; // MongoDB Hex ID
        if (gridCreated) gridCreated.textContent = fmtDate(u.created_at);

        // Sync Topbar
        const topName = document.getElementById("topbar-name");
        const topIni = document.getElementById("topbar-avatar-initials");
        if (topName) topName.textContent = u.name || u.email;
        if (topIni) topIni.textContent = ini;
    }

    setupEventListeners() {
        // Name Update
        document.getElementById("form-name")?.addEventListener("submit", (e) => this.handleNameUpdate(e));

        // Password Update
        document.getElementById("form-password")?.addEventListener("submit", (e) => this.handlePasswordUpdate(e));

        // Password strength & match logic
        document.getElementById("pw-new")?.addEventListener("input", (e) => this.checkPasswordStrength(e.target.value));
        document.getElementById("pw-confirm")?.addEventListener("input", (e) => this.checkPasswordMatch(e.target.value));

        // Visibility Toggles
        document.querySelectorAll(".toggle-pw").forEach(btn => {
            btn.addEventListener("click", () => {
                const target = document.getElementById(btn.dataset.target);
                if (target) {
                    target.type = target.type === "password" ? "text" : "password";
                    const icon = btn.querySelector(".material-symbols-outlined");
                    if (icon) icon.textContent = target.type === "password" ? "visibility" : "visibility_off";
                }
            });
        });
    }

    async handleNameUpdate(e) {
        e.preventDefault();
        const name = document.getElementById("edit-name").value.trim();
        if (name.length < 2) { showToast("Callsign must be at least 2 characters", "error"); return; }

        const btn = document.getElementById("btn-save-name");
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner-mini"></span> Updating...';

        try {
            const res = await Api.updateProfile(name);
            this.user.name = res.data.name;
            
            // Persist to session
            const stored = Auth.getUser();
            stored.name = res.data.name;
            localStorage.setItem("ac_user", JSON.stringify(stored));
            
            this.render(this.user);
            showToast("Pilot identification updated successfully.", "success");
        } catch (err) {
            showToast(err.message, "error");
        } finally {
            btn.disabled = false;
            btn.innerHTML = '<span class="material-symbols-outlined text-[16px]">save</span> Save Name';
        }
    }

    async handlePasswordUpdate(e) {
        e.preventDefault();
        const current = document.getElementById("pw-current").value;
        const newPw = document.getElementById("pw-new").value;
        const confirm = document.getElementById("pw-confirm").value;

        if (newPw !== confirm) { showToast("Security credentials do not match", "error"); return; }
        if (newPw.length < 6) { showToast("New password must be at least 6 characters", "error"); return; }

        const btn = document.getElementById("btn-change-pw");
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner-mini"></span> Re-encrypting...';

        try {
            await Api.changePassword(current, newPw, confirm);
            showToast("Security keys updated. Session remained active.", "success");
            e.target.reset();
            const bar = document.getElementById("pw-strength-bar");
            if (bar) bar.style.width = "0%";
        } catch (err) {
            showToast(err.message, "error");
        } finally {
            btn.disabled = false;
            btn.innerHTML = '<span class="material-symbols-outlined text-[16px]">key</span> Update Password';
        }
    }

    checkPasswordStrength(v) {
        let s = 0;
        if (v.length >= 6) s++;
        if (v.length >= 10) s++;
        if (/[A-Z]/.test(v)) s++;
        if (/[0-9]/.test(v)) s++;
        if (/[^A-Za-z0-9]/.test(v)) s++;
        
        const levels = [
            { w: "0%", bg: "transparent" },
            { w: "25%", bg: "#ff6e84" },
            { w: "50%", bg: "#facc15" },
            { w: "75%", bg: "#93aaff" },
            { w: "100%", bg: "#4ade80" },
        ];
        const bar = document.getElementById("pw-strength-bar");
        if (bar) {
            const lvl = levels[Math.min(s, 4)];
            bar.style.width = lvl.w;
            bar.style.background = lvl.bg;
        }
    }

    checkPasswordMatch(v) {
        const newPw = document.getElementById("pw-new")?.value;
        const errEl = document.getElementById("pw-match-err");
        if (errEl) {
            errEl.classList.toggle("hidden", v === newPw || v === "");
        }
    }
}

// Initiation
window.profileManager = new ProfileManager();
window.onload = () => window.profileManager.init();
