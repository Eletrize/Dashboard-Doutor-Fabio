/**
 * Dashboard Eletrize (Cloudflare) - Exemplo de configuração do cliente
 *
 * Como usar:
 * 1) Copie este arquivo para config.js
 * 2) Ajuste clientInfo e environments
 * 3) Ajuste devices (ar-condicionado, initialize, extras de polling)
 */

const CLIENT_CONFIG = {
  clientInfo: {
    name: "NOME DO CLIENTE",
    projectName: "Dashboard Cliente",
    location: "Cidade, UF",
    version: "1.0.0",
  },

  // Overrides globais de ícones (vale para TODOS os botões)
  // Chave: caminho atual (ex.: "images/icons/icon-mute.svg")
  // Valor: novo caminho
  ui: {
    items: {
      lights: { label: "Luzes", icon: "images/icons/icon-small-light-off.svg" },
      curtains: { label: "Cortinas", icon: "images/icons/icon-curtain.svg" },
      comfort: { label: "Ar Condicionado", icon: "images/icons/ar-condicionado.svg" },
      music: { label: "Música", icon: "images/icons/icon-musica.svg" },
      tv: { label: "Televisão", icon: "images/icons/icon-tv.svg" },
      htv: { label: "HTV", icon: "images/icons/icon-htv.svg" },
      home: { label: "Home", icon: "images/icons/icon-home.svg" },
      scenes: { label: "Cenários", icon: "images/icons/icon-scenes.svg" },
    },
    toggles: {
      light: {
        on: "images/icons/icon-small-light-on.svg",
        off: "images/icons/icon-small-light-off.svg",
      },
    },
    actions: {
      back: "images/icons/back-button.svg",
      curtainOpen: "images/icons/arrow-up.svg",
      curtainStop: "images/icons/icon-stop.svg",
      curtainClose: "images/icons/arrow-down.svg",
    },
    iconOverrides: {},
  },

  // Ambientes: crie quantos quiser (ambiente1, ambiente2, ...)
  // Campos suportados aqui:
  // - name, visible, order
  // - lights: [{ id, name }]
  // - curtains: [{ id, name, description? }]
  // - airConditioner: { zones: [{ id, name, deviceId }] }
  environments: {
    ambiente1: {
      name: "Sala",
      photo: "photo-sala",
      visible: true,
      order: 1,
      lights: [
        { id: "101", name: "Lustre" },
        { id: "102", name: "Spots" },
      ],
      curtains: [{ id: "201", name: "Cortina" }],
      airConditioner: {
        zones: [{ id: "sala", name: "Sala", deviceId: "301" }],
      },
    },

    ambiente2: {
      name: "Quarto",
      photo: "photo-quarto",
      visible: true,
      order: 2,
      lights: [{ id: "103", name: "Luz Quarto" }],
      curtains: [],
      airConditioner: null,
    },
  },

  devices: {
    // Para compatibilidade com o script do ar-condicionado (mapeia ambiente -> deviceId)
    airConditioners: {
      ambiente1: "301",
    },

    // Dispositivos que suportam comando Maker API: initialize
    initializeDevices: [],

    // IDs extras para incluir no polling global (ex.: receiver/volume)
    extraPollingDevices: [],
  },
};

// =========================
// Helpers (API pública)
// =========================

function getVisibleEnvironments() {
  if (!CLIENT_CONFIG?.environments) return [];
  return Object.entries(CLIENT_CONFIG.environments)
    .filter(([_, env]) => env && env.visible !== false)
    .sort((a, b) => (a[1].order || 0) - (b[1].order || 0))
    .map(([key, env]) => ({ key, ...env }));
}

function getEnvironment(envKey) {
  return (CLIENT_CONFIG?.environments && CLIENT_CONFIG.environments[envKey]) || null;
}

function getEnvironmentLightIds(envKey) {
  const env = getEnvironment(envKey);
  if (!env?.lights) return [];
  return env.lights.map((light) => String(light.id));
}

function getEnvironmentCurtainIds(envKey) {
  const env = getEnvironment(envKey);
  if (!env?.curtains) return [];
  return env.curtains.map((curtain) => String(curtain.id));
}

function getAllCurtainIds() {
  const ids = [];
  getVisibleEnvironments().forEach((env) => {
    (env.curtains || []).forEach((curtain) => ids.push(String(curtain.id)));
  });
  return ids;
}

// Mantém o nome por compatibilidade com o código atual,
// mas inclui também extraPollingDevices (ex.: receiver)
function getAllLightIds() {
  const ids = [];
  getVisibleEnvironments().forEach((env) => {
    (env.lights || []).forEach((light) => ids.push(String(light.id)));
  });

  (CLIENT_CONFIG?.devices?.extraPollingDevices || []).forEach((id) => ids.push(String(id)));

  // unique
  return Array.from(new Set(ids));
}

function getAcDeviceIds() {
  return (CLIENT_CONFIG?.devices?.airConditioners && { ...CLIENT_CONFIG.devices.airConditioners }) || {};
}

function getHomeRoomsData() {
  return getVisibleEnvironments().map((env) => ({
    name: env.name,
    route: env.key,
    deviceIds: (env.lights || []).map((l) => String(l.id)),
  }));
}

function getEnvironmentPhotoMap() {
  return getVisibleEnvironments().reduce((acc, env) => {
    if (env?.photo) {
      acc[env.key] = env.photo;
    }
    return acc;
  }, {});
}

function getIconOverrides() {
  return (CLIENT_CONFIG?.ui?.iconOverrides && { ...CLIENT_CONFIG.ui.iconOverrides }) || {};
}

function getUiItem(key) {
  return (CLIENT_CONFIG?.ui?.items && CLIENT_CONFIG.ui.items[key]) || null;
}

function getUiToggle(key) {
  return (CLIENT_CONFIG?.ui?.toggles && CLIENT_CONFIG.ui.toggles[key]) || null;
}

function getUiToggleIcon(key, state) {
  const toggle = getUiToggle(key);
  if (!toggle) return null;
  return state === "on" ? toggle.on : toggle.off;
}

function getUiActionIcon(key) {
  return (CLIENT_CONFIG?.ui?.actions && CLIENT_CONFIG.ui.actions[key]) || null;
}

function buildCurtainSectionsFromConfig() {
  return getVisibleEnvironments()
    .filter((env) => Array.isArray(env.curtains) && env.curtains.length > 0)
    .map((env) => ({
      key: env.key,
      name: env.name,
      curtains: env.curtains.map((curtain) => ({
        deviceId: String(curtain.id),
        title: curtain.name,
        description: curtain.description || "",
      })),
    }));
}

function generateLightsControls(envKey) {
  const env = getEnvironment(envKey);
  if (!env?.lights?.length) return "";

  const DEFAULT_ICON_ON =
    CLIENT_CONFIG?.ui?.toggles?.light?.on ||
    "images/icons/icon-small-light-on.svg";
  const DEFAULT_ICON_OFF =
    CLIENT_CONFIG?.ui?.toggles?.light?.off ||
    "images/icons/icon-small-light-off.svg";

  return env.lights
    .map(
      (light) => {
        const iconOn =
          light?.iconOn ||
          light?.icon?.on ||
          light?.icons?.on ||
          DEFAULT_ICON_ON;
        const iconOff =
          light?.iconOff ||
          light?.icon?.off ||
          light?.icons?.off ||
          DEFAULT_ICON_OFF;

        return `
        <div class="control-card" data-state="off" data-device-id="${String(
          light.id
        )}" data-icon-on="${iconOn}" data-icon-off="${iconOff}" onclick="toggleRoomControl(this)">
          <img class="control-icon" src="${iconOff}" alt="${light.name}">
          <div class="control-label">${light.name}</div>
        </div>
      `;
      }
    )
    .join("");
}

function generateCurtainsControls(envKey) {
  const env = getEnvironment(envKey);
  if (!env?.curtains?.length) return "";

  return env.curtains
    .map(
      (curtain) => `
        <article class="curtain-tile curtain-tile--transparent" data-device-id="${String(curtain.id)}" data-environment="${env.name}">
          <header class="curtain-tile__header curtain-tile__header--minimal">
            <h3 class="curtain-tile__title">${curtain.name}</h3>
            <div class="curtain-tile__line"></div>
          </header>
          <div class="curtain-tile__actions">
            <button class="curtain-tile__btn" data-device-id="${String(curtain.id)}" onclick="curtainAction(this, 'open')" aria-label="Abrir ${curtain.name}">
              <img src="images/icons/arrow-up.svg" alt="Abrir">
            </button>
            <button class="curtain-tile__btn" data-device-id="${String(curtain.id)}" onclick="curtainAction(this, 'stop')" aria-label="Parar ${curtain.name}">
              <img src="images/icons/icon-stop.svg" alt="Parar">
            </button>
            <button class="curtain-tile__btn" data-device-id="${String(curtain.id)}" onclick="curtainAction(this, 'close')" aria-label="Fechar ${curtain.name}">
              <img src="images/icons/arrow-down.svg" alt="Fechar">
            </button>
          </div>
        </article>
      `
    )
    .join("");
}

// Export global
window.CLIENT_CONFIG = CLIENT_CONFIG;
window.getVisibleEnvironments = getVisibleEnvironments;
window.getEnvironment = getEnvironment;
window.getEnvironmentLightIds = getEnvironmentLightIds;
window.getEnvironmentCurtainIds = getEnvironmentCurtainIds;
window.getAllCurtainIds = getAllCurtainIds;
window.getAllLightIds = getAllLightIds;
window.getAcDeviceIds = getAcDeviceIds;
window.getHomeRoomsData = getHomeRoomsData;
window.getEnvironmentPhotoMap = getEnvironmentPhotoMap;
window.getIconOverrides = getIconOverrides;
window.getUiItem = getUiItem;
window.getUiToggle = getUiToggle;
window.getUiToggleIcon = getUiToggleIcon;
window.getUiActionIcon = getUiActionIcon;
window.buildCurtainSectionsFromConfig = buildCurtainSectionsFromConfig;
window.generateLightsControls = generateLightsControls;
window.generateCurtainsControls = generateCurtainsControls;
