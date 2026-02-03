// ========================================
// DEBUG UTILITIES
// ========================================

console.log("📜 SCRIPT.JS CARREGANDO...");

function isDebugEnabled() {
  if (typeof window === "undefined") return false;
  return Boolean(window.__DASHBOARD_DEBUG__);
}

function debugLog(messageOrFactory, ...args) {
  if (!isDebugEnabled()) return;

  if (typeof messageOrFactory === "function") {
    try {
      const result = messageOrFactory();

      if (Array.isArray(result)) {
        console.log(...result);
      } else {
        console.log(result);
      }
    } catch (error) {
      console.error("Debug log failure:", error);
    }

    return;
  }

  console.log(messageOrFactory, ...args);
}

// ========================================
// ICON OVERRIDES (via config.js)
// ========================================

// ========================================
// UI TOKENS (icons/labels via config.js)
// ========================================

function getUiItemFromConfig(key) {
  if (!key) return null;

  try {
    if (typeof window !== "undefined" && typeof window.getUiItem === "function") {
      return window.getUiItem(key) || null;
    }
  } catch (e) {
    // ignore
  }

  try {
    if (typeof window !== "undefined" && window.CLIENT_CONFIG?.ui?.items) {
      return window.CLIENT_CONFIG.ui.items[key] || null;
    }
  } catch (e) {
    // ignore
  }

  return null;
}

function applyUiTokens(root = document) {
  try {
    const nodes = root.querySelectorAll?.("[data-ui-item]") || [];
    nodes.forEach((el) => {
      const key = el.getAttribute("data-ui-item");
      const item = getUiItemFromConfig(key);
      if (!item) return;

      const label = typeof item.label === "string" ? item.label : null;
      const icon = typeof item.icon === "string" ? item.icon : null;

      // Atualizar ícone
      if (icon) {
        const img =
          el.querySelector?.("img.control-icon") ||
          el.querySelector?.("img.nav-icon") ||
          el.querySelector?.("img");

        if (img) {
          img.setAttribute("src", resolveIconPath(icon));
          if (label) img.setAttribute("alt", label);
        }
      }

      // Atualizar label visível (quando existir)
      if (label) {
        const labelNode = el.querySelector?.(".control-label");
        if (labelNode) {
          labelNode.textContent = label;
        }

        // Melhorar acessibilidade
        if (!el.getAttribute("aria-label")) {
          el.setAttribute("aria-label", label);
        }
      }
    });
  } catch (e) {
    // não travar a aplicação por causa de UI tokens
  }
}

function extractRelativeAssetPath(value) {
  if (!value || typeof value !== "string") return null;

  // Preferir o atributo (relativo) quando existir; mas se vier URL absoluta,
  // tentar reduzir para algo como "images/...".
  const marker = "images/";
  const idx = value.indexOf(marker);
  if (idx >= 0) {
    return value.slice(idx);
  }

  // Se vier com prefixo "/.../images/..."
  const slashMarker = "/images/";
  const idx2 = value.indexOf(slashMarker);
  if (idx2 >= 0) {
    return value.slice(idx2 + 1);
  }

  return value;
}

function getIconOverrideMap() {
  try {
    if (typeof window !== "undefined" && typeof window.getIconOverrides === "function") {
      return window.getIconOverrides() || {};
    }
  } catch (e) {
    // ignore
  }

  try {
    if (typeof window !== "undefined" && window.CLIENT_CONFIG?.ui?.iconOverrides) {
      return window.CLIENT_CONFIG.ui.iconOverrides;
    }
  } catch (e) {
    // ignore
  }

  return {};
}

function resolveIconPath(path) {
  if (!path) return path;
  const overrides = getIconOverrideMap();
  if (!overrides || typeof overrides !== "object") return path;

  const normalized = extractRelativeAssetPath(path);
  if (normalized && overrides[normalized]) return overrides[normalized];
  if (overrides[path]) return overrides[path];
  return path;
}

function applyIconOverrides(root = document) {
  const overrides = getIconOverrideMap();
  if (!overrides || typeof overrides !== "object" || Object.keys(overrides).length === 0) {
    return;
  }

  try {
    // Atualizar atributos data-icon-on/off para controles que alternam ícones
    const toggles = root.querySelectorAll?.("[data-icon-on], [data-icon-off]") || [];
    toggles.forEach((el) => {
      const rawOn = el.getAttribute("data-icon-on");
      const rawOff = el.getAttribute("data-icon-off");
      if (rawOn) {
        const nextOn = resolveIconPath(rawOn);
        if (nextOn !== rawOn) el.setAttribute("data-icon-on", nextOn);
      }
      if (rawOff) {
        const nextOff = resolveIconPath(rawOff);
        if (nextOff !== rawOff) el.setAttribute("data-icon-off", nextOff);
      }
    });

    // Atualizar qualquer <img src="..."> no DOM (música, cortinas, AC, etc.)
    const imgs = root.querySelectorAll?.("img[src]") || [];
    imgs.forEach((img) => {
      const raw = img.getAttribute("src") || img.src;
      const next = resolveIconPath(raw);
      if (next && next !== raw) {
        img.setAttribute("src", next);
      }
    });
  } catch (e) {
    // não travar a aplicação por causa de ícones
  }
}

if (typeof window !== "undefined") {
  window.debugLog = debugLog;
  window.isDebugEnabled = isDebugEnabled;
}

const CONTROL_SELECTOR =
  ".room-control[data-device-id], .control-card[data-device-id]";
const MASTER_BUTTON_SELECTOR = ".room-master-btn[data-device-ids]";
const deviceControlCache = new Map();
const masterButtonCache = new Set();
const deviceStateMemory = new Map();
const DEVICE_STATE_STORAGE_PREFIX = "deviceState:";
const DEVICE_STATE_MAX_QUOTA_ERRORS = 1;
let deviceStateStorageDisabled = false;
let deviceStateCleanupInProgress = false;
let deviceStateQuotaErrors = 0;
let deviceStateQuotaWarningShown = false;
let controlCachePrimed = false;
let domObserverInstance = null;
let fallbackSyncTimer = null;
let pendingControlSyncHandle = null;
let pendingControlSyncForce = false; // ========================================

function buildRoomImageBases() {
  if (typeof getEnvironmentPhotoMap === "function") {
    try {
      const map = getEnvironmentPhotoMap();
      const values = map ? Object.values(map).filter(Boolean) : [];
      if (values.length) {
        return Array.from(new Set(values));
      }
    } catch (error) {
      console.warn("Falha ao ler fotos do config.js", error);
    }
  }

  return [];
}

const ROOM_IMAGE_BASES = buildRoomImageBases();

const CRITICAL_IMAGE_BASES = ROOM_IMAGE_BASES.slice(0, 3);

const ICON_ASSET_PATHS = [
  "images/icons/icon-tv.svg",
  "images/icons/icon-htv.svg",
  "images/icons/icon-bluray.svg",
  "images/icons/icon-apple-tv.svg",
  "images/icons/icon-clarotv.svg",
  "images/icons/icon-numbers.svg",
  "images/icons/icon-globo.svg",
  "images/icons/icon-globonews.svg",
  "images/icons/icon-gnt.svg",
  "images/icons/icon-canaloff.svg",
  "images/icons/icon-discovery.svg",
  "images/icons/icon-espn.svg",
  "images/icons/icon-sportv.svg",
  "images/icons/icon-tcaction.svg",
  "images/icons/icon-hbo.svg",
  "images/icons/icon-config.svg",
  "images/icons/icon-setup.svg",
  "images/icons/icon-stup.svg",
  "images/icons/icon-sound-high.svg",
  "images/icons/icon-sound-low.svg",
  "images/icons/icon-sound-mute.svg",
  "images/icons/icon-roku.svg",
  "images/icons/icon-musica.svg",
  "images/icons/icon-curtain.svg",
  "images/icons/icon-firetv.svg",
  "images/icons/icon-conforto.svg",
  "images/icons/ar-condicionado.svg",
  "images/icons/icon-piscina.svg",
  "images/icons/icon-telao-led.svg",
  "images/icons/icon-small-light-off.svg",
  "images/icons/icon-small-light-on.svg",
  "images/icons/icon-small-smartglass-off.svg",
  "images/icons/icon-small-smartglass-on.svg",
  "images/icons/icon-small-shader-off.svg",
  "images/icons/icon-small-shader-on.svg",
  "images/icons/icon-small-tv-off.svg",
  "images/icons/icon-small-tv-on.svg",
  "images/icons/icon-small-telamovel-off.svg",
  "images/icons/icon-small-telamovel-on.svg",
  "images/icons/icon-ac-power.svg",
  "images/icons/icon-ac-fan.svg",
  "images/icons/icon-ac-cool.svg",
  "images/icons/icon-ac-heat.svg",
  "images/icons/icon-ac-auto.svg",
  "images/icons/icon-ac-aleta-moving.svg",
  "images/icons/icon-ac-aleta-parada.svg",
  "images/icons/icon-ac-aleta-alta.svg",
  "images/icons/icon-ac-aleta-baixa.svg",
  "images/icons/icon-rotatephone.svg",
  "images/icons/icon-settings.svg",
  "images/icons/icon-home.svg",
  "images/icons/back-button.svg",
  "images/icons/eletrize.svg",
  "images/icons/Fullscreen.svg",
  "images/icons/icon-limpar.svg",
  "images/icons/icon-mouse.svg",
  "images/icons/Instagram.svg",
  "images/icons/whatsapp.svg",
  "images/icons/icon-volume.svg",
  "images/icons/icon-mute.svg",
  "images/icons/icon-next-track.svg",
  "images/icons/icon-previous-track.svg",
  "images/icons/icon-play.svg",
  "images/icons/icon-pause.svg",
  "images/icons/icon-stop.svg",
  "images/icons/Encerrar-expediente.svg",
  "images/icons/iniciar-expediente.svg",
  "images/icons/icon-scenes.svg",
  "images/icons/pageselector.svg",
];

function buildRoomAssetList() {
  const assets = [];
  ROOM_IMAGE_BASES.forEach((base) => {
    assets.push(`images/Images/${base}.jpg`);
  });
  return assets;
}

const AssetPreloader = (() => {
  const queues = {
    critical: new Set(),
    background: new Set(),
  };

  function add(url, { priority = "background" } = {}) {
    if (!url) return;
    const key = priority === "critical" ? "critical" : "background";
    queues[key].add(url);
  }

  function startQueue(priority, { weight = 0, offset = 0 } = {}) {
    if (typeof window === "undefined") {
      return Promise.resolve();
    }
    const list = Array.from(queues[priority] || []);
    if (!list.length) {
      return Promise.resolve();
    }

    return new Promise((resolve) => {
      let completed = 0;
      const total = list.length;

      const update = (url) => {
        completed += 1;
        if (weight > 0) {
          const percent =
            offset + Math.min(weight, Math.round((completed / total) * weight));
          updateProgress(
            percent,
            `Pré-carregando mídia (${completed}/${total})`
          );
        }

        if (completed === total) {
          resolve();
        }
      };

      list.forEach((url) => {
        const img = new Image();
        img.decoding = "async";
        img.loading = "eager";
        img.onload = img.onerror = () => update(url);
        img.src = url;
      });
    });
  }

  return {
    add,
    startQueue,
  };
})();

ROOM_IMAGE_BASES.forEach((base) => {
  AssetPreloader.add(`images/Images/${base}.jpg`, { priority: "background" });
});

AssetPreloader.add("images/pwa/app-icon-420.webp", { priority: "critical" });
AssetPreloader.add("images/pwa/app-icon-192.png", { priority: "background" });
AssetPreloader.add("images/pwa/app-icon-512-transparent.png", {
  priority: "background",
});
ICON_ASSET_PATHS.forEach((asset) =>
  AssetPreloader.add(asset, { priority: "background" })
);

let assetPreloadComplete = false;
let assetPreloadPromise = null;

if (typeof window !== "undefined") {
  assetPreloadPromise = AssetPreloader.startQueue("critical", {
    weight: 30,
    offset: 0,
  })
    .catch((error) => {
      console.warn("Falha ao pré-carregar mídia crítica", error);
    })
    .finally(() => {
      assetPreloadComplete = true;
      AssetPreloader.startQueue("background", {
        weight: 15,
        offset: 30,
      }).catch((error) =>
        console.warn("Falha ao pré-carregar mídia adicional", error)
      );
    });

  window.__assetPreloadPromise = assetPreloadPromise;
window.queueAssetForPreload = (url, priority) =>
  AssetPreloader.add(url, { priority });
}

function isStandaloneMode() {
  if (typeof window === "undefined") return false;
  const mql =
    typeof window.matchMedia === "function"
      ? window.matchMedia("(display-mode: standalone)")
      : null;
  return Boolean(
    (mql && mql.matches) || window.navigator?.standalone === true
  );
}

async function requestPersistentStorage() {
  if (
    typeof navigator === "undefined" ||
    !navigator.storage ||
    typeof navigator.storage.persist !== "function"
  ) {
    return;
  }
  try {
    const alreadyPersisted = await navigator.storage.persisted();
    if (alreadyPersisted) {
      return;
    }
    await navigator.storage.persist();
  } catch (error) {
    console.warn("Não foi possível garantir armazenamento persistente:", error);
  }
}

const fullscreenManager = (() => {
  let attempted = false;

  function canRequestFullscreen() {
    return (
      typeof document !== "undefined" &&
      typeof document.documentElement.requestFullscreen === "function"
    );
  }

  function enterFullscreen() {
    if (attempted || !canRequestFullscreen()) return;
    attempted = true;
    document.documentElement
      .requestFullscreen({ navigationUI: "hide" })
      .catch((error) => {
        console.warn("Não foi possível entrar em tela cheia automaticamente", error);
      });

    if (screen?.orientation?.lock) {
      screen.orientation.lock("landscape").catch(() => {});
    }
  }

  function setupAutoFullscreen() {
    if (!isStandaloneMode() || !canRequestFullscreen()) return;

    const handler = () => {
      document.removeEventListener("click", handler);
      document.removeEventListener("touchend", handler);
      enterFullscreen();
    };

    document.addEventListener("click", handler, { once: true });
    document.addEventListener("touchend", handler, { once: true });
  }

  if (typeof window !== "undefined") {
    window.addEventListener("DOMContentLoaded", setupAutoFullscreen);
  }

  return { enterFullscreen };
})();

if (typeof window !== "undefined") {
  window.requestPersistentStorage = requestPersistentStorage;
  window.fullscreenManager = fullscreenManager;

  window.addEventListener("DOMContentLoaded", () => {
    if (isStandaloneMode()) {
      requestPersistentStorage();
    }
  });
}

// DETECÃƒâ€¡ÃƒÆ’O DE DISPOSITIVOS
// ========================================

function isMusicPageActive(hash = window.location.hash) {
  const isActive = /ambiente\d+-musica/.test(hash || "");
  console.log("🎵 isMusicPageActive check:", { hash, isActive });
  return isActive;
}

function queryActiveMusic(selector) {
  const activePage = document.querySelector(".page.active");
  if (!activePage) return null;
  return activePage.querySelector(selector);
}

// Detectar iPad Mini 6 especificamente
function detectIPadMini6() {
  const userAgent = navigator.userAgent.toLowerCase();
  const isIPad = /ipad/.test(userAgent);

  // Verificar tamanho: iPad Mini 6 tem 2048x1536 (portrait)
  const screenWidth = window.screen.width;
  const screenHeight = window.screen.height;

  // iPad Mini 6: ~1024x768 em modo reportado pelo navegador (scaled)
  const isIPadMini6 =
    isIPad &&
    ((screenWidth === 1024 && screenHeight === 768) ||
      (screenWidth === 768 && screenHeight === 1024));

  if (isIPadMini6) {
    document.documentElement.dataset.device = "ipad-mini-6";
    console.log(
      "Ã°Å¸ÂÅ½ iPad Mini 6 detectado - aplicando fixes específicos",
      `Screen: ${screenWidth}x${screenHeight}`,
      `Inner: ${window.innerWidth}x${window.innerHeight}`,
      `DPR: ${window.devicePixelRatio}`
    );
    return true;
  }

  return false;
}

// Detectar se é um celular (não tablet)
function isMobilePhone() {
  const userAgent = navigator.userAgent.toLowerCase();

  // Considerar celular se:
  // 1. iPhone ou Android com tela pequena
  // 2. Largura mÃƒÂ¡xima < 768px (breakpoint de tablet)
  const isIPhone = /iphone/.test(userAgent);
  const isAndroid = /android/.test(userAgent);
  const isSmallScreen = window.innerWidth < 768;

  // iPad e tablets maiores não são celulares
  const isTablet = /ipad|galaxy tab|sm-t/.test(userAgent);

  return (isIPhone || (isAndroid && isSmallScreen)) && !isTablet;
}

// Detectar dispositivo geral (Apple, Android ou Desktop)
function detectDevice() {
  const userAgent = navigator.userAgent.toLowerCase();

  const isApple =
    /ipad|iphone|mac os x/.test(userAgent) && navigator.maxTouchPoints > 1;
  const isAndroid = /android/.test(userAgent);

  if (isApple || isAndroid) {
    document.documentElement.dataset.device = "mobile";
    console.log(
      `Ã°Å¸â€œÂ± Dispositivo mobile detectado (${
        isApple ? "Apple" : "Android"
      })`
    );
  }
}

// Função para detectar se está na página de controle remoto da TV
function isOnTVControlPage() {
  const target = `${window.location.pathname}${window.location.hash}`;
  return /(ambiente\d+-(tv|htv|bluray|appletv|clarotv|roku|games|hidromassagem))/.test(target);
}

// Função para criar/mostrar overlay de orientação
function showOrientationOverlay() {
  let overlay = document.getElementById("orientation-overlay");

  if (!overlay) {
    overlay = document.createElement("div");
    overlay.id = "orientation-overlay";
    overlay.innerHTML = `
      <div class="orientation-overlay-content">
        <img src="images/icons/icon-rotatephone.svg" alt="Rotacione o dispositivo" class="orientation-icon">
        <p class="orientation-message">Rotacione o dispositivo</p>
      </div>
    `;
    document.body.appendChild(overlay);

    // Adicionar estilos dinamicamente se não existirem
    if (!document.getElementById("orientation-overlay-styles")) {
      const style = document.createElement("style");
      style.id = "orientation-overlay-styles";
      style.innerHTML = `
        #orientation-overlay {
          display: none;
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.95);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          z-index: 10000;
          align-items: center;
          justify-content: center;
        }

        #orientation-overlay.active {
          display: flex;
        }

        .orientation-overlay-content {
          text-align: center;
          color: #fff;
        }

        .orientation-icon {
          width: 120px;
          height: 120px;
          margin-bottom: 20px;
          animation: rotate 2s infinite;
          filter: brightness(0) invert(1);
        }

        .orientation-message {
          font-size: 24px;
          font-weight: 600;
          letter-spacing: 0.5px;
          margin: 0;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
        }

        @keyframes rotate {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        @media (max-width: 480px) {
          .orientation-icon {
            width: 80px;
            height: 80px;
          }

          .orientation-message {
            font-size: 18px;
          }
        }
      `;
      document.head.appendChild(style);
    }
  }

  return overlay;
}

// Função para aplicar estilos baseado em orientação e localização
function updateDeviceStyles() {
  const isMobile = isMobilePhone();
  const isLandscape = window.innerWidth > window.innerHeight;
  const onTVPage = isOnTVControlPage();

  // Regra prioritÃƒÂ¡ria: Celulares em landscape no controle remoto são bloqueados
  if (isMobile && isLandscape && onTVPage) {
    const overlay = showOrientationOverlay();
    overlay.classList.add("active");
    document.documentElement.dataset.layoutState = "mobile-blocked";
    console.log(
      "Ã°Å¸â€œÂµ Celular em landscape no controle remoto - bloqueado"
    );
  } else {
    const overlay = showOrientationOverlay();
    overlay.classList.remove("active");
    document.documentElement.dataset.layoutState = "default";
  }
}

// Executar detecção ao carregar
detectIPadMini6();
detectDevice();
updateDeviceStyles();

// Monitorar mudanÃƒÂ§as de orientação
window.addEventListener("orientationchange", updateDeviceStyles);
window.addEventListener("resize", updateDeviceStyles);

// ========================================
// CONFIGURAÇÕES GERAIS
// ========================================

// IDs de todos os dispositivos de iluminação (obtidos do config.js)
let ALL_LIGHT_IDS =
  typeof getAllLightIds === "function"
    ? getAllLightIds()
    : [];

// Mapeamento de IDs de Ar Condicionado por ambiente (obtidos do config.js)
const AC_DEVICE_IDS =
  typeof getAcDeviceIds === "function"
    ? getAcDeviceIds()
    : {};

// ID do dispositivo de Ar Condicionado atual (será atualizado dinamicamente)
let AC_DEVICE_ID = getACDeviceIdForCurrentRoute(); // Atualizado dinamicamente

// Função para obter o ID do AC baseado na rota atual
function getACDeviceIdForCurrentRoute() {
  const currentRoute = (window.location.hash || "").replace("#", "");
  // Extrair o ambiente da rota (ex: "ambiente7-conforto" -> "ambiente7")
  const match = currentRoute.match(/^(ambiente\d+)/);
  if (match) {
    const ambiente = match[1];
    if (typeof getEnvironment === "function") {
      const env = getEnvironment(ambiente);
      const acConfig = env?.airConditioner || null;
      if (acConfig?.deviceId) {
        return String(acConfig.deviceId);
      }
      if (AC_DEVICE_IDS[ambiente]) {
        return String(AC_DEVICE_IDS[ambiente]);
      }
      const zones = Array.isArray(acConfig?.zones) ? acConfig.zones : [];
      const zoneId = zones.find((zone) => zone?.deviceId)?.deviceId;
      if (zoneId) {
        return String(zoneId);
      }
    }
  }
  return AC_DEVICE_IDS["ambiente1"] || "110"; // Fallback para ambiente1
}

// ========================================
// INICIALIZAÇÃO DE DISPOSITIVOS POR AMBIENTE
// ========================================

// Mapa de dispositivos por ambiente com comando "initialize"
const ENV_INITIALIZE_DEVICE_MAP =
  (typeof CLIENT_CONFIG !== "undefined" &&
    CLIENT_CONFIG?.devices?.initializeDevicesByEnv) ||
  {};

const INIT_COOLDOWN_MS = 30000; // 30 segundos entre inicializações por ambiente
const lastInitByEnv = new Map();

async function initializeEnvironmentDevices(envKey) {
  if (!envKey) return;
  const ids = ENV_INITIALIZE_DEVICE_MAP?.[envKey];
  if (!Array.isArray(ids) || ids.length === 0) return;

  const now = Date.now();
  const last = lastInitByEnv.get(envKey) || 0;
  if (now - last < INIT_COOLDOWN_MS) {
    console.log(`⏳ [initializeEnvironmentDevices] Cooldown ativo (${envKey}), ignorando.`);
    return;
  }

  console.log(`🚀 [initializeEnvironmentDevices] Iniciando dispositivos de ${envKey}...`);
  lastInitByEnv.set(envKey, now);

  const results = await Promise.allSettled(
    ids.map(async (deviceId) => {
      try {
        console.log(`🔧 [initializeEnvironmentDevices] Enviando initialize para ${deviceId}`);
        await sendHubitatCommand(deviceId, "initialize");
        console.log(`✅ [initializeEnvironmentDevices] ${deviceId} inicializado`);
        return { deviceId, success: true };
      } catch (error) {
        console.error(`❌ [initializeEnvironmentDevices] Erro em ${deviceId}:`, error);
        return { deviceId, success: false, error };
      }
    }),
  );

  const successful = results.filter(
    (r) => r.status === "fulfilled" && r.value.success,
  ).length;
  const failed = results.length - successful;
  console.log(
    `🏁 [initializeEnvironmentDevices] ${envKey}: ${successful} sucesso, ${failed} falhas`,
  );
}

function getEnvironmentRouteFromHash(hash) {
  const route = (hash || "").replace("#", "");
  return /^ambiente\\d+$/.test(route) ? route : null;
}

function getRemoteDeviceIdForEnv(envKey, controlType) {
  if (!envKey || !controlType || typeof getEnvironment !== "function") {
    return null;
  }
  const env = getEnvironment(envKey);
  if (!env) return null;
  const list = Array.isArray(env[controlType]) ? env[controlType] : [];
  const first = list[0];
  if (!first || !first.id) return null;
  return String(first.id);
}

function syncRemoteControlDeviceIds() {
  const route = (window.location.hash || "").replace("#", "");
  const envKey = route.split("-")[0];
  if (!/^ambiente\\d+$/.test(envKey)) return;

  const wrapper = document.querySelector(
    ".page.active .tv-control-wrapper[data-control-type]",
  );
  if (!wrapper) return;
  const controlType = String(wrapper.dataset.controlType || "").toLowerCase();
  if (!controlType || controlType === "music") return;

  const targetId = getRemoteDeviceIdForEnv(envKey, controlType);
  if (!targetId) return;

  wrapper.querySelectorAll("[data-device-id]").forEach((el) => {
    if (el.tagName === "INPUT" && el.type === "range") return;
    if (el.closest(".tv-control-section--volume")) return;
    el.dataset.deviceId = targetId;
  });
}

// Configurações de timeout e retry
const NETWORK_CONFIG = {
  HEALTH_CHECK_TIMEOUT: 5000, // 5s para health check
  FETCH_TIMEOUT_PER_ATTEMPT: 15000, // 15s por tentativa
  MAX_RETRY_ATTEMPTS: 3, // 3 tentativas mÃƒÂ¡ximo
  RETRY_DELAY_BASE: 1000, // 1s base para backoff
  RETRY_DELAY_MAX: 5000, // 5s mÃƒÂ¡ximo entre tentativas
};

// --- Confiabilidade de comandos (fila + timeout + retry) ---
// Serializa comandos por deviceId para evitar colisões quando o usuário toca rápido.
const DEVICE_COMMAND_QUEUE = new Map();

function enqueueDeviceCommand(deviceId, task) {
  const key = String(deviceId);
  const previous = DEVICE_COMMAND_QUEUE.get(key) || Promise.resolve();

  // Nunca deixa um erro quebrar a fila: engole o erro do anterior antes de continuar.
  const next = previous
    .catch(() => {})
    .then(() => task());

  // Limpa a fila quando este item terminar (se ainda for o último).
  DEVICE_COMMAND_QUEUE.set(
    key,
    next.finally(() => {
      if (DEVICE_COMMAND_QUEUE.get(key) === next) {
        DEVICE_COMMAND_QUEUE.delete(key);
      }
    })
  );

  return next;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithTimeout(url, options = {}, timeoutMs) {
  if (typeof AbortController === "undefined" || !timeoutMs) {
    return fetch(url, options);
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
}

function computeBackoffDelay(attempt) {
  return Math.min(
    NETWORK_CONFIG.RETRY_DELAY_BASE * Math.pow(2, attempt - 1),
    NETWORK_CONFIG.RETRY_DELAY_MAX
  );
}

function isHtmlResponseText(text) {
  const trimmed = String(text || "").trim().toLowerCase();
  return trimmed.startsWith("<!doctype") || trimmed.startsWith("<html");
}

async function fetchTextWithRetry(url, options = {}, config = {}) {
  const maxRetries =
    typeof config.maxRetries === "number"
      ? config.maxRetries
      : NETWORK_CONFIG.MAX_RETRY_ATTEMPTS;
  const timeoutMs =
    typeof config.timeoutMs === "number"
      ? config.timeoutMs
      : NETWORK_CONFIG.FETCH_TIMEOUT_PER_ATTEMPT;

  let lastError = null;

  for (let attempt = 1; attempt <= maxRetries; attempt += 1) {
    try {
      const response = await fetchWithTimeout(url, { cache: "no-cache", ...options }, timeoutMs);
      const text = await response.text();

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText || "Erro"}`);
      }

      // Proxy/Functions às vezes devolvem HTML quando estão fora.
      if (isHtmlResponseText(text)) {
        throw new Error("Resposta HTML inesperada (proxy indisponível)");
      }

      return { response, text };
    } catch (error) {
      lastError = error;

      if (attempt >= maxRetries) {
        break;
      }

      const delay = computeBackoffDelay(attempt);
      await sleep(delay);
    }
  }

  throw lastError || new Error("Falha desconhecida ao fazer fetch");
}

// FunÃƒÂ§ÃƒÂµes de toggle para ÃƒÂ­cones nos cards da home
function toggleTelamovelIcon(el) {
  const img = el.querySelector("img");
  if (el.dataset.state === "off") {
    img.src = resolveIconPath("images/icons/icon-small-telamovel-on.svg");
    el.dataset.state = "on";
  } else {
    img.src = resolveIconPath("images/icons/icon-small-telamovel-off.svg");
    el.dataset.state = "off";
  }
}

function toggleSmartglassIcon(el) {
  const img = el.querySelector("img");
  if (el.dataset.state === "off") {
    img.src = resolveIconPath("images/icons/icon-small-smartglass-on.svg");
    el.dataset.state = "on";
  } else {
    img.src = resolveIconPath("images/icons/icon-small-smartglass-off.svg");
    el.dataset.state = "off";
  }
}

function toggleShaderIcon(el) {
  const img = el.querySelector("img");
  if (el.dataset.state === "off") {
    img.src = resolveIconPath("images/icons/icon-small-shader-on.svg");
    el.dataset.state = "on";
  } else {
    img.src = resolveIconPath("images/icons/icon-small-shader-off.svg");
    el.dataset.state = "off";
  }
}

function toggleLightIcon(el) {
  const img = el.querySelector("img");
  const deviceIdsAttr = el.dataset.deviceIds;
  const deviceIds = deviceIdsAttr ? deviceIdsAttr.split(",") : [];

  if (el.dataset.state === "off") {
    img.src = resolveIconPath("images/icons/icon-small-light-on.svg");
    el.dataset.state = "on";
    deviceIds.forEach((id) => sendHubitatCommand(id, "on"));
  } else {
    img.src = resolveIconPath("images/icons/icon-small-light-off.svg");
    el.dataset.state = "off";
    deviceIds.forEach((id) => sendHubitatCommand(id, "off"));
  }
}

function toggleTvIcon(el) {
  const img = el.querySelector("img");
  if (el.dataset.state === "off") {
    img.src = resolveIconPath("images/icons/icon-small-tv-on.svg");
    el.dataset.state = "on";
  } else {
    img.src = resolveIconPath("images/icons/icon-small-tv-off.svg");
    el.dataset.state = "off";
  }
}

// BotÃƒÂµes dos cÃƒÂ´modos nas páginas internas
function getMainControlIcon(el) {
  if (!el) return null;
  return (
    el.querySelector(".control-icon-main") ||
    el.querySelector(".room-control-icon, .control-icon")
  );
}

function toggleRoomControl(el) {
  const resolvedDeviceId = resolveLightDeviceIdFromConfig(el);
  const ICON_ON = resolveIconPath(
    (el && el.dataset && (el.dataset.iconOn || el.dataset.iconon)) ||
      "images/icons/icon-small-light-on.svg"
  );
  const ICON_OFF = resolveIconPath(
    (el && el.dataset && (el.dataset.iconOff || el.dataset.iconoff)) ||
      "images/icons/icon-small-light-off.svg"
  );
  const img = getMainControlIcon(el);
  const isOff = (el.dataset.state || "off") === "off";
  const newState = isOff ? "on" : "off";
  const deviceId = resolvedDeviceId || el.dataset.deviceId;

  if (!deviceId) return;

  // Marcar comando recente para proteger contra polling
  recentCommands.set(deviceId, Date.now());

  // Atualizar UI imediatamente
  el.dataset.state = newState;
  if (img) img.src = newState === "on" ? ICON_ON : ICON_OFF;

  // Persist locally
  setStoredState(deviceId, newState);

  console.log(`Enviando comando ${newState} para dispositivo ${deviceId}`);

  // Send to Hubitat
  sendHubitatCommand(deviceId, newState === "on" ? "on" : "off")
    .then(() => {
      console.log(
        `Ã¢Å“â€¦ Comando ${newState} enviado com sucesso para dispositivo ${deviceId}`
      );
    })
    .catch((error) => {
      console.error(
        `⚠️Erro ao enviar comando para dispositivo ${deviceId}:`,
        error
      );
      // Em caso de erro, reverter o estado visual
      const revertState = newState === "on" ? "off" : "on";
      el.dataset.state = revertState;
      if (img) img.src = revertState === "on" ? ICON_ON : ICON_OFF;
      setStoredState(deviceId, revertState);
    });
}

function resolveLightDeviceIdFromConfig(el) {
  if (!el || !el.dataset) return null;

  const currentRoute = (window.location.hash || "").replace("#", "");
  const envKey = currentRoute.split("-")[0] || null;
  const explicit = el.dataset.deviceId ? String(el.dataset.deviceId) : null;

  if (!envKey || typeof getEnvironment !== "function") {
    return explicit;
  }

  const env = getEnvironment(envKey);
  const lights = Array.isArray(env?.lights) ? env.lights : [];

  if (explicit && lights.some((light) => String(light.id) === explicit)) {
    return explicit;
  }

  const normalizeLabel = (value) =>
    String(value || "")
      .trim()
      .replace(/\s+/g, " ")
      .toLowerCase();

  const label =
    el.dataset.lightName ||
    el.querySelector(".control-label")?.textContent ||
    "";
  const normalizedLabel = normalizeLabel(label);

  if (normalizedLabel) {
    const match = lights.find(
      (light) => normalizeLabel(light?.name) === normalizedLabel
    );
    if (match) {
      const id = String(match.id);
      el.dataset.deviceId = id;
      return id;
    }
  }

  const indexAttr = el.dataset.lightIndex;
  if (indexAttr !== undefined && indexAttr !== null) {
    const idx = Number.parseInt(indexAttr, 10);
    if (!Number.isNaN(idx) && lights[idx]) {
      const id = String(lights[idx].id);
      el.dataset.deviceId = id;
      return id;
    }
  }

  return explicit;
}

function clampDimmerValue(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isNaN(parsed)) {
    return Math.max(0, Math.min(100, parsed));
  }
  const fb = Number.parseInt(fallback, 10);
  if (!Number.isNaN(fb)) {
    return Math.max(0, Math.min(100, fb));
  }
  return 80;
}

function updateDimmerSliderUI(slider, level) {
  if (!slider) return;
  const safeLevel = clampDimmerValue(level, slider?.value || 0);
  slider.value = safeLevel;
  slider.style.setProperty("--dimmer-progress", `${(safeLevel / 100) * 100}%`);

  const display = slider.parentElement?.querySelector?.("[data-dimmer-value]");
  if (display) {
    display.textContent = `${safeLevel}%`;
  }
}

function updateDimmerIconIntensity(controlEl, level) {
  if (!controlEl) return;
  const icon = getMainControlIcon(controlEl);
  if (!icon) return;

  const normalized = clampDimmerValue(level, level);
  const minOpacity = 0.35;
  const maxOpacity = 1;
  const fraction = normalized / 100;
  const op = minOpacity + (maxOpacity - minOpacity) * fraction;
  icon.style.opacity = op.toFixed(2);
}

function applyDimmerLevelToControl(controlEl, level) {
  if (!controlEl || !controlEl.dataset) return;
  if (controlEl.dataset.controlType !== "dimmer") return;

  controlEl.dataset.level = clampDimmerValue(level, level);

  const slider = controlEl.querySelector(".dimmer-slider");
  if (slider) {
    updateDimmerSliderUI(slider, level);
  }

  const deviceId = controlEl.dataset.deviceId;
  const nextState = clampDimmerValue(level, level) > 0 ? "on" : "off";

  setRoomControlUI(controlEl, nextState);
  updateDimmerIconIntensity(controlEl, level);
  if (deviceId) {
    setStoredState(deviceId, nextState);
  }
}

function toggleDimmerControl(eventOrEl, maybeEl) {
  const el = maybeEl || eventOrEl;
  const evt = eventOrEl instanceof Event ? eventOrEl : null;

  if (!el || !el.dataset) return;

   if (el.dataset.longPressHandled === "true") {
    delete el.dataset.longPressHandled;
    return;
  }

  if (evt && evt.target && evt.target.closest(".dimmer-slider-row")) {
    return;
  }

  const deviceId = resolveLightDeviceIdFromConfig(el) || el.dataset.deviceId;
  const slider = el.querySelector(".dimmer-slider");
  const defaultLevel = clampDimmerValue(el.dataset.defaultLevel, 80);
  const currentState = (el.dataset.state || "off") === "on" ? "on" : "off";
  const nextState = currentState === "on" ? "off" : "on";

  if (!deviceId) return;

  recentCommands.set(deviceId, Date.now());
  setRoomControlUI(el, nextState);
  setStoredState(deviceId, nextState);

  if (nextState === "on") {
    const levelToSet = clampDimmerValue(defaultLevel, 80);
    if (slider) {
      updateDimmerSliderUI(slider, levelToSet);
    }

    el.dataset.level = levelToSet;
    updateDimmerIconIntensity(el, levelToSet);

    sendHubitatCommand(deviceId, "setLevel", String(levelToSet)).catch(
      (error) => {
        console.error(
          `⚠️Erro ao definir nível do dimmer ${deviceId} para ${levelToSet}:`,
          error
        );
      }
    );
  } else {
    if (slider) {
      updateDimmerSliderUI(slider, 0);
    }

    el.dataset.level = 0;
    updateDimmerIconIntensity(el, 0);

    sendHubitatCommand(deviceId, "off").catch((error) => {
      console.error(`⚠️Erro ao desligar dimmer ${deviceId}:`, error);
    });
  }
}

function handleDimmerInput(event, sliderEl) {
  if (event && typeof event.stopPropagation === "function") {
    event.stopPropagation();
  }
  if (!sliderEl) return;

  const level = clampDimmerValue(sliderEl.value, sliderEl.dataset.defaultLevel);
  updateDimmerSliderUI(sliderEl, level);
}

function handleDimmerChange(event, sliderEl) {
  if (event && typeof event.stopPropagation === "function") {
    event.stopPropagation();
  }
  if (!sliderEl) return;

  const card = sliderEl.closest(".control-card");
  const deviceId =
    resolveLightDeviceIdFromConfig(card || sliderEl) ||
    sliderEl.dataset.deviceId;
  const level = clampDimmerValue(sliderEl.value, card?.dataset?.defaultLevel);
  const nextState = level > 0 ? "on" : "off";

  if (card) {
    setRoomControlUI(card, nextState);
  }
  updateDimmerIconIntensity(card, level);
  if (!deviceId) return;

  setStoredState(deviceId, nextState);
  recentCommands.set(deviceId, Date.now());

  updateDimmerSliderUI(sliderEl, level);

  sendHubitatCommand(deviceId, "setLevel", String(level))
    .then(() => {
      if (level === 0) {
        return sendHubitatCommand(deviceId, "off");
      }
      return null;
    })
    .catch((error) => {
      console.error(`⚠️Erro ao enviar nível ${level} para dimmer ${deviceId}:`, error);
    });
}

const dimmerLongPressTimers = new WeakMap();

function startDimmerLongPress(event, el) {
  if (!el) return;
  cancelDimmerLongPress(el);

  const timer = setTimeout(() => {
    el.dataset.longPressHandled = "true";
    showDimmerPopup(el);
    dimmerLongPressTimers.delete(el);
  }, 500);

  dimmerLongPressTimers.set(el, timer);
}

function cancelDimmerLongPress(el) {
  const timer = dimmerLongPressTimers.get(el);
  if (timer) {
    clearTimeout(timer);
    dimmerLongPressTimers.delete(el);
  }
}

function showDimmerPopup(controlEl) {
  if (!controlEl || !controlEl.dataset) return;
  const deviceId = controlEl.dataset.deviceId;
  if (!deviceId) return;

  const currentLevel = clampDimmerValue(
    controlEl.dataset.level ?? controlEl.dataset.defaultLevel ?? 80,
    80
  );

  const overlay = document.createElement("div");
  overlay.className = "dimmer-popup-overlay";

  overlay.innerHTML = `
    <div class="dimmer-popup" role="dialog" aria-label="Ajustar intensidade">
      <div class="dimmer-popup__header">Intensidade</div>
      <div class="dimmer-popup__body">
        <input class="dimmer-slider" type="range" min="0" max="100" step="1" value="${currentLevel}" data-device-id="${deviceId}" aria-label="Nível do dimmer">
        <div class="dimmer-popup__value" data-dimmer-popup-value>${currentLevel}%</div>
      </div>
    </div>
  `;

  const slider = overlay.querySelector(".dimmer-slider");
  const valueLabel = overlay.querySelector("[data-dimmer-popup-value]");

  const closePopup = () => {
    overlay.remove();
  };

  overlay.addEventListener("click", (evt) => {
    if (evt.target === overlay) closePopup();
  });

  if (slider) {
    updateDimmerSliderUI(slider, currentLevel);

    slider.addEventListener("input", (evt) => {
      const lvl = clampDimmerValue(evt.target.value, currentLevel);
      updateDimmerSliderUI(slider, lvl);
      if (valueLabel) valueLabel.textContent = `${lvl}%`;
    });

    slider.addEventListener("change", (evt) => {
      const lvl = clampDimmerValue(evt.target.value, currentLevel);
      if (valueLabel) valueLabel.textContent = `${lvl}%`;

      const nextState = lvl > 0 ? "on" : "off";
      setRoomControlUI(controlEl, nextState);
      controlEl.dataset.level = lvl;
      updateDimmerIconIntensity(controlEl, lvl);
      setStoredState(deviceId, nextState);
      recentCommands.set(deviceId, Date.now());

      sendHubitatCommand(deviceId, "setLevel", String(lvl))
        .then(() => {
          if (lvl === 0) return sendHubitatCommand(deviceId, "off");
          return null;
        })
        .catch((error) => {
          console.error(`⚠️Erro ao enviar nível ${lvl} para dimmer ${deviceId}:`, error);
        });
    });
  }

  document.body.appendChild(overlay);
}

function togglePoolControl(el, action) {
  const deviceId = el.dataset.deviceId;
  if (!action || !deviceId) {
    console.error(" togglePoolControl: action ou deviceId ausente");
    return;
  }

  console.log(` Enviando comando "${action}" para dispositivo piscina ${deviceId}`);

  // Enviar comando para Hubitat
  sendHubitatCommand(deviceId, action)
    .then(() => {
      console.log(` Comando "${action}" enviado com sucesso para dispositivo ${deviceId}`);
    })
    .catch((error) => {
      console.error(` Erro ao enviar comando para dispositivo ${deviceId}:`, error);
    });
}
// ========================================
// CONTROLE DE PODER DA TV
// ========================================

let tvPowerState = "off"; // Estado inicial: desligado

function updateTVPowerState(newState) {
  tvPowerState = newState;

  // Selecionar botões ON e OFF
  const btnOn = document.querySelector(".tv-btn--power-on");
  const btnOff = document.querySelector(".tv-btn--power-off");

  // Selecionar todos os outros controles (incluindo música e volume)
  const otherControls = document.querySelectorAll(
    ".tv-volume-canais-wrapper, .tv-commands-grid, .tv-directional-pad, .tv-numpad, .tv-favorites-list, .tv-logo-section, .tv-control-mode-toggle, .tv-control-section--music, .tv-control-section--dpad, .tv-control-section--volume, .tv-control-section--media, .music-now-content, .music-album-container, .music-info, .tv-volume-slider-container, .tv-volume-slider, .tv-volume-value"
  );
  const gestureIcons = document.querySelectorAll(".tv-gesture-icons");
  const gestureSurface = document.querySelectorAll(".tv-gesture-surface");

  // Selecionar títulos das seções de controle
  const titles = document.querySelectorAll(".tv-section-title, .tv-section-line");
  
  // Selecionar seção de volume separadamente (coluna 2)
  const volumeSection = document.querySelectorAll(".tv-col-2 > .tv-control-section");

  if (newState === "on") {
    // TV ligada
    btnOn?.classList.add("active");
    btnOff?.classList.remove("active");

    // Mostrar outros controles
    otherControls.forEach((control) => {
      control.style.opacity = "1";
      control.style.pointerEvents = "auto";
    });
    gestureIcons.forEach((control) => {
      control.style.opacity = "";
      control.style.pointerEvents = "none";
    });
    gestureSurface.forEach((control) => {
      control.style.opacity = "";
      control.style.pointerEvents = "";
    });
    volumeSection.forEach((control) => {
      control.style.opacity = "1";
      control.style.pointerEvents = "auto";
    });

    // Mostrar títulos
    titles.forEach((title) => {
      title.style.opacity = "1";
    });

    console.log("📺 TV LIGADA - Controles visíveis");
  } else {
    // TV desligada - opacidade 40% (0.4)
    btnOff?.classList.add("active");
    btnOn?.classList.remove("active");

    // Escurecer e desabilitar outros controles
    otherControls.forEach((control) => {
      control.style.opacity = "0.4";
      control.style.pointerEvents = "none";
    });
    gestureIcons.forEach((control) => {
      control.style.opacity = "0.4";
      control.style.pointerEvents = "none";
    });
    gestureSurface.forEach((control) => {
      control.style.opacity = "0.4";
      control.style.pointerEvents = "none";
    });
    volumeSection.forEach((control) => {
      control.style.opacity = "0.4";
      control.style.pointerEvents = "none";
    });

    // Apagar títulos
    titles.forEach((title) => {
      title.style.opacity = "0.4";
    });

    console.log("📺 TV DESLIGADA - Controles desabilitados");
  }
}

// Controle de TV
function tvCommand(el, command) {
  const deviceId = el.dataset.deviceId;
  if (!command || !deviceId) return;

  if (command === "mute") {
    const slider = document.getElementById("tv-volume-slider");
    if (slider) {
      slider.value = "0";
      slider.dispatchEvent(new Event("input", { bubbles: true }));
      slider.dispatchEvent(new Event("change", { bubbles: true }));
    }
    return;
  }

  // Alguns controles precisam disparar comando duplo (ex.: Claro TV: returnButton + voltar)
  const commandsToSend = [command];
  const wrapper = el.closest?.(".tv-control-wrapper");
  const isClaroTv = wrapper?.dataset?.controlType === "clarotv";
  if (isClaroTv && command === "returnButton") {
    commandsToSend.push("voltar");
  }

  // Controlar estado de poder
  if (command === "on" || command === "powerOn") {
    updateTVPowerState("on");
  } else if (command === "off" || command === "powerOff") {
    updateTVPowerState("off");
  }

  // Feedback visual (preserva transform base quando existir)
  const computedTransform = window.getComputedStyle(el).transform;
  const baseTransform = computedTransform !== "none" ? computedTransform : "";
  el.style.transform = baseTransform
    ? `${baseTransform} scale(0.99)`
    : "scale(0.99)";
  el.style.background = "rgba(255, 255, 255, 0.15)";
  el.style.borderColor = "rgba(255, 255, 255, 0.3)";
  setTimeout(() => {
    el.style.transform = "";
    el.style.background = "";
    el.style.borderColor = "";
  }, 200);

  // Marcar comando recente
  recentCommands.set(deviceId, Date.now());

  commandsToSend.forEach((cmd) => {
    console.log(`📺 Enviando comando ${cmd} para dispositivo ${deviceId}`);

    // Enviar para Hubitat
    sendHubitatCommand(deviceId, cmd)
      .then(() => {
        console.log(
          `✅ Comando TV ${cmd} enviado com sucesso para dispositivo ${deviceId}`
        );
      })
      .catch((error) => {
        console.error(
          `❌ Erro ao enviar comando TV para dispositivo ${deviceId}:`,
          error
        );
      });
  });
}

function toggleClaroTvPanel(trigger, targetView) {
  const view = targetView === "favorites" ? "favorites" : "numbers";
  const wrapper = trigger?.closest?.(".tv-control-wrapper");
  if (!wrapper) return;

  const panel = wrapper.querySelector(
    ".tv-control-section[data-claro-panel]"
  );
  if (!panel) return;

  const currentView = panel.dataset.claroPanel || "numbers";
  if (currentView === view) return;

  const fade = panel.querySelector("[data-claro-fade]");
  const title = panel.querySelector("[data-claro-panel-title]");
  const buttons = wrapper.querySelectorAll("[data-claro-panel-btn]");

  const applyView = () => {
    panel.dataset.claroPanel = view;
    if (title) {
      title.textContent = view === "favorites" ? "Favoritos" : "N\u00fameros";
    }

    buttons.forEach((btn) => {
      const isActive = btn.dataset.claroPanelBtn === view;
      btn.classList.toggle("is-active", isActive);
      btn.setAttribute("aria-pressed", isActive ? "true" : "false");
    });
  };

  if (!fade) {
    applyView();
    return;
  }

  if (fade.dataset.fadeBusy === "true") return;
  fade.dataset.fadeBusy = "true";
  fade.classList.add("is-fading");

  window.setTimeout(() => {
    applyView();
    fade.classList.remove("is-fading");
  }, 200);

  window.setTimeout(() => {
    fade.dataset.fadeBusy = "";
  }, 400);
}

function positionAppleTvModeIndicator(section) {
  if (!section) return;
  const toggle = section.querySelector(".tv-control-mode-toggle");
  if (!toggle) return;
  const indicator = toggle.querySelector(".tv-control-mode-indicator");
  if (!indicator) return;
  const activeBtn =
    toggle.querySelector(".tv-control-mode-btn.is-active") ||
    toggle.querySelector(".tv-control-mode-btn");
  if (!activeBtn) return;

  const toggleRect = toggle.getBoundingClientRect();
  const btnRect = activeBtn.getBoundingClientRect();
  if (!toggleRect.width || !btnRect.width) return;

  const left = btnRect.left - toggleRect.left;
  const top = btnRect.top - toggleRect.top;
  indicator.style.left = `${left}px`;
  indicator.style.top = `${top}px`;
  indicator.style.width = `${btnRect.width}px`;
  indicator.style.height = `${btnRect.height}px`;
  indicator.style.bottom = "auto";
}

function syncAppleTvControlMode(section) {
  if (!section) return;
  const mode = section.dataset.controlMode || "cursor";
  section.dataset.controlMode = mode;

  const toggle = section.querySelector(".tv-control-mode-toggle");
  if (toggle) {
    toggle.dataset.mode = mode;
  }

  const buttons = section.querySelectorAll(".tv-control-mode-btn");
  buttons.forEach((btn) => {
    const isActive = btn.dataset.mode === mode;
    btn.classList.toggle("is-active", isActive);
    btn.setAttribute("aria-pressed", isActive ? "true" : "false");
  });

  window.requestAnimationFrame(() => {
    positionAppleTvModeIndicator(section);
  });
}

function initAppleTvGestureControls(root = document) {
  const sections = root.querySelectorAll(
    ".tv-control-wrapper .tv-control-section--dpad"
  );

  sections.forEach((section) => {
    if (section.dataset.gestureInit === "true") {
      syncAppleTvControlMode(section);
      return;
    }

    const surface = section.querySelector(".tv-gesture-surface");
    if (!surface) return;

    const buttons = {
      up: section.querySelector(".tv-directional-btn--up"),
      down: section.querySelector(".tv-directional-btn--down"),
      left: section.querySelector(".tv-directional-btn--left"),
      right: section.querySelector(".tv-directional-btn--right"),
      center: section.querySelector(".tv-directional-btn--ok"),
    };

    const sendCommand = (command, btn) => {
      if (btn) {
        tvCommand(btn, command);
        return;
      }

      const deviceId = section.dataset.deviceId;
      if (!deviceId) return;
      sendHubitatCommand(deviceId, command).catch(() => {});
    };

    const threshold = 24;
    let startX = 0;
    let startY = 0;
    let moved = false;
    let pointerId = null;

    const resetGesture = () => {
      startX = 0;
      startY = 0;
      moved = false;
      pointerId = null;
    };

    const isGesturesMode = () =>
      section.dataset.controlMode === "gestures";

    surface.addEventListener("pointerdown", (e) => {
      if (!isGesturesMode()) return;
      pointerId = e.pointerId;
      startX = e.clientX;
      startY = e.clientY;
      moved = false;
      surface.setPointerCapture(pointerId);
    });

    surface.addEventListener("pointermove", (e) => {
      if (!isGesturesMode() || pointerId !== e.pointerId || moved) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      if (Math.hypot(dx, dy) < threshold) return;
      moved = true;

      if (Math.abs(dx) > Math.abs(dy)) {
        sendCommand(dx > 0 ? "cursorRight" : "cursorLeft", dx > 0 ? buttons.right : buttons.left);
      } else {
        sendCommand(dy > 0 ? "cursorDown" : "cursorUp", dy > 0 ? buttons.down : buttons.up);
      }
    });

    surface.addEventListener("pointerup", (e) => {
      if (pointerId !== e.pointerId) return;
      if (isGesturesMode() && !moved) {
        sendCommand("cursorCenter", buttons.center);
      }
      resetGesture();
    });

    surface.addEventListener("pointercancel", resetGesture);

    section.dataset.gestureInit = "true";
    syncAppleTvControlMode(section);
  });

  if (!window.__APPLE_TV_TOGGLE_RESIZE__) {
    window.__APPLE_TV_TOGGLE_RESIZE__ = true;
    window.addEventListener("resize", () => {
      document
        .querySelectorAll(
          ".tv-control-wrapper .tv-control-section--dpad"
        )
        .forEach((section) => syncAppleTvControlMode(section));
    });
  }
}

document.addEventListener("click", (e) => {
  const btn = e.target.closest(".tv-control-mode-btn");
  if (!btn) return;
  const section = btn.closest(".tv-control-section--dpad");
  if (!section) return;
  const mode = btn.dataset.mode;
  if (!mode) return;
  if (section.dataset.controlMode === mode) return;
  section.dataset.controlMode = mode;
  syncAppleTvControlMode(section);
});

// Macro para ligar HTV + TV + Receiver de uma vez

// Macro para ligar TV e Receiver e setar input SAT/CBL
function htvMacroOn() {
  const TV_ID = "111";
  const RECEIVER_ID = "354";

  console.log("🎬 Macro HTV: Inicializando, ligando TV, setando HDMI 2 e input SAT/CBL...");

  // Inicializa TV primeiro
  sendHubitatCommand(TV_ID, "initialize")
    .then(() => {
      console.log("✅ TV inicializada");
      // Liga TV (ou confirma que está ligada)
      return sendHubitatCommand(TV_ID, "on");
    })
    .then(() => {
      console.log("✅ TV ligada");
      // Seta HDMI 2 na TV
      return sendHubitatCommand(TV_ID, "hdmi2");
    })
    .then(() => {
      console.log("✅ HDMI 2 selecionado na TV");
      console.log("⏳ Aguardando 4 segundos antes de setar input SAT/CBL...");
      // Aguardar 4 segundos antes de setar input SAT/CBL
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve(sendHubitatCommand(RECEIVER_ID, "setInputSource", "SAT/CBL"));
        }, 4000);
      });
    })
    .then(() => {
      console.log("✅ Input SAT/CBL selecionado no Receiver");
    })
    .catch((error) => {
      console.error("❌ Erro na macro HTV:", error);
      // Mesmo com erro, tentar setar o input (caso TV já esteja ligada)
      console.log("🔄 Tentando setar input SAT/CBL mesmo com erro anterior...");
      sendHubitatCommand(RECEIVER_ID, "setInputSource", "SAT/CBL")
        .then(() => console.log("✅ Input SAT/CBL selecionado no Receiver (recuperação)"))
        .catch((err) => console.error("❌ Erro ao setar input:", err));
    });
}

// Versão anterior da função (mantida para referência)
function htvMacroOn_old() {
  const TV_ID = "111";
  const RECEIVER_ID = "354";

  console.log("🎬 Macro HTV: Ligando TV, setando HDMI 2 e input SAT/CBL...");

  // Liga TV (ou confirma que está ligada)
  sendHubitatCommand(TV_ID, "on")
    .then(() => {
      console.log("✅ TV ligada");
      // Seta HDMI 2 na TV
      return sendHubitatCommand(TV_ID, "hdmi2");
    })
    .then(() => {
      console.log("✅ HDMI 2 selecionado na TV");
      console.log("⏳ Aguardando 4 segundos antes de setar input SAT/CBL...");
      // Aguardar 4 segundos antes de setar input SAT/CBL
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve(sendHubitatCommand(RECEIVER_ID, "setInputSource", "SAT/CBL"));
        }, 4000);
      });
    })
    .then(() => {
      console.log("✅ Input SAT/CBL selecionado no Receiver");
    })
    .catch((error) => {
      console.error("❌ Erro na macro HTV:", error);
      // Mesmo com erro, tentar setar o input (caso TV já esteja ligada)
      console.log("🔄 Tentando setar input SAT/CBL mesmo com erro anterior...");
      sendHubitatCommand(RECEIVER_ID, "setInputSource", "SAT/CBL")
        .then(() => console.log("✅ Input SAT/CBL selecionado no Receiver (recuperação)"))
        .catch((err) => console.error("❌ Erro ao setar input:", err));
    });
}

// Macro para ligar Telão da Piscina
function telaoMacroOn() {
  const TELAO_ID = "157";
  const RECEIVER_ID = "16";

  console.log("🎬 Macro Telão: Ligando Telão e setando input SAT/CBL...");

  // Liga Telão e seta input SAT/CBL no receiver
  Promise.all([
    sendHubitatCommand(TELAO_ID, "on"),
    sendHubitatCommand(RECEIVER_ID, "setInputSource", "SAT/CBL")
  ])
    .then(() => {
      console.log("✅ Telão ligado e input SAT/CBL selecionado");
    })
    .catch((error) => {
      console.error("❌ Erro na macro Telão:", error);
    });
}

// Macro para desligar TV e Receiver
function htvMacroOff() {
  const TV_ID = "111";
  const RECEIVER_ID = "354";

  console.log("🎬 Macro HTV: Desligando TV e Receiver...");

  Promise.all([
    sendHubitatCommand(TV_ID, "off"),
    sendHubitatCommand(RECEIVER_ID, "off")
  ])
    .then(() => {
      console.log("✅ TV e Receiver desligados");
    })
    .catch((error) => {
      console.error("❌ Erro ao desligar TV/Receiver:", error);
    });
}

// ============================================
// MACROS SUÍTE MASTER (sem Receiver)
// ============================================

// Macro para ligar HTV Suíte Master: Liga TV, aguarda 3s, seleciona HDMI2
function suiteMasterHtvOn() {
  const TV_ID = "183"; // TV Samsung Suíte Master

  console.log("🎬 Macro Suíte Master HTV: Ligando TV e selecionando HDMI2...");

  sendHubitatCommand(TV_ID, "on")
    .then(() => {
      console.log("✅ TV Suíte Master ligada");
      console.log("⏳ Aguardando 3 segundos antes de selecionar HDMI2...");
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve(sendHubitatCommand(TV_ID, "hdmi2"));
        }, 3000);
      });
    })
    .then(() => {
      console.log("✅ HDMI2 selecionado na TV Suíte Master");
    })
    .catch((error) => {
      console.error("❌ Erro na macro Suíte Master HTV:", error);
    });
}

// Macro para desligar HTV Suíte Master: Apenas desliga TV
function suiteMasterHtvOff() {
  const TV_ID = "183"; // TV Samsung Suíte Master

  console.log("🎬 Macro Suíte Master HTV: Desligando TV...");

  sendHubitatCommand(TV_ID, "off")
    .then(() => {
      console.log("✅ TV Suíte Master desligada");
    })
    .catch((error) => {
      console.error("❌ Erro ao desligar TV Suíte Master:", error);
    });
}

// Macro para ligar TV Suíte Master: Apenas liga TV (apps internos)
function suiteMasterTvOn() {
  const TV_ID = "183"; // TV Samsung Suíte Master

  console.log("🎬 Macro Suíte Master TV: Ligando TV...");

  sendHubitatCommand(TV_ID, "on")
    .then(() => {
      console.log("✅ TV Suíte Master ligada");
    })
    .catch((error) => {
      console.error("❌ Erro ao ligar TV Suíte Master:", error);
    });
}

// Macro para desligar TV Suíte Master: Apenas desliga TV
function suiteMasterTvOff() {
  const TV_ID = "183"; // TV Samsung Suíte Master

  console.log("🎬 Macro Suíte Master TV: Desligando TV...");

  sendHubitatCommand(TV_ID, "off")
    .then(() => {
      console.log("✅ TV Suíte Master desligada");
    })
    .catch((error) => {
      console.error("❌ Erro ao desligar TV Suíte Master:", error);
    });
}

// ============================================
// MACROS SUÍTE I (sem Receiver) - TV: 184
// ============================================

// Macro para ligar HTV Suíte I: Liga TV, aguarda 3s, seleciona HDMI2
function suite1HtvOn() {
  const TV_ID = "184"; // TV Samsung Suíte I

  console.log("🎬 Macro Suíte I HTV: Ligando TV e selecionando HDMI2...");

  sendHubitatCommand(TV_ID, "on")
    .then(() => {
      console.log("✅ TV Suíte I ligada");
      console.log("⏳ Aguardando 3 segundos antes de selecionar HDMI2...");
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve(sendHubitatCommand(TV_ID, "hdmi2"));
        }, 3000);
      });
    })
    .then(() => {
      console.log("✅ HDMI2 selecionado na TV Suíte I");
    })
    .catch((error) => {
      console.error("❌ Erro na macro Suíte I HTV:", error);
    });
}

// Macro para desligar HTV Suíte I: Apenas desliga TV
function suite1HtvOff() {
  const TV_ID = "184"; // TV Samsung Suíte I

  console.log("🎬 Macro Suíte I HTV: Desligando TV...");

  sendHubitatCommand(TV_ID, "off")
    .then(() => {
      console.log("✅ TV Suíte I desligada");
    })
    .catch((error) => {
      console.error("❌ Erro ao desligar TV Suíte I:", error);
    });
}

// Macro para ligar TV Suíte I: Apenas liga TV (apps internos)
function suite1TvOn() {
  const TV_ID = "184"; // TV Samsung Suíte I

  console.log("🎬 Macro Suíte I TV: Ligando TV...");

  sendHubitatCommand(TV_ID, "on")
    .then(() => {
      console.log("✅ TV Suíte I ligada");
    })
    .catch((error) => {
      console.error("❌ Erro ao ligar TV Suíte I:", error);
    });
}

// Macro para desligar TV Suíte I: Apenas desliga TV
function suite1TvOff() {
  const TV_ID = "184"; // TV Samsung Suíte I

  console.log("🎬 Macro Suíte I TV: Desligando TV...");

  sendHubitatCommand(TV_ID, "off")
    .then(() => {
      console.log("✅ TV Suíte I desligada");
    })
    .catch((error) => {
      console.error("❌ Erro ao desligar TV Suíte I:", error);
    });
}

// ============================================
// MACROS SUÍTE II (sem Receiver) - TV: 185
// ============================================

// Macro para ligar HTV Suíte II: Liga TV, aguarda 3s, seleciona HDMI2
function suite2HtvOn() {
  const TV_ID = "185"; // TV Samsung Suíte II

  console.log("🎬 Macro Suíte II HTV: Ligando TV e selecionando HDMI2...");

  sendHubitatCommand(TV_ID, "on")
    .then(() => {
      console.log("✅ TV Suíte II ligada");
      console.log("⏳ Aguardando 3 segundos antes de selecionar HDMI2...");
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve(sendHubitatCommand(TV_ID, "hdmi2"));
        }, 3000);
      });
    })
    .then(() => {
      console.log("✅ HDMI2 selecionado na TV Suíte II");
    })
    .catch((error) => {
      console.error("❌ Erro na macro Suíte II HTV:", error);
    });
}

// Macro para desligar HTV Suíte II: Apenas desliga TV
function suite2HtvOff() {
  const TV_ID = "185"; // TV Samsung Suíte II

  console.log("🎬 Macro Suíte II HTV: Desligando TV...");

  sendHubitatCommand(TV_ID, "off")
    .then(() => {
      console.log("✅ TV Suíte II desligada");
    })
    .catch((error) => {
      console.error("❌ Erro ao desligar TV Suíte II:", error);
    });
}

// Macro para ligar TV Suíte II: Apenas liga TV (apps internos)
function suite2TvOn() {
  const TV_ID = "185"; // TV Samsung Suíte II

  console.log("🎬 Macro Suíte II TV: Ligando TV...");

  sendHubitatCommand(TV_ID, "on")
    .then(() => {
      console.log("✅ TV Suíte II ligada");
    })
    .catch((error) => {
      console.error("❌ Erro ao ligar TV Suíte II:", error);
    });
}

// Macro para desligar TV Suíte II: Apenas desliga TV
function suite2TvOff() {
  const TV_ID = "185"; // TV Samsung Suíte II

  console.log("🎬 Macro Suíte II TV: Desligando TV...");

  sendHubitatCommand(TV_ID, "off")
    .then(() => {
      console.log("✅ TV Suíte II desligada");
    })
    .catch((error) => {
      console.error("❌ Erro ao desligar TV Suíte II:", error);
    });
}

// ============================================

// Macro para ligar TV + Receiver de uma vez

// Macro para ligar TV e Receiver e setar input TV
function tvMacroOn() {
  const TV_ID = "111";
  const RECEIVER_ID = "354";

  console.log("🎬 Macro TV: Ligando TV, depois setando input TV...");

  // Liga TV
  sendHubitatCommand(TV_ID, "on")
    .then(() => {
      console.log("✅ TV ligada");
      console.log("⏳ Aguardando 4 segundos antes de setar input TV...");
      // Aguardar 4 segundos antes de setar input TV
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve(sendHubitatCommand(RECEIVER_ID, "setInputSource", "TV"));
        }, 4000);
      });
    })
    .then(() => {
      console.log("✅ Input TV selecionado no Receiver");
    })
    .catch((error) => {
      console.error("❌ Erro na macro TV:", error);
    });
}

// Macro para desligar TV e Receiver
function tvMacroOff() {
  const TV_ID = "111";
  const RECEIVER_ID = "354";

  console.log("🎬 Macro TV: Desligando TV e Receiver...");

  Promise.all([
    sendHubitatCommand(TV_ID, "off"),
    sendHubitatCommand(RECEIVER_ID, "off")
  ])
    .then(() => {
      console.log("✅ TV e Receiver desligados");
    })
    .catch((error) => {
      console.error("❌ Erro ao desligar TV/Receiver:", error);
    });
}

// Macro para ativar Fire TV (HDMI 2 + BD no Receiver)
function fireTVMacro() {
  const TV_ID = "111";
  const RECEIVER_ID = "354";

  console.log("🎬 Macro Fire TV: Selecionando HDMI 2 e setando Receiver para BD...");

  // Enviar comando HDMI 2 para TV
  sendHubitatCommand(TV_ID, "hdmi2")
    .then(() => {
      console.log("✅ HDMI 2 selecionado na TV");
      // Setar input BD no Receiver
      return sendHubitatCommand(RECEIVER_ID, "setInputSource", "BD");
    })
    .then(() => {
      console.log("✅ Input BD selecionado no Receiver");
    })
    .catch((error) => {
      console.error("❌ Erro na macro Fire TV:", error);
    });
}

// Controle do Slider de Volume
function initVolumeSlider() {
  const slider = document.getElementById("tv-volume-slider");
  const display = document.getElementById("tv-volume-display");
  const DENON_DEVICE_ID = "354"; // ID do Denon AVR no Hubitat

  if (!slider || !display) {
    console.log("Ã¢Å¡Â Ã¯Â¸Â Slider ou display não encontrado");
    return;
  }

  console.log("Ã°Å¸Å½Å¡Ã¯Â¸Â Inicializando slider de volume do Denon AVR");

  // Definir o device ID no slider
  slider.dataset.deviceId = DENON_DEVICE_ID;

  // Remover event listeners antigos para evitar duplicaÃƒÂ§ÃƒÂ£o
  const newSlider = slider.cloneNode(true);
  slider.parentNode.replaceChild(newSlider, slider);

  // Pegar referÃƒÂªncia ao novo slider
  const updatedSlider = document.getElementById("tv-volume-slider");

  // Buscar volume atual do Denon e atualizar o slider
  updateDenonVolumeFromServer();

  // Atualizar display quando slider mudar
  updatedSlider.addEventListener("input", (e) => {
    const value = e.target.value;
    const max = e.target.max || 100;
    const percentage = (value / max) * 100;

    display.textContent = value;
    updatedSlider.style.setProperty("--volume-progress", percentage + "%");

    console.log(
      `Ã°Å¸Å½Å¡Ã¯Â¸Â Volume display atualizado: ${value} (${percentage.toFixed(
        1
      )}%)`
    );
  });

  // Enviar comando ao soltar o slider
  updatedSlider.addEventListener("change", (e) => {
    const value = e.target.value;

    console.log(
      `Ã°Å¸â€Å  Volume alterado para: ${value} - enviando para Denon AVR`
    );

    // Enviar comando setVolume para o Denon AVR
    sendHubitatCommand(DENON_DEVICE_ID, "setvolume", value)
      .then(() => {
        console.log(`Ã¢Å“â€¦ Volume do Denon definido para ${value}`);
      })
      .catch((error) => {
        console.error(`⚠️Erro ao definir volume do Denon:`, error);
      });
  });

  console.log("Ã¢Å“â€¦ Slider de volume do Denon AVR inicializado com sucesso");
}

// Função para atualizar o volume do Denon a partir do servidor
async function updateDenonVolumeFromServer() {
  const DENON_DEVICE_ID = "354";
  const tvSlider = document.getElementById("tv-volume-slider");
  const tvDisplay = document.getElementById("tv-volume-display");
  const musicSlider =
    typeof queryActiveMusic === "function"
      ? queryActiveMusic("#music-volume-slider")
      : document.querySelector("#music-volume-slider");
  const musicDisplay =
    typeof queryActiveMusic === "function"
      ? queryActiveMusic("#music-volume-display")
      : document.querySelector("#music-volume-display");
  const musicIconHigh =
    typeof queryActiveMusic === "function"
      ? queryActiveMusic(".volume-icon-high")
      : document.querySelector(".volume-icon-high");
  const musicIconLow =
    typeof queryActiveMusic === "function"
      ? queryActiveMusic(".volume-icon-low")
      : document.querySelector(".volume-icon-low");
  const musicIconMuted =
    typeof queryActiveMusic === "function"
      ? queryActiveMusic(".volume-icon-muted")
      : document.querySelector(".volume-icon-muted");

  try {
    const pollingUrl = isProduction
      ? `${POLLING_URL}?devices=${DENON_DEVICE_ID}`
      : null;

    if (!pollingUrl) {
      console.log(
        "⚠️não é possível buscar volume em desenvolvimento"
      );
      return;
    }

    const response = await fetch(pollingUrl);
    if (!response.ok) throw new Error(`Polling failed: ${response.status}`);

    const data = await response.json();

    // Processar resposta para pegar o volume e o estado de energia
    let volume = null;
    let powerState = null;

    if (data.devices && data.devices[DENON_DEVICE_ID]) {
      const devicePayload = data.devices[DENON_DEVICE_ID];
      volume =
        devicePayload.volume ??
        devicePayload.level ??
        (devicePayload.attributes && devicePayload.attributes.volume);
      powerState = getDenonPowerStateFromDevice(devicePayload);
    } else if (Array.isArray(data.data)) {
      const denonData = data.data.find((d) => String(d.id) === DENON_DEVICE_ID);
      if (denonData) {
        if (denonData.attributes) {
          if (Array.isArray(denonData.attributes)) {
            const volumeAttr = denonData.attributes.find(
              (attr) => attr?.name === "volume"
            );
            volume =
              volumeAttr?.currentValue ??
              volumeAttr?.value ??
              denonData.volume ??
              volume;
          } else if (typeof denonData.attributes === "object") {
            volume = denonData.attributes.volume ?? denonData.volume ?? volume;
          }
        } else if (denonData.volume !== undefined) {
          volume = denonData.volume;
        }
        powerState = getDenonPowerStateFromDevice(denonData);
      }
    }

    if (volume !== null && volume !== undefined) {
      const volumeValue = parseInt(volume, 10);

      if (tvSlider) {
        const maxTv = parseInt(tvSlider.max || "100", 10);
        const percentageTv = (volumeValue / maxTv) * 100;
        tvSlider.value = volumeValue;
        tvSlider.style.setProperty("--volume-progress", percentageTv + "%");
      }

      if (tvDisplay) {
        tvDisplay.textContent = volumeValue;
      }

      if (musicSlider) {
        const maxMusic = parseInt(musicSlider.max || "100", 10);
        const percentageMusic = (volumeValue / maxMusic) * 100;
        musicSlider.value = volumeValue;
        musicSlider.style.setProperty(
          "--volume-percent",
          percentageMusic + "%"
        );
      }

      if (musicDisplay) {
        musicDisplay.textContent = volumeValue;
      }

      if (musicIconHigh && musicIconLow && musicIconMuted) {
        musicIconHigh.style.display = "none";
        musicIconLow.style.display = "none";
        musicIconMuted.style.display = "none";
        if (volumeValue === 0) {
          musicIconMuted.style.display = "block";
        } else if (volumeValue >= 50) {
          musicIconHigh.style.display = "block";
        } else {
          musicIconLow.style.display = "block";
        }
      }

      console.log("[Denon] Volume atualizado:", volumeValue);
    }

    if (powerState) {
      applyDenonPowerState(powerState);
    }
  } catch (error) {
    console.error("⚠️Erro ao buscar volume do Denon:", error);
  }
}

// Função para atualizar a UI do volume do Denon (chamada pelo polling)
function updateDenonVolumeUI(volume) {
  const tvSlider = document.getElementById("tv-volume-slider");
  const tvDisplay = document.getElementById("tv-volume-display");
  const musicSlider =
    typeof queryActiveMusic === "function"
      ? queryActiveMusic("#music-volume-slider")
      : document.querySelector("#music-volume-slider");
  const musicDisplay =
    typeof queryActiveMusic === "function"
      ? queryActiveMusic("#music-volume-display")
      : document.querySelector("#music-volume-display");
  const musicIconHigh =
    typeof queryActiveMusic === "function"
      ? queryActiveMusic(".volume-icon-high")
      : document.querySelector(".volume-icon-high");
  const musicIconLow =
    typeof queryActiveMusic === "function"
      ? queryActiveMusic(".volume-icon-low")
      : document.querySelector(".volume-icon-low");
  const musicIconMuted =
    typeof queryActiveMusic === "function"
      ? queryActiveMusic(".volume-icon-muted")
      : document.querySelector(".volume-icon-muted");

  debugLog(() => ["updateDenonVolumeUI chamada", { volume }]);

  if (!tvSlider && !musicSlider) {
    debugLog(() => "updateDenonVolumeUI: nenhum controle encontrado na página");
    return;
  }

  const volumeValue = parseInt(volume, 10);
  debugLog(() => [
    "updateDenonVolumeUI: estado atual",
    {
      recebido: volume,
      convertido: volumeValue,
      tvSlider: tvSlider ? tvSlider.value : "n/a",
      musicSlider: musicSlider ? musicSlider.value : "n/a",
    },
  ]);

  const lastCmd = recentCommands.get("354");
  if (lastCmd && Date.now() - lastCmd < COMMAND_PROTECTION_MS) {
    debugLog(
      () => "updateDenonVolumeUI: comando manual recente, ignorando polling"
    );
    return;
  }

  let updated = false;

  if (tvSlider) {
    const currentTv = parseInt(tvSlider.value, 10);
    const maxTv = tvSlider.max || 100;
    const percentageTv = (volumeValue / maxTv) * 100;
    if (currentTv !== volumeValue) {
      tvSlider.value = volumeValue;
      tvSlider.style.setProperty("--volume-progress", percentageTv + "%");
      updated = true;
    }
    if (tvDisplay) {
      tvDisplay.textContent = volumeValue;
    }
  }

  if (musicSlider) {
    const currentMusic = parseInt(musicSlider.value, 10);
    const maxMusic = musicSlider.max || 100;
    const percentageMusic = (volumeValue / maxMusic) * 100;
    if (currentMusic !== volumeValue) {
      musicSlider.value = volumeValue;
      musicSlider.style.setProperty("--volume-percent", percentageMusic + "%");
      if (typeof updateVolumeBar === "function") updateVolumeBar();
      updated = true;
    }
  }

  if (musicDisplay) {
    musicDisplay.textContent = volumeValue;
  }

  if (musicIconHigh && musicIconLow && musicIconMuted) {
    musicIconHigh.style.display = "none";
    musicIconLow.style.display = "none";
    musicIconMuted.style.display = "none";
    if (volumeValue === 0) {
      musicIconMuted.style.display = "block";
    } else if (volumeValue >= 50) {
      musicIconHigh.style.display = "block";
    } else {
      musicIconLow.style.display = "block";
    }
  }

  if (updated) {
    debugLog(() => ["updateDenonVolumeUI: volume sincronizado", { volumeValue }]);
  }
}

function normalizeDenonPowerState(value) {
  if (value === undefined || value === null) return null;
  const normalized = String(value).trim().toLowerCase();
  if (["on", "1", "true", "online"].includes(normalized)) return "on";
  if (["off", "0", "false", "offline", "standby"].includes(normalized))
    return "off";
  return null;
}

function getDenonPowerStateFromDevice(device) {
  if (!device || typeof device !== "object") return null;

  const directCandidates = [
    device.switch,
    device.state,
    device.power,
    device.status,
  ];

  for (const candidate of directCandidates) {
    const normalized = normalizeDenonPowerState(candidate);
    if (normalized) return normalized;
  }

  const attrs = device.attributes;

  if (Array.isArray(attrs)) {
    for (const attr of attrs) {
      if (!attr) continue;
      const attrName = String(attr.name || attr.attribute || "").toLowerCase();
      if (!attrName) continue;
      if (["switch", "power", "status", "state"].includes(attrName)) {
        const normalized = normalizeDenonPowerState(
          attr.currentValue ?? attr.value
        );
        if (normalized) return normalized;
      }
    }
  } else if (attrs && typeof attrs === "object") {
    const keys = ["switch", "power", "status", "state"];
    for (const key of keys) {
      if (key in attrs) {
        const normalized = normalizeDenonPowerState(attrs[key]);
        if (normalized) return normalized;
      }
    }
  }

  return null;
}

function applyDenonPowerState(rawState) {
  const normalized = normalizeDenonPowerState(rawState);
  if (!normalized) return;

  if (typeof recentCommands !== "undefined") {
    const lastCmd = recentCommands.get("354");
    if (lastCmd && Date.now() - lastCmd < COMMAND_PROTECTION_MS) {
      console.log(
        "[Denon] Ignorando sincronizacao de power por comando recente"
      );
      return;
    }
  }

  const desiredOn = normalized === "on";

  window.musicPlayerUI = window.musicPlayerUI || {};
  window.musicPlayerUI.currentPowerState = normalized;

  if (
    window.musicPlayerUI &&
    typeof window.musicPlayerUI.isPowerOn === "function" &&
    window.musicPlayerUI.isPowerOn() === desiredOn
  ) {
    return;
  }

  if (
    window.musicPlayerUI &&
    typeof window.musicPlayerUI.setPower === "function"
  ) {
    window.musicPlayerUI.setPower(desiredOn);
  }
}
// Inicializar estado ao carregar
document.addEventListener("DOMContentLoaded", () => {
  updateTVPowerState("off");
  initVolumeSlider();
  initAppleTvGestureControls();
  ensureTopBarVisible();
  syncRemoteControlDeviceIds();

  // Re-inicializar quando a página mudar (para SPAs)
  window.addEventListener("hashchange", () => {
    setTimeout(() => {
      initVolumeSlider();
      initAppleTvGestureControls();
      ensureTopBarVisible();
      syncRemoteControlDeviceIds();
    }, 100);
  });

  window.addEventListener("resize", () => {
    ensureTopBarVisible();
  });

  window.addEventListener("orientationchange", () => {
    setTimeout(() => {
      ensureTopBarVisible();
    }, 100);
  });

  // Listener para inicialização de dispositivos por ambiente
  window.addEventListener("hashchange", () => {
    const newHash = window.location.hash;
    const envKey = getEnvironmentRouteFromHash(newHash);
    if (!envKey) return;
    console.log("🏠 [hashchange] Entrando no ambiente:", envKey);
    // Pequeno delay para garantir que a página carregou
    setTimeout(() => {
      initializeEnvironmentDevices(envKey);
    }, 500);
  });

  // Listener específico para página de música
  window.addEventListener("hashchange", () => {
    console.log("🎵 [hashchange] Hash mudou para:", window.location.hash);
    const isMusicActive = isMusicPageActive();
    console.log("🎵 [hashchange] isMusicPageActive:", isMusicActive);
    
    if (isMusicActive) {
      console.log("🎵 [hashchange] Iniciando player de música em 300ms...");
      setTimeout(() => {
        console.log("🎵 [hashchange] Executando initMusicPlayerUI...");
        initMusicPlayerUI();
        updateDenonMetadata();
        startMusicMetadataPolling();
      }, 300);
    } else {
      stopMusicMetadataPolling();
    }
  });
});

function setRoomControlUI(el, state) {
  const ICON_ON = resolveIconPath(
    (el && el.dataset && (el.dataset.iconOn || el.dataset.iconon)) ||
      "images/icons/icon-small-light-on.svg"
  );
  const ICON_OFF = resolveIconPath(
    (el && el.dataset && (el.dataset.iconOff || el.dataset.iconoff)) ||
      "images/icons/icon-small-light-off.svg"
  );
  const normalized = state === "on" ? "on" : "off";

  el.dataset.state = normalized;

  // Usa a camada principal do ícone, mantendo o contorno separado
  const img = getMainControlIcon(el);
  if (img) {
    img.src = ICON_OFF; // Sempre usa outline
  } else {
    console.warn(
      `Ã¢Å¡Â Ã¯Â¸Â setRoomControlUI: Imagem não encontrada para elemento com classes: ${el.className}`
    );
    // Debug: mostrar todos os elementos filhos para diagnÃƒÂ³stico
    console.log(
      `Ã°Å¸â€Â Elementos filhos:`,
      Array.from(el.children).map((child) => child.className)
    );
  }

  // Para todas as luzes: controlar opacidade do ícone de background
  const bgIcon = el.querySelector(".control-icon-bg");
  if (bgIcon) {
    bgIcon.style.opacity = normalized === "on" ? "0.6" : "0";
  }
}

function deviceStateKey(deviceId) {
  return `${DEVICE_STATE_STORAGE_PREFIX}${deviceId}`;
}

function getStoredState(deviceId) {
  if (deviceStateMemory.has(deviceId)) {
    return deviceStateMemory.get(deviceId);
  }

  if (deviceStateStorageDisabled) {
    return null;
  }

  try {
    const key = deviceStateKey(deviceId);
    const value = localStorage.getItem(key);

    if (value !== null && value !== undefined) {
      deviceStateMemory.set(deviceId, value);
    }

    return value;
  } catch (error) {
    debugLog(() => ["getStoredState fallback", deviceId, error]);
    return null;
  }
}

function setStoredState(deviceId, state) {
  deviceStateMemory.set(deviceId, state);

  if (deviceStateStorageDisabled) {
    return;
  }

  const key = deviceStateKey(deviceId);

  try {
    localStorage.setItem(key, state);
    deviceStateQuotaErrors = 0;
  } catch (error) {
    if (isQuotaExceededError(error)) {
      handleDeviceStateQuotaError(deviceId, key, state, error);
    } else {
      console.warn(`Erro ao salvar estado ${deviceId}:`, error);
    }
  }
}

function isQuotaExceededError(error) {
  if (!error) return false;
  return (
    error.name === "QuotaExceededError" ||
    error.name === "NS_ERROR_DOM_QUOTA_REACHED" ||
    error.code === 22 ||
    error.code === 1014
  );
}

function handleDeviceStateQuotaError(deviceId, key, state, error) {
  if (deviceStateStorageDisabled) {
    return;
  }

  if (!deviceStateQuotaWarningShown) {
    console.warn(
      `Persistencia de estados sem espaco para ${deviceId}. Tentando limpeza...`,
      error
    );
    deviceStateQuotaWarningShown = true;
  } else {
    debugLog(() => [
      "QuotaExceeded repetido",
      { deviceId, message: error?.message }
    ]);
  }

  let removedEntries = 0;
  if (!deviceStateCleanupInProgress) {
    deviceStateCleanupInProgress = true;
    try {
      const excluded = new Set([key]);
      removedEntries = purgeDeviceStateEntries(excluded);
      if (removedEntries > 0) {
        console.info(`Estados antigos removidos do localStorage: ${removedEntries}`);
      }
    } finally {
      deviceStateCleanupInProgress = false;
    }
  }

  if (removedEntries === 0) {
    disableDeviceStatePersistence(
      "Sem espaco restante no localStorage e nenhum estado para remover",
      error
    );
    return;
  }

  try {
    localStorage.setItem(key, state);
    deviceStateQuotaErrors = 0;
  } catch (retryError) {
    deviceStateQuotaErrors += 1;
    const attempt = Math.min(
      deviceStateQuotaErrors,
      DEVICE_STATE_MAX_QUOTA_ERRORS
    );

    if (attempt >= DEVICE_STATE_MAX_QUOTA_ERRORS) {
      disableDeviceStatePersistence(
        "localStorage sem espaco suficiente para estados",
        retryError
      );
    } else {
      console.warn(
        `Persistencia de estados ainda sem espaco (tentativa ${attempt}/${DEVICE_STATE_MAX_QUOTA_ERRORS})`,
        retryError
      );
    }
  }
}

function purgeDeviceStateEntries(excludeKeys = new Set()) {
  if (typeof localStorage === "undefined") return 0;

  const keysToRemove = [];
  for (let i = 0; i < localStorage.length; i++) {
    const currentKey = localStorage.key(i);
    if (
      currentKey &&
      currentKey.startsWith(DEVICE_STATE_STORAGE_PREFIX) &&
      !excludeKeys.has(currentKey)
    ) {
      keysToRemove.push(currentKey);
    }
  }

  keysToRemove.forEach((keyName) => {
    try {
      localStorage.removeItem(keyName);
    } catch (removeError) {
      console.warn("Erro ao remover estado persistido:", keyName, removeError);
    }

    const deviceId = keyName.substring(DEVICE_STATE_STORAGE_PREFIX.length);
    if (deviceId) {
      deviceStateMemory.delete(deviceId);
    }
  });

  return keysToRemove.length;
}

function disableDeviceStatePersistence(reason, error) {
  if (deviceStateStorageDisabled) {
    return;
  }

  deviceStateStorageDisabled = true;
  console.warn(`Persistencia de estados desativada: ${reason}`, error);
}

function registerControlElement(el) {
  if (!el || !el.dataset) return false;
  const deviceId = el.dataset.deviceId;
  if (!deviceId) return false;

  let registry = deviceControlCache.get(deviceId);
  if (!registry) {
    registry = new Set();
    deviceControlCache.set(deviceId, registry);
  }

  if (registry.has(el)) return false;
  registry.add(el);
  return true;
}

function unregisterControlElement(el) {
  if (!el || !el.dataset) return false;
  const deviceId = el.dataset.deviceId;
  if (!deviceId) return false;

  const registry = deviceControlCache.get(deviceId);
  if (!registry) return false;
  const removed = registry.delete(el);
  if (registry.size === 0) {
    deviceControlCache.delete(deviceId);
  }
  return removed;
}

function registerMasterButton(btn) {
  if (!btn) return false;
  if (masterButtonCache.has(btn)) return false;
  masterButtonCache.add(btn);
  return true;
}

function unregisterMasterButton(btn) {
  if (!btn) return false;
  return masterButtonCache.delete(btn);
}

function collectControlsFromNode(node) {
  if (!node || node.nodeType !== Node.ELEMENT_NODE) return false;
  let changed = false;

  if (node.matches && node.matches(CONTROL_SELECTOR)) {
    changed = registerControlElement(node) || changed;
  }

  if (node.matches && node.matches(MASTER_BUTTON_SELECTOR)) {
    changed = registerMasterButton(node) || changed;
  }

  if (typeof node.querySelectorAll === "function") {
    node.querySelectorAll(CONTROL_SELECTOR).forEach(function (el) {
      changed = registerControlElement(el) || changed;
    });

    node.querySelectorAll(MASTER_BUTTON_SELECTOR).forEach(function (btn) {
      changed = registerMasterButton(btn) || changed;
    });
  }

  return changed;
}

function removeControlsFromNode(node) {
  if (!node || node.nodeType !== Node.ELEMENT_NODE) return false;
  let changed = false;

  if (node.matches && node.matches(CONTROL_SELECTOR)) {
    changed = unregisterControlElement(node) || changed;
  }

  if (node.matches && node.matches(MASTER_BUTTON_SELECTOR)) {
    changed = unregisterMasterButton(node) || changed;
  }

  if (typeof node.querySelectorAll === "function") {
    node.querySelectorAll(CONTROL_SELECTOR).forEach(function (el) {
      changed = unregisterControlElement(el) || changed;
    });

    node.querySelectorAll(MASTER_BUTTON_SELECTOR).forEach(function (btn) {
      changed = unregisterMasterButton(btn) || changed;
    });
  }

  return changed;
}

function primeControlCaches(options) {
  const config = options || {};
  const root =
    config.root && typeof config.root.querySelectorAll === "function"
      ? config.root
      : document;
  const force = Boolean(config.force);

  if (controlCachePrimed && !force) {
    return;
  }

  root.querySelectorAll(CONTROL_SELECTOR).forEach(function (el) {
    registerControlElement(el);
  });

  root.querySelectorAll(MASTER_BUTTON_SELECTOR).forEach(function (btn) {
    registerMasterButton(btn);
  });

  controlCachePrimed = true;
}

function pruneStaleEntries() {
  deviceControlCache.forEach(function (registry, deviceId) {
    registry.forEach(function (el) {
      if (!el.isConnected) {
        registry.delete(el);
      }
    });

    if (registry.size === 0) {
      deviceControlCache.delete(deviceId);
    }
  });

  masterButtonCache.forEach(function (btn) {
    if (!btn.isConnected) {
      masterButtonCache.delete(btn);
    }
  });
}

function scheduleControlSync(forceMasterUpdate) {
  if (forceMasterUpdate) {
    pendingControlSyncForce = true;
  }

  if (pendingControlSyncHandle !== null) {
    return;
  }

  var runSync = function () {
    pendingControlSyncHandle = null;
    var force = pendingControlSyncForce;
    pendingControlSyncForce = false;
    syncAllVisibleControls(force);
  };

  if (typeof window !== "undefined") {
    if (typeof window.requestIdleCallback === "function") {
      pendingControlSyncHandle = window.requestIdleCallback(runSync, {
        timeout: 120,
      });
      return;
    }

    if (typeof window.requestAnimationFrame === "function") {
      pendingControlSyncHandle = window.requestAnimationFrame(function () {
        runSync();
      });
      return;
    }
  }

  pendingControlSyncHandle = setTimeout(runSync, 32);
}

async function fetchDeviceState(deviceId) {
  try {
    const url = urlDeviceInfo(deviceId);
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`Hubitat state fetch failed: ${resp.status}`);
    const data = await resp.json();
    // Maker API returns attributes array; prefer currentValue, fallback to value
    const attr = Array.isArray(data.attributes)
      ? data.attributes.find((a) => a.name === "switch")
      : null;
    const state = attr?.currentValue || attr?.value || "off";
    return state;
  } catch (error) {
    console.error(`Error fetching state for device ${deviceId}:`, error);
    return "off"; // fallback
  }
}

async function refreshRoomControlFromHubitat(el) {
  return;
}

function initRoomPage() {
  debugLog(() => ["initRoomPage: start"]);

  const root = document.getElementById("spa-root") || document;
  primeControlCaches({ root: root, force: true });
  pruneStaleEntries();
  syncAllVisibleControls(true);

  // Rename label on Sinuca page: Iluminacao -> Bar (UI-only)
  try {
    const route = (window.location.hash || "").replace("#", "");
    if (route === "ambiente5") {
      document
        .querySelectorAll(".room-control-label")
        .forEach(function (label) {
          const text = (label.textContent || "").trim().toLowerCase();
          if (text.startsWith("ilumin")) {
            label.textContent = "Bar";
          }
        });
    }
  } catch (error) {
    debugLog(() => ["initRoomPage rename fallback", error]);
  }

  // Garantir atualizacao de botoes master apos o layout estabilizar
  const masterUpdate = function () {
    updateAllMasterButtons(true);
  };

  if (typeof window.requestIdleCallback === "function") {
    window.requestIdleCallback(masterUpdate, { timeout: 200 });
  } else {
    setTimeout(masterUpdate, 50);
  }
}

// === CONTROLADOR DE AR CONDICIONADO ===

// Função para inicializar o controle de AR quando a página de conforto for carregada
function initAirConditionerControl() {
  const root = document.querySelector('[data-component="ac-control"]');

  if (!root) {
    console.warn("Componente de controle de ar-condicionado n?o encontrado.");
    return;
  }

  const route = (window.location.hash || "").replace("#", "");
  const match = route.match(/^(ambiente\d+)/);
  const envKey = match ? match[1] : "";
  const acConfig =
    envKey && typeof getEnvironment === "function"
      ? getEnvironment(envKey)?.airConditioner || null
      : null;
  const mappedDeviceId =
    envKey && AC_DEVICE_IDS[envKey] ? String(AC_DEVICE_IDS[envKey]) : "";
  const baseDeviceId = acConfig?.deviceId
    ? String(acConfig.deviceId)
    : mappedDeviceId;
  const acBrandProfiles =
    (typeof CLIENT_CONFIG !== "undefined" &&
      CLIENT_CONFIG?.devices?.airConditionerBrands) ||
    {};
  const acBrandKey = String(acConfig?.brand || "").toLowerCase();
  const acBrandProfile =
    (acBrandKey && acBrandProfiles[acBrandKey]) ||
    acBrandProfiles.default ||
    {};
  const acCommands = {
    ...(acBrandProfile.commands || {}),
    ...(acConfig?.commands || {}),
  };
  const swingConfig = acBrandProfile?.attributes?.swing || {
    key: "swing",
    on: ["on", "moving", "swing", "true"],
    off: ["off", "parada", "stop", "stopped", "false"],
  };
  const tempKeys = Array.isArray(acBrandProfile?.attributes?.temperature)
    ? acBrandProfile.attributes.temperature
    : ["temperature", "coolingsetpoint", "thermostatsetpoint", "setpoint"];

  const tempSlider = root.querySelector('[data-role="temp-slider"]');
  const tempCurrent = root.querySelector('[data-role="temp-current"]');
  const tempDecreaseButtons = Array.from(
    root.querySelectorAll('[data-role="temp-decrease"]')
  );
  const tempIncreaseButtons = Array.from(
    root.querySelectorAll('[data-role="temp-increase"]')
  );
  const powerOnBtn = root.querySelector('[data-role="power-on"]');
  const powerOffBtn = root.querySelector('[data-role="power-off"]');
  const liveRegion = root.querySelector('[data-role="temperature-live"]');
  const aletaButtons = Array.from(root.querySelectorAll('[data-aleta-button]'));
  const zoneButtons = Array.from(root.querySelectorAll('[data-zone-button]'));

  if (!tempSlider || !tempCurrent || !powerOnBtn || !powerOffBtn) {
    console.warn("Elementos essenciais do AC n?o encontrados.");
    return;
  }

  const minTemp = Number.parseInt(root.dataset.tempMin || "18", 10);
  const maxTemp = Number.parseInt(root.dataset.tempMax || "25", 10);
  const defaultTemp = Number.parseInt(root.dataset.tempDefault || "22", 10);

  function clampTemperature(value) {
    const num = Number.isFinite(value) ? value : minTemp;
    return Math.min(Math.max(num, minTemp), maxTemp);
  }

  const state = {
    minTemp,
    maxTemp,
    temperature: clampTemperature(defaultTemp),
    powerOn: false,
    activeZoneIds: baseDeviceId ? [baseDeviceId] : [],
    swing: null,
  };

  function getFallbackDeviceId() {
    return baseDeviceId || root.dataset.deviceId || getACDeviceIdForCurrentRoute();
  }

  function parseZoneIds(button) {
    if (!button) return [];
    const raw = button.dataset.zoneIds || "";
    if (!raw) return [];
    return raw
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean);
  }

  function getActiveZoneIds() {
    if (baseDeviceId) return [baseDeviceId];
    if (state.activeZoneIds.length) return state.activeZoneIds;
    const fallback = getFallbackDeviceId();
    return fallback ? [String(fallback)] : [];
  }

  function getPrimaryDeviceId() {
    return getActiveZoneIds()[0] || "";
  }

  function buildTempCommand(temp) {
    if (typeof acCommands.tempTemplate === "string") {
      return acCommands.tempTemplate.replace("{temp}", String(temp));
    }
    if (typeof acCommands.tempPrefix === "string" && acCommands.tempPrefix) {
      return `${acCommands.tempPrefix}${temp}`;
    }
    return `temp${temp}`;
  }

  function normalizeSwingValue(value) {
    if (value === null || value === undefined) return null;
    const normalized = String(value).trim().toLowerCase();
    if (!normalized) return null;
    const onValues = Array.isArray(swingConfig.on) ? swingConfig.on : [swingConfig.on];
    const offValues = Array.isArray(swingConfig.off) ? swingConfig.off : [swingConfig.off];
    if (onValues.map((v) => String(v).toLowerCase()).includes(normalized)) {
      return "moving";
    }
    if (offValues.map((v) => String(v).toLowerCase()).includes(normalized)) {
      return "parada";
    }
    if (normalized === "on") return "moving";
    if (normalized === "off") return "parada";
    return null;
  }

  function setAletaButtonsActive(aleta) {
    if (!aleta) return;
    aletaButtons.forEach((btn) => {
      const isActive = btn.dataset.aleta === aleta;
      btn.setAttribute("aria-pressed", isActive.toString());
    });
  }

  function setZoneSelection(button) {
    const ids = parseZoneIds(button);
    state.activeZoneIds = baseDeviceId
      ? [baseDeviceId]
      : ids.length
      ? ids
      : getActiveZoneIds();
    zoneButtons.forEach((btn) => {
      btn.setAttribute("aria-pressed", (btn === button).toString());
    });
    AC_DEVICE_ID = getPrimaryDeviceId();
  }

  function updateSliderVisual(temp) {
    const range = state.maxTemp - state.minTemp;
    const percent = range > 0 ? ((temp - state.minTemp) / range) * 100 : 0;
    tempSlider.style.setProperty("--ac-temp-progress", `${percent}%`);
  }

  function updateTemperatureDisplay(temp) {
    tempCurrent.textContent = String(temp);
    tempSlider.value = String(temp);
    updateSliderVisual(temp);

    if (liveRegion) {
      liveRegion.textContent = `Temperatura ajustada para ${temp}.`;
    }
  }

  function setControlsEnabled(enabled) {
    tempSlider.toggleAttribute("disabled", !enabled);
    tempDecreaseButtons.forEach((btn) => btn.toggleAttribute("disabled", !enabled));
    tempIncreaseButtons.forEach((btn) => btn.toggleAttribute("disabled", !enabled));
    aletaButtons.forEach((btn) => btn.toggleAttribute("disabled", !enabled));
  }

  let temperatureDebounceTimer = null;

  function sendTemperatureCommand(temp) {
    const ids = getActiveZoneIds();
    if (!ids.length) return;
    const command = buildTempCommand(temp);
    if (!command) return;
    ids.forEach((id) => sendHubitatCommand(id, command));
  }

  function updateTemperature(value, options = {}) {
    const temp = clampTemperature(value);
    state.temperature = temp;
    updateTemperatureDisplay(temp);

    if (!state.powerOn || options.silent) {
      return;
    }

    if (temperatureDebounceTimer) {
      clearTimeout(temperatureDebounceTimer);
    }

    temperatureDebounceTimer = setTimeout(() => {
      sendTemperatureCommand(temp);
      temperatureDebounceTimer = null;
    }, 900);
  }

  function setPowerState(isOn, options = {}) {
    state.powerOn = isOn;
    root.toggleAttribute("data-power-off", !isOn);
    powerOnBtn.setAttribute("aria-pressed", isOn.toString());
    powerOffBtn.setAttribute("aria-pressed", (!isOn).toString());
    setControlsEnabled(isOn);

    if (temperatureDebounceTimer) {
      clearTimeout(temperatureDebounceTimer);
      temperatureDebounceTimer = null;
    }

    if (!options.silent) {
      const ids = getActiveZoneIds();
      const command = isOn
        ? acCommands.powerOn || "on"
        : acCommands.powerOff || "off";
      if (command) {
        ids.forEach((id) => sendHubitatCommand(id, command));
      }
    }
  }

  function setAletaState(aleta) {
    if (!state.powerOn) return;
    if (aleta === "windfree") {
      const command = acCommands.windfree;
      if (!command) return;
      setAletaButtonsActive(aleta);
      getActiveZoneIds().forEach((id) => sendHubitatCommand(id, command));
      return;
    }

    const desired =
      aleta === "moving" ? "moving" : aleta === "parada" ? "parada" : null;
    if (!desired) return;

    if (acCommands.swingToggle) {
      if (state.swing && state.swing === desired) return;
      setAletaButtonsActive(desired);
      state.swing = desired;
      getActiveZoneIds().forEach((id) =>
        sendHubitatCommand(id, acCommands.swingToggle)
      );
      return;
    }

    const command =
      desired === "moving"
        ? acCommands.swingOn || "swingOn"
        : acCommands.swingOff || "swingOff";
    if (!command) return;
    setAletaButtonsActive(desired);
    state.swing = desired;
    getActiveZoneIds().forEach((id) => sendHubitatCommand(id, command));
  }

  zoneButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      setZoneSelection(btn);
      applyACFromPolling({ needPower: true, needTemp: true, needSwing: true });
    });
  });

  powerOnBtn.addEventListener("click", () => setPowerState(true));
  powerOffBtn.addEventListener("click", () => setPowerState(false));

  tempSlider.addEventListener("input", () => {
    updateTemperature(Number.parseInt(tempSlider.value, 10));
  });

  tempDecreaseButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      updateTemperature(state.temperature - 1);
    });
  });

  tempIncreaseButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      updateTemperature(state.temperature + 1);
    });
  });

  aletaButtons.forEach((btn) => {
    btn.addEventListener("click", () => setAletaState(btn.dataset.aleta));
  });

  if (zoneButtons.length) {
    const defaultButton =
      zoneButtons.find((btn) => btn.dataset.zoneDefault === "true") ||
      zoneButtons[0];
    if (defaultButton) {
      setZoneSelection(defaultButton);
    }
  } else {
    const fallback = getFallbackDeviceId();
    state.activeZoneIds = fallback ? [String(fallback)] : [];
    AC_DEVICE_ID = getPrimaryDeviceId();
  }

  updateTemperature(state.temperature, { silent: true });
  setPowerState(false, { silent: true });
  applyACFromPolling({ needPower: true, needTemp: true, needSwing: true });

  async function applyACFromPolling({
    needPower = true,
    needTemp = true,
    needSwing = true,
  } = {}) {
    try {
      const deviceId = getPrimaryDeviceId();
      if (!deviceId) return;
      const url = `/polling?devices=${encodeURIComponent(deviceId)}`;
      const resp = await fetch(url, { cache: "no-store" });
      if (!resp.ok) return;
      const payload = await resp.json();
      const list = Array.isArray(payload?.data) ? payload.data : [];
      const device = list.find((d) => String(d?.id) === String(deviceId));
      if (!device) return;

      let attrsMap = {};
      if (Array.isArray(device.attributes)) {
        device.attributes.forEach((attr) => {
          if (!attr || !attr.name) return;
          attrsMap[String(attr.name).toLowerCase()] =
            attr.currentValue ?? attr.value;
        });
      } else if (device.attributes && typeof device.attributes === "object") {
        Object.keys(device.attributes).forEach((key) => {
          attrsMap[String(key).toLowerCase()] = device.attributes[key];
        });
      }

      if (needPower) {
        const sw = String(attrsMap["switch"] ?? "").toLowerCase();
        if (sw) {
          setPowerState(sw === "on", { silent: true });
        }
      }

      if (needTemp) {
        let temp;
        for (const key of tempKeys) {
          if (key && attrsMap[key.toLowerCase()] !== undefined) {
            temp = attrsMap[key.toLowerCase()];
            break;
          }
        }
        if (typeof temp === "string") {
          const match = temp.match(/(-?\d{1,2})/);
          if (match) temp = Number.parseInt(match[1], 10);
        }
        if (typeof temp === "number" && !Number.isNaN(temp)) {
          updateTemperature(Math.round(temp), { silent: true });
        }
      }

      if (needSwing) {
        const swingKey = String(swingConfig.key || "swing").toLowerCase();
        const swingValue = attrsMap[swingKey];
        const swingMode = normalizeSwingValue(swingValue);
        if (swingMode) {
          state.swing = swingMode;
          setAletaButtonsActive(swingMode);
        }
      }
    } catch (error) {
      console.warn("Falha no polling do AC:", error);
    }
  }

  (async function syncFromWebhook() {
    try {
      const resp = await fetch("/webhook/eletr1z33333d4sh/status", {
        cache: "no-store",
      });
      if (!resp.ok) return;
      const data = await resp.json();
      const evt = data && data.lastACStatus;
      if (!evt) {
        return applyACFromPolling({ needPower: true, needTemp: true, needSwing: true });
      }

      const activeIds = getActiveZoneIds().map(String);
      if (evt.deviceId && !activeIds.includes(String(evt.deviceId))) {
        return applyACFromPolling({ needPower: true, needTemp: true, needSwing: true });
      }

      const name = (evt.name || "").toLowerCase();
      const rawVal = evt.value;
      const val =
        rawVal !== undefined && rawVal !== null ? String(rawVal).toLowerCase() : "";

      let desiredPower = null;
      let desiredTemp = null;
      let desiredSwing = null;

      if (name === "switch" || name === "power" || name === "ac" || name === "acpower") {
        desiredPower = val === "on" || val === "true" || val === "1";
      }

      if (name.includes("temp") || name.includes("setpoint")) {
        const match = val.match(/(-?\d{1,2})/);
        if (match) {
          const parsed = Number.parseInt(match[1], 10);
          if (!Number.isNaN(parsed)) desiredTemp = parsed;
        } else if (typeof rawVal === "number") {
          desiredTemp = Math.round(rawVal);
        }
      }

      if (name.includes("swing")) {
        desiredSwing = normalizeSwingValue(val);
      }

      if (typeof desiredTemp === "number") {
        updateTemperature(desiredTemp, { silent: true });
      }

      if (desiredPower !== null) {
        setPowerState(!!desiredPower, { silent: true });
      }

      if (desiredSwing) {
        state.swing = desiredSwing;
        setAletaButtonsActive(desiredSwing);
      }

      const needPower = desiredPower === null;
      const needTemp = !(typeof desiredTemp === "number");
      const needSwing = desiredSwing === null;
      if (needPower || needTemp || needSwing) {
        await applyACFromPolling({ needPower, needTemp, needSwing });
      }
    } catch (error) {
      console.warn("Falha ao sincronizar AC via webhook:", error);
    }
  })();

  setTimeout(() => {
    applyACFromPolling({ needPower: true, needTemp: true, needSwing: true });
  }, 1200);
}

// === FIM DO CONTROLADOR DE AR CONDICIONADO ===

// Normalize mis-encoded Portuguese accents across the UI
window.normalizeAccents = function normalizeAccents(root) {
  try {
    const map = new Map([
      ["EscritÃ¯Â¿Â½Ã¯Â¿Â½rio", "EscritÃƒÂ³rio"],
      ["ProgramaÃ¯Â¿Â½Ã¯Â¿Â½Ã‡Å“o", "ProgramaÃƒÂ§ÃƒÂ£o"],
      ["RecepÃ¯Â¿Â½Ã¯Â¿Â½Ã‡Å“o", "RecepÃƒÂ§ÃƒÂ£o"],
      ["RefeitÃ¯Â¿Â½Ã¯Â¿Â½rio", "RefeitÃƒÂ³rio"],
      ["FuncionÃ‡Â­rios", "FuncionÃƒÂ¡rios"],
      ["IluminaÃ¯Â¿Â½Ã¯Â¿Â½o", "IluminaÃƒÂ§ÃƒÂ£o"],
      ["IluminaÃ¯Â¿Â½Ã¯Â¿Â½Ã‡Å“o", "IluminaÃƒÂ§ÃƒÂ£o"],
      ["PainÃ‡Â¸is", "Painéis"],
      ["ArmÃ‡Â­rio", "ArmÃƒÂ¡rio"],
      ["AmbientÃ‡Å“o", "Ambiente"],
    ]);
    const selector = ".page-title, .room-control-label, .room-card span";
    const scope = root || document;
    scope.querySelectorAll(selector).forEach((el) => {
      const before = el.textContent || "";
      let after = before;
      map.forEach((val, key) => {
        if (after.includes(key)) after = after.replaceAll(key, val);
      });
      if (after !== before) el.textContent = after;
    });
  } catch (_) {}
};

// --- FunÃƒÂ§ÃƒÂµes para a página do EscritÃƒÂ³rio ---

function toggleDevice(el, deviceType) {
  const img = el.querySelector(".control-icon");
  const stateEl = el.querySelector(".control-state");
  const currentState = el.dataset.state;
  let newState;
  let newLabel;

  const icons = {
    light: {
      on: "images/icons/icon-small-light-on.svg",
      off: "images/icons/icon-small-light-off.svg",
    },
    tv: {
      on: "images/icons/icon-small-tv-on.svg",
      off: "images/icons/icon-small-tv-off.svg",
    },
    shader: {
      on: "images/icons/icon-small-shader-on.svg",
      off: "images/icons/icon-small-shader-off.svg",
    },
  };

  if (!icons[deviceType]) return;

  let deviceId = el.dataset.deviceId || null;
  // Fallback por label para compatibilidade
  if (!deviceId) {
    const controlLabel = el
      .querySelector(".control-label")
      ?.textContent?.trim();
    if (controlLabel === "Pendente") {
      deviceId = "102";
    } else if (controlLabel === "Trilho") {
      deviceId = "101";
    }
  }

  if (currentState === "off" || currentState === "closed") {
    newState = "on";
    newLabel = deviceType === "shader" ? "Abertas" : "ON";
    img.src = icons[deviceType].on;
    if (deviceId) sendHubitatCommand(deviceId, "on");
  } else {
    newState = deviceType === "shader" ? "closed" : "off";
    newLabel = deviceType === "shader" ? "Fechadas" : "OFF";
    img.src = icons[deviceType].off;
    if (deviceId) sendHubitatCommand(deviceId, "off");
  }

  el.dataset.state = newState;
  if (stateEl) stateEl.textContent = newLabel;
}

// (removido) setupThermostat: não utilizado apÃƒÂ³s retirada da página "escritorio"

// --- Controle do Hubitat ---

async function brutalCacheClear() {
  const confirmationMessage =
    "Deseja realmente limpar todo o cache do aplicativo? Isso ira recarregar a pagina.";

  if (!window.confirm(confirmationMessage)) {
    console.log("Limpeza manual de cache cancelada pelo usuario.");
    return;
  }

  console.log("Iniciando limpeza manual de cache.");

  if (typeof showMobileDebug === "function") {
    showMobileDebug("Limpando cache...", "info");
  }

  const criticalKeys = ["hubitat_host", "hubitat_token"];
  const backup = {};

  try {
    criticalKeys.forEach((key) => {
      const value = localStorage.getItem(key);
      if (value !== null) {
        backup[key] = value;
      }
    });

    localStorage.clear();

    Object.keys(backup).forEach((key) => {
      localStorage.setItem(key, backup[key]);
    });
  } catch (error) {
    console.warn("Erro ao limpar localStorage:", error);
  }

  try {
    sessionStorage.clear();
  } catch (error) {
    console.warn("Erro ao limpar sessionStorage:", error);
  }

  if ("caches" in window) {
    try {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map((name) => caches.delete(name)));
    } catch (error) {
      console.warn("Erro ao limpar caches do navegador:", error);
    }
  }

  if (navigator.serviceWorker && navigator.serviceWorker.getRegistrations) {
    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(
        registrations.map((registration) => registration.unregister())
      );
    } catch (error) {
      console.warn("Erro ao remover service workers:", error);
    }
  }

  try {
    const timestamp = Date.now();
    const cacheBuster =
      timestamp.toString() + "_" + Math.random().toString(36).substring(2, 10);

    localStorage.setItem("last_cache_clear", timestamp.toString());
    localStorage.setItem("app_cache_version", cacheBuster);
  } catch (error) {
    console.warn("Erro ao atualizar metadados de cache:", error);
  }

  if (typeof showMobileDebug === "function") {
    showMobileDebug("Cache limpo. Recarregando...", "success");
  }

  setTimeout(() => {
    window.location.reload();
  }, 400);
}

window.brutalCacheClear = brutalCacheClear;
const isProductionOriginal = !["localhost", "127.0.0.1", "::1"].includes(
  location.hostname
);
// TEMPORÃƒÂRIO: ForÃƒÂ§ar produÃƒÂ§ÃƒÂ£o para debug mobile
const isProduction = true;
console.log("Ã°Å¸â€Â DEBUG PRODUÇÃO’O (FORÇADO):", {
  hostname: location.hostname,
  isProductionOriginal: isProductionOriginal,
  isProduction: isProduction,
  isMobile:
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    ),
});

// Detectar dispositivos mÃƒÂ³veis
const isMobile =
  /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

// SOLUÃƒâ€¡ÃƒÆ’O: Desabilitar console.log em mobile para evitar travamentos
const ENABLE_DEBUG_LOGS = true; // Logs habilitados em desktop e mobile

// Sistema de detecção de cache desatualizado para mobile (TEMPORARIAMENTE DESABILITADO)
const APP_VERSION = "1.0.0"; // Ã°Å¸Å½â€° MARCO v1.0 - SISTEMA TOTALMENTE FUNCIONAL
(function () {
  if (false && isMobile) {
    // DESABILITADO para debug
    try {
      var lastVersion = localStorage.getItem("app_version");
      var lastLoad = localStorage.getItem("last_mobile_load");
      var now = new Date().getTime();

      // SÃƒÂ³ recarregar se versão realmente mudou (não por tempo)
      if (lastVersion && lastVersion !== APP_VERSION) {
        console.log(
          "Ã°Å¸â€œÂ± Nova versão detectada - forÃƒÂ§ando reload cache"
        );
        console.log(
          "Ã°Å¸â€œÂ± Versão anterior:",
          lastVersion,
          "Nova:",
          APP_VERSION
        );

        // Marcar que jÃƒÂ¡ foi recarregado para esta versão
        localStorage.setItem("app_version", APP_VERSION);
        localStorage.setItem("last_mobile_load", now.toString());
        localStorage.setItem("reload_done_" + APP_VERSION, "true");

        // Limpar caches exceto os marcadores de versão
        var itemsToKeep = [
          "app_version",
          "last_mobile_load",
          "reload_done_" + APP_VERSION,
        ];
        var keysToRemove = [];
        for (var i = 0; i < localStorage.length; i++) {
          var key = localStorage.key(i);
          if (
            key &&
            !itemsToKeep.includes(key) &&
            !key.startsWith("reload_done_")
          ) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach((key) => localStorage.removeItem(key));

        // ForÃƒÂ§ar reload apenas se não foi feito ainda para esta versão
        if (!localStorage.getItem("reload_done_" + APP_VERSION)) {
          setTimeout(function () {
            console.log(
              "Ã°Å¸â€œÂ± Recarregando página para nova versão..."
            );
            window.location.reload(true);
          }, 2000);
          return; // não continuar inicialização
        }
      } else {
        // Primeira vez ou mesma versão - continuar normalmente
        localStorage.setItem("app_version", APP_VERSION);
        localStorage.setItem("last_mobile_load", now.toString());
        console.log("Ã°Å¸â€œÂ± Mobile cache OK - versão", APP_VERSION);
      }
    } catch (e) {
      console.warn(
        "Ã°Å¸â€œÂ± Erro na verificaÃƒÂ§ÃƒÂ£o de versão mobile:",
        e
      );
    }
  }
})();

// Função de log segura para mobile
function safeLog() {
  if (ENABLE_DEBUG_LOGS && typeof console !== "undefined" && console.log) {
    try {
      console.log.apply(console, arguments);
    } catch (e) {
      // Silenciar se console falhar
    }
  }
}

// Sistema de debug visual para mobile (DESABILITADO - compatibilidade resolvida)
function showMobileDebug(message, type) {
  // Debug desabilitado - funcionalidade mobile estável
  return;
}

// Substituir console.log globalmente para mobile
if (!ENABLE_DEBUG_LOGS) {
  // Criar console mock silencioso para mobile
  window.console = window.console || {};
  window.console.log = function () {};
  window.console.error = function () {};
  window.console.warn = function () {};
}

// Debug mÃƒÂ­nimo apenas se necessÃƒÂ¡rio
if (ENABLE_DEBUG_LOGS) {
  safeLog("=== DASHBOARD ELETRIZE DEBUG ===");
  safeLog("Ã°Å¸â€Â isProduction:", isProduction, "isMobile:", isMobile);
}

safeLog("=== AMBIENTE DETECTADO ===", {
  isProduction,
  isMobile,
  isIOS,
  userAgent: navigator.userAgent.substring(0, 60) + "...",
});
const HUBITAT_PROXY_URL = "/hubitat-proxy";
const POLLING_URL = "/polling";
window.musicPlayerUI = window.musicPlayerUI || {};

function normalizeMakerApiDeviceIds(ids, fallback = "*") {
  const source = ids !== undefined ? ids : fallback;
  if (source === "*" || source === "all" || source === true) return null; // null = todos
  if (Array.isArray(source)) {
    const normalized = source.filter(Boolean).map((v) => String(v));
    return normalized.length > 0 ? new Set(normalized) : null;
  }
  if (source === undefined || source === null) return null;
  return new Set([String(source)]);
}

// Hubitat Cloud (Maker API) configuration via config.js (com fallback seguro)
const CLIENT_MAKER_API_CLOUD =
  (typeof window !== "undefined" && window.CLIENT_CONFIG?.makerApi?.cloud) || {};
const DEFAULT_MAKER_API_CLOUD = {
  enabled: true,
  appBaseUrl:
    "https://cloud.hubitat.com/api/df90ffba-2205-41f8-8f62-ec4c430ae94f/apps/144",
  accessToken: "94f13f9f-2842-48ea-a860-02eda566a02a",
  deviceIds: "*",
};

const HUBITAT_CLOUD_ENABLED =
  CLIENT_MAKER_API_CLOUD.enabled ?? DEFAULT_MAKER_API_CLOUD.enabled;
const HUBITAT_CLOUD_APP_BASE_URL =
  CLIENT_MAKER_API_CLOUD.appBaseUrl || DEFAULT_MAKER_API_CLOUD.appBaseUrl;
const HUBITAT_CLOUD_ACCESS_TOKEN =
  CLIENT_MAKER_API_CLOUD.accessToken || DEFAULT_MAKER_API_CLOUD.accessToken;
const HUBITAT_CLOUD_DEVICES_BASE_URL = HUBITAT_CLOUD_APP_BASE_URL
  ? `${HUBITAT_CLOUD_APP_BASE_URL}/devices`
  : "";
const HUBITAT_CLOUD_DEVICE_IDS = normalizeMakerApiDeviceIds(
  CLIENT_MAKER_API_CLOUD.deviceIds,
  DEFAULT_MAKER_API_CLOUD.deviceIds
);

function useHubitatCloud(deviceId) {
  if (!HUBITAT_CLOUD_ENABLED) return false;
  if (!HUBITAT_CLOUD_APP_BASE_URL || !HUBITAT_CLOUD_ACCESS_TOKEN) return false;
  if (deviceId === undefined || deviceId === null) return false;
  if (HUBITAT_CLOUD_DEVICE_IDS === null) return true; // null = todos os dispositivos
  return HUBITAT_CLOUD_DEVICE_IDS.has(String(deviceId));
}

const TEXT_MOJIBAKE_REGEX = /[\u00C3\u00C2\u00E2\uFFFD]/;
const TEXT_MOJIBAKE_REPLACEMENTS = [
  ["\u00e2\u0080\u0099", "Ã¢â‚¬â„¢"],
  ["\u00e2\u0080\u0098", "Ã¢â‚¬Ëœ"],
  ["\u00e2\u0080\u009c", "Ã¢â‚¬Å“"],
  ["\u00e2\u0080\u009d", "Ã¢â‚¬Â"],
  ["\u00e2\u0080\u0093", "Ã¢â‚¬â€œ"],
  ["\u00e2\u0080\u0094", "Ã¢â‚¬â€"],
  ["\u00e2\u0080\u00a6", "Ã¢â‚¬Â¦"],
  ["\u00e2\u0080\u00a2", "Ã¢â‚¬Â¢"],
  ["\u00c2\u00ba", "Ã‚Âº"],
  ["\u00c2\u00aa", "Ã‚Âª"],
  ["\u00c2\u00b0", "Ã‚Â°"],
  ["\u00c2\u00a9", "Ã‚Â©"],
  ["\u00c2\u00ae", "Ã‚Â®"],
];
const UTF8_DECODER =
  typeof TextDecoder !== "undefined"
    ? new TextDecoder("utf-8", { fatal: false })
    : null;

function hasMojibake(str) {
  return TEXT_MOJIBAKE_REGEX.test(str);
}

function decodeLatin1ToUtf8(str) {
  if (!UTF8_DECODER) return null;

  const bytes = new Uint8Array(str.length);

  for (let i = 0; i < str.length; i += 1) {
    const code = str.charCodeAt(i);
    if (code > 255) {
      return null;
    }
    bytes[i] = code;
  }

  try {
    return UTF8_DECODER.decode(bytes);
  } catch (_error) {
    return null;
  }
}

function normalizePortugueseText(value) {
  if (value === null || value === undefined) return value;

  let text = String(value);
  if (!text.trim()) return text.trim();

  const original = text;
  text = text.trim();

  if (hasMojibake(text)) {
    const decoded = decodeLatin1ToUtf8(text);
    if (decoded && decoded.trim()) {
      text = decoded.trim();
    }
  }

  text = text
    .replace(/\u00C2\u00A0/g, " ")
    .replace(/\u00C2(?=[^\w\s])/g, "")
    .replace(/\u00C2\s/g, " ")
    .replace(/\uFFFD/g, "")
    .replace(/\s{2,}/g, " ")
    .replace(/\s+([!?.,;:])/g, "$1")
    .replace(/([(\[{])\s+/g, "$1")
    .replace(/\s+([\)\]}])/g, "$1");

  TEXT_MOJIBAKE_REPLACEMENTS.forEach(([wrong, right]) => {
    if (text.includes(wrong)) {
      text = text.split(wrong).join(right);
    }
  });

  return text || original.trim();
}

function interpretPlaybackStatus(value) {
  if (value === null || value === undefined) return null;
  const normalized = String(value).toLowerCase();

  if (
    normalized === "playing" ||
    normalized === "play" ||
    normalized === "buffering" ||
    normalized === "resume" ||
    normalized === "run" ||
    normalized === "start" ||
    normalized === "on"
  ) {
    return true;
  }

  if (
    normalized === "paused" ||
    normalized === "pause" ||
    normalized === "stopped" ||
    normalized === "stop" ||
    normalized === "idle" ||
    normalized === "standby" ||
    normalized === "off"
  ) {
    return false;
  }

  return null;
}

if (typeof window.musicPlayerUI.currentPlaying !== "boolean") {
  window.musicPlayerUI.currentPlaying = false;
}
// (Removido: HUBITAT_DIRECT_URL / HUBITAT_ACCESS_TOKEN do frontend por seguranÃƒÂ§a)

// Função para mostrar erro ao usuÃƒÂ¡rio
function showErrorMessage(message) {
  // Criar modal de erro
  const errorModal = document.createElement("div");
  errorModal.className = "error-modal";
  errorModal.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        padding: 24px;
        max-width: 90vw;
        min-width: 320px;
        z-index: 10000;
        text-align: center;
    `;

  errorModal.innerHTML = `
        <h3 style="margin-bottom: 12px; font-size: 1.4rem;">⚠️Erro de Conexão</h3>
        <p style="margin-bottom: 20px; line-height: 1.5;">${message}</p>
        <button onclick="this.parentElement.remove()" style="
            background: linear-gradient(135deg, #e74c3c, #c0392b);
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 12px;
            cursor: pointer;
            font-weight: 600;
            transition: transform 0.2s ease, box-shadow 0.2s ease;
        " onmouseover="this.style.transform='scale(1.05)'; this.style.boxShadow='0 6px 20px rgba(231, 76, 60, 0.4)'" 
           onmouseout="this.style.transform='scale(1)'; this.style.boxShadow='none'">Fechar</button>
    `;

  document.body.appendChild(errorModal);

  // Remover automaticamente apÃƒÂ³s 10 segundos
  setTimeout(() => {
    if (errorModal.parentElement) {
      errorModal.remove();
    }
  }, 10000);
}

// Fallback direto via Maker API (cloud). Usa appBaseUrl/accessToken do config.js
async function loadAllDeviceStatesDirect(deviceIds) {
  // Agora usa o proxy /polling em vez de chamar o Hubitat diretamente
  let idsArray = deviceIds;
  if (!Array.isArray(idsArray)) {
    idsArray =
      typeof idsArray === "string"
        ? idsArray.split(",").map((id) => id.trim())
        : [];
  }

  // Monta a URL do proxy com a lista de IDs
  const idsParam = idsArray.length > 0 ? idsArray.join(",") : "";
  const url = `${POLLING_URL}?devices=${encodeURIComponent(idsParam)}`;
  console.log("📡 [fallback-proxy] Fetching via proxy:", url);

  const response = await fetch(url, { method: "GET", mode: "cors" });
  const text = await response.text();

  if (!response.ok) {
    throw new Error(`Polling proxy falhou: HTTP ${response.status} ${response.statusText}`);
  }

  let data;
  try {
    data = JSON.parse(text);
  } catch (err) {
    console.error("⚠️ [fallback-proxy] Resposta não é JSON:", text.slice(0, 300));
    throw err;
  }

  // O proxy já retorna no formato { success, devices }
  return data;
}

// Função para testar Configurações do Hubitat
async function testHubitatConnection() {
  console.log("Ã°Å¸â€Â§ Testando Conexão com Hubitat...");

  try {
    // Testar com um dispositivo conhecido (231)
    const response = await fetch(`${POLLING_URL}?devices=231`);
    console.log("Ã°Å¸â€Â§ Status da resposta:", response.status);
    console.log(
      "Ã°Å¸â€Â§ Headers da resposta:",
      Object.fromEntries(response.headers.entries())
    );

    const responseText = await response.text();
    console.log(
      "Ã°Å¸â€Â§ ConteÃƒÂºdo da resposta:",
      responseText.substring(0, 300)
    );

    if (response.ok) {
      try {
        const data = JSON.parse(responseText);
        console.log("Ã¢Å“â€¦ Conexão OK - Dados:", data);
        return true;
      } catch (e) {
        console.error("⚠️Resposta não é JSON vÃƒÂ¡lido:", e);
        return false;
      }
    } else {
      console.error("⚠️Erro HTTP:", response.status, response.statusText);
      return false;
    }
  } catch (error) {
    console.error("⚠️Erro na Conexão:", error);
    return false;
  }
}

// Helpers de URL para endpoints comuns da API
function urlDeviceInfo(deviceId) {
  return `${HUBITAT_PROXY_URL}?device=${deviceId}`;
}

function urlSendCommand(deviceId, command, value) {
  // SEMPRE usar o proxy para evitar CORS e 404
  return `${HUBITAT_PROXY_URL}?device=${deviceId}&command=${encodeURIComponent(
    command
  )}${value !== undefined ? `&value=${encodeURIComponent(value)}` : ""}`;
}

async function sendHubitatCommand(deviceId, command, value) {
  return enqueueDeviceCommand(deviceId, async () => {
    console.log(
      `📡 [sendHubitatCommand] Enviando comando: ${command} para dispositivo ${deviceId}${
        value !== undefined ? ` com valor ${value}` : ""
      }`
    );

    try {
      // Segurança: comandos diretos no frontend continuam desativados.
      if (!isProduction && !useHubitatCloud(deviceId)) {
        throw new Error("Envio direto desativado no modo desenvolvimento");
      }

      const requestUrl = urlSendCommand(deviceId, command, value);
      console.log(`📡 [sendHubitatCommand] URL: ${requestUrl}`);

      const { response, text } = await fetchTextWithRetry(
        requestUrl,
        { method: "GET", mode: "cors" },
        {
          maxRetries: NETWORK_CONFIG.MAX_RETRY_ATTEMPTS,
          timeoutMs: NETWORK_CONFIG.FETCH_TIMEOUT_PER_ATTEMPT,
        }
      );

      console.log(
        `📡 [sendHubitatCommand] Resposta (status ${response.status}):`,
        String(text).substring(0, 200)
      );

      // Tenta parse JSON, mas aceita resposta vazia
      try {
        return JSON.parse(text);
      } catch {
        return null;
      }
    } catch (error) {
      console.error("📡 [sendHubitatCommand] Erro ao enviar comando:", error);
      throw error;
    }
  });
}

// --- Cortinas (abrir/parar/fechar) ---
function sendCurtainCommand(deviceId, action, commandName) {
  // Sempre usa comandos padrão do Maker API (open/stop/close)
  const commandMap = {
    open: "open",
    stop: "stop",
    close: "close",
  };
  const commandToSend = commandMap[action];
  if (!commandToSend) throw new Error("Ação de cortina inválida");
  return sendHubitatCommand(deviceId, commandToSend);
}

function curtainAction(el, action) {
  try {
    const id =
      el?.dataset?.deviceId ||
      el.closest("[data-device-id]")?.dataset?.deviceId;
    
    console.log(`🪟 curtainAction chamada: action=${action}, id=${id}, el=`, el);
    
    if (!id) {
      console.error("🪟 ERRO: ID do dispositivo não encontrado!");
      return;
    }
    
    // Suporte a comandos diretos push1, push2, push3, push4
    if (action.startsWith('push')) {
      console.log(`🪟 Cortina (ID ${id}): enviando comando direto ${action}`);
      return sendHubitatCommand(id, action)
        .then(result => {
          console.log(`🪟 Comando ${action} enviado com sucesso para ID ${id}:`, result);
        })
        .catch(err => {
          console.error(`🪟 ERRO ao enviar comando ${action} para ID ${id}:`, err);
        });
    }
    
    const cmd = el?.dataset?.cmd || "push";
    sendCurtainCommand(id, action, cmd);
  } catch (e) {
    console.error("Falha ao acionar cortina:", e);
  }
}

// Master on/off (Home quick toggle) removido completamente

// --- Override para contornar CORS no browser ao chamar Hubitat ---
// Envia comandos em modo no-cors (resposta opaca) e, em falha, faz um GET via Image.
try {
  if (typeof sendHubitatCommand === "function") {
    const _corsBypassSend = function (deviceId, command, value) {
      const baseUrl = urlSendCommand(deviceId, command, value);
      // Adiciona cache-buster para evitar SW/cache do navegador
      const url =
        baseUrl + (baseUrl.includes("?") ? "&" : "?") + `_ts=${Date.now()}`;
      console.log(`Enviando comando para o Hubitat (no-cors): ${url}`);
      try {
        return fetch(url, {
          mode: "no-cors",
          cache: "no-store",
          credentials: "omit",
          redirect: "follow",
          referrerPolicy: "no-referrer",
          keepalive: true,
        })
          .then(() => null)
          .catch((err) => {
            try {
              const beacon = new Image();
              beacon.referrerPolicy = "no-referrer";
              beacon.src = url;
            } catch (_) {
              /* ignore */
            }
            console.error("Erro ao enviar comando (CORS?):", err);
            return null;
          });
      } catch (e) {
        try {
          const beacon = new Image();
          beacon.referrerPolicy = "no-referrer";
          beacon.src = url;
        } catch (_) {
          /* ignore */
        }
        return Promise.resolve(null);
      }
    };
    // Sobrescreve Função original
    // eslint-disable-next-line no-global-assign
    sendHubitatCommand = _corsBypassSend;
  }
} catch (_) {
  /* ignore */
}

// --- Polling automÃƒÂ¡tico de estados ---

const POLLING_INTERVAL_BASE_MS = 5000;
const POLLING_INTERVAL_STEP_MS = 2000;
const POLLING_INTERVAL_MAX_MS = 20000;
let currentPollingInterval = POLLING_INTERVAL_BASE_MS;
let pollingTimerHandle = null;
let pollingActive = false;
let pollingFailureCount = 0;
let pollingPausedForVisibility = false;

// Sistema para evitar conflitos entre comandos manuais e polling
const recentCommands = new Map(); // deviceId -> timestamp do ÃƒÂºltimo comando
const COMMAND_PROTECTION_MS = 8000; // 8 segundos de proteÃƒÂ§ÃƒÂ£o apÃƒÂ³s comando manual

// Sistema de loading para botÃƒÂµes master
function setMasterButtonLoading(button, isLoading) {
  console.log(
    "Ã°Å¸â€â€ž setMasterButtonLoading chamada:",
    button,
    "loading:",
    isLoading
  );

  if (isLoading) {
    button.classList.add("loading");
    button.dataset.loading = "true";
    console.log("Ã¢Å“â€¦ Loading ativado - classes:", button.className);
  } else {
    button.classList.remove("loading");
    button.dataset.loading = "false";
    console.log("⚠️Loading desativado - classes:", button.className);
  }
}

function cleanupExpiredCommands() {
  const now = Date.now();
  for (const [deviceId, timestamp] of recentCommands.entries()) {
    if (now - timestamp > COMMAND_PROTECTION_MS) {
      recentCommands.delete(deviceId);
    }
  }
}

function scheduleNextPollingRun(delay) {
  if (!pollingActive) return;

  const safeDelay = Math.max(delay, 500);

  if (pollingTimerHandle !== null) {
    clearTimeout(pollingTimerHandle);
  }

  pollingTimerHandle = setTimeout(function () {
    pollingTimerHandle = null;
    updateDeviceStatesFromServer();
  }, safeDelay);

  debugLog(() => ["scheduleNextPollingRun", safeDelay]);
}

function startPolling() {
  if (pollingActive) return;

  if (!isProduction) {
    debugLog(() => ["Polling desativado em ambiente de desenvolvimento"]);
    return;
  }

  pollingActive = true;
  pollingFailureCount = 0;
  currentPollingInterval = POLLING_INTERVAL_BASE_MS;

  updateDeviceStatesFromServer();

  console.log(
    "Polling iniciado - intervalo base",
    POLLING_INTERVAL_BASE_MS / 1000,
    "segundos"
  );
}

function stopPolling() {
  if (!pollingActive) return;

  pollingActive = false;
  pollingFailureCount = 0;
  currentPollingInterval = POLLING_INTERVAL_BASE_MS;

  if (pollingTimerHandle !== null) {
    clearTimeout(pollingTimerHandle);
    pollingTimerHandle = null;
  }

  console.log("Polling parado");
}

if (typeof document !== "undefined") {
  document.addEventListener("visibilitychange", function () {
    if (document.hidden) {
      if (pollingActive) {
        pollingPausedForVisibility = true;
        stopPolling();
      }
    } else if (pollingPausedForVisibility) {
      pollingPausedForVisibility = false;
      startPolling();
    }
  });
}

async function updateDeviceStatesFromServer(options = {}) {
  const skipSchedule = Boolean(options && options.skipSchedule);
  let hasStateChanges = false;
  let encounteredError = false;

  try {
    cleanupExpiredCommands();

    if (!isProduction) {
      debugLog(() => ["Polling skipped (dev mode)"]);
      return;
    }

    const deviceIds = ALL_LIGHT_IDS.join(",");
    const pollingUrl = `${POLLING_URL}?devices=${deviceIds}`;

    debugLog(() => [
      "pollingRequest",
      { interval: currentPollingInterval, url: pollingUrl },
    ]);

    const response = await fetch(pollingUrl, { cache: "no-store" });
    const rawText = await response.text();

    if (!response.ok) {
      throw new Error(`Polling failed: ${response.status}`);
    }

    let data;
    let devicesMap;

    const trimmed = (rawText || "").trim();
    const looksLikeHtml = trimmed.startsWith("<!DOCTYPE html") || trimmed.startsWith("<html");

    if (looksLikeHtml) {
      console.warn("⚠️ Polling retornou HTML (Cloudflare Functions falhando). Tentando fallback Maker API...");
      const direct = await loadAllDeviceStatesDirect(ALL_LIGHT_IDS);
      devicesMap = direct.devices;
    } else {
      try {
        data = JSON.parse(rawText);
      } catch (err) {
        console.warn("⚠️ Polling JSON parse falhou, tentando fallback Maker API...", err);
        const direct = await loadAllDeviceStatesDirect(ALL_LIGHT_IDS);
        devicesMap = direct.devices;
      }

      if (!devicesMap && data) {
        devicesMap = data.devices;
      }
    }

    if (!devicesMap && data && Array.isArray(data.data)) {
      devicesMap = {};
      data.data.forEach((device) => {
        if (!device || !device.id) {
          return;
        }

        let state = "off";
        let level = null;

        if (Array.isArray(device.attributes)) {
          const switchAttr = device.attributes.find(
            (attribute) => attribute.name === "switch"
          );
          state = switchAttr?.currentValue || switchAttr?.value || "off";

          const levelAttr = device.attributes.find(
            (attribute) => attribute.name === "level"
          );
          if (levelAttr) {
            level = levelAttr?.currentValue ?? levelAttr?.value ?? level;
          }
        } else if (device.attributes && typeof device.attributes === "object") {
          if (device.attributes.switch !== undefined) {
            state = device.attributes.switch;
          } else {
            debugLog(() => ["Polling skip device (no switch)", device.id]);
            return;
          }

          if (device.attributes.level !== undefined) {
            level = device.attributes.level;
          }
        }

        devicesMap[device.id] = { state, success: true };

        if (level !== null && level !== undefined) {
          devicesMap[device.id].level = level;
        }

        if (device.attributes && device.attributes.volume !== undefined) {
          devicesMap[device.id].volume = device.attributes.volume;
        }
      });
    }

    if (!devicesMap) {
      debugLog(() => ["Polling response sem devices", data]);
      return;
    }

    Object.entries(devicesMap).forEach(([deviceId, deviceData]) => {
      if (!deviceData) {
        return;
      }

      if (deviceData.success) {
        const previousState = getStoredState(deviceId);
        const nextState = deviceData.state;
        const nextLevel = deviceData.level;

        if (previousState !== nextState) {
          hasStateChanges = true;
        }

        setStoredState(deviceId, nextState);
        updateDeviceUI(deviceId, {
          state: nextState,
          level: nextLevel,
        });

        if (String(deviceId) === "354" && deviceData.volume !== undefined) {
          updateDenonVolumeUI(deviceData.volume);
        }
      } else {
        console.warn(`Falha no device ${deviceId}:`, deviceData.error);
      }
    });

    updateAllMasterButtons();
    if (typeof updateMasterLightToggleState === "function") {
      updateMasterLightToggleState();
    }
  } catch (error) {
    encounteredError = true;
    console.error("Erro no polling:", error);

    if (
      error.message.includes("JSON.parse") ||
      error.message.includes("unexpected character")
    ) {
      console.error("PARANDO POLLING - Cloudflare Functions não funcionam");
      stopPolling();
      return;
    }
  } finally {
    if (!skipSchedule && pollingActive) {
      if (encounteredError) {
        pollingFailureCount += 1;
        currentPollingInterval = Math.min(
          Math.round(currentPollingInterval * 1.5) || POLLING_INTERVAL_BASE_MS,
          POLLING_INTERVAL_MAX_MS
        );
      } else if (hasStateChanges) {
        pollingFailureCount = 0;
        currentPollingInterval = POLLING_INTERVAL_BASE_MS;
      } else {
        pollingFailureCount = 0;
        currentPollingInterval = Math.min(
          currentPollingInterval + POLLING_INTERVAL_STEP_MS,
          POLLING_INTERVAL_MAX_MS
        );
      }

      debugLog(() => [
        "pollingNextInterval",
        {
          encounteredError,
          hasStateChanges,
          nextInterval: currentPollingInterval,
          failureCount: pollingFailureCount,
        },
      ]);

      scheduleNextPollingRun(currentPollingInterval);
    }
  }
}

function updateDeviceUI(deviceId, stateOrData, forceUpdate = false) {
  // Verificar se o DOM está pronto
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () =>
      updateDeviceUI(deviceId, stateOrData, forceUpdate)
    );
    return;
  }

  let level = null;
  let state = stateOrData;

  if (stateOrData && typeof stateOrData === "object") {
    state =
      stateOrData.state !== undefined
        ? stateOrData.state
        : stateOrData.switch !== undefined
        ? stateOrData.switch
        : stateOrData.value !== undefined
        ? stateOrData.value
        : stateOrData;

    if (stateOrData.level !== undefined) {
      level = clampDimmerValue(stateOrData.level, stateOrData.level);
    }
  }

  const normalizedState = state === "on" ? "on" : state === "off" ? "off" : String(state || "off");

  // Verificar se hÃƒÂ¡ comando recente que deve ser respeitado
  if (!forceUpdate) {
    const lastCommand = recentCommands.get(deviceId);
    if (lastCommand && Date.now() - lastCommand < COMMAND_PROTECTION_MS) {
      return;
    }
  }

  // Atualizar controles de cÃƒÂ´modo (room-control E control-card)
  const roomControls = document.querySelectorAll(
    `[data-device-id="${deviceId}"]`
  );
  console.log(
    `Ã°Å¸â€Â§ updateDeviceUI(${deviceId}, ${state}) - Encontrados ${roomControls.length} controles`
  );

  roomControls.forEach((el, index) => {
    console.log(
      `Ã°Å¸â€Â§ Controle ${index + 1}: classes="${
        el.className
      }", currentState="${el.dataset.state}"`
    );

    // Suporta tanto .room-control quanto .control-card
    if (
      el.classList.contains("room-control") ||
      el.classList.contains("control-card")
    ) {
      const currentState = el.dataset.state;
      if (currentState !== normalizedState || forceUpdate) {
        console.log(
          `Ã°Å¸â€â€ž Atualizando controle ${deviceId}: "${currentState}" Ã¢â€ â€™ "${normalizedState}" (force=${forceUpdate})`
        );
        setRoomControlUI(el, normalizedState);
        if (level !== null) {
          applyDimmerLevelToControl(el, level);
        }
        // Salvar o estado atualizado
        setStoredState(deviceId, normalizedState);
      } else {
        console.log(
          `Ã¢Å“â€œ Controle ${deviceId} jÃƒÂ¡ está no estado correto: "${normalizedState}"`
        );
      }
    } else {
      console.log(
        `Ã¢Å¡Â Ã¯Â¸Â Elemento encontrado mas não é room-control nem control-card: ${el.className}`
      );
    }
  });

  // Atualizar botÃƒÂµes master da home apÃƒÂ³s qualquer mudanÃƒÂ§a de dispositivo
  if (String(deviceId) === "354") {
    applyDenonPowerState(state);
  }

  updateAllMasterButtons();
}

function updateAllMasterButtons(forceUpdate = false) {
  pruneStaleEntries();

  masterButtonCache.forEach(function (btn) {
    if (!btn.isConnected) {
      masterButtonCache.delete(btn);
      return;
    }

    const ids = (btn.dataset.deviceIds || "")
      .split(",")
      .map(function (id) {
        return id.trim();
      })
      .filter(Boolean);

    if (ids.length === 0) {
      return;
    }

    const masterState = anyOn(ids) ? "on" : "off";
    setMasterIcon(btn, masterState, forceUpdate);
  });
}

// FunÃƒÂ§ÃƒÂµes auxiliares para botÃƒÂµes master (movidas do HTML)
function anyOn(deviceIds) {
  return (deviceIds || []).some((id) => (getStoredState(id) || "off") === "on");
}

// Função para inicializar e sincronizar estados dos botÃƒÂµes master na home
function initHomeMasters() {
  console.log("🏠 Inicializando botões master da home...");
  
  // Aguardar um pouco para garantir que o DOM está pronto
  setTimeout(() => {
    const masterButtons = document.querySelectorAll(".room-master-btn");
    
    if (masterButtons.length === 0) {
      console.log("⚠️ Nenhum botão master encontrado");
      return;
    }
    
    console.log(`✅ Encontrados ${masterButtons.length} botões master`);
    
    masterButtons.forEach((btn) => {
      // Limpar estado de pending
      btn.dataset.pending = "false";
      
      // Obter IDs dos dispositivos
      const ids = (btn.dataset.deviceIds || "").split(",").filter(Boolean);
      
      if (ids.length === 0) return;
      
      // Calcular estado baseado nos dispositivos
      const state = anyOn(ids) ? "on" : "off";
      
      // Atualizar ícone do botão
      setMasterIcon(btn, state, true);
      
      const route = btn.dataset.route || "unknown";
      console.log(`  ${route}: ${ids.length} luzes, estado = ${state}`);
    });
    
    console.log("✅ Botões master sincronizados!");
  }, 100);
}

// Função auxiliar para verificar se alguma cortina está aberta
function anyCurtainOpen(curtainIds) {
  // Verifica se alguma cortina do grupo está aberta
  return (curtainIds || []).some((id) => {
    const state = getCurtainState(id);
    console.log(`Ã°Å¸â€Â Cortina ${id}: estado = ${state}`);
    return state === "open";
  });
}

// Função para obter o estado atual da cortina
function getCurtainState(curtainId) {
  // Buscar no localStorage ou usar um estado padrÃƒÂ£o
  const state = localStorage.getItem(`curtain_${curtainId}_state`) || "closed";
  return state; // retorna 'open' ou 'closed'
}

// Função para obter o ÃƒÂºltimo comando de cortina
function getLastCurtainCommand(curtainId) {
  const state = getCurtainState(curtainId);
  return state === "closed" ? "close" : "open"; // normalizar para comando
}

// Função para armazenar o estado da cortina
function setCurtainState(curtainId, state) {
  localStorage.setItem(`curtain_${curtainId}_state`, state);
}

// Função para obter estado da cortina
function getCurtainState(curtainId) {
  try {
    return localStorage.getItem(`curtain_${curtainId}_state`) || "closed";
  } catch (error) {
    console.error("⚠️Erro ao obter estado da cortina:", error);
    return "closed";
  }
}

function setMasterIcon(btn, state, forceUpdate = false) {
  if (!forceUpdate && btn.dataset.pending === "true") {
    debugLog(() => ["masterButtonPending", btn.dataset.deviceIds]);
    return;
  }

  const img = btn.querySelector("img");
  if (!img) return;

  const nextIcon =
    state === "on"
      ? "images/icons/icon-small-light-on.svg"
      : "images/icons/icon-small-light-off.svg";
  const currentSrc = img.src || "";

  if (!currentSrc.includes(nextIcon.split("/").pop())) {
    img.src = nextIcon;
    btn.dataset.state = state;
    debugLog(() => ["masterIconUpdated", state, btn.dataset.deviceIds]);
  }
}

function setCurtainMasterIcon(btn, state, forceUpdate = false) {
  if (!forceUpdate && btn.dataset.pending === "true") {
    debugLog(() => ["curtainMasterPending", btn.dataset.curtainIds]);
    return;
  }

  const img = btn.querySelector("img");
  if (!img) return;

  const nextIcon =
    state === "open"
      ? "images/icons/curtain-open.svg"
      : "images/icons/curtain-closed.svg";
  const currentSrc = img.src || "";

  if (!currentSrc.includes(nextIcon.split("/").pop())) {
    img.src = nextIcon;
    btn.dataset.state = state;
    debugLog(() => ["curtainMasterIconUpdated", state, btn.dataset.curtainIds]);
  }
}

// Função para definir o estado de loading do botÃƒÂ£o master de cortinas
function setCurtainMasterButtonLoading(btn, loading) {
  btn.dataset.loading = loading ? "true" : "false";
  if (loading) {
    btn.classList.add("loading");
    btn.dataset.pending = "true";
  } else {
    btn.classList.remove("loading");
    btn.dataset.pending = "false";
  }
}

// Função para atualizar ÃƒÂ­cones das cortinas individuais
function updateIndividualCurtainButtons(curtainIds, command) {
  curtainIds.forEach((curtainId) => {
    const button = document.querySelector(`[data-device-id="${curtainId}"]`);
    if (button && button.querySelector(".device-icon")) {
      const icon = button.querySelector(".device-icon");
      icon.src =
        command === "open"
          ? "images/icons/curtain-open.svg"
          : "images/icons/curtain-closed.svg";
      icon.alt = command === "open" ? "Cortina Aberta" : "Cortina Fechada";
    }
  });
}

// Função chamada pelo onclick dos botÃƒÂµes master na home
function onHomeMasterClick(event, button) {
  console.log("Ã°Å¸â€“Â±Ã¯Â¸Â onHomeMasterClick chamada!", button);
  event.preventDefault();
  event.stopPropagation();

  // Verificar se jÃƒÂ¡ está carregando
  if (button.dataset.loading === "true") {
    console.log(
      "Ã¢ÂÂ¸Ã¯Â¸Â BotÃƒÂ£o jÃƒÂ¡ está carregando, ignorando clique"
    );
    return;
  }

  const envKey = button?.dataset?.route || null;
  const deviceIds =
    envKey && typeof getEnvironmentLightIds === "function"
      ? getEnvironmentLightIds(envKey)
      : (button.dataset.deviceIds || "").split(",").filter(Boolean);
  console.log("Ã°Å¸â€Â Device IDs encontrados:", deviceIds);

  if (deviceIds.length === 0) {
    console.log("⚠️Nenhum device ID encontrado");
    return;
  }

  // Determinar comando baseado no estado atual
  const currentState = anyOn(deviceIds) ? "on" : "off";
  const newCommand = currentState === "on" ? "off" : "on";
  console.log(
    "Ã°Å¸Å½Â¯ Comando determinado:",
    currentState,
    "Ã¢â€ â€™",
    newCommand
  );

  // Ativar loading visual
  console.log("Ã°Å¸â€â€ž Ativando loading visual...");
  setMasterButtonLoading(button, true);

  // Atualizar UI imediatamente
  setMasterIcon(button, newCommand);

  // Enviar comandos para todos os dispositivos (master dos ambientes mantém comportamento original)
  const promises = deviceIds.map((deviceId) => {
    // Marcar comando recente
    recentCommands.set(deviceId, Date.now());
    setStoredState(deviceId, newCommand);
    return sendHubitatCommand(deviceId, newCommand);
  });

  // Aguardar conclusão de todos os comandos
  Promise.allSettled(promises).finally(() => {
    // Remover loading apÃƒÂ³s comandos
    setTimeout(() => {
      setMasterButtonLoading(button, false);
    }, 1000); // 1 segundo de delay para feedback visual
  });
}

// Função chamada pelo onclick dos botÃƒÂµes master de cortinas na home
function onHomeCurtainMasterClick(event, button) {
  console.log("Ã°Å¸â€“Â±Ã¯Â¸Â onHomeCurtainMasterClick chamada!", button);
  event.preventDefault();
  event.stopPropagation();

  // Verificar se jÃƒÂ¡ está carregando
  if (button.dataset.loading === "true") {
    console.log(
      "Ã¢ÂÂ¸Ã¯Â¸Â BotÃƒÂ£o de cortina jÃƒÂ¡ está carregando, ignorando clique"
    );
    return;
  }

  const envKey = button?.dataset?.route || null;
  const curtainIds =
    envKey && typeof getEnvironmentCurtainIds === "function"
      ? getEnvironmentCurtainIds(envKey)
      : (button.dataset.curtainIds || "").split(",").filter(Boolean);
  console.log("Ã°Å¸â€Â Curtain IDs encontrados:", curtainIds);

  if (curtainIds.length === 0) {
    console.log("⚠️Nenhum curtain ID encontrado");
    return;
  }

  // Determinar comando baseado no estado atual das cortinas
  console.log(
    "Ã°Å¸â€Â Verificando estados individuais das cortinas:",
    curtainIds.map((id) => ({ id, state: getCurtainState(id) }))
  );
  const currentState = anyCurtainOpen(curtainIds) ? "open" : "closed";
  const newCommand = currentState === "open" ? "close" : "open";
  console.log(
    "Ã°Å¸Å½Â¯ Comando de cortina determinado:",
    currentState,
    "Ã¢â€ â€™",
    newCommand
  );

  // Atualizar UI imediatamente (antes do loading)
  setCurtainMasterIcon(button, newCommand, true); // forÃƒÂ§ar atualizaÃƒÂ§ÃƒÂ£o

  // Ativar loading visual
  console.log("Ã°Å¸â€â€ž Ativando loading visual no botÃƒÂ£o de cortina...");
  setCurtainMasterButtonLoading(button, true);

  // Atualizar ÃƒÂ­cones dos botÃƒÂµes individuais imediatamente
  updateIndividualCurtainButtons(curtainIds, newCommand);

  // Enviar comandos para todas as cortinas
  const promises = curtainIds.map((curtainId) => {
    // Marcar comando recente
    recentCommands.set(curtainId, Date.now());
    // Armazenar o estado da cortina
    setCurtainState(curtainId, newCommand);
    return sendHubitatCommand(curtainId, newCommand);
  });

  // Aguardar conclusão de todos os comandos
  Promise.allSettled(promises).finally(() => {
    // Remover loading apÃƒÂ³s comandos
    setTimeout(() => {
      setCurtainMasterButtonLoading(button, false);
    }, 1000); // 1 segundo de delay para feedback visual
  });
}

// Função especial para atualizar estados apÃƒÂ³s comandos master
function updateStatesAfterMasterCommand(deviceIds, command) {
  console.log(
    `Ã°Å¸Å½Â¯ Atualizando estados apÃƒÂ³s master ${command} para:`,
    deviceIds
  );

  // Atualizar todos os dispositivos affected
  deviceIds.forEach((deviceId) => {
    updateDeviceUI(deviceId, command, true);
  });

  // ForÃƒÂ§ar atualizaÃƒÂ§ÃƒÂ£o de todos os masters
  setTimeout(() => {
    const masterButtons = document.querySelectorAll(".room-master-btn");
    masterButtons.forEach((btn) => {
      const ids = (btn.dataset.deviceIds || "").split(",").filter(Boolean);
      if (ids.some((id) => deviceIds.includes(id))) {
        const masterState = anyOn(ids) ? "on" : "off";
        setMasterIcon(btn, masterState, true); // forÃƒÂ§ar atualizaÃƒÂ§ÃƒÂ£o
      }
    });
  }, 100);
}

// === SISTEMA DE CARREGAMENTO GLOBAL ===

// Controle da tela de loading
let loaderFallbackTimeout = null;

function showLoader() {
  try {
    const loader = document.getElementById("global-loader");
    if (loader) {
      loader.classList.remove("hidden");
      loader.style.display = "flex"; // ForÃƒÂ§ar display
      loader.style.opacity = "1"; // Garantir opacidade visível
      loader.style.visibility = "visible"; // Garantir visibilidade
      updateProgress(0, "Iniciando carregamento...");
      console.log("Ã°Å¸â€œÂ± Loader exibido");

      const loaderSpinner = loader.querySelector(".loader-spinner");
      const loaderText = loader.querySelector(".loader-text");
      const loaderProgress = loader.querySelector(".loader-progress");
      const loaderContent = loader.querySelector(".loader-content");
      const resetTargets = [loaderSpinner, loaderText, loaderProgress];

      // Reativar animações resetando o elemento
      if (loaderContent) {
        loaderContent.style.animation = "none";
        // Forçar reflow para ativar animação novamente
        void loaderContent.offsetWidth;
        loaderContent.style.animation = "0.6s ease-out fadeInUp";
      }

      resetTargets.forEach((el) => {
        if (!el) return;
        el.style.transition = "";
        el.style.opacity = "";
        el.style.display = "";
      });

      if (loaderFallbackTimeout) {
        clearTimeout(loaderFallbackTimeout);
      }

      loaderFallbackTimeout = setTimeout(() => {
        const activeLoader = document.getElementById("global-loader");
        if (
          activeLoader &&
          activeLoader.style.display !== "none" &&
          !activeLoader.classList.contains("animating")
        ) {
          console.warn("Loader travado: iniciando animacao de fallback.");
          startHomeAnimation();
        }
      }, 9000);
    } else {
      console.warn("Ã¢Å¡Â Ã¯Â¸Â Elemento loader não encontrado");
    }
  } catch (error) {
    console.error("⚠️Erro ao mostrar loader:", error);
  }
}

function hideLoader() {
  console.log("🟢 hideLoader FOI CHAMADA!");
  try {
    if (loaderFallbackTimeout) {
      clearTimeout(loaderFallbackTimeout);
      loaderFallbackTimeout = null;
    }

    const finalizeHide = () => {
      console.log("🟡 finalizeHide executando...");
      const loader = document.getElementById("global-loader");
      console.log("🟡 Loader encontrado em finalizeHide:", !!loader);
      if (loader) {
        // Start the orchestrated animation sequence
        startHomeAnimation();
      }
    };

    if (!assetPreloadComplete && assetPreloadPromise) {
      const pending = assetPreloadPromise;
      assetPreloadPromise = null;

      // Fail-safe: não prender a UI em caso de preload travado
      const failSafeMs = 6000;
      const failSafeTimeout = setTimeout(() => {
        console.warn(
          `⚠️Preload demorou mais que ${failSafeMs}ms; escondendo loader mesmo assim.`
        );
        finalizeHide();
      }, failSafeMs);

      pending
        .catch((error) =>
          console.warn("Falha ao pré-carregar todos os assets", error)
        )
        .finally(() => {
          clearTimeout(failSafeTimeout);
          finalizeHide();
        });
      return;
    }

    finalizeHide();
  } catch (error) {
    console.error("Erro ao esconder loader:", error);
  }
}

// Orchestrated animation sequence from loading to home
function startHomeAnimation() {
  console.log("🔵 startHomeAnimation FOI CHAMADA!");
  const loader = document.getElementById("global-loader");
  console.log("🔵 Loader encontrado:", !!loader);

  if (!loader) {
    console.warn("⚠️ Loader not found, showing spa-root directly");
    document.body.classList.add("app-ready");
    return;
  }

  if (
    loader.dataset.fading === "true" ||
    loader.classList.contains("hidden") ||
    loader.style.display === "none"
  ) {
    document.body.classList.add("app-ready");
    return;
  }

  loader.dataset.fading = "true";
  console.log("🎬 Iniciando animação orquestrada...");

  // Verificar se os elementos da home existem
  const checkElements = () => {
    const roomCards = document.querySelectorAll(".room-card");
    const pageTitle =
      document.getElementById("spa-static-header") ||
      document.querySelector(".page-title.fixed-header");
    return roomCards.length > 0 && pageTitle;
  };

  // Executar a animação com pequeno delay para garantir que DOM está pronto
  if (checkElements()) {
    requestAnimationFrame(() => {
      executeOrchestratedAnimation(loader);
    });
  } else {
    // Aguardar até 500ms para elementos aparecerem
    console.log("🎬 Aguardando elementos da home...");
    let attempts = 0;
    const waitForElements = setInterval(() => {
      attempts++;
      if (checkElements() || attempts > 10) {
        clearInterval(waitForElements);
        if (checkElements()) {
          console.log("🎬 Elementos encontrados após " + (attempts * 50) + "ms");
          executeOrchestratedAnimation(loader);
        } else {
          console.warn("⚠️ Elementos da home não encontrados, usando fallback");
          // Fallback: apenas esconder loader
          document.body.classList.add("app-ready");
          loader.style.display = "none";
          loader.classList.add("hidden");
        }
      }
    }, 50);
  }
}

function executeOrchestratedAnimation(loader) {
  console.log("🎬 executeOrchestratedAnimation INICIOU");

  // Elementos do loader
  const loaderLogo = loader.querySelector(".loader-logo");
  const loaderLogoBtnImg = loader.querySelector(".loader-logo-btn .logo-round");
  const loaderLine = document.getElementById("loader-line");

  // Elementos da home (buscar de novo para garantir que existem)
  const pageTitle =
    document.getElementById("spa-static-header") ||
    document.querySelector(".page-title.fixed-header");
  const headerLogo =
    (pageTitle && pageTitle.querySelector(".app-logo-trigger")) ||
    document.querySelector(".page-title.fixed-header .app-logo-trigger");
  const topBar =
    document.getElementById("spa-static-topbar") ||
    document.querySelector(".top-bar-custom");
  const roomCards = document.querySelectorAll(".room-card");
  const navbar = document.getElementById("spa-navbar");

  console.log("🎬 Elementos encontrados:", {
    loaderLogo: !!loaderLogo,
    loaderLogoBtnImg: !!loaderLogoBtnImg,
    loaderLine: !!loaderLine,
    headerLogo: !!headerLogo,
    topBar: !!topBar,
    roomCards: roomCards.length,
    navbar: !!navbar,
    pageTitle: !!pageTitle
  });

  // ===== FASE 0: Preparação (0ms) =====
  // Ativar modo de animação orquestrada (desativa transições automáticas via CSS)
  document.body.classList.add("orchestrated-animation");
  document.body.classList.remove("reveal-home");
  
  // Preparar elementos da home (somente via CSS: opacity 0 durante orchestrated-animation)
  // Não aplicar transforms/staggers: queremos apenas um fade rápido.

  if (topBar) {
    topBar.style.opacity = "0";
    topBar.style.transform = "scaleX(0)";
  }
  if (pageTitle) {
    pageTitle.style.opacity = "0";
  }
  
  // Esconder logo do header (será substituído pelo logo do loader)
  if (headerLogo) headerLogo.style.opacity = "0";

  // Adicionar classe de transição ao loader (spinner/text/progress somem)
  loader.classList.add("transitioning");

  // Agora mostrar spa-root (CSS orchestrated-animation já força opacity:1)
  document.body.classList.add("app-ready");

  // ===== FASE 1: Logo começa a se mover (50ms - 1000ms) =====
  setTimeout(() => {
    if (loaderLogo && loaderLogoBtnImg) {
      loaderLogo.classList.add("transitioning");
      
      // Calcular posição do header onde o logo deve ir
      const loaderRect = loaderLogoBtnImg.getBoundingClientRect();
      
      // Posição inicial (centro da tela)
      const startX = loaderRect.left;
      const startY = loaderRect.top;
      
      // Posição final - calcular baseado na posição real do header
      // O .page-title.fixed-header tem: top: 87px; transform: translate(-50%, -100%)
      // Isso significa que o BOTTOM do header fica em 87px
      // Container do logo: 72x72px, logo: 64x64px centrado
      // Posição do topo do logo: 87px - 72px + (72-64)/2 = 87 - 72 + 4 = 19px
      const endX = (window.innerWidth - loaderRect.width) / 2;
      const endY = 19; // Topo do logo fica em ~19px
      
      console.log("🎬 Logo movimento:", { startX, startY, endX, endY });
      
      // Definir posição inicial fixa
      loaderLogo.style.left = startX + "px";
      loaderLogo.style.top = startY + "px";
      loaderLogo.style.position = "fixed";
      loaderLogo.style.margin = "0";
      loaderLogo.style.zIndex = "10001";
      loaderLogo.style.transition = "left 1s cubic-bezier(0.4, 0, 0.2, 1), top 1s cubic-bezier(0.4, 0, 0.2, 1)";
      
      // Forçar reflow
      void loaderLogo.offsetWidth;
      
      // Iniciar movimento (sem scale - logo já tem tamanho correto 64px)
      loaderLogo.style.left = endX + "px";
      loaderLogo.style.top = endY + "px";
    }
  }, 50);

  // ===== FASE 2: Linha branca expande (500ms - 1300ms) =====
  setTimeout(() => {
    if (loaderLine) {
      console.log("🎬 Linha expandindo...");
      loaderLine.classList.add("expanding");
    }
  }, 500);

  // ===== FASE 3: Logo chega ao header, elementos começam a aparecer (1000ms) =====
  setTimeout(() => {
    console.log("🎬 Logo chegou ao header, iniciando fade dos elementos");
    
    // Manter logo do loader visível (ele é o logo final!)
    // Esconder o logo do header (será substituído pelo do loader)
    if (headerLogo) headerLogo.style.visibility = "hidden";
    
    // Mostrar pageTitle mas sem o logo interno (o logo do loader está no lugar)
    if (pageTitle) {
      pageTitle.style.transition = "opacity 0.3s ease";
      pageTitle.style.opacity = "1";
    }

    // Mostrar cards mais cedo (sem esperar o fim da expansão da linha)
    document.body.classList.add("reveal-home");
  }, 1000);

  // ===== FASE 5: Top bar aparece (1300ms) =====
  setTimeout(() => {
    console.log("🎬 Top bar aparecendo");
    if (topBar) {
      topBar.style.transition = "opacity 0.3s ease, transform 0.3s ease";
      topBar.style.opacity = "1";
      topBar.style.transform = "scaleX(1)";
    }
    // Esconder linha do loader (top-bar assume)
    if (loaderLine) loaderLine.style.opacity = "0";
  }, 1300);

  // ===== FASE 7: Background do loader faz fade out (3000ms - 3500ms) =====
  setTimeout(() => {
    console.log("🎬 Background do loader sumindo");
    loader.style.background = "transparent";
    loader.style.transition = "background 0.5s ease";
  }, 3000);

  // ===== FASE 8: Cleanup final (3500ms) =====
  setTimeout(() => {
    // Antes de esconder o loader, mostrar o logo do header
    if (headerLogo) {
      headerLogo.style.visibility = "visible";
      headerLogo.style.opacity = "1";
    }
    
    // Agora esconder o loader (incluindo o logo do loader)
    loader.style.display = "none";
    loader.classList.add("hidden");
    
    // NÃO limpar opacity/transform dos elementos - eles devem permanecer visíveis!
    // Apenas limpar as transições inline
    roomCards.forEach(card => {
      card.style.transition = "";
      // Manter opacity e transform para elementos ficarem visíveis
    });
    if (navbar) {
      navbar.style.transition = "";
    }
    if (topBar) {
      topBar.style.transition = "";
    }
    if (pageTitle) {
      pageTitle.style.transition = "";
    }
    
    // Limpar estilos do loader
    loader.style.background = "";
    loader.style.transition = "";
    loader.dataset.fading = "";
    loader.classList.remove("transitioning");
    if (loaderLogo) {
      loaderLogo.style.cssText = "";
      loaderLogo.classList.remove("transitioning");
    }
    if (loaderLine) {
      loaderLine.classList.remove("expanding");
      loaderLine.style.opacity = "";
    }
    
    // Remover modo de animação orquestrada MAS manter elementos visíveis
    // Os estilos inline de opacity:1 e transform:translateY(0) permanecem
    document.body.classList.remove("orchestrated-animation");
    
    console.log("✅ Animação orquestrada concluída!");
  }, 3500);
}

function ensureTopBarVisible() {
  const topBar =
    document.getElementById("spa-static-topbar") ||
    document.querySelector(".top-bar-custom.spa-static-chrome");
  if (!topBar) return;
  topBar.style.display = "block";
  topBar.style.visibility = "visible";
  topBar.style.opacity = "1";
  topBar.style.transform = "scaleX(1)";
}



function updateProgress(percentage, text) {
  try {
    const progressFill = document.getElementById("progress-fill");
    const progressText = document.getElementById("progress-text");
    const loaderText = document.querySelector(".loader-text");

    if (progressFill) {
      progressFill.style.width = percentage + "%";
    }

    if (progressText) {
      progressText.textContent = Math.round(percentage) + "%";
    }

    if (loaderText && text) {
      loaderText.textContent = text;
    }

    // Log para debug mobile
    console.log(
      `Ã°Å¸â€œÅ  Progresso: ${percentage}% - ${text || "Carregando..."}`
    );
  } catch (error) {
    console.warn("Ã¢Å¡Â Ã¯Â¸Â Erro ao atualizar progresso:", error);
  }
}

// Carregamento global de todos os estados dos dispositivos
async function loadAllDeviceStatesGlobally() {
  console.log("Ã°Å¸Å’Â Iniciando carregamento global de estados...");
  console.log(
    "Ã°Å¸Å’Â ALL_LIGHT_IDS disponível:",
    !!ALL_LIGHT_IDS,
    "Length:",
    ALL_LIGHT_IDS ? ALL_LIGHT_IDS.length : "undefined"
  );
  console.log("Ã°Å¸Å’Â DEBUG CARREGAMENTO:", {
    isProduction: isProduction,
    hostname: location.hostname,
    isMobile: isMobile,
    userAgent: navigator.userAgent.substring(0, 100),
  });

  // Mobile e desktop usam EXATAMENTE o mesmo carregamento
  console.log("Ã°Å¸Å’Â Carregamento universal (desktop e mobile idênticos)");

  if (!isProduction) {
    console.log(
      "Ã°Å¸â€™Â» MODO DESENVOLVIMENTO ATIVO - carregando do localStorage"
    );
    console.log("Ã°Å¸â€™Â» ISSO PODE SER O PROBLEMA NO MOBILE!");
    console.log("Ã°Å¸â€œâ€¹ Dispositivos a carregar:", ALL_LIGHT_IDS.length);
    updateProgress(20, "Modo DEV - Estados salvos...");

    // Simular carregamento para melhor UX (mobile-friendly)
    try {
      await new Promise((resolve) => setTimeout(resolve, 500));
    } catch (e) {
      // Fallback se Promise.resolve falhar
      console.warn("Promise fallback ativo");
    }

    let loadedCount = 0;
    ALL_LIGHT_IDS.forEach((deviceId, index) => {
      let storedState = "off";
      try {
        storedState = getStoredState(deviceId) || "off";
        updateDeviceUI(deviceId, storedState, true); // forceUpdate = true
        loadedCount++;
      } catch (e) {
        console.warn(`⚠️Erro ao processar ${deviceId}:`, e);
      }

      const progress = 20 + ((index + 1) / ALL_LIGHT_IDS.length) * 80;
      updateProgress(
        progress,
        `Dispositivo ${index + 1}/${ALL_LIGHT_IDS.length}...`
      );
    });

    console.log(
      `Ã¢Å“â€¦ Carregamento completo: ${loadedCount}/${ALL_LIGHT_IDS.length} dispositivos`
    );
    updateProgress(100, "Carregamento Concluído!");
    return true;
  }

  try {
    console.log("Ã°Å¸Å’Â MODO PRODUÇÃO’O ATIVO - buscando do servidor");
    updateProgress(10, "Testando conectividade...");

    // Teste rÃƒÂ¡pido de conectividade
    try {
      const healthController = new AbortController();
      const healthTimeout = setTimeout(
        () => healthController.abort(),
        NETWORK_CONFIG.HEALTH_CHECK_TIMEOUT
      );

      const healthCheck = await fetch(POLLING_URL + "?health=1", {
        method: "GET",
        signal: healthController.signal,
        mode: "cors",
      });

      clearTimeout(healthTimeout);
      console.log("Ã°Å¸ÂÂ¥ Health check:", healthCheck.ok ? "OK" : "FAIL");
    } catch (healthError) {
      console.warn(
        "Ã¢Å¡Â Ã¯Â¸Â Health check falhou, continuando mesmo assim:",
        healthError.message
      );
    }

    updateProgress(20, "Conectando com servidor...");

    const deviceIds = ALL_LIGHT_IDS.join(",");
    console.log(
      `Ã°Å¸â€œÂ¡ Buscando estados de ${ALL_LIGHT_IDS.length} dispositivos no servidor...`
    );
    console.log(
      "Ã°Å¸â€œÂ¡ URL será:",
      `${POLLING_URL}?devices=${deviceIds}`
    );

    updateProgress(30, "Enviando solicitação...");

    // Função de retry com backoff exponencial
    const fetchWithRetry = async (
      url,
      options,
      maxRetries = NETWORK_CONFIG.MAX_RETRY_ATTEMPTS
    ) => {
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          console.log(
            `Ã°Å¸â€œÂ¡ Tentativa ${attempt}/${maxRetries} para ${url}`
          );
          updateProgress(
            30 + (attempt - 1) * 5,
            `Tentativa ${attempt}/${maxRetries}...`
          );

          // Configurar timeout por tentativa
          let controller, timeoutId;
          const timeout = NETWORK_CONFIG.FETCH_TIMEOUT_PER_ATTEMPT;

          if (typeof AbortController !== "undefined") {
            controller = new AbortController();
            timeoutId = setTimeout(() => {
              console.warn(
                `Ã¢ÂÂ° Timeout de ${
                  timeout / 1000
                }s atingido na tentativa ${attempt}`
              );
              controller.abort();
            }, timeout);
            options.signal = controller.signal;
          }

          const response = await fetch(url, options);
          if (timeoutId) clearTimeout(timeoutId);

          console.log(
            `Ã°Å¸â€œÂ¡ Tentativa ${attempt} - Status: ${response.status}`
          );

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }

          return response;
        } catch (error) {
          console.warn(`⚠️Tentativa ${attempt} falhou:`, error.message);

          if (attempt === maxRetries) {
            throw new Error(
              `Falha apÃƒÂ³s ${maxRetries} tentativas: ${error.message}`
            );
          }

          // Aguardar antes do retry (backoff exponencial)
          const delay = Math.min(
            NETWORK_CONFIG.RETRY_DELAY_BASE * Math.pow(2, attempt - 1),
            NETWORK_CONFIG.RETRY_DELAY_MAX
          );
          console.log(
            `Ã¢ÂÂ³ Aguardando ${delay}ms antes da prÃƒÂ³xima tentativa...`
          );
          updateProgress(
            30 + attempt * 5,
            `Reagendando em ${delay / 1000}s...`
          );
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    };

    // Configurações otimizadas para mobile
    const fetchOptions = {
      method: "GET",
      cache: "no-cache", // ForÃƒÂ§ar busca fresca
      mode: "cors",
    };

    const requestUrl = `${POLLING_URL}?devices=${deviceIds}`;
    console.log("Ã°Å¸â€œÂ¡ Fazendo fetch com retry para:", requestUrl);

    const response = await fetchWithRetry(requestUrl, fetchOptions);

    console.log("Ã°Å¸â€œÂ¡ Resposta recebida, status:", response.status);
    updateProgress(50, "Recebendo dados...");

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    let data;
    let responseText = "";
    try {
      console.log("Ã°Å¸â€œÂ¡ Parseando resposta JSON...");

      // Debug: Capturar o texto da resposta primeiro
      responseText = await response.text();
      console.log(
        "Ã°Å¸â€œÂ¡ Resposta recebida (texto):",
        responseText.substring(0, 500)
      ); // Primeiros 500 chars

      if (!responseText) {
        throw new Error("Resposta vazia do servidor");
      }

      // Verificar se é HTML (Functions não estÃƒÂ£o funcionando)
      if (
        responseText.trim().startsWith("<!DOCTYPE html") ||
        responseText.trim().startsWith("<html")
      ) {
        console.error(
          "⚠️CRÃƒÂTICO: Cloudflare Functions não estÃƒÂ£o funcionando!"
        );
        console.error(
          "⚠️O servidor está retornando HTML em vez de executar as Functions."
        );
        console.error(
          "⚠️Implementando fallback automÃƒÂ¡tico para API direta do Hubitat..."
        );

        // FALLBACK AUTOMÃƒÂTICO: Usar API direta do Hubitat
        console.log(
          "Ã°Å¸â€â€ž Tentando API direta do Hubitat como fallback..."
        );
        updateProgress(60, "Usando API direta como fallback...");

        try {
          const fallbackData = await loadAllDeviceStatesDirect(ALL_LIGHT_IDS);
          console.log("Ã¢Å“â€¦ Fallback bem-sucedido:", fallbackData);

          // Processar dados do fallback
          const deviceEntries = Object.entries(fallbackData.devices);
          let processedCount = 0;

          deviceEntries.forEach(([deviceId, deviceData]) => {
            if (deviceData.success) {
              setStoredState(deviceId, deviceData.state);
              updateDeviceUI(deviceId, deviceData.state, true);
              console.log(
                `Ã¢Å“â€¦ Device ${deviceId}: ${deviceData.state} (direto)`
              );
            } else {
              const storedState = getStoredState(deviceId) || "off";
              updateDeviceUI(deviceId, storedState, true);
              console.log(
                `Ã¢Å¡Â Ã¯Â¸Â Device ${deviceId}: usando estado salvo "${storedState}"`
              );
            }

            processedCount++;
            const progress = 60 + (processedCount / deviceEntries.length) * 35;
            updateProgress(
              progress,
              `Processando ${processedCount}/${deviceEntries.length}...`
            );
          });

          updateProgress(100, "Carregamento via API direta Concluído!");

          // ForÃƒÂ§ar atualizaÃƒÂ§ÃƒÂ£o dos botÃƒÂµes master
          setTimeout(() => {
            updateAllMasterButtons();
            console.log(
              "Ã°Å¸â€â€ž BotÃƒÂµes master atualizados apÃƒÂ³s fallback"
            );
          }, 100);

          console.log(
            "Ã¢Å“â€¦ Fallback automÃƒÂ¡tico Concluído com sucesso"
          );
          return true;
        } catch (fallbackError) {
          console.error("⚠️Fallback também falhou:", fallbackError);

          // ÃƒÅ¡ltimo recurso: usar estados salvos
          console.log(
            "Ã°Å¸â€œÂ¦ Usando estados salvos como ÃƒÂºltimo recurso..."
          );
          ALL_LIGHT_IDS.forEach((deviceId) => {
            const storedState = getStoredState(deviceId) || "off";
            updateDeviceUI(deviceId, storedState, true);
          });

          throw new Error(
            "Functions não funcionam e API direta também falhou - usando estados salvos"
          );
        }
      }

      // Tentar parsear o JSON
      data = JSON.parse(responseText);
      console.log("Ã°Å¸â€œÂ¡ JSON parseado com sucesso");
    } catch (jsonError) {
      console.error("⚠️Erro ao parsear JSON:", jsonError);
      console.error(
        "⚠️ConteÃƒÂºdo da resposta que falhou:",
        responseText?.substring(0, 200)
      );
      throw new Error(`Resposta invÃƒÂ¡lida do servidor: ${jsonError.message}`);
    }
    console.log("Ã°Å¸â€œÂ¡ Estados recebidos:", data);

    // NormalizaÃƒÂ§ÃƒÂ£o do formato de resposta:
    // Formato antigo esperado: { devices: { id: { state, success } } }
    // Novo formato (Cloudflare Function refatorada): { success:true, data:[ { id, attributes:[{name:'switch', currentValue:'on'}] } ] }
    if (!data.devices) {
      try {
        if (Array.isArray(data.data)) {
          console.log(
            "Ã°Å¸â€â€ž Normalizando",
            data.data.length,
            "dispositivos do formato novo..."
          );
          const mapped = {};
          data.data.forEach((d, index) => {
            if (!d || !d.id) {
              console.warn(`Ã¢Å¡Â Ã¯Â¸Â Dispositivo ${index} invÃƒÂ¡lido:`, d);
              return;
            }

            let state = "off";
            let level = null;

            if (Array.isArray(d.attributes)) {
              // Formato antigo: attributes é array de objetos
              const sw = d.attributes.find((a) => a.name === "switch");
              if (sw) {
                state = sw?.currentValue || sw?.value || "off";
              }

              const levelAttr = d.attributes.find((a) => a.name === "level");
              if (levelAttr) {
                level = levelAttr?.currentValue ?? levelAttr?.value ?? level;
              }
            } else if (d.attributes && typeof d.attributes === "object") {
              // Formato atual: attributes é objeto direto com propriedades
              if (d.attributes.switch !== undefined) {
                state = d.attributes.switch;
                console.log(`Ã°Å¸â€œâ€¹ Device ${d.id}: switch=${state}`);
              } else {
                console.log(
                  `Ã°Å¸â€Ëœ Device ${d.id}: não é lÃƒÂ¢mpada (sem atributo 'switch'), pulando...`
                );
                return; // Pular dispositivos sem switch (botÃƒÂµes, sensores, etc.)
              }

              if (d.attributes.level !== undefined) {
                level = d.attributes.level;
              }
            } else {
              console.warn(
                `Ã¢Å¡Â Ã¯Â¸Â Device ${d.id}: attributes invÃƒÂ¡lido:`,
                d.attributes
              );
            }

            mapped[d.id] = { state, level, success: true };
          });
          data.devices = mapped;
          console.log(
            "Ã°Å¸â€â€ž Resposta normalizada para formato devices (",
            Object.keys(mapped).length,
            "dispositivos )"
          );
          console.log("Ã°Å¸â€Â Estados finais mapeados:", mapped);
        } else {
          throw new Error(
            "Formato de resposta inesperado: falta campo devices e data[]"
          );
        }
      } catch (normError) {
        console.error("⚠️Falha ao normalizar resposta:", normError);
        throw normError;
      }
    }

    updateProgress(70, "Processando estados...");

    // Processar dispositivos com progresso
    const deviceEntries = Object.entries(data.devices || {});
    console.log(`Processando ${deviceEntries.length} dispositivos...`);
    let processedCount = 0;

    await processDeviceEntries(deviceEntries);

    function handleDeviceEntry(deviceId, deviceData) {
      if (deviceData.success) {
        setStoredState(deviceId, deviceData.state);
        updateDeviceUI(
          deviceId,
          { state: deviceData.state, level: deviceData.level },
          true
        ); // forceUpdate = true
      } else {
        console.warn(`Falha no device ${deviceId}:`, deviceData.error);
        const storedState = getStoredState(deviceId) || "off";
        updateDeviceUI(deviceId, storedState, true); // forceUpdate = true
      }

      processedCount++;
      const progress = 70 + (processedCount / deviceEntries.length) * 25;
      updateProgress(
        progress,
        `Aplicando estado ${processedCount}/${deviceEntries.length}...`
      );
    }

    function scheduleChunk(callback) {
      if (
        typeof window !== "undefined" &&
        typeof window.requestIdleCallback === "function"
      ) {
        window.requestIdleCallback(callback, { timeout: 120 });
      } else {
        setTimeout(callback, 16);
      }
    }

    function processDeviceEntries(entries) {
      return new Promise((resolve) => {
        let index = 0;
        const CHUNK_SIZE = 20;

        const runChunk = (deadline) => {
          const hasDeadline =
            deadline && typeof deadline.timeRemaining === "function";
          let processedInChunk = 0;

          while (index < entries.length) {
            const current = entries[index++];
            handleDeviceEntry(current[0], current[1]);
            processedInChunk += 1;

            if (processedInChunk >= CHUNK_SIZE) {
              break;
            }

            if (hasDeadline && deadline.timeRemaining() <= 4) {
              break;
            }
          }

          if (index < entries.length) {
            scheduleChunk(runChunk);
          } else {
            resolve();
          }
        };

        runChunk();
      });
    }

    updateProgress(95, "Finalizando sincronizaÃƒÂ§ÃƒÂ£o...");

    // ForÃƒÂ§ar atualizaÃƒÂ§ÃƒÂ£o de todos os botÃƒÂµes master apÃƒÂ³s carregamento
    setTimeout(() => {
      updateAllMasterButtons();
      console.log(
        "Ã°Å¸â€â€ž BotÃƒÂµes master atualizados apÃƒÂ³s carregamento global"
      );
    }, 100);

    updateProgress(100, "Estados carregados com sucesso!");
    console.log("Ã¢Å“â€¦ Carregamento global Concluído com sucesso");
    return true;
  } catch (error) {
    console.error("⚠️Erro no carregamento global:", error);

    // Tentar diagnÃƒÂ³stico automÃƒÂ¡tico da Conexão
    try {
      console.log("Ã°Å¸â€Â§ Executando diagnÃƒÂ³stico da Conexão...");
      const connectionTest = await testHubitatConnection();
      if (!connectionTest) {
        showErrorMessage(
          "Falha na Conexão com Hubitat. Verifique se as Configurações foram alteradas no painel do Cloudflare."
        );
      }
    } catch (diagError) {
      console.error("Erro no diagnÃƒÂ³stico:", diagError);
    }

    // Tratamento inteligente de erro com retry automÃƒÂ¡tico
    if (error.name === "AbortError") {
      console.warn("Ã¢ÂÂ±Ã¯Â¸Â Timeout apÃƒÂ³s mÃƒÂºltiplas tentativas");
      updateProgress(60, "Timeout - usando backup...");
      showErrorMessage(
        "Timeout na Conexão. Verifique sua internet e tente novamente."
      );
    } else if (error.message.includes("Falha apÃƒÂ³s")) {
      console.warn("Ã°Å¸â€â€ž MÃƒÂºltiplas tentativas falharam");
      updateProgress(60, "Falhas mÃƒÂºltiplas - modo backup...");
      showErrorMessage(
        "Servidor temporariamente indisponível. Usando dados salvos."
      );
    } else if (error.name === "TypeError" && error.message.includes("fetch")) {
      console.warn("Ã°Å¸Å’Â Problema de conectividade de rede");
      updateProgress(60, "Sem rede - modo offline...");
      showErrorMessage("Sem Conexão com a internet. Modo offline ativado.");
    } else if (error.message.includes("HTTP 5")) {
      console.warn("Ã°Å¸â€Â¥ Erro no servidor (5xx)");
      updateProgress(60, "Erro servidor - backup...");
      showErrorMessage(
        "Problema no servidor. Usando ÃƒÂºltimos dados conhecidos."
      );
    } else {
      console.warn("⚠️Erro desconhecido no carregamento:", error.message);
      updateProgress(60, "Erro geral - usando backup...");
      showErrorMessage("Erro no carregamento. Usando dados salvos localmente.");
    }

    // Fallback para localStorage
    ALL_LIGHT_IDS.forEach((deviceId, index) => {
      const storedState = getStoredState(deviceId) || "off";
      updateDeviceUI(deviceId, storedState, true); // forceUpdate = true

      const progress = 60 + ((index + 1) / ALL_LIGHT_IDS.length) * 35;
      updateProgress(
        progress,
        `Carregando backup ${index + 1}/${ALL_LIGHT_IDS.length}...`
      );
    });

    const offlineMsg = "Carregamento Concluído (modo offline)";
    updateProgress(100, offlineMsg);
    return false;
  }
}

// Verificar compatibilidade com mobile
function checkMobileCompatibility() {
  const issues = [];
  const warnings = [];

  // APIs crÃƒÂ­ticas (falha total se não existirem)
  if (typeof fetch === "undefined") {
    issues.push("Fetch API não suportada");
  }

  if (typeof Promise === "undefined") {
    issues.push("Promises não suportadas");
  }

  // APIs opcionais (warnings apenas)
  if (typeof MutationObserver === "undefined") {
    warnings.push("MutationObserver não suportado (usar fallback)");
  }

  if (typeof AbortController === "undefined") {
    warnings.push("AbortController não suportado (sem timeout)");
  }

  if (typeof localStorage === "undefined") {
    warnings.push("LocalStorage não suportado (sem persistÃƒÂªncia)");
  }

  // Testar localStorage funcionamento
  try {
    const testKey = "__test_ls__";
    localStorage.setItem(testKey, "test");
    localStorage.removeItem(testKey);
  } catch (e) {
    warnings.push("LocalStorage bloqueado (modo privado?)");
  }

  if (warnings.length > 0) {
    console.warn("Ã¢Å¡Â Ã¯Â¸Â Avisos de compatibilidade:", warnings);
  }

  if (issues.length > 0) {
    console.error("⚠️Problemas crÃƒÂ­ticos detectados:", issues);
    return false;
  }

  console.log("Ã¢Å“â€¦ Compatibilidade mobile verificada");
  return true;
}

// Fade de scroll no rodape (remover quando chega ao fim da lista)
const scrollFadeContainers = new Set();
let scrollFadeResizeTimer = null;
let scrollFadeResizeBound = false;

function updateScrollFade(container) {
  if (!container || !container.classList) return;
  const maxScroll = container.scrollHeight - container.clientHeight;
  if (!Number.isFinite(maxScroll) || maxScroll <= 1) {
    container.classList.remove(
      "scroll-fade-active",
      "scroll-fade-start",
      "scroll-fade-end"
    );
    return;
  }
  const atTop = container.scrollTop <= 1;
  const atBottom = container.scrollTop >= maxScroll - 1;
  container.classList.add("scroll-fade-active");
  container.classList.toggle("scroll-fade-start", atTop);
  container.classList.toggle("scroll-fade-end", atBottom);
}

function registerScrollFade(container) {
  if (!container || !container.classList || scrollFadeContainers.has(container)) {
    return;
  }
  scrollFadeContainers.add(container);
  const handler = () => updateScrollFade(container);
  container.addEventListener("scroll", handler, { passive: true });
  updateScrollFade(container);
  setTimeout(() => updateScrollFade(container), 120);

  if (!scrollFadeResizeBound) {
    scrollFadeResizeBound = true;
    window.addEventListener("resize", () => {
      if (scrollFadeResizeTimer) clearTimeout(scrollFadeResizeTimer);
      scrollFadeResizeTimer = setTimeout(() => {
        scrollFadeContainers.forEach((el) => updateScrollFade(el));
      }, 150);
    });
  }
}

function setupScrollFadeContainers(root = document) {
  if (!root || !root.querySelectorAll) return;
  const selectors = [
    ".ambiente-grid",
    ".controls-grid",
    "[class*=-luzes-wrapper]",
    "[class*=-cortinas-wrapper]",
    "[class*=-piscina-wrapper]",
  ];
  const nodes = root.querySelectorAll(selectors.join(","));
  nodes.forEach((node) => registerScrollFade(node));
  if (root.matches && selectors.some((sel) => root.matches(sel))) {
    registerScrollFade(root);
  }
}

// Observador para sincronizar novos elementos no DOM
function setupDomObserver() {
  const root = document.getElementById("spa-root") || document.body;

  // Aplicar tokens e overrides de ícones imediatamente
  applyUiTokens(root);
  applyIconOverrides(root);
  setupScrollFadeContainers(root);

  primeControlCaches({ root: root, force: true });
  pruneStaleEntries();
  scheduleControlSync(true);

  if (typeof MutationObserver === "undefined") {
    console.warn(
      "MutationObserver indisponivel - usando fallback de sincronizacao periodica"
    );
    if (fallbackSyncTimer) {
      clearInterval(fallbackSyncTimer);
    }
    fallbackSyncTimer = setInterval(function () {
      syncAllVisibleControls();
    }, 8000);
    return;
  }

  try {
    if (fallbackSyncTimer) {
      clearInterval(fallbackSyncTimer);
      fallbackSyncTimer = null;
    }

    if (domObserverInstance) {
      domObserverInstance.disconnect();
    }

    domObserverInstance = new MutationObserver(function (mutations) {
      let changed = false;

      mutations.forEach(function (mutation) {
        mutation.removedNodes.forEach(function (node) {
          if (removeControlsFromNode(node)) {
            changed = true;
          }
        });

        mutation.addedNodes.forEach(function (node) {
          if (collectControlsFromNode(node)) {
            changed = true;
          }

          // Aplicar tokens/overrides somente no que entrou
          try {
            if (node && node.querySelectorAll) {
              applyUiTokens(node);
              applyIconOverrides(node);
              setupScrollFadeContainers(node);
            }
          } catch (e) {
            // ignore
          }
        });
      });

      if (changed) {
        scheduleControlSync(true);
      }
    });

    domObserverInstance.observe(root, {
      childList: true,
      subtree: true,
    });
  } catch (error) {
    console.error("Erro ao configurar MutationObserver:", error);
    console.warn("Usando fallback de sincronizacao periodica.");
    if (fallbackSyncTimer) {
      clearInterval(fallbackSyncTimer);
    }
    fallbackSyncTimer = setInterval(function () {
      syncAllVisibleControls();
    }, 8000);
  }
}

// Sincronizar todos os controles visÃƒÂ­veis com estados salvos
function syncAllVisibleControls(forceMasterUpdate = false) {
  pruneStaleEntries();

  debugLog(() => [
    "syncAllVisibleControls",
    { devices: deviceControlCache.size, force: forceMasterUpdate },
  ]);

  let updatedControls = 0;

  deviceControlCache.forEach(function (registry, deviceId) {
    if (!registry || registry.size === 0) {
      deviceControlCache.delete(deviceId);
      return;
    }

    const savedState = getStoredState(deviceId);
    const hasState = savedState !== null && savedState !== undefined;

    if (!hasState) {
      return;
    }

    registry.forEach(function (el) {
      if (!el.isConnected) {
        registry.delete(el);
        return;
      }

      const currentState = el.dataset.state;
      if (currentState !== savedState || forceMasterUpdate) {
        setRoomControlUI(el, savedState);
        updatedControls += 1;
      }
    });

    if (registry.size === 0) {
      deviceControlCache.delete(deviceId);
    }
  });

  masterButtonCache.forEach(function (btn) {
    if (!btn.isConnected) {
      masterButtonCache.delete(btn);
      return;
    }

    const ids = (btn.dataset.deviceIds || "")
      .split(",")
      .map(function (id) {
        return id.trim();
      })
      .filter(Boolean);

    if (ids.length === 0) {
      return;
    }

    const masterState = anyOn(ids) ? "on" : "off";
    setMasterIcon(btn, masterState, forceMasterUpdate);
  });

  debugLog(() => ["syncAllVisibleControls:updated", updatedControls]);
}

// Comandos de debug globais
window.debugEletrize = {
  forcePolling: updateDeviceStatesFromServer,
  reloadStates: loadAllDeviceStatesGlobally,
  syncControls: syncAllVisibleControls,
  showLoader: showLoader,
  hideLoader: hideLoader,
  checkDevice: (deviceId) => {
    const stored = getStoredState(deviceId);
    console.log(`Device ${deviceId}: stored=${stored}`);
  },
  checkAllDevices: () => {
    console.log("Ã°Å¸â€œâ€¹ Estados de todos os dispositivos:");
    ALL_LIGHT_IDS.forEach((deviceId) => {
      const stored = getStoredState(deviceId);
      console.log(`  ${deviceId}: ${stored}`);
    });
  },
  testSetState: (deviceId, state) => {
    console.log(`Ã°Å¸Â§Âª Testando setState(${deviceId}, ${state})`);
    setStoredState(deviceId, state);
    updateDeviceUI(deviceId, state, true);
    console.log(`Ã¢Å“â€¦ Teste completo`);
  },
  clearAllStates: () => {
    console.log("Limpando todos os estados salvos...");
    ALL_LIGHT_IDS.forEach((deviceId) => {
      deviceStateMemory.delete(deviceId);
      try {
        localStorage.removeItem(deviceStateKey(deviceId));
      } catch (e) {
        debugLog(() => ["Falha ao limpar estado local", deviceId, e]);
      }
    });
    console.log("Estados limpos");
  },
  checkProtectedCommands: () => {
    console.log("Ã°Å¸â€ºÂ¡Ã¯Â¸Â Comandos protegidos:");
    if (recentCommands.size === 0) {
      console.log("  Ã¢Å“â€¦ Nenhum comando protegido");
      return;
    }
    const now = Date.now();
    recentCommands.forEach((timestamp, deviceId) => {
      const remaining = Math.max(0, COMMAND_PROTECTION_MS - (now - timestamp));
      const status = remaining > 0 ? "Ã°Å¸â€â€™ ATIVO" : "Ã°Å¸â€â€œ EXPIRADO";
      console.log(
        `  ${status} ${deviceId}: ${Math.ceil(remaining / 1000)}s restantes`
      );
    });
  },
  testMasterLoading: () => {
    console.log("Ã°Å¸â€â€ž Testando loading nos botÃƒÂµes master...");
    const masters = document.querySelectorAll(".room-master-btn");
    const scenes = document.querySelectorAll(".scene-control-card");

    console.log("BotÃƒÂµes master encontrados:", masters.length);
    console.log("BotÃƒÂµes de cenÃƒÂ¡rio encontrados:", scenes.length);

    // Testar botÃƒÂµes master da home
    masters.forEach((btn, index) => {
      console.log(`Testando botÃƒÂ£o master ${index + 1}:`, btn);
      setTimeout(() => {
        setMasterButtonLoading(btn, true);
        setTimeout(() => {
          setMasterButtonLoading(btn, false);
        }, 3000);
      }, index * 200);
    });

    // Testar botÃƒÂ£o de cenÃƒÂ¡rios também
    scenes.forEach((btn, index) => {
      setTimeout(() => {
        setMasterButtonLoading(btn, true);
        setTimeout(() => {
          setMasterButtonLoading(btn, false);
        }, 3000);
      }, (masters.length + index) * 200);
    });
  },
  checkMasterButtons: () => {
    console.log("Ã°Å¸ÂÂ  Status dos botÃƒÂµes master:");
    document.querySelectorAll(".room-master-btn").forEach((btn, index) => {
      const ids = (btn.dataset.deviceIds || "").split(",").filter(Boolean);
      const route = btn.dataset.route || "unknown";
      const pending = btn.dataset.pending === "true";
      const currentState = btn.dataset.state || "unknown";
      const calculatedState = anyOn(ids) ? "on" : "off";
      const consistent = currentState === calculatedState;

      console.log(
        `  ${index + 1}. ${route}: ${currentState} (calc: ${calculatedState}) ${
          consistent ? "Ã¢Å“â€¦" : "Ã¢ÂÅ’"
        } ${pending ? "Ã¢ÂÂ³" : "Ã°Å¸â€â€œ"}`
      );
    });
  },
  fixMasterButtons: () => {
    console.log("Ã°Å¸â€Â§ Corrigindo todos os botÃƒÂµes master...");
    document.querySelectorAll(".room-master-btn").forEach((btn) => {
      btn.dataset.pending = "false";
      const ids = (btn.dataset.deviceIds || "").split(",").filter(Boolean);
      const state = anyOn(ids) ? "on" : "off";
      setMasterIcon(btn, state, true);
    });
    console.log("Ã¢Å“â€¦ BotÃƒÂµes master corrigidos!");
  },
  mobileInfo: () => {
    console.log("Ã°Å¸â€œÂ± InformaÃƒÂ§ÃƒÂµes do dispositivo mÃƒÂ³vel:");
    console.log("  isMobile:", isMobile);
    console.log("  isIOS:", isIOS);
    console.log("  isProduction:", isProduction);
    console.log("  User Agent:", navigator.userAgent);
    console.log("  App Version:", APP_VERSION);
    try {
      console.log(
        "  ÃƒÅ¡ltima carga:",
        new Date(parseInt(localStorage.getItem("last_mobile_load") || "0"))
      );
      console.log("  Versão cache:", localStorage.getItem("app_version"));
    } catch (e) {
      console.log("  localStorage indisponível");
    }
  },
  clearMobileCache: () => {
    console.log("Ã°Å¸Â§Â¹ Limpando cache mobile...");
    try {
      localStorage.removeItem("app_version");
      localStorage.removeItem("last_mobile_load");
      localStorage.removeItem("app_cache_version");
      sessionStorage.clear();
      console.log("Ã¢Å“â€¦ Cache mobile limpo! Recarregue a página.");
    } catch (e) {
      console.error("⚠️Erro ao limpar cache:", e);
    }
  },
  forceMobileReload: () => {
    console.log("Ã°Å¸â€â€ž ForÃƒÂ§ando recarga mobile com limpeza de cache...");
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch (e) {}
    setTimeout(() => {
      window.location.reload(true);
    }, 1000);
  },
  checkMobileCache: () => {
    console.log("Ã°Å¸â€Â Status do cache mobile:");
    try {
      const version = localStorage.getItem("app_version");
      const lastLoad = localStorage.getItem("last_mobile_load");
      const now = new Date().getTime();

      console.log("  App Version atual:", APP_VERSION);
      console.log("  Versão em cache:", version);
      console.log("  Cache vÃƒÂ¡lido:", version === APP_VERSION);

      if (lastLoad) {
        const age = Math.floor((now - parseInt(lastLoad)) / 60000); // minutos
        console.log("  Idade do cache:", age, "minutos");
        console.log("  Cache expirado:", age > 60);
      } else {
        console.log("  Primeira carga detectada");
      }
    } catch (e) {
      console.error("  Erro na verificaÃƒÂ§ÃƒÂ£o:", e);
    }
    console.log("  Screen:", `${screen.width}x${screen.height}`);
    console.log("  Viewport:", `${window.innerWidth}x${window.innerHeight}`);
    console.log(
      "  Connection:",
      navigator.connection
        ? `${navigator.connection.effectiveType} (${navigator.connection.downlink}Mbps)`
        : "não disponível"
    );
    checkMobileCompatibility();
  },
  testMobileApi: async () => {
    console.log("Ã°Å¸Â§Âª Testando APIs para mobile...");
    try {
      const testUrl = isProduction ? `${POLLING_URL}?devices=366` : "#test";
      // Configurar timeout compatÃƒÂ­vel
      const fetchConfig = {
        method: "GET",
        cache: "no-cache",
      };

      // Adicionar timeout se AbortController for suportado
      if (typeof AbortController !== "undefined") {
        const testController = new AbortController();
        setTimeout(() => testController.abort(), 5000);
        fetchConfig.signal = testController.signal;
      }

      const response = await fetch(testUrl, fetchConfig);
      console.log("Ã¢Å“â€¦ Fetch test:", response.status, response.statusText);
    } catch (error) {
      console.error("⚠️Fetch test failed:", error);
    }
  },
};

/* --- Music player metadata update functions --- */

// Função para atualizar metadados do Denon
function updateDenonMetadata() {
  console.log("🎵 [updateDenonMetadata] INICIANDO - Hash atual:", window.location.hash);

  // Pedir ao Cloudflare function para retornar o JSON completo do Hubitat
  // (a function usa a variÃƒÂ¡vel HUBITAT_FULL_URL do ambiente quando configurada)
  fetch(`${POLLING_URL}?full=1`)
    .then(async (response) => {
      if (!response.ok) {
        const text = await response.text().catch(() => "<no body>");
        throw new Error(`HTTP error! status: ${response.status} - ${text}`);
      }
      // Tentar analisar JSON, mas capturar e mostrar texto cru se falhar
      try {
        return await response.json();
      } catch (err) {
        const rawText = await response
          .text()
          .catch(() => "<non-readable body>");
        throw new Error(`Invalid JSON response from polling: ${rawText}`);
      }
    })
    .then((data) => {
      console.log("Ã°Å¸Å½Âµ Resposta completa do Hubitat:", data);

      // Procurar o Denon AVR pelos metadados (ID 29) nos dados
      // O formato pode ser um array direto ou um objeto com propriedade devices
      const devices = Array.isArray(data) ? data : data.devices || [];
      // O ID do dispositivo que fornece metadados do Denon é 29
      const DENON_METADATA_DEVICE_ID = "29";
      let denonDevice = devices.find(
        (device) =>
          String(device.id) === DENON_METADATA_DEVICE_ID ||
          device.id === parseInt(DENON_METADATA_DEVICE_ID, 10)
      );
      // Fallback: procurar por dispositivos cujo nome/label contenha 'denon', 'receiver' ou 'av'
      if (!denonDevice) {
        denonDevice = devices.find((device) => {
          const name = String(device.name || device.label || "").toLowerCase();
          return (
            name.includes("denon") ||
            name.includes("receiver") ||
            name.includes("av")
          );
        });
        if (denonDevice)
          console.log(
            "Ã°Å¸â€Å½ Denon metadata device encontrado por name/label:",
            denonDevice
          );
      }

      if (denonDevice) {
        console.log("Denon encontrado:", denonDevice);
        const metadataPowerState = getDenonPowerStateFromDevice(denonDevice);
        if (metadataPowerState) {
          applyDenonPowerState(metadataPowerState);
        }
        console.log("Ã°Å¸Å½Âµ Atributos do Denon:", denonDevice.attributes);

        // Extrair metadados - o formato pode variar
        let artist = "Desconhecido";
        let track = "Sem tÃƒÂ­tulo";
        let album = "ÃƒÂlbum desconhecido";
        let albumArt = null;
        let playbackStatus = null;
        let trackDataRaw = null;
        let trackDataObj = null;

        // Tentar extrair de diferentes formatos possÃƒÂ­veis
        if (Array.isArray(denonDevice.attributes)) {
          // Formato array: [{name: "artist", currentValue: "..."}, ...]
          const artistAttr = denonDevice.attributes.find(
            (attr) => attr.name === "artist" || attr.name === "trackArtist"
          );
          const trackAttr = denonDevice.attributes.find(
            (attr) => attr.name === "trackDescription" || attr.name === "track"
          );
          const albumAttr = denonDevice.attributes.find(
            (attr) => attr.name === "albumName" || attr.name === "album"
          );
          const albumArtAttr = denonDevice.attributes.find(
            (attr) => {
              const name = attr.name?.toLowerCase();
              return (
                name === "albumarturl" ||
                name === "albumarturi" ||
                name === "currentalbumarturl" ||
                name === "currentalbumarturi" ||
                name === "enqueuedmetadataalbumarturl" ||
                name === "enqueuedmetadataalbumarturi" ||
                name === "albumart" ||
                name === "artworkurl" ||
                name === "imageurl"
              );
            }
          );
          const statusAttr = denonDevice.attributes.find((attr) => {
            const attrName = String(attr?.name || "").toLowerCase();
            return (
              attrName === "status" ||
              attrName === "playbackstatus" ||
              attrName === "playerstatus" ||
              attrName === "transportstate"
            );
          });
          const trackDataAttr = denonDevice.attributes.find(
            (attr) => attr.name === "trackData" || attr.name === "trackdata"
          );

          artist = artistAttr?.currentValue || artistAttr?.value || artist;
          track = trackAttr?.currentValue || trackAttr?.value || track;
          album = albumAttr?.currentValue || albumAttr?.value || album;
          
          // Extrair albumArt e processar (pode ser URL direta ou HTML)
          const rawAlbumArt = albumArtAttr?.currentValue || albumArtAttr?.value;
          if (rawAlbumArt && typeof rawAlbumArt === "string") {
            const albumArtValue = rawAlbumArt.trim();
            if (albumArtValue.startsWith('http://') || albumArtValue.startsWith('https://')) {
              albumArt = albumArtValue;
              console.log("🎵 [array] albumArt é URL direta:", albumArt);
            } else if (albumArtValue.includes('<img') || albumArtValue.includes('src=')) {
              const imgMatch = albumArtValue.match(/src=['"]([^'"]+)['"]/);
              albumArt = imgMatch ? imgMatch[1] : null;
              console.log("🎵 [array] albumArt extraído de HTML:", albumArt);
            } else {
              albumArt = albumArtValue;
              console.log("🎵 [array] albumArt valor direto:", albumArt);
            }
          }
          
          playbackStatus =
            statusAttr?.currentValue || statusAttr?.value || playbackStatus;
          trackDataRaw =
            trackDataAttr?.currentValue || trackDataAttr?.value || trackDataRaw;
        } else if (
          denonDevice.attributes &&
          typeof denonDevice.attributes === "object"
        ) {
          // Formato objeto: {artist: "...", trackDescription: "...", track: "...", album: "...", ...}
          artist = denonDevice.attributes.artist || artist;
          track = denonDevice.attributes.track || track;
          album = denonDevice.attributes.album || album;
          playbackStatus =
            denonDevice.attributes.status ||
            denonDevice.attributes.playbackStatus ||
            denonDevice.attributes.playerStatus ||
            denonDevice.attributes.transportState ||
            playbackStatus;
          trackDataRaw = denonDevice.attributes.trackData || trackDataRaw;

          // Para albumArt, verificar se já é uma URL ou se precisa extrair de tag HTML
          if (
            denonDevice.attributes.albumArt &&
            typeof denonDevice.attributes.albumArt === "string"
          ) {
            const albumArtValue = denonDevice.attributes.albumArt.trim();
            
            // Se já começa com http/https, é uma URL direta
            if (albumArtValue.startsWith('http://') || albumArtValue.startsWith('https://')) {
              albumArt = albumArtValue;
              console.log("🎵 albumArt é URL direta:", albumArt);
            } 
            // Senão, tentar extrair de tag HTML <img src="...">
            else if (albumArtValue.includes('<img') || albumArtValue.includes('src=')) {
              const imgMatch = albumArtValue.match(/src=['"]([^'"]+)['"]/);
              albumArt = imgMatch ? imgMatch[1] : null;
              console.log("🎵 albumArt extraído de HTML:", albumArt);
            }
            // Pode ser um caminho relativo ou outro formato
            else {
              albumArt = albumArtValue;
              console.log("🎵 albumArt valor direto:", albumArt);
            }
          }

          // Se não encontrou albumArt, tentar extrair do trackData JSON
          if (!albumArt && denonDevice.attributes.trackData) {
            try {
              const trackData =
                typeof denonDevice.attributes.trackData === "string"
                  ? JSON.parse(denonDevice.attributes.trackData)
                  : denonDevice.attributes.trackData;
              trackDataObj = trackData;
              albumArt = trackData.image_url || albumArt;
            } catch (e) {
              console.warn("Ã¢Å¡Â Ã¯Â¸Â Erro ao parsear trackData:", e);
            }
          }
        }

        if (!trackDataObj && trackDataRaw) {
          try {
            trackDataObj =
              typeof trackDataRaw === "string"
                ? JSON.parse(trackDataRaw)
                : trackDataRaw;
          } catch (e) {
            console.warn("Ã¢Å¡Â Ã¯Â¸Â Erro ao parsear trackData (raw):", e);
          }
        }

        if (
          !albumArt &&
          trackDataObj &&
          typeof trackDataObj.image_url === "string"
        ) {
          albumArt = trackDataObj.image_url;
        }

        let derivedPlaybackStatus = interpretPlaybackStatus(playbackStatus);
        if (derivedPlaybackStatus === null && trackDataObj) {
          const trackDataStatus =
            trackDataObj.play_state ||
            trackDataObj.player_state ||
            trackDataObj.state ||
            trackDataObj.status ||
            trackDataObj.transport_state;
          derivedPlaybackStatus = interpretPlaybackStatus(trackDataStatus);
        }

        if (derivedPlaybackStatus !== null) {
          window.musicPlayerUI.currentPlaying = derivedPlaybackStatus;
          if (
            window.musicPlayerUI &&
            typeof window.musicPlayerUI.setPlaying === "function"
          ) {
            window.musicPlayerUI.setPlaying(derivedPlaybackStatus);
          }
        }

        console.log("🎵 Metadados extraídos:", {
          artist,
          track,
          album,
          albumArt,
        });
        
        // Debug: se albumArt não foi encontrado, listar todos os atributos disponíveis
        if (!albumArt) {
          console.log("⚠️ Album art não encontrado. Atributos disponíveis no dispositivo 29:");
          if (Array.isArray(denonDevice.attributes)) {
            denonDevice.attributes.forEach(attr => {
              const name = attr.name?.toLowerCase() || '';
              if (name.includes('art') || name.includes('image') || name.includes('url') || name.includes('uri') || name.includes('album')) {
                console.log(`   - ${attr.name}: ${attr.currentValue || attr.value}`);
              }
            });
          } else if (denonDevice.attributes) {
            Object.keys(denonDevice.attributes).forEach(key => {
              const keyLower = key.toLowerCase();
              if (keyLower.includes('art') || keyLower.includes('image') || keyLower.includes('url') || keyLower.includes('uri') || keyLower.includes('album')) {
                console.log(`   - ${key}: ${denonDevice.attributes[key]}`);
              }
            });
          }
        }
        
        artist = normalizePortugueseText(artist);
        track = normalizePortugueseText(track);
        album = normalizePortugueseText(album);

        // Atualizar UI
        updateMusicPlayerUI(artist, track, album, albumArt);
      } else {
        console.log(
          "Ã¢Å¡Â Ã¯Â¸Â Denon AVR (ID 29) (metadados) não encontrado nos dados"
        );
        console.log(
          "Dispositivos disponÃƒÂ­veis:",
          devices.map((d) => ({ id: d.id, name: d.name || d.label }))
        );
      }
    })
    .catch((error) => {
      console.error("⚠️Erro ao buscar metadados do Denon:", error);
      // Tentar logar a resposta bruta para debug adicional via endpoint de polling
      fetch(`${POLLING_URL}?full=1`)
        .then((res) => res.text())
        .then((t) => console.log("Raw polling response (debug):", t))
        .catch((e) =>
          console.warn(
            "não foi possível obter resposta bruta de /polling:",
            e
          )
        );
    });
}

// Função para atualizar a UI do player com os metadados
function updateMusicPlayerUI(artist, track, album, albumArt) {
  artist = normalizePortugueseText(artist);
  track = normalizePortugueseText(track);
  album = normalizePortugueseText(album);

  // Obter elementos do DOM
  const artistElement = queryActiveMusic("#music-artist");
  const trackElement = queryActiveMusic("#music-track");
  const albumImgElement = queryActiveMusic(".music-album-img");
  const activePage = document.querySelector(".page.active");

  // tentar descobrir o ambiente atual a partir da classe da página (ex: 'ambiente2-page')
  let currentEnvKey = null;
  if (activePage && activePage.classList) {
    for (const cls of activePage.classList) {
      const m = cls.match(/^(.+)-page$/);
      if (m) {
        currentEnvKey = m[1];
        break;
      }
    }
  }

  // placeholder de capa depende apenas do config.js; se nÃ£o houver, fica vazio
  const albumPlaceholder = "images/images/music-placeholder.png";

  // Atualizar texto se os elementos existirem
  if (artistElement) artistElement.textContent = artist;
  if (activePage) {
    activePage
      .querySelectorAll(".music-artist-sync")
      .forEach((el) => (el.textContent = artist));
  }

  if (trackElement) trackElement.textContent = track;
  if (activePage) {
    activePage
      .querySelectorAll(".music-track-sync")
      .forEach((el) => (el.textContent = track));
  }

  syncMusicTrackMarquee();

  // Atualizar imagem do ÃƒÂ¡lbum
  if (albumImgElement) {
    if (albumArt && albumArt !== "null" && albumArt !== "") {
      albumImgElement.src = albumArt;
      albumImgElement.onerror = function () {
        // Se a imagem falhar, use placeholder, se existir
        this.src = albumPlaceholder;
      };
    } else {
      // Usar placeholder padrão
      albumImgElement.src = albumPlaceholder;
    }
  }

  console.log(`Ã°Å¸Å½Âµ UI atualizada: "${track}" por ${artist} (${album})`);
}

// VariÃƒÂ¡vel global para o intervalo de polling de metadados
let musicMetadataInterval = null;

// Função para iniciar polling especÃƒÂ­fico de metadados do player
function startMusicMetadataPolling() {
  // Parar polling anterior se existir
  stopMusicMetadataPolling();

  console.log("Ã°Å¸Å½Âµ Iniciando polling de metadados a cada 3 segundos");

  // Iniciar novo polling a cada 3 segundos
  musicMetadataInterval = setInterval(() => {
    if (isMusicPageActive()) {
      updateDenonMetadata();
    } else {
      // Se saÃƒÂ­mos da página, parar o polling
      stopMusicMetadataPolling();
    }
  }, 3000);
}

// Função para parar o polling de metadados
function stopMusicMetadataPolling() {
  if (musicMetadataInterval) {
    clearInterval(musicMetadataInterval);
    musicMetadataInterval = null;
    console.log("Ã°Å¸Å½Âµ Polling de metadados parado");
  }
}

/* --- Music player UI handlers (simple local behavior for now) --- */

let musicTrackMarqueeListenersAttached = false;

function syncMusicTrackMarquee() {
  ensureMusicTrackMarqueeListeners();

  const activePage = document.querySelector(".page.active");
  if (!activePage) {
    return;
  }

  const trackElements = activePage.querySelectorAll(
    ".music-track-marquee__text:not(.music-track-marquee__text--clone)"
  );

  trackElements.forEach((trackElement) => {
    const marqueeContainer = trackElement.closest(".music-track-marquee");
    if (!marqueeContainer) {
      return;
    }

    const marqueeInner = marqueeContainer.querySelector(
      ".music-track-marquee__inner"
    );
    if (!marqueeInner) {
      return;
    }

    const cloneElement = marqueeContainer.querySelector(
      ".music-track-marquee__text--clone"
    );
    if (cloneElement) {
      cloneElement.textContent = trackElement.textContent || "";
    }

    marqueeContainer.classList.remove("music-track-marquee--active");
    marqueeContainer.style.removeProperty("--music-track-marquee-duration");

    requestAnimationFrame(() => {
      const containerWidth = marqueeContainer.clientWidth;
      const contentWidth = marqueeInner.scrollWidth;
      const shouldMarquee = contentWidth > containerWidth + 2;

      marqueeContainer.classList.toggle(
        "music-track-marquee--active",
        shouldMarquee
      );

      if (shouldMarquee) {
        const pixelsPerSecond = 80;
        const duration = Math.min(
          24,
          Math.max(10, contentWidth / pixelsPerSecond)
        );
        marqueeContainer.style.setProperty(
          "--music-track-marquee-duration",
          `${duration}s`
        );
      }
    });
  });
}

function ensureMusicTrackMarqueeListeners() {
  if (musicTrackMarqueeListenersAttached) {
    return;
  }

  const handleResize = () => syncMusicTrackMarquee();
  window.addEventListener("resize", handleResize);
  window.addEventListener("orientationchange", handleResize);

  musicTrackMarqueeListenersAttached = true;
}

function initMusicPlayerUI() {
  // Guard clause: verificar se estamos em uma página de música
  if (!isMusicPageActive()) {
    console.log(" Não está em página de música, ignorando initMusicPlayerUI");
    return;
  }

  const playToggleBtn = queryActiveMusic("#music-play-toggle");
  const playTogglePlayIcon = playToggleBtn
    ? playToggleBtn.querySelector(".music-play-toggle__icon--play")
    : null;
  const playTogglePauseIcon = playToggleBtn
    ? playToggleBtn.querySelector(".music-play-toggle__icon--pause")
    : null;
  const nextBtn = queryActiveMusic("#music-next");
  const prevBtn = queryActiveMusic("#music-prev");
  const muteBtn = queryActiveMusic("#music-mute");
  const volumeSlider = queryActiveMusic("#music-volume-slider");
  const volumeSection = queryActiveMusic(".music-volume-section");
  const volumeIconHigh = queryActiveMusic(".volume-icon-high");
  const volumeIconLow = queryActiveMusic(".volume-icon-low");
  const volumeIconMuted = queryActiveMusic(".volume-icon-muted");
  const masterOnBtn = queryActiveMusic("#music-master-on");
  const masterOffBtn = queryActiveMusic("#music-master-off");
  const playerInner = queryActiveMusic(".music-player-inner");

  console.log("Ã°Å¸Å½Âµ Inicializando player de mÃƒÂºsica...", {
    playToggleBtn,
    masterOnBtn,
    masterOffBtn,
  });

  function bindVerticalVolumeSlider(slider) {
    if (!slider || !slider.classList.contains("music-volume-slider--vertical")) {
      return;
    }
    if (slider.dataset.verticalBound === "true") {
      return;
    }
    slider.dataset.verticalBound = "true";

    let pointerActive = false;

    const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

    const updateFromPointer = (event) => {
      const rect = slider.getBoundingClientRect();
      if (!rect.height) return;
      const min = Number(slider.min || 0);
      const max = Number(slider.max || 100);
      const ratio = 1 - (event.clientY - rect.top) / rect.height;
      const value = Math.round(min + clamp(ratio, 0, 1) * (max - min));
      slider.value = String(value);
      slider.dispatchEvent(new Event("input", { bubbles: true }));
    };

    slider.addEventListener("pointerdown", (event) => {
      if (event.button !== undefined && event.button !== 0) return;
      pointerActive = true;
      if (slider.setPointerCapture) slider.setPointerCapture(event.pointerId);
      updateFromPointer(event);
    });

    slider.addEventListener("pointermove", (event) => {
      if (!pointerActive) return;
      if (slider.hasPointerCapture && !slider.hasPointerCapture(event.pointerId)) {
        return;
      }
      updateFromPointer(event);
    });

    const finishPointer = (event) => {
      if (!pointerActive) return;
      pointerActive = false;
      if (slider.releasePointerCapture) {
        slider.releasePointerCapture(event.pointerId);
      }
      slider.dispatchEvent(new Event("change", { bubbles: true }));
    };

    slider.addEventListener("pointerup", finishPointer);
    slider.addEventListener("pointercancel", finishPointer);
  }

  window.musicPlayerUI = window.musicPlayerUI || {};
  const initialPowerState =
    typeof window.musicPlayerUI.currentPowerState === "string"
      ? window.musicPlayerUI.currentPowerState
      : "on";

  if (!playToggleBtn || !nextBtn || !prevBtn) {
    console.warn("Ã¢Å¡Â Ã¯Â¸Â BotÃƒÂµes de controle não encontrados");
    return;
  }

  // Estado do volume
  let isMuted = false;
  let volumeBeforeMute = 50;
  // Guardar estado anterior de mute quando o master for desligado
  let previousMutedState = false;
  let isPlaying = false;

  // Estado master power
  let isPowerOn = initialPowerState === "on";

  function setPlaying(isPlayingValue) {
    isPlaying = !!isPlayingValue;
    playToggleBtn.setAttribute("aria-pressed", isPlaying ? "true" : "false");
    playToggleBtn.classList.toggle("is-playing", isPlaying);

    if (playTogglePlayIcon) {
      playTogglePlayIcon.style.display = isPlaying ? "none" : "block";
    }

    if (playTogglePauseIcon) {
      playTogglePauseIcon.style.display = isPlaying ? "block" : "none";
    }

    playToggleBtn.setAttribute("aria-label", isPlaying ? "Pausar" : "Tocar");
    window.musicPlayerUI.currentPlaying = isPlaying;
  }

  function updateVolumeIcons(volumeValue, muted) {
    if (volumeIconHigh) volumeIconHigh.style.display = "none";
    if (volumeIconLow) volumeIconLow.style.display = "none";
    if (volumeIconMuted) volumeIconMuted.style.display = "none";

    if (muted) {
      if (volumeIconMuted) volumeIconMuted.style.display = "block";
      return;
    }

    const numericVolume = Number.isFinite(volumeValue)
      ? volumeValue
      : parseInt(volumeSlider?.value || "0", 10);
    if (numericVolume >= 50) {
      if (volumeIconHigh) volumeIconHigh.style.display = "block";
    } else {
      if (volumeIconLow) volumeIconLow.style.display = "block";
    }
  }

  function setMuted(muted) {
    isMuted = muted;
    muteBtn.setAttribute("aria-pressed", muted ? "true" : "false");
    volumeSection.setAttribute("data-muted", muted ? "true" : "false");

    if (muted) {
      volumeBeforeMute = parseInt(volumeSlider.value);
      volumeSlider.value = 0;
      volumeSlider.setAttribute("disabled", "true");
      volumeSlider.style.pointerEvents = "none";
      console.log(
        "Ã°Å¸â€â€¡ Volume mutado. Volume anterior:",
        volumeBeforeMute
      );
      // Atualiza a barra visual para 0% quando mutado
      if (typeof updateVolumeBar === "function") updateVolumeBar();
      updateVolumeIcons(0, true);
    } else {
      volumeSlider.value = volumeBeforeMute;
      volumeSlider.removeAttribute("disabled");
      volumeSlider.style.pointerEvents = "auto";
      console.log(
        "Ã°Å¸â€Å  Volume desmutado. Volume restaurado:",
        volumeBeforeMute
      );
      // Atualiza a barra visual para o valor restaurado
      if (typeof updateVolumeBar === "function") updateVolumeBar();
      updateVolumeIcons(parseInt(volumeSlider.value), false);
    }
  }

  // Device IDs (default) Ã¢â‚¬â€ podem ser sobrescritos por data-* no HTML da página ativa
  let DENON_CMD_DEVICE_ID = "354"; // Denon AVR - comandos (volume/mute/power)
  let DENON_MUSIC_DEVICE_ID = "29"; // Denon HEOS - metadados/transport (play/pause/next/prev)

  // Tentar detectar overrides a partir dos atributos data-*
  try {
    const metadataContainer = queryActiveMusic(".music-player-card");
    const ctrlFromEl =
      queryActiveMusic("#music-mute") ||
      queryActiveMusic("#music-volume-slider") ||
      queryActiveMusic("#music-master-on") ||
      queryActiveMusic("#music-master-off");

    if (
      metadataContainer &&
      metadataContainer.dataset &&
      metadataContainer.dataset.metadataDeviceId
    ) {
      DENON_MUSIC_DEVICE_ID = String(
        metadataContainer.dataset.metadataDeviceId
      );
    }

    if (ctrlFromEl && ctrlFromEl.dataset && ctrlFromEl.dataset.deviceId) {
      DENON_CMD_DEVICE_ID = String(ctrlFromEl.dataset.deviceId);
    }
  } catch (e) {
    console.warn(
      "não foi possível ler overrides de IDs de Denon via data-*:",
      e
    );
  }

  playToggleBtn.addEventListener("click", () => {
    const action = isPlaying ? "pause" : "play";
    console.log(
      "Ã°Å¸Å½Âµ Toggle play/pause -> enviando comando",
      action,
      "para device",
      DENON_MUSIC_DEVICE_ID
    );

    sendHubitatCommand(DENON_MUSIC_DEVICE_ID, action)
      .then(() => {
        console.log("Ã¢Å“â€¦ Comando " + action + " enviado com sucesso");
        setPlaying(!isPlaying);
      })
      .catch((err) =>
        console.error("⚠️Erro ao enviar comando " + action + ":", err)
      );
  });

  nextBtn.addEventListener("click", () => {
    console.log(
      "Ã¢ÂÂ­Ã¯Â¸Â Next clicked - enviando comando para device",
      DENON_MUSIC_DEVICE_ID
    );
    sendHubitatCommand(DENON_MUSIC_DEVICE_ID, "nextTrack")
      .then(() => console.log("Ã¢Å“â€¦ Comando nextTrack enviado com sucesso"))
      .catch((err) =>
        console.error("⚠️Erro ao enviar comando nextTrack:", err)
      );
  });

  prevBtn.addEventListener("click", () => {
    console.log(
      "Ã¢ÂÂ®Ã¯Â¸Â Previous clicked - enviando comando para device",
      DENON_MUSIC_DEVICE_ID
    );
    sendHubitatCommand(DENON_MUSIC_DEVICE_ID, "previousTrack")
      .then(() =>
        console.log("Ã¢Å“â€¦ Comando previousTrack enviado com sucesso")
      )
      .catch((err) =>
        console.error("⚠️Erro ao enviar comando previousTrack:", err)
      );
  });

  window.musicPlayerUI.setPlaying = setPlaying;
  window.musicPlayerUI.isPlaying = () => isPlaying;

  // Controle de volume
  if (muteBtn && volumeSlider) {
    bindVerticalVolumeSlider(volumeSlider);

    muteBtn.addEventListener("click", () => {
      const newMutedState = !isMuted;
      const command = newMutedState ? "mute" : "unmute";
      console.log(
        `Ã°Å¸â€â€¡ Mute button clicked - enviando comando "${command}" para device ${DENON_CMD_DEVICE_ID}`
      );

      sendHubitatCommand(DENON_CMD_DEVICE_ID, command)
        .then(() => {
          console.log(`Ã¢Å“â€¦ Comando ${command} enviado com sucesso`);
          setMuted(newMutedState);
        })
        .catch((err) =>
          console.error(`⚠️Erro ao enviar comando ${command}:`, err)
        );
    });

    // Função para atualizar a barra de volume
    function updateVolumeBar() {
      const value = parseInt(volumeSlider.value);
      const percent = (value / 100) * 100;
      volumeSlider.style.setProperty("--volume-percent", percent + "%");
      const volumeDisplay = queryActiveMusic("#music-volume-display");
      if (volumeDisplay) volumeDisplay.textContent = value;
      updateVolumeIcons(value, isMuted);
      console.log(
        "Ã°Å¸â€Å  Volume ajustado para:",
        value,
        "% -",
        percent + "%"
      );
    }

    // Event listener para input (arrastar o slider)
    volumeSlider.addEventListener("input", (e) => {
      updateVolumeBar();
    });

    // Event listener para change (quando solta o slider)
    volumeSlider.addEventListener("change", (e) => {
      updateVolumeBar();
      const value = e.target.value;
      console.log("Ã°Å¸â€Å  Volume finalizado em:", value);
    });

    // If there's a separate music slider, wire it to send commands to Denon (device 15)
    const musicSlider = queryActiveMusic("#music-volume-slider");
    if (musicSlider) {
      musicSlider.addEventListener("input", (e) => {
        // update visual bar for music slider
        const v = parseInt(e.target.value);
        musicSlider.style.setProperty(
          "--volume-percent",
          (v / 100) * 100 + "%"
        );
        const volumeDisplay = queryActiveMusic("#music-volume-display");
        if (volumeDisplay) volumeDisplay.textContent = v;
        updateVolumeIcons(v, isMuted);
      });

      musicSlider.addEventListener("change", (e) => {
        const value = e.target.value;
        console.log(
          `Ã°Å¸â€Å  Music slider changed -> sending setVolume ${value} to Denon (${DENON_CMD_DEVICE_ID})`
        );
        updateVolumeIcons(parseInt(value, 10), isMuted);
        // Mark recent command to prevent polling overwrite
        recentCommands.set(DENON_CMD_DEVICE_ID, Date.now());
        // Send command
        sendHubitatCommand(DENON_CMD_DEVICE_ID, "setvolume", value)
          .then(() =>
            console.log("Ã¢Å“â€¦ setVolume sent to Denon via music slider")
          )
          .catch((err) =>
            console.error(
              "⚠️Error sending setVolume from music slider:",
              err
            )
          );
      });
    }

    // Garantir que o slider seja interativo
    volumeSlider.style.pointerEvents = "auto";

    // Inicializar a barra com o valor padrÃƒÂ£o
    updateVolumeBar();

    console.log("Ã°Å¸Å½Âµ Slider de volume configurado:", volumeSlider);
  } else {
    console.warn("Ã¢Å¡Â Ã¯Â¸Â BotÃƒÂ£o mute ou slider não encontrados");
  }

  // Controle master On/Off
  function setMasterPower(powerOn) {
    isPowerOn = powerOn;
    window.musicPlayerUI.currentPowerState = powerOn ? "on" : "off";

    if (powerOn) {
      masterOnBtn.classList.add("music-master-btn--active");
      masterOnBtn.setAttribute("aria-pressed", "true");
      masterOffBtn.classList.remove("music-master-btn--active");
      masterOffBtn.setAttribute("aria-pressed", "false");
      playerInner.classList.remove("power-off");
      console.log("Ã¢Å¡Â¡ Player ligado");
      // Restaurar estado de mute que havia antes do power-off
      setMuted(previousMutedState);
    } else {
      masterOffBtn.classList.add("music-master-btn--active");
      masterOffBtn.setAttribute("aria-pressed", "true");
      masterOnBtn.classList.remove("music-master-btn--active");
      masterOnBtn.setAttribute("aria-pressed", "false");
      playerInner.classList.add("power-off");
      console.log("Ã¢Å¡Â« Player desligado");
      // Salvar estado atual de mute e forÃƒÂ§ar mute enquanto estiver desligado
      previousMutedState = isMuted;
      setMuted(true);
    }
  }

  if (masterOnBtn && masterOffBtn && playerInner) {
    masterOnBtn.addEventListener("click", () => {
      if (!isPowerOn) {
        console.log(
          `Power ON clicked - enviando comando "on" para device ${DENON_CMD_DEVICE_ID}`
        );
        recentCommands.set(DENON_CMD_DEVICE_ID, Date.now());
        sendHubitatCommand(DENON_CMD_DEVICE_ID, "on")
          .then(() => {
            console.log("Ã¢Å“â€¦ Comando on enviado com sucesso");
            setMasterPower(true);
          })
          .catch((err) =>
            console.error("⚠️Erro ao enviar comando on:", err)
          );
      }
    });

    masterOffBtn.addEventListener("click", () => {
      if (isPowerOn) {
        console.log(
          `Power OFF clicked - enviando comando "off" para device ${DENON_CMD_DEVICE_ID}`
        );
        recentCommands.set(DENON_CMD_DEVICE_ID, Date.now());
        sendHubitatCommand(DENON_CMD_DEVICE_ID, "off")
          .then(() => {
            console.log("Ã¢Å“â€¦ Comando off enviado com sucesso");
            setMasterPower(false);
          })
          .catch((err) =>
            console.error("⚠️Erro ao enviar comando off:", err)
          );
      }
    });
  }

  window.musicPlayerUI.setPower = (powerOnValue) =>
    setMasterPower(normalizeDenonPowerState(powerOnValue) === "on");
  window.musicPlayerUI.isPowerOn = () => isPowerOn;

  // initialize
  setPlaying(Boolean(window.musicPlayerUI.currentPlaying));
  setMasterPower(initialPowerState === "on");

  // Buscar metadados iniciais do Denon
  updateDenonMetadata();
  updateDenonVolumeFromServer();

  // Iniciar polling de metadados
  startMusicMetadataPolling();

  syncMusicTrackMarquee();

  console.log("Ã°Å¸Å½Âµ Player de mÃƒÂºsica inicializado");
}

// Initialize when SPA navigation might insert the music page
document.addEventListener("DOMContentLoaded", () => {
  setTimeout(initMusicPlayerUI, 100);
});

// Versão ultra-bÃƒÂ¡sica para browsers problemÃƒÂ¡ticos
function initUltraBasicMode() {
  try {
    showMobileDebug("Ã°Å¸Å¡Â¨ Inicializando modo ultra-bÃƒÂ¡sico...", "info");

    // Esconder loader de forma mais segura
    var loader = document.getElementById("global-loader");
    if (loader) {
      if (typeof startHomeAnimation === "function") {
        startHomeAnimation();
      } else {
        loader.classList.add("hidden");
        loader.style.display = "none";
      }
      showMobileDebug("Ã¢Å“â€¦ Loader escondido em modo bÃƒÂ¡sico", "success");
    }

    // Definir estados bÃƒÂ¡sicos sem usar localStorage (pode falhar no mobile)
    var processedDevices = 0;
    ALL_LIGHT_IDS.forEach(function (deviceId) {
      try {
        var controls = document.querySelectorAll(
          '[data-device-id="' + deviceId + '"]'
        );
        controls.forEach(function (control) {
          if (control.classList.contains("room-control")) {
            control.dataset.state = "off";
            var img = control.querySelector(".room-control-icon");
            if (img) {
              img.src = "images/icons/icon-small-light-off.svg";
            }
            processedDevices++;
          }
        });
      } catch (e) {
        showMobileDebug(
          "Erro no dispositivo " + deviceId + ": " + e.message,
          "error"
        );
      }
    });

    showMobileDebug(
      "Ã¢Å“â€¦ Modo ultra-bÃƒÂ¡sico ativo - " +
        processedDevices +
        " dispositivos processados",
      "success"
    );

    // Verificar elementos bÃƒÂ¡sicos
    var controls = document.querySelectorAll(".room-control");
    var masters = document.querySelectorAll(".room-master-btn");
    showMobileDebug(
      "Ã°Å¸â€Â Encontrados " +
        controls.length +
        " controles e " +
        masters.length +
        " masters",
      "info"
    );

    return true; // Sucesso
  } catch (error) {
    showMobileDebug(
      "⚠️ERRO CRÃƒÂTICO no modo ultra-bÃƒÂ¡sico: " + error.message,
      "error"
    );
    return false; // Falha
  }
}

// Função de inicialização simplificada para mobile COM POLLING ATIVO
function initSimpleMode() {
  console.log("Ã°Å¸â€œÂ± Inicializando modo simples com polling...");

  try {
    console.log("Ã°Å¸â€œÂ± Tentando mostrar loader...");
    showLoader();

    console.log("Ã°Å¸â€œÂ± Atualizando progresso...");
    updateProgress(10, "Modo simples com polling ativo...");

    console.log(
      "Ã°Å¸â€œÂ± Processando",
      ALL_LIGHT_IDS.length,
      "dispositivos..."
    );

    // Carregar estados bÃƒÂ¡sicos
    for (var i = 0; i < ALL_LIGHT_IDS.length; i++) {
      var deviceId = ALL_LIGHT_IDS[i];
      var progress = 10 + ((i + 1) / ALL_LIGHT_IDS.length) * 70; // Deixar 20% para polling

      console.log(
        "Ã°Å¸â€œÂ± Processando device",
        deviceId,
        "- progresso:",
        progress + "%"
      );
      updateProgress(
        progress,
        "Carregando " + (i + 1) + "/" + ALL_LIGHT_IDS.length + "..."
      );

      try {
        updateDeviceUI(deviceId, "off", true);
      } catch (e) {
        console.error("⚠️Erro no device", deviceId + ":", e);
      }
    }

    console.log("Ã°Å¸â€œÂ± Configurando polling para modo simples...");
    updateProgress(85, "Ativando sincronizaÃƒÂ§ÃƒÂ£o...");

    // Configurar observador DOM simplificado
    try {
      setupDomObserver();
      console.log("Ã¢Å“â€¦ Observador DOM configurado no modo simples");
    } catch (e) {
      console.warn("Ã¢Å¡Â Ã¯Â¸Â Observador DOM falhou no modo simples:", e);
    }

    // Sincronizar controles visÃƒÂ­veis
    updateProgress(90, "Sincronizando controles...");
    setTimeout(function () {
      try {
        scheduleControlSync(true);
        console.log("Ã¢Å“â€¦ Controles sincronizados no modo simples");
      } catch (e) {
        console.warn("Ã¢Å¡Â Ã¯Â¸Â SincronizaÃƒÂ§ÃƒÂ£o falhou:", e);
      }
    }, 300);

    // IMPLEMENTAR POLLING NO MODO SIMPLES
    updateProgress(95, "Iniciando polling...");
    setTimeout(function () {
      if (isProduction) {
        console.log("Ã°Å¸â€â€ž Iniciando polling em modo simples...");
        try {
          startPolling(); // Ativar polling completo mesmo no modo simples
          console.log("Ã¢Å“â€¦ Polling ativo no modo simples");
        } catch (e) {
          console.error("⚠️Erro ao iniciar polling no modo simples:", e);
        }
      } else {
        console.log(
          "Ã°Å¸â€™Â» Modo desenvolvimento - polling não iniciado no modo simples"
        );
      }

      updateProgress(100, "Modo simples com polling ativo!");

      setTimeout(function () {
        console.log("Ã°Å¸â€œÂ± Escondendo loader...");
        hideLoader();
        console.log("Ã¢Å“â€¦ Modo simples com polling completo ativo");
      }, 1000);
    }, 2000); // Aguardar 2s para estabilizar antes do polling
  } catch (error) {
    console.error("⚠️ERRO CRÃƒÂTICO no modo simples:", error);
    console.error("⚠️Erro stack:", error.stack);
    console.error("⚠️Erro linha:", error.lineNumber || "desconhecida");

    // Ativar modo ultra-bÃƒÂ¡sico como fallback
    console.log("Ã°Å¸Å¡Â¨ Ativando modo ultra-bÃƒÂ¡sico...");
    initUltraBasicMode();
  }
}

// Tratamento de erros globais para debug mobile
window.onerror = function (message, source, lineno, colno, error) {
  console.error("Ã°Å¸Å¡Â¨ ERRO GLOBAL DETECTADO:");
  console.error("Ã°Å¸â€œÂ Mensagem:", message);
  console.error("Ã°Å¸â€œÂ Arquivo:", source);
  console.error("Ã°Å¸â€œÂ Linha:", lineno);
  console.error("Ã°Å¸â€œÂ Coluna:", colno);
  console.error("Ã°Å¸â€œÂ Erro:", error);

  // Tentar ativar modo ultra-bÃƒÂ¡sico
  setTimeout(function () {
    console.log("Ã°Å¸Å¡Â¨ Tentando recuperaÃƒÂ§ÃƒÂ£o automÃƒÂ¡tica...");
    try {
      initUltraBasicMode();
    } catch (e) {
      console.error("Ã°Å¸â€™Â¥ Falha na recuperaÃƒÂ§ÃƒÂ£o:", e);
    }
  }, 1000);

  return false; // não impedir outros handlers
};

// Capturar promises rejeitadas
window.addEventListener("unhandledrejection", function (event) {
  console.error("Ã°Å¸Å¡Â¨ PROMISE REJEITADA:", event.reason);
  console.error("Ã°Å¸Å¡Â¨ Promise:", event.promise);
});

console.log("Script carregado, configurando DOMContentLoaded...");

// Tentativa de manter a tela ativa (Wake Lock) - útil em dispositivos como Echo Show
let screenWakeLock = null;
let lastHiddenAt = 0;
let keepAliveVideoStarted = false;

async function requestScreenWakeLock() {
  if (!("wakeLock" in navigator)) {
    return;
  }

  try {
    if (screenWakeLock) {
      return;
    }

    screenWakeLock = await navigator.wakeLock.request("screen");
    console.log("🔒 Wake Lock ativo");

    screenWakeLock.addEventListener("release", () => {
      console.log("🔓 Wake Lock liberado");
      screenWakeLock = null;
    });
  } catch (error) {
    console.warn("⚠️ Falha ao solicitar Wake Lock:", error);
    screenWakeLock = null;
  }
}

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") {
    lastHiddenAt = Date.now();
    return;
  }

  if (document.visibilityState === "visible") {
    requestScreenWakeLock();

    if (lastHiddenAt && Date.now() - lastHiddenAt > 10000) {
      setTimeout(() => {
        console.log("🔁 Retomou do descanso, recarregando...");
        window.location.reload();
      }, 800);
    }
  }
});

window.addEventListener("pageshow", (event) => {
  if (event.persisted || (lastHiddenAt && Date.now() - lastHiddenAt > 10000)) {
    console.log("🔁 pageshow detectado, recarregando...");
    window.location.reload();
  }
});

window.addEventListener("focus", () => {
  if (lastHiddenAt && Date.now() - lastHiddenAt > 10000) {
    console.log("🔁 Foco após descanso, recarregando...");
    window.location.reload();
  }
});

// Vídeo leve em loop via canvas para manter atividade de mídia (fallback adicional)
function startKeepAliveVideo() {
  if (keepAliveVideoStarted) return;
  if (typeof HTMLCanvasElement === "undefined") return;
  if (typeof document.createElement !== "function") return;

  const canvas = document.createElement("canvas");
  canvas.width = 2;
  canvas.height = 2;
  canvas.style.position = "fixed";
  canvas.style.left = "-9999px";
  canvas.style.top = "-9999px";

  const ctx = canvas.getContext("2d");
  if (!ctx || typeof canvas.captureStream !== "function") {
    return;
  }

  const stream = canvas.captureStream(1);
  const video = document.createElement("video");
  video.muted = true;
  video.autoplay = true;
  video.loop = true;
  video.playsInline = true;
  video.style.position = "fixed";
  video.style.width = "1px";
  video.style.height = "1px";
  video.style.opacity = "0.01";
  video.style.left = "-9999px";
  video.style.top = "-9999px";
  video.srcObject = stream;

  document.body.appendChild(canvas);
  document.body.appendChild(video);

  let t = 0;
  const draw = () => {
    t += 1;
    const v = t % 255;
    ctx.fillStyle = `rgb(${v},${v},${v})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    requestAnimationFrame(draw);
  };
  draw();

  video.play().catch(() => {
    // Requer gesto do usuário; será tentado novamente no primeiro clique
  });

  keepAliveVideoStarted = true;
  console.log("🎞️ Keep-alive de vídeo iniciado");
}

// Algumas plataformas exigem gesto do usuário para ativar Wake Lock
document.addEventListener(
  "click",
  () => {
    requestScreenWakeLock();
    startKeepAliveVideo();
  },
  { once: true }
);

document.addEventListener("DOMContentLoaded", () => {
  requestScreenWakeLock();
  startKeepAliveVideo();
});

// Função de inicialização unificada (mobile e desktop idênticos)
// Função de inicialização unificada (mobile e desktop idênticos)
function initializeApp() {
  console.log("DASHBOARD ELETRIZE INICIALIZANDO");
  console.log("Mobile detectado:", isMobile);

  // Marcar que a inicialização foi iniciada
  window.initializationStarted = true;

  // Debug visual para mobile
  showMobileDebug("DASHBOARD ELETRIZE INICIALIZANDO", "info");

  // Envolver tudo em try-catch para capturar qualquer erro
  try {
    console.log("Iniciando carregamento (comportamento unificado)...");
    showLoader();

    // Timeout padrÃƒÂ£o para desktop e mobile (comportamento idÃƒÂªntico)
    var initDelay = 500;
    console.log(
      "Delay de inicialização: " + initDelay + "ms (universal)"
    );

    // Aguardar um pouco para UI carregar e entÃƒÂ£o iniciar carregamento
    setTimeout(function () {
      console.log("Iniciando carregamento principal...");

      try {
        // Carregamento global de todos os estados (usando Promise)
        loadAllDeviceStatesGlobally()
          .then(function (success) {
            console.log("Carregamento global Concluído, success:", success);

            // Delay final padrÃƒÂ£o para desktop e mobile
            var finalDelay = 800;
            setTimeout(function () {
              // Esconder loader
              hideLoader();

              // Configurar observador DOM
              setupDomObserver();

              // Inicializar página de cÃƒÂ´modo e sincronizar controles jÃƒÂ¡ existentes
              var syncDelay = 100;
              setTimeout(() => {
                console.log(
                  "Ã°Å¸ÂÂ  Inicializando controles de cÃƒÂ´modos na inicialização..."
                );
                initRoomPage(); // Inicializar pagina de comodo
                scheduleControlSync(true); // Sincronizar todos os controles
              }, syncDelay);

              // Iniciar polling se estiver em produÃƒÂ§ÃƒÂ£o
              if (isProduction) {
                var pollingDelay = 3000;
                console.log(
                  "Ã¢Å“â€¦ INICIANDO POLLING em " +
                    pollingDelay / 1000 +
                    " segundos (universal)",
                  {
                    isProduction: isProduction,
                    hostname: location.hostname,
                    isMobile: isMobile,
                  }
                );
                setTimeout(startPolling, pollingDelay);
              } else {
                console.log(
                  "⚠️POLLING NÃƒÆ’O INICIADO - não está em produÃƒÂ§ÃƒÂ£o:",
                  {
                    isProduction: isProduction,
                    hostname: location.hostname,
                    isMobile: isMobile,
                  }
                );
              }

              console.log("AplicaÃƒÂ§ÃƒÂ£o totalmente inicializada!");
              showMobileDebug("App totalmente inicializada!", "success");

              // Marcar que a inicialização foi concluÃƒÂ­da
              window.appFullyInitialized = true;
            }, finalDelay);
          })
          .catch(function (error) {
            console.error("Erro no carregamento global:", error);
            showMobileDebug("Erro no carregamento: " + error.message, "error");
            hideLoader();

            // Fallback para modo bÃƒÂ¡sico
            setTimeout(function () {
              try {
                initUltraBasicMode();
              } catch (ultraError) {
                console.error("Falha total na recuperaÃƒÂ§ÃƒÂ£o:", ultraError);
                updateProgress(100, "Erro crÃƒÂ­tico - recarregue a página");
                setTimeout(function () {
                  hideLoader();
                }, 3000);
              }
            }, 1000);
          });
      } catch (loadError) {
        console.error("Erro crÃƒÂ­tico na inicialização:", loadError);
        showMobileDebug("ERRO CRÃƒÂTICO: " + loadError.message, "error");

        // Modo de emergÃƒÂªncia
        try {
          initUltraBasicMode();
        } catch (emergencyError) {
          console.error("Falha no modo de emergÃƒÂªncia:", emergencyError);
          updateProgress(100, "Erro crÃƒÂ­tico - recarregue a página");
          setTimeout(hideLoader, 3000);
        }
      }
    }, initDelay);
  } catch (mainError) {
    console.error("ERRO CRITICO NA INICIALIZACAO PRINCIPAL:", mainError);
    showMobileDebug("ERRO PRINCIPAL: " + mainError.message, "error");

    // ÃƒÅ¡ltimo recurso - modo ultra-bÃƒÂ¡sico
    try {
      initUltraBasicMode();
    } catch (finalError) {
      console.error("FALHA TOTAL:", finalError);
      showMobileDebug("FALHA TOTAL: " + finalError.message, "error");
    }
  }
}

// inicialização global da aplicaÃƒÂ§ÃƒÂ£o
window.addEventListener("DOMContentLoaded", function () {
  console.log("DOMContentLoaded executado, chamando initializeApp...");
  initializeApp();
});

// Fallback se DOMContentLoaded não funcionar
setTimeout(function () {
  if (!window.initializationStarted) {
    console.log(
      "Fallback: DOMContentLoaded não executou, forÃƒÂ§ando inicialização..."
    );
    initializeApp();
  }
}, 2000);

// Parar polling quando a página é fechada
window.addEventListener("beforeunload", stopPolling);

// FunÃƒÂ§ÃƒÂµes de debug disponÃƒÂ­veis globalmente
window.testHubitatConnection = testHubitatConnection;
window.showErrorMessage = showErrorMessage;

// Funções master de cortinas (abrir/fechar todas)
function handleMasterCurtainsOpen() {
  console.log("🎬 Abrindo todas as cortinas...");
  const btn = document.getElementById("master-curtains-open-btn");
  if (btn) {
    btn.classList.add("loading");
  }
  
  // Encontrar todas as cortinas
  const curtainButtons = document.querySelectorAll('.curtain-tile__btn[data-device-id]');
  const curtainIds = new Set();
  
  curtainButtons.forEach(button => {
    const id = button.dataset.deviceId;
    if (id && !curtainIds.has(id)) {
      curtainIds.add(id);
      curtainAction(button, 'open');
    }
  });
  
  setTimeout(() => {
    if (btn) {
      btn.classList.remove("loading");
    }
  }, 2000);
  
  console.log(`✅ Comando de abertura enviado para ${curtainIds.size} cortinas`);
}

function handleMasterCurtainsClose() {
  console.log("🎬 Fechando todas as cortinas...");
  const btn = document.getElementById("master-curtains-close-btn");
  if (btn) {
    btn.classList.add("loading");
  }
  
  // Encontrar todas as cortinas
  const curtainButtons = document.querySelectorAll('.curtain-tile__btn[data-device-id]');
  const curtainIds = new Set();
  
  curtainButtons.forEach(button => {
    const id = button.dataset.deviceId;
    if (id && !curtainIds.has(id)) {
      curtainIds.add(id);
      curtainAction(button, 'close');
    }
  });
  
  setTimeout(() => {
    if (btn) {
      btn.classList.remove("loading");
    }
  }, 2000);
  
  console.log(`✅ Comando de fechamento enviado para ${curtainIds.size} cortinas`);
}

// Exportar funções usadas em onclick="" no HTML (necessário para IIFE)
window.toggleRoomControl = toggleRoomControl;
window.toggleDimmerControl = toggleDimmerControl;
window.handleDimmerInput = handleDimmerInput;
window.handleDimmerChange = handleDimmerChange;
window.startDimmerLongPress = startDimmerLongPress;
window.cancelDimmerLongPress = cancelDimmerLongPress;
window.togglePoolControl = togglePoolControl;
window.fireTVMacro = fireTVMacro;
window.htvMacroOn = htvMacroOn;
window.htvMacroOff = htvMacroOff;
window.tvMacroOn = tvMacroOn;
window.tvMacroOff = tvMacroOff;
window.suiteMasterHtvOn = suiteMasterHtvOn;
window.suiteMasterHtvOff = suiteMasterHtvOff;
window.suiteMasterTvOn = suiteMasterTvOn;
window.suiteMasterTvOff = suiteMasterTvOff;
window.suite1HtvOn = suite1HtvOn;
window.suite1HtvOff = suite1HtvOff;
window.suite1TvOn = suite1TvOn;
window.suite1TvOff = suite1TvOff;
window.suite2HtvOn = suite2HtvOn;
window.suite2HtvOff = suite2HtvOff;
window.suite2TvOn = suite2TvOn;
window.suite2TvOff = suite2TvOff;
window.tvCommand = tvCommand;
window.curtainAction = curtainAction;
window.spaNavigate = spaNavigate;
window.handleMasterCurtainsOpen = handleMasterCurtainsOpen;
window.handleMasterCurtainsClose = handleMasterCurtainsClose;

// Exportar funções de animação
window.hideLoader = hideLoader;
window.startHomeAnimation = startHomeAnimation;

// === Premium feedback: pressed (toque/click) ===
function setupPremiumPressFeedback() {
  try {
    let pressedEl = null;

    const clearPressed = () => {
      if (pressedEl && pressedEl.classList) {
        pressedEl.classList.remove("is-pressed");
      }
      pressedEl = null;
    };

    document.addEventListener(
      "pointerdown",
      (e) => {
        const target = e.target && e.target.closest ? e.target.closest("button") : null;
        if (!target) return;

        // Evitar conflito com botões que já têm animações próprias
        if (
          target.classList.contains("room-master-btn") ||
          target.classList.contains("room-curtain-master-btn") ||
          target.classList.contains("app-logo-trigger")
        ) {
          return;
        }

        // Não aplicar se estiver desabilitado ou em loading
        if (target.disabled) return;
        if (target.classList.contains("loading")) return;
        if (target.dataset && target.dataset.loading === "true") return;

        if (pressedEl && pressedEl !== target) {
          pressedEl.classList.remove("is-pressed");
        }
        pressedEl = target;
        pressedEl.classList.add("is-pressed");
      },
      true
    );

    document.addEventListener("pointerup", clearPressed, true);
    document.addEventListener("pointercancel", clearPressed, true);
    window.addEventListener("blur", clearPressed, true);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState !== "visible") clearPressed();
    });
  } catch (e) {
    // ignore
  }
}

document.addEventListener("DOMContentLoaded", () => {
  setupPremiumPressFeedback();
});

console.log("📜 SCRIPT.JS CARREGADO COMPLETAMENTE!");
