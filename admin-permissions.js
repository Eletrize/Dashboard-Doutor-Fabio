/* eslint-disable no-console */
(function (global) {
  "use strict";

  const state = {
    users: [],
    selectedUserId: "",
    currentUserId: "",
    loading: false,
    saving: false,
    searchTerm: "",
  };

  function normalizeText(value) {
    return String(value || "").trim().toLowerCase();
  }

  function escapeHtml(value) {
    return String(value || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function getEl(id) {
    return document.getElementById(id);
  }

  function toArray(value) {
    return Array.isArray(value) ? value : [];
  }

  function getAccessApi() {
    return global.dashboardAccess || null;
  }

  function canAccessAdminPanel() {
    const accessApi = getAccessApi();
    return Boolean(
      accessApi && typeof accessApi.canAccessAdminPanel === "function"
        ? accessApi.canAccessAdminPanel()
        : false,
    );
  }

  function getEnvironmentCatalog() {
    const environments = global.CLIENT_CONFIG?.environments || {};
    return Object.entries(environments)
      .map(([key, env]) => ({
        key: String(key || ""),
        name: String(env?.name || key),
        order: Number(env?.order || 0),
      }))
      .sort((left, right) => left.order - right.order || left.name.localeCompare(right.name, "pt-BR"));
  }

  function formatRoleLabel(role) {
    switch (normalizeText(role)) {
      case "admin":
        return "Administrador";
      case "convidado":
        return "Convidado";
      default:
        return "Morador";
    }
  }

  function formatAccessModeLabel(mode) {
    switch (normalizeText(mode)) {
      case "admin":
        return "Admin";
      case "restricted":
        return "Restrito";
      default:
        return "Acesso total";
    }
  }

  function formatDateTime(value) {
    if (!value) return "-";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return "-";
    try {
      return new Intl.DateTimeFormat("pt-BR", {
        dateStyle: "short",
        timeStyle: "short",
      }).format(parsed);
    } catch (_error) {
      return parsed.toLocaleString("pt-BR");
    }
  }

  function setFeedback(message, type) {
    const feedback = getEl("admin-permissions-feedback");
    if (!feedback) return;
    feedback.textContent = message || "";
    feedback.dataset.state = type || "neutral";
  }

  function getFilteredUsers() {
    const normalizedSearch = normalizeText(state.searchTerm);
    if (!normalizedSearch) {
      return state.users.slice();
    }

    return state.users.filter((user) => {
      const haystack = [
        user?.email,
        user?.displayName,
        user?.profile?.displayName,
        user?.profile?.role,
        user?.accessMode,
      ]
        .map((value) => normalizeText(value))
        .join(" ");
      return haystack.includes(normalizedSearch);
    });
  }

  async function fetchAdminData() {
    const response = await fetch("/admin-access", {
      method: "GET",
      cache: "no-store",
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(
        payload?.message || payload?.error || `Falha HTTP ${response.status}`,
      );
    }

    return payload;
  }

  function buildAccessMap(user) {
    return toArray(user?.environmentAccess).reduce((map, row) => {
      const envKey = String(row?.environmentKey || "").trim();
      if (!envKey) return map;
      map.set(envKey, {
        canView: row?.canView === true,
        canControl: row?.canControl === true,
        canCreateScenes: row?.canCreateScenes === true,
      });
      return map;
    }, new Map());
  }

  function renderUserList() {
    const listEl = getEl("admin-permissions-users");
    if (!listEl) return;

    if (state.loading) {
      listEl.innerHTML = '<div class="admin-permissions-empty">Carregando usuarios...</div>';
      return;
    }

    const users = getFilteredUsers();
    if (!users.length) {
      listEl.innerHTML = '<div class="admin-permissions-empty">Nenhum usuario encontrado.</div>';
      return;
    }

    listEl.innerHTML = users
      .map((user) => {
        const isActive = user.id === state.selectedUserId;
        const roleLabel = user.accessMode === "admin"
          ? "Administrador"
          : user.profile?.role
            ? formatRoleLabel(user.profile.role)
            : "Sem perfil";

        return `
          <button
            type="button"
            class="admin-permissions-user-btn${isActive ? " is-active" : ""}"
            data-admin-user-id="${escapeHtml(user.id)}"
          >
            <div class="admin-permissions-user-main">
              <span class="admin-permissions-user-name">${escapeHtml(user.displayName || user.email)}</span>
              <span class="admin-permissions-user-email">${escapeHtml(user.email)}</span>
            </div>
            <div class="admin-permissions-user-meta">
              <span class="admin-permissions-chip">${escapeHtml(formatAccessModeLabel(user.accessMode))}</span>
              <span class="admin-permissions-chip admin-permissions-chip--muted">${escapeHtml(roleLabel)}</span>
            </div>
          </button>
        `;
      })
      .join("");
  }

  function renderModeOption(mode, label, checked, disabled) {
    return `
      <label class="admin-permissions-mode-option${checked ? " is-active" : ""}${disabled ? " is-disabled" : ""}">
        <input
          type="radio"
          name="admin-access-mode"
          value="${escapeHtml(mode)}"
          ${checked ? "checked" : ""}
          ${disabled ? "disabled" : ""}
        />
        <span>${escapeHtml(label)}</span>
      </label>
    `;
  }

  function renderEnvironmentCards(user) {
    const accessMap = buildAccessMap(user);

    return getEnvironmentCatalog()
      .map((environment) => {
        const current = accessMap.get(environment.key) || {
          canView: false,
          canControl: false,
          canCreateScenes: false,
        };

        return `
          <article class="admin-permissions-env-card" data-admin-env-key="${escapeHtml(environment.key)}">
            <div class="admin-permissions-env-head">
              <div>
                <h3 class="admin-permissions-env-title">${escapeHtml(environment.name)}</h3>
                <p class="admin-permissions-env-key">${escapeHtml(environment.key)}</p>
              </div>
            </div>
            <div class="admin-permissions-env-options">
              <label class="admin-permissions-toggle">
                <input type="checkbox" data-admin-permission="view" ${current.canView ? "checked" : ""} />
                <span>Visualizar</span>
              </label>
              <label class="admin-permissions-toggle">
                <input type="checkbox" data-admin-permission="control" ${current.canControl ? "checked" : ""} />
                <span>Controlar</span>
              </label>
              <label class="admin-permissions-toggle">
                <input type="checkbox" data-admin-permission="scenes" ${current.canCreateScenes ? "checked" : ""} />
                <span>Cenarios</span>
              </label>
            </div>
          </article>
        `;
      })
      .join("");
  }

  function getSelectedUser() {
    return state.users.find((user) => user.id === state.selectedUserId) || null;
  }

  function renderUserDetail() {
    const emptyEl = getEl("admin-permissions-empty");
    const detailEl = getEl("admin-permissions-detail");
    if (!emptyEl || !detailEl) return;

    const user = getSelectedUser();
    if (!user) {
      emptyEl.hidden = false;
      detailEl.hidden = true;
      detailEl.innerHTML = "";
      return;
    }

    emptyEl.hidden = true;
    detailEl.hidden = false;

    const accessMode = String(user.accessMode || "restricted");
    const isCurrentAdmin = user.isCurrentUser === true;
    const displayNameValue =
      accessMode === "full"
        ? user.displayName || ""
        : user.profile?.displayName || user.displayName || "";
    const selectedRole = accessMode === "admin"
      ? "admin"
      : user.profile?.role || "morador";

    detailEl.innerHTML = `
      <div class="admin-permissions-detail-inner">
        <div class="admin-permissions-detail-head">
          <div>
            <h2 class="admin-permissions-detail-title">${escapeHtml(user.displayName || user.email)}</h2>
            <p class="admin-permissions-detail-email">${escapeHtml(user.email)}</p>
          </div>
          <div class="admin-permissions-detail-chips">
            <span class="admin-permissions-chip">${escapeHtml(formatAccessModeLabel(accessMode))}</span>
            <span class="admin-permissions-chip admin-permissions-chip--muted">${user.emailConfirmed ? "Email verificado" : "Email pendente"}</span>
          </div>
        </div>

        <div class="admin-permissions-summary-grid">
          <div class="admin-permissions-summary-card">
            <span class="admin-permissions-summary-label">Ultimo login</span>
            <strong class="admin-permissions-summary-value">${escapeHtml(formatDateTime(user.lastSignInAt))}</strong>
          </div>
          <div class="admin-permissions-summary-card">
            <span class="admin-permissions-summary-label">Criado em</span>
            <strong class="admin-permissions-summary-value">${escapeHtml(formatDateTime(user.createdAt))}</strong>
          </div>
          <div class="admin-permissions-summary-card">
            <span class="admin-permissions-summary-label">Perfil</span>
            <strong class="admin-permissions-summary-value">${escapeHtml(accessMode === "full" ? "Sem perfil salvo" : formatRoleLabel(selectedRole))}</strong>
          </div>
        </div>

        <label class="scenes-field">
          <span class="scenes-field-label">Nome exibido</span>
          <input
            id="admin-access-display-name"
            class="scenes-input"
            type="text"
            maxlength="80"
            value="${escapeHtml(displayNameValue)}"
          />
        </label>

        <div class="scenes-field">
          <span class="scenes-field-label">Tipo de acesso</span>
          <div class="admin-permissions-mode-grid">
            ${renderModeOption("admin", "Administrador", accessMode === "admin", false)}
            ${renderModeOption("restricted", "Restrito", accessMode === "restricted", isCurrentAdmin)}
            ${renderModeOption("full", "Acesso total", accessMode === "full", isCurrentAdmin)}
          </div>
        </div>

        <label class="scenes-field">
          <span class="scenes-field-label">Perfil</span>
          <select id="admin-access-role" class="scenes-select">
            <option value="morador" ${selectedRole === "morador" ? "selected" : ""}>Morador</option>
            <option value="convidado" ${selectedRole === "convidado" ? "selected" : ""}>Convidado</option>
            <option value="admin" ${selectedRole === "admin" ? "selected" : ""}>Administrador</option>
          </select>
        </label>

        <div id="admin-permissions-mode-note" class="admin-permissions-mode-note"></div>

        <div class="admin-permissions-environments-head">
          <div>
            <h3 class="admin-permissions-section-title">Ambientes</h3>
            <p class="admin-permissions-section-subtitle">Defina o que este usuario pode ver, controlar e usar em cenarios.</p>
          </div>
          <div class="admin-permissions-bulk-actions">
            <button type="button" id="admin-permissions-grant-all" class="scenes-btn scenes-btn--ghost">Liberar tudo</button>
            <button type="button" id="admin-permissions-clear-all" class="scenes-btn scenes-btn--ghost">Limpar</button>
          </div>
        </div>

        <div id="admin-permissions-environment-list" class="admin-permissions-env-grid">
          ${renderEnvironmentCards(user)}
        </div>

        <div class="admin-permissions-actions">
          <button type="button" id="admin-permissions-save" class="scenes-btn scenes-btn--primary">
            Salvar permissoes
          </button>
        </div>
      </div>
    `;

    bindDetailEvents(user);
    syncDetailFormState(user);
  }

  function getCheckedAccessMode() {
    const checked = document.querySelector('input[name="admin-access-mode"]:checked');
    return String(checked?.value || "restricted");
  }

  function getEnvironmentCards() {
    return Array.from(
      document.querySelectorAll("[data-admin-env-key]"),
    );
  }

  function syncEnvironmentDependencies(target) {
    const card = target?.closest?.("[data-admin-env-key]");
    if (!card) return;

    const viewInput = card.querySelector('[data-admin-permission="view"]');
    const controlInput = card.querySelector('[data-admin-permission="control"]');
    const scenesInput = card.querySelector('[data-admin-permission="scenes"]');
    if (!viewInput || !controlInput || !scenesInput) return;

    const permission = String(target.dataset.adminPermission || "");

    if (permission === "view" && !viewInput.checked) {
      controlInput.checked = false;
      scenesInput.checked = false;
      return;
    }

    if (permission === "control") {
      if (controlInput.checked) {
        viewInput.checked = true;
        return;
      }
      scenesInput.checked = false;
      return;
    }

    if (permission === "scenes" && scenesInput.checked) {
      controlInput.checked = true;
      viewInput.checked = true;
    }
  }

  function updateModeNote(accessMode, isCurrentAdmin) {
    const noteEl = getEl("admin-permissions-mode-note");
    if (!noteEl) return;

    let message = "";
    if (accessMode === "admin") {
      message = "Administrador tem acesso total e pode abrir este painel.";
    } else if (accessMode === "full") {
      message = "Acesso total remove o perfil salvo. O usuario continua com acesso total, mas sem permissao administrativa.";
    } else {
      message = "Modo restrito usa a lista de ambientes abaixo.";
    }

    if (isCurrentAdmin) {
      message += " Sua propria conta deve permanecer como administrador.";
    }

    noteEl.textContent = message;
  }

  function syncDetailFormState(user) {
    const accessMode = getCheckedAccessMode();
    const roleSelect = getEl("admin-access-role");
    const displayNameInput = getEl("admin-access-display-name");
    const bulkGrantBtn = getEl("admin-permissions-grant-all");
    const bulkClearBtn = getEl("admin-permissions-clear-all");
    const environmentCards = getEnvironmentCards();
    const isRestricted = accessMode === "restricted";
    const isAdminMode = accessMode === "admin";

    document
      .querySelectorAll(".admin-permissions-mode-option")
      .forEach((label) => {
        const input = label.querySelector('input[name="admin-access-mode"]');
        label.classList.toggle("is-active", input?.checked === true);
      });

    if (displayNameInput) {
      displayNameInput.disabled = accessMode === "full";
    }

    if (roleSelect) {
      roleSelect.disabled = !isRestricted;
      if (isAdminMode) {
        roleSelect.value = "admin";
      }
      if (accessMode === "full") {
        roleSelect.value = user.profile?.role || "morador";
      }
    }

    if (bulkGrantBtn) bulkGrantBtn.disabled = !isRestricted;
    if (bulkClearBtn) bulkClearBtn.disabled = !isRestricted;

    environmentCards.forEach((card) => {
      card.classList.toggle("is-disabled", !isRestricted);
      card.querySelectorAll('input[type="checkbox"]').forEach((input) => {
        input.disabled = !isRestricted;
      });
    });

    updateModeNote(accessMode, user.isCurrentUser === true);
  }

  function collectEnvironmentAccess() {
    return getEnvironmentCards()
      .map((card) => {
        const environmentKey = String(card.dataset.adminEnvKey || "").trim();
        const viewInput = card.querySelector('[data-admin-permission="view"]');
        const controlInput = card.querySelector('[data-admin-permission="control"]');
        const scenesInput = card.querySelector('[data-admin-permission="scenes"]');

        return {
          environmentKey,
          canView: viewInput?.checked === true,
          canControl: controlInput?.checked === true,
          canCreateScenes: scenesInput?.checked === true,
        };
      })
      .filter((row) => row.environmentKey);
  }

  async function handleSave() {
    const user = getSelectedUser();
    if (!user || state.saving) return;

    const accessMode = getCheckedAccessMode();
    const displayNameInput = getEl("admin-access-display-name");
    const roleSelect = getEl("admin-access-role");
    const payload = {
      userId: user.id,
      accessMode,
      displayName: displayNameInput?.value || "",
      role: roleSelect?.value || "morador",
      environmentAccess: accessMode === "restricted" ? collectEnvironmentAccess() : [],
    };

    state.saving = true;
    setFeedback("Salvando permissoes...", "neutral");

    try {
      const response = await fetch("/admin-access", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(
          result?.message || result?.error || `Falha HTTP ${response.status}`,
        );
      }

      setFeedback("Permissoes atualizadas com sucesso.", "success");
      await loadAdminPermissions(user.id);
    } catch (error) {
      setFeedback(error?.message || "Falha ao salvar permissoes.", "error");
    } finally {
      state.saving = false;
    }
  }

  function bindDetailEvents(user) {
    document
      .querySelectorAll('input[name="admin-access-mode"]')
      .forEach((input) => {
        input.addEventListener("change", () => syncDetailFormState(user));
      });

    getEnvironmentCards().forEach((card) => {
      card.addEventListener("change", (event) => {
        if (!(event.target instanceof HTMLInputElement)) return;
        syncEnvironmentDependencies(event.target);
      });
    });

    const bulkGrantBtn = getEl("admin-permissions-grant-all");
    if (bulkGrantBtn) {
      bulkGrantBtn.addEventListener("click", () => {
        getEnvironmentCards().forEach((card) => {
          const viewInput = card.querySelector('[data-admin-permission="view"]');
          const controlInput = card.querySelector('[data-admin-permission="control"]');
          if (viewInput) viewInput.checked = true;
          if (controlInput) controlInput.checked = true;
        });
      });
    }

    const bulkClearBtn = getEl("admin-permissions-clear-all");
    if (bulkClearBtn) {
      bulkClearBtn.addEventListener("click", () => {
        getEnvironmentCards().forEach((card) => {
          card.querySelectorAll('input[type="checkbox"]').forEach((input) => {
            input.checked = false;
          });
        });
      });
    }

    const saveBtn = getEl("admin-permissions-save");
    if (saveBtn) {
      saveBtn.addEventListener("click", handleSave);
    }
  }

  async function loadAdminPermissions(preferredUserId) {
    state.loading = true;
    renderUserList();
    renderUserDetail();

    try {
      const payload = await fetchAdminData();
      state.users = toArray(payload?.users);
      state.currentUserId = String(payload?.currentUserId || "").trim();

      const preferredId = String(preferredUserId || state.selectedUserId || "").trim();
      const availableUsers = getFilteredUsers();
      const hasPreferred = state.users.some((user) => user.id === preferredId);
      state.selectedUserId = hasPreferred
        ? preferredId
        : availableUsers[0]?.id || state.users[0]?.id || "";

      renderUserList();
      renderUserDetail();
      setFeedback("", "neutral");
    } catch (error) {
      console.error("Falha ao carregar painel de permissoes:", error);
      state.users = [];
      state.selectedUserId = "";
      renderUserList();
      renderUserDetail();
      setFeedback(
        error?.message || "Falha ao carregar permissoes administrativas.",
        "error",
      );
    } finally {
      state.loading = false;
      renderUserList();
    }
  }

  function bindListEvents() {
    const searchInput = getEl("admin-permissions-search");
    if (searchInput) {
      searchInput.addEventListener("input", (event) => {
        state.searchTerm = String(event.target?.value || "");
        const filteredUsers = getFilteredUsers();
        if (!filteredUsers.some((user) => user.id === state.selectedUserId)) {
          state.selectedUserId = filteredUsers[0]?.id || "";
        }
        renderUserList();
        renderUserDetail();
      });
    }

    const refreshBtn = getEl("admin-permissions-refresh");
    if (refreshBtn) {
      refreshBtn.addEventListener("click", () => {
        loadAdminPermissions(state.selectedUserId).catch((error) => {
          console.error("Falha ao atualizar painel de permissoes:", error);
        });
      });
    }

    const usersContainer = getEl("admin-permissions-users");
    if (usersContainer) {
      usersContainer.addEventListener("click", (event) => {
        const button = event.target?.closest?.("[data-admin-user-id]");
        if (!button) return;
        state.selectedUserId = String(button.dataset.adminUserId || "");
        renderUserList();
        renderUserDetail();
      });
    }
  }

  async function initAdminPermissionsPage() {
    const pageRoot = document.querySelector('[data-page="admin-permissions"]');
    if (!pageRoot) return;

    if (!canAccessAdminPanel()) {
      setFeedback("Acesso administrativo necessario.", "error");
      const usersEl = getEl("admin-permissions-users");
      const emptyEl = getEl("admin-permissions-empty");
      if (usersEl) {
        usersEl.innerHTML =
          '<div class="admin-permissions-empty">Este painel e exclusivo para administradores.</div>';
      }
      if (emptyEl) {
        emptyEl.hidden = false;
        emptyEl.textContent = "Este painel e exclusivo para administradores.";
      }
      return;
    }

    if (pageRoot.dataset.adminPermissionsBound !== "true") {
      bindListEvents();
      pageRoot.dataset.adminPermissionsBound = "true";
    }

    const searchInput = getEl("admin-permissions-search");
    state.searchTerm = String(searchInput?.value || "");
    await loadAdminPermissions(state.selectedUserId);
  }

  global.initAdminPermissionsPage = function () {
    return initAdminPermissionsPage().catch((error) => {
      console.error("Falha ao inicializar painel de permissoes:", error);
      setFeedback(
        error?.message || "Falha ao abrir painel de permissoes.",
        "error",
      );
    });
  };
})(window);
