# App Info Menu Snippets

## HTML Popup Markup

```html
<!-- App Info Menu -->
<div id="app-info-menu" class="app-info-menu" aria-hidden="true">
  <div
    class="app-info-card"
    role="dialog"
    aria-modal="true"
    aria-labelledby="app-info-title"
  >
    <button
      type="button"
      class="app-info-close"
      id="app-info-close"
      aria-label="Fechar menu"
    >
      <span aria-hidden="true">&times;</span>
    </button>
    <div class="app-info-header">
      <img
        src="images/pwa/app-icon-512.png"
        alt="Eletrize Dashboard"
        class="app-info-logo"
      />
      <div class="app-info-meta">
        <h2 id="app-info-title">Eletrize Dashboard</h2>
        <p class="app-info-description">
          Monitoramento e controle inteligente.
        </p>
      </div>
    </div>
    <div class="app-info-options">
      <button type="button" class="app-info-option" data-menu-focus>
        Preferencias
      </button>
      <button type="button" class="app-info-option">Central de suporte</button>
      <button type="button" class="app-info-option">Documentacao</button>
    </div>
    <div class="app-info-version">Versao 1.0</div>
  </div>
</div>
```

## HTML Logo Trigger

```html
<button
  class="app-logo-button"
  type="button"
  aria-label="Abrir menu do aplicativo"
>
  <img
    src="images/icons/Eletrize.svg"
    alt="Dashboard Eletrize"
    class="app-logo"
  />
</button>
```

## CSS Styling

```css
/* App info popup */
.app-logo-button {
  background: transparent;
  border: none;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}
.app-logo-button:focus-visible {
  outline: 2px solid rgba(255, 255, 255, 0.6);
  outline-offset: 6px;
}
.app-logo {
  display: block;
  max-width: 160px;
}
.app-info-menu {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: rgba(0, 0, 0, 0.55);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.25s ease;
  z-index: 2100;
}
.app-info-menu.is-visible {
  opacity: 1;
  pointer-events: auto;
}
body.app-info-menu-open {
  overflow: hidden;
}
.app-info-card {
  width: min(100%, 360px);
  padding: 32px;
  border-radius: 28px;
  background: linear-gradient(
    145deg,
    rgba(18, 18, 18, 0.88),
    rgba(8, 8, 8, 0.68)
  );
  border: 1px solid rgba(255, 255, 255, 0.18);
  box-shadow: 0 30px 60px rgba(0, 0, 0, 0.45);
  color: #f5f5f5;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 24px;
  backdrop-filter: blur(28px) saturate(160%);
  -webkit-backdrop-filter: blur(28px) saturate(160%);
  transform: translateY(20px);
  transition: transform 0.28s ease;
}
.app-info-menu.is-visible .app-info-card {
  transform: translateY(0);
}
.app-info-close {
  position: absolute;
  top: 18px;
  right: 18px;
  width: 38px;
  height: 38px;
  border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, 0.25);
  background: rgba(255, 255, 255, 0.08);
  color: #fff;
  font-size: 20px;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 0.2s ease, transform 0.2s ease, border-color 0.2s ease;
}
.app-info-close:hover {
  background: rgba(255, 255, 255, 0.16);
  border-color: rgba(255, 255, 255, 0.4);
}
.app-info-close:active {
  transform: scale(0.95);
}
.app-info-header {
  display: flex;
  align-items: center;
  gap: 18px;
}
.app-info-logo {
  width: 100px;
  height: 100px;
  border-radius: 24px;
  padding: 14px;
  background: rgba(255, 255, 255, 0.08);
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.1), 0 18px 30px rgba(0, 0, 0, 0.45);
  object-fit: contain;
}
.app-info-meta h2 {
  margin: 0;
  font-size: 22px;
  letter-spacing: 0.4px;
  font-weight: 600;
}
.app-info-description {
  margin: 6px 0 0;
  font-size: 15px;
  color: rgba(255, 255, 255, 0.72);
  line-height: 1.5;
}
.app-info-options {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.app-info-option {
  width: 100%;
  border: 1px solid rgba(255, 255, 255, 0.16);
  border-radius: 18px;
  padding: 14px 18px;
  background: rgba(255, 255, 255, 0.04);
  color: #fff;
  font-size: 16px;
  text-align: left;
  font-family: "Raleway", Arial, sans-serif;
  cursor: pointer;
  transition: border-color 0.2s ease, background 0.2s ease, transform 0.12s ease;
}
.app-info-option:hover {
  border-color: rgba(255, 255, 255, 0.4);
  background: rgba(255, 255, 255, 0.08);
}
.app-info-option:active {
  transform: translateY(1px);
}
.app-info-option:focus-visible {
  outline: 2px solid rgba(255, 255, 255, 0.45);
  outline-offset: 4px;
}
.app-info-version {
  margin-top: 8px;
  text-align: center;
  font-size: 13px;
  letter-spacing: 0.4px;
  color: rgba(255, 255, 255, 0.6);
}
@media (max-width: 420px) {
  .app-info-card {
    padding: 28px 22px;
    border-radius: 24px;
  }
  .app-info-logo {
    width: 80px;
    height: 80px;
    padding: 12px;
    border-radius: 20px;
  }
}
```

## JavaScript Helpers

```javascript
const spaRoot = document.getElementById("spa-root");
const appInfoMenu = document.getElementById("app-info-menu");
const appInfoCloseBtn = document.getElementById("app-info-close");
const appInfoCard = appInfoMenu
  ? appInfoMenu.querySelector(".app-info-card")
  : null;

function openAppInfoMenu() {
  if (!appInfoMenu || appInfoMenu.classList.contains("is-visible")) return;
  appInfoMenu.classList.add("is-visible");
  appInfoMenu.setAttribute("aria-hidden", "false");
  document.body.classList.add("app-info-menu-open");
  const focusTarget =
    (appInfoCard && appInfoCard.querySelector("[data-menu-focus]")) ||
    appInfoCloseBtn;
  if (focusTarget && typeof focusTarget.focus === "function") {
    setTimeout(() => focusTarget.focus(), 0);
  }
}

function closeAppInfoMenu() {
  if (!appInfoMenu || !appInfoMenu.classList.contains("is-visible")) return;
  appInfoMenu.classList.remove("is-visible");
  appInfoMenu.setAttribute("aria-hidden", "true");
  document.body.classList.remove("app-info-menu-open");
}

function initializeAppInfoMenu() {
  if (!appInfoMenu) return;
  appInfoMenu.addEventListener("click", function (ev) {
    if (ev.target === appInfoMenu) {
      closeAppInfoMenu();
    }
  });
  if (appInfoCloseBtn) {
    appInfoCloseBtn.addEventListener("click", closeAppInfoMenu);
  }
  document.addEventListener("keydown", function (ev) {
    if (ev.key === "Escape") {
      closeAppInfoMenu();
    }
  });
}

function attachAppLogoTriggers() {
  const triggers = document.querySelectorAll(".app-logo-button");
  triggers.forEach((btn) => {
    if (btn.dataset.menuBound === "true") return;
    btn.dataset.menuBound = "true";
    btn.addEventListener("click", openAppInfoMenu);
    btn.addEventListener("keydown", function (ev) {
      if (ev.key === "Enter" || ev.key === " ") {
        ev.preventDefault();
        openAppInfoMenu();
      }
    });
  });
}

initializeAppInfoMenu();
```

## SPA Render Hook

```javascript
if (!pages[page]) page = "home";
closeAppInfoMenu();
spaRoot.innerHTML = pages[page]();
attachAppLogoTriggers();
```
