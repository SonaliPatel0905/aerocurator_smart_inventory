/**
 * AeroCurator – Profile Page Logic
 */

let currentUser = {};

(async () => {
    if (!Auth.guard()) return;
    setActiveNav("profile");
    initTopbar();
    initSidebarToggle();

    // Also show the Account section in sidebar
    document.querySelectorAll("[data-page='profile'], [data-page='users']")
        .forEach(el => el.closest(".hidden") && el.closest(".hidden").classList.remove("hidden"));

    await loadProfile();
    initForms();
})();

async function loadProfile() {
    try {
        const res  = await Api.me();
        currentUser = res.data;
        render(currentUser);
    } catch (e) {
        showToast("Failed to load profile: " + e.message, "error");
    }
}

function initials(name) {
    const parts = (name || "").trim().split(" ");
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return (name || "??").substring(0, 2).toUpperCase();
}

function render(u) {
    // Big avatar + identity card
    const ini = initials(u.name || u.email);
    document.getElementById("profile-avatar").textContent        = ini;
    document.getElementById("profile-name-display").textContent  = u.name  || "—";
    document.getElementById("profile-email-display").textContent = u.email || "—";
    const chip = document.getElementById("profile-role-chip");
    chip.textContent = u.role || "user";
    chip.className   = `chip chip-${u.role === "admin" ? "admin" : "user"} mt-3 mx-auto`;

    document.getElementById("profile-joined").textContent = fmtDate(u.created_at);
    document.getElementById("profile-access").textContent =
        u.role === "admin" ? "Full Admin — CRUD + User Mgmt" : "Standard User — Read + Transact";

    // Pre-fill name edit field
    document.getElementById("edit-name").value = u.name || "";

    // Account info grid
    document.getElementById("info-email").textContent   = u.email || "—";
    document.getElementById("info-role").textContent    = u.role || "—";
    document.getElementById("info-id").textContent      = `#${u.id}`;
    document.getElementById("info-created").textContent = fmtDate(u.created_at);

    // Update topbar in case name differs
    const nameEl = document.getElementById("topbar-name");
    const avEl   = document.getElementById("topbar-avatar-initials");
    if (nameEl) nameEl.textContent = u.name || u.email;
    if (avEl)   avEl.textContent   = ini;
}

function initForms() {
    // ── Name form ──────────────────────────────────────────────────────────
    document.getElementById("form-name").addEventListener("submit", async (e) => {
        e.preventDefault();
        const name = document.getElementById("edit-name").value.trim();
        if (name.length < 2) { showToast("Name must be at least 2 characters", "error"); return; }

        const btn = document.getElementById("btn-save-name");
        btn.disabled = true; btn.innerHTML = `<span class="material-symbols-outlined text-[16px]">sync</span> Saving…`;

        try {
            const res = await Api.updateProfile(name);
            currentUser.name = res.data.name;
            // Update localStorage so topbar stays correct across pages
            const stored = Auth.getUser();
            stored.name  = res.data.name;
            localStorage.setItem("ac_user", JSON.stringify(stored));
            render(currentUser);
            showToast("Display name updated!", "success");
        } catch (err) {
            showToast(err.message, "error");
        }
        btn.disabled = false; btn.innerHTML = `<span class="material-symbols-outlined text-[16px]">save</span> Save Name`;
    });

    // ── Password form ──────────────────────────────────────────────────────
    // Strength bar
    document.getElementById("pw-new").addEventListener("input", function () {
        const v = this.value;
        let s = 0;
        if (v.length >= 6)  s++;
        if (v.length >= 10) s++;
        if (/[A-Z]/.test(v)) s++;
        if (/[0-9]/.test(v)) s++;
        if (/[^A-Za-z0-9]/.test(v)) s++;
        const levels = [
            { w: "0%",   bg: "transparent" },
            { w: "25%",  bg: "#ff6e84" },
            { w: "50%",  bg: "#facc15" },
            { w: "75%",  bg: "#93aaff" },
            { w: "100%", bg: "#4ade80" },
        ];
        const bar = document.getElementById("pw-strength-bar");
        const lvl = levels[Math.min(s, 4)];
        bar.style.width      = lvl.w;
        bar.style.background = lvl.bg;
    });

    // Live confirm mismatch
    document.getElementById("pw-confirm").addEventListener("input", function () {
        const newPw = document.getElementById("pw-new").value;
        const errEl = document.getElementById("pw-match-err");
        errEl.classList.toggle("hidden", this.value === newPw || this.value === "");
    });

    // Visibility toggles
    document.querySelectorAll(".toggle-pw").forEach(btn => {
        btn.addEventListener("click", () => {
            const target = document.getElementById(btn.dataset.target);
            target.type  = target.type === "password" ? "text" : "password";
            btn.querySelector(".material-symbols-outlined").textContent =
                target.type === "password" ? "visibility" : "visibility_off";
        });
    });

    document.getElementById("form-password").addEventListener("submit", async (e) => {
        e.preventDefault();
        const current = document.getElementById("pw-current").value;
        const newPw   = document.getElementById("pw-new").value;
        const confirm = document.getElementById("pw-confirm").value;

        if (newPw !== confirm) { showToast("Passwords do not match", "error"); return; }

        const btn = document.getElementById("btn-change-pw");
        btn.disabled = true; btn.innerHTML = `<span class="material-symbols-outlined text-[16px]">sync</span> Updating…`;

        try {
            await Api.changePassword(current, newPw, confirm);
            showToast("Password updated! Please sign in again next time.", "success");
            document.getElementById("form-password").reset();
            document.getElementById("pw-strength-bar").style.width = "0%";
        } catch (err) {
            showToast(err.message, "error");
        }
        btn.disabled = false; btn.innerHTML = `<span class="material-symbols-outlined text-[16px]">key</span> Update Password`;
    });
}
