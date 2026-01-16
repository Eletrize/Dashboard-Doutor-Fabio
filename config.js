/**
 * Dashboard Eletrize (Cloudflare) - Configuração do cliente
 *
 * Objetivo: permitir adicionar/remover ambientes e dispositivos editando apenas este arquivo,
 * similar ao modelo do LongPing, mas mantendo o funcionamento Cloudflare (Pages/Functions).
 */

const CLIENT_CONFIG = {
  clientInfo: {
    name: "Doutor Fabio",
    projectName: "Dashboard Residencial",
    location: "Ribeirão Preto, SP",
    version: "1.5",
  },

  // Configuração da Maker API (Hubitat) centralizada no config.js
  makerApi: {
    cloud: {
      enabled: true,
      // URL base completa do app da Maker API (inclui apiId e appId)
      appBaseUrl:
        "https://cloud.hubitat.com/api/df90ffba-2205-41f8-8f62-ec4c430ae94f/apps/144",
      // Token de acesso fornecido pela Maker API
      accessToken: "94f13f9f-2842-48ea-a860-02eda566a02a",
      // Quais dispositivos devem usar a nuvem: "*"/"all" para todos ou uma lista de IDs
      deviceIds: "*",
      // Endpoints diretos úteis (mantidos aqui para fácil consulta)
      endpoints: {
        devicesAll:
          "https://cloud.hubitat.com/api/df90ffba-2205-41f8-8f62-ec4c430ae94f/apps/144/devices/all?access_token=94f13f9f-2842-48ea-a860-02eda566a02a",
        deviceInfo:
          "https://cloud.hubitat.com/api/df90ffba-2205-41f8-8f62-ec4c430ae94f/apps/144/devices/[Device ID]?access_token=94f13f9f-2842-48ea-a860-02eda566a02a",
        deviceEvents:
          "https://cloud.hubitat.com/api/df90ffba-2205-41f8-8f62-ec4c430ae94f/apps/144/devices/[Device ID]/events?access_token=94f13f9f-2842-48ea-a860-02eda566a02a",
        deviceCommands:
          "https://cloud.hubitat.com/api/df90ffba-2205-41f8-8f62-ec4c430ae94f/apps/144/devices/[Device ID]/commands?access_token=94f13f9f-2842-48ea-a860-02eda566a02a",
        deviceCapabilities:
          "https://cloud.hubitat.com/api/df90ffba-2205-41f8-8f62-ec4c430ae94f/apps/144/devices/[Device ID]/capabilities?access_token=94f13f9f-2842-48ea-a860-02eda566a02a",
        deviceAttribute:
          "https://cloud.hubitat.com/api/df90ffba-2205-41f8-8f62-ec4c430ae94f/apps/144/devices/[Device ID]/attribute/[Attribute]?access_token=94f13f9f-2842-48ea-a860-02eda566a02a",
        sendDeviceCommand:
          "https://cloud.hubitat.com/api/df90ffba-2205-41f8-8f62-ec4c430ae94f/apps/144/devices/[Device ID]/[Command]/[Secondary value]?access_token=94f13f9f-2842-48ea-a860-02eda566a02a",
        sendPostUrl:
          "https://cloud.hubitat.com/api/df90ffba-2205-41f8-8f62-ec4c430ae94f/apps/144/postURL/[URL]?access_token=94f13f9f-2842-48ea-a860-02eda566a02a",
        setHubVariable:
          "https://cloud.hubitat.com/api/df90ffba-2205-41f8-8f62-ec4c430ae94f/apps/144/hubvariables/[Variable Name]/[Value]?access_token=94f13f9f-2842-48ea-a860-02eda566a02a",
        modesList:
          "https://cloud.hubitat.com/api/df90ffba-2205-41f8-8f62-ec4c430ae94f/apps/144/modes?access_token=94f13f9f-2842-48ea-a860-02eda566a02a",
        setMode:
          "https://cloud.hubitat.com/api/df90ffba-2205-41f8-8f62-ec4c430ae94f/apps/144/modes/[Mode ID]?access_token=94f13f9f-2842-48ea-a860-02eda566a02a",
      },
    },
  },

  // Overrides globais de ícones (vale para TODOS os botões)
  // Chave: caminho atual (ex.: "images/icons/icon-mute.svg")
  // Valor: novo caminho (ex.: "images/icons/whatsapp.svg")
  // Dica: isso também cobre botões estáticos (música, cortinas, AC, etc.).
  ui: {
    // Itens de UI reutilizáveis (nome + ícone) para abas/botões principais
    // Use as chaves abaixo no app: lights, curtains, comfort, music, tv, htv, home, scenes
    items: {
      lights: { label: "Luzes", icon: "images/icons/icon-small-light-off.svg" },
      curtains: { label: "Cortinas", icon: "images/icons/icon-curtain.svg" },
      comfort: { label: "Ar Condicionado", icon: "images/icons/ar-condicionado.svg" },
      music: { label: "Música", icon: "images/icons/icon-musica.svg" },
      tv: { label: "Televisão", icon: "images/icons/icon-tv.svg" },
      htv: { label: "HTV", icon: "images/icons/icon-htv.svg" },
      home: { label: "Home", icon: "images/icons/icon-home.svg" },
      scenes: { label: "Cenários", icon: "images/icons/icon-scenes.svg" },
      bluray: { label: "Blu-ray", icon: "images/icons/icon-bluray.svg" },
      appletv: { label: "Apple TV", icon: "images/icons/icon-apple-tv.svg" },
      clarotv: { label: "Claro TV", icon: "images/icons/icon-clarotv.svg" },
      roku: { label: "Roku", icon: "images/icons/icon-roku.svg" },
      games: { label: "Games", icon: "images/icons/icon-games.svg" },
      hidromassagem: { label: "Hidromassagem", icon: "images/icons/icon-hidromassagem.svg" },
    },

    // Ícones on/off padronizados por tipo (reutilizáveis em qualquer botão toggle)
    toggles: {
      light: {
        on: "images/icons/icon-small-light-on.svg",
        off: "images/icons/icon-small-light-off.svg",
      },
      dimmer: {
        on: "images/icons/icon-dimmer-on.svg",
        off: "images/icons/icon-dimmer-off.svg",
      },
      tv: {
        on: "images/icons/icon-small-tv-on.svg",
        off: "images/icons/icon-small-tv-off.svg",
      },
      shader: {
        on: "images/icons/icon-small-shader-on.svg",
        off: "images/icons/icon-small-shader-off.svg",
      },
      smartglass: {
        on: "images/icons/icon-small-smartglass-on.svg",
        off: "images/icons/icon-small-smartglass-off.svg",
      },
      telamovel: {
        on: "images/icons/icon-small-telamovel-on.svg",
        off: "images/icons/icon-small-telamovel-off.svg",
      },
    },

    // Ícones de ações (setas, voltar, stop etc.)
    actions: {
      back: "images/icons/back-button.svg",
      curtainOpen: "images/icons/open-curtain.svg",
      curtainStop: "images/icons/icon-stop.svg",
      curtainClose: "images/icons/close-curtain.svg",
    },

    iconOverrides: {
      // Exemplos (descomente e ajuste conforme necessidade):
      // "images/icons/icon-mute.svg": "images/icons/icon-volume.svg",
      // "images/icons/arrow-up.svg": "images/icons/icon-ac-aleta-alta.svg",
    },
  },

  environments: {
    ambiente1: {
      name: "Home Theater",
      photo: "photo-placeholder.webp",
      visible: true,
      order: 1,
      lights: [
        { id: "301", name: "Painel" },
        { id: "340", name: "Spots", type: "dimmer", defaultLevel: 100 },
      ],
      airConditioner: {
        zones: [{ id: "Home", name: "home", deviceId: "347" }],
      },
      curtains: [],
      tv: [
        { id: "111", name: "Televisão" },
      ],
      bluray: [
        { id: "112", name: "Blu-ray" },        
      ],
      appletv: [
        { id: "113", name: "Apple TV" },
      ],
      music: [
        { id: "114", name: "Música" },
      ],
      clarotv: [
        { id: "117", name: "Claro TV" },
      ],
    },

    ambiente2: {
      name: "Living",
      photo: "photo-living.webp",
      visible: true,
      order: 2,
      lights: [
        { id: "302", name: "Canjiquinha" },
        { id: "303", name: "Hall Entrada" },
        { id: "304", name: "Spots" },
        { id: "305", name: "Sanca" },
        { id: "344", name: "Lustre", type: "dimmer", defaultLevel: 60 },
        { id: "342", name: "Spots Dimmer", type: "dimmer", defaultLevel: 100 },
      ],
      curtains: [
        { id: "359", name: "Corredor" },
        { id: "361", name: "Varanda" },
      ],
      airConditioner: {
        zones: [{ id: "living", name: "Living", deviceId: "167" }],
      },
    },

    ambiente3: {
      name: "Varanda",
      photo: "photo-varanda.webp",
      visible: true,
      order: 3,
      lights: [
        { id: "306", name: "Spots" },
        { id: "307", name: "Churrasqueira" },
        { id: "341", name: "Pendente", type: "dimmer", defaultLevel: 100 },
      ],
      curtains: [
        { id: "121", name: "Cortina" }
      ],
      airConditioner: {
        zones: [{ id: "Varanda", name: "Varanda", deviceId: "168" }],
      },
      roku: [
        { id: "122", name: "Roku" },
      ],
      games: [
        { id: "123", name: "Games" },
      ],
      music: [
        { id: "124", name: "Música" },
      ],
      tv: [
        { id: "125", name: "Televisão" },
      ],
    },

    ambiente4: {
      name: "Piscina",
      photo: "photo-placeholder.webp",
      visible: true,
      order: 4,
      lights: [
        { id: "70", name: "Corredor Espeto" },
        { id: "66", name: "Piscina" },
        { id: "59", name: "LED Piscina" },
      ],
      hidromassagem: [
        { id: "130", name: "Hidromassagem" },
      ],
    },

    ambiente5: {
      name: "Escritório",
      photo: "photo-placeholder.webp",
      visible: true,
      order: 5,
      curtains: [
        { id: "40", name: "Cortina" }
      ],
      airConditioner: {
        zones: [{ id: "escritorio", name: "Escritório", deviceId: "169" }],
      },
    },

    ambiente6: {
      name: "Escada",
      photo: "photo-placeholder.webp",
      visible: true,
      order: 6,
      lights: [
        { id: "81", name: "Luz" },
        { id: "82", name: "Luz 2" },
      ],
    },

    ambiente7: {
      name: "Brinquedoteca",
      photo: "photo-placeholder.webp",
      visible: true,
      order: 7,
      tv: [
        { id: "50", name: "Televisão" }
      ],
      airConditioner: {
        zones: [{ id: "Brinquedoteca", name: "Brinquedoteca", deviceId: "182" }],
      },
    },

    ambiente8: {
      name: "Suíte Milena",
      photo: "photo-placeholder.webp",
      visible: true,
      order: 8,
      curtains: [
        { id: "51", name: "Veneziana" }
      ],
      airConditioner: {
        zones: [{ id: "suitemilena", name: "Suíte Milena", deviceId: "188" }],
      },
      tv: [
        { id: "53", name: "Televisão" }
      ],
      music: [
        { id: "54", name: "Música" }
      ],
      clarotv: [
        { id: "55", name: "Claro TV" }
      ],
    },

    ambiente9: {
      name: "Suíte Fabio",
      photo: "photo-placeholder.webp",
      visible: true,
       order: 10,
      lights: [],
      curtains: [{ id: "52", name: "Veneziana" }],
      airConditioner: {
        zones: [{ id: "suitemaster", name: "Suíte Master", deviceId: "180" }],
      },
    },

    ambiente10: {
      name: "Suíte Laura",
      photo: "photo-placeholder.webp",
      visible: true,
      order: 10,
      lights: [],
      curtains: [{ id: "52", name: "Veneziana" }],
      airConditioner: {
        zones: [{ id: "suitemaster", name: "Suíte Master", deviceId: "180" }],
      },
    },
  },

  devices: {
    airConditioners: {
      ambiente1: "110",
      ambiente2: "167",
      ambiente7: "182",
      ambiente8: "188",
       ambiente9: "180",
       ambiente10: "180",
    },

    // Mantém a lógica existente de "initialize" quando entrar no ambiente1
    initializeDevices: [
      "15", // Denon AVR
      "29", // Denon HEOS Speaker
      "109", // Cortinas Gourmet
      "110", // AC Varanda
      "111", // TV Varanda
      "114", // HTV Varanda
      "115", // Cortina Esquerda
      "116", // Cortina Direita
    ],

    // O polling atual usa ALL_LIGHT_IDS também para volume do Denon
    extraPollingDevices: ["15"],
  },
};

// =========================
// Helpers (API pública)
// =========================

function getVisibleEnvironments() {
  if (!CLIENT_CONFIG?.environments) return [];
  return Object.entries(CLIENT_CONFIG.environments)
    .filter(([_, env]) => env && env.visible === true)
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

function getAllLightIds() {
  const ids = [];
  getVisibleEnvironments().forEach((env) => {
    (env.lights || []).forEach((light) => ids.push(String(light.id)));
  });
  (CLIENT_CONFIG?.devices?.extraPollingDevices || []).forEach((id) => ids.push(String(id)));
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

function normalizeDimmerLevel(value, fallback = 80) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isNaN(parsed)) {
    return Math.max(0, Math.min(100, parsed));
  }
  const fb = Number.parseInt(fallback, 10);
  return Math.max(0, Math.min(100, Number.isNaN(fb) ? 80 : fb));
}

function isDimmerLight(light) {
  const type = (light?.type || light?.class || "").toString().toLowerCase();
  return type === "dimmer";
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

  const DIMMER_ICON_ON =
    CLIENT_CONFIG?.ui?.toggles?.dimmer?.on ||
    "images/icons/icon-dimmer-on.svg";
  const DIMMER_ICON_OFF =
    CLIENT_CONFIG?.ui?.toggles?.dimmer?.off ||
    "images/icons/icon-dimmer-off.svg";

  return env.lights
    .map((light, index) => {
      const dimmerEnabled = isDimmerLight(light);
      
      // Se for dimmer, usa ícones de dimmer; senão usa ícones de luz normal
      const defaultIconOn = dimmerEnabled ? DIMMER_ICON_ON : DEFAULT_ICON_ON;
      const defaultIconOff = dimmerEnabled ? DIMMER_ICON_OFF : DEFAULT_ICON_OFF;
      
      const iconOn =
        light?.iconOn || light?.icon?.on || light?.icons?.on || defaultIconOn;
      const iconOff =
        light?.iconOff ||
        light?.icon?.off ||
        light?.icons?.off ||
        defaultIconOff;
      const defaultLevel = normalizeDimmerLevel(light?.defaultLevel, 80);
      const deviceId = String(light.id);

      if (!dimmerEnabled) {
        return `
        <div class="control-card" data-state="off" data-device-id="${deviceId}" data-light-name="${light.name}" data-light-index="${index}" data-icon-on="${iconOn}" data-icon-off="${iconOff}" onclick="toggleRoomControl(this)">
          <div class="control-icon-wrap">
            <img class="control-icon control-icon-outline" src="${iconOff}" alt="${light.name}">
            <img class="control-icon control-icon-main" src="${iconOff}" alt="${light.name}">
          </div>
          <div class="control-label">${light.name}</div>
        </div>
      `;
      }

      const sliderId = `${envKey}-${deviceId}-dimmer`;

      return `
        <div class="control-card control-card--dimmer" data-state="off" data-device-id="${deviceId}" data-light-name="${light.name}" data-light-index="${index}" data-icon-on="${iconOn}" data-icon-off="${iconOff}" data-control-type="dimmer" data-default-level="${defaultLevel}" onclick="toggleDimmerControl(event, this)" onmousedown="startDimmerLongPress(event, this)" onmouseup="cancelDimmerLongPress(this)" onmouseleave="cancelDimmerLongPress(this)" ontouchstart="startDimmerLongPress(event, this)" ontouchend="cancelDimmerLongPress(this)" ontouchcancel="cancelDimmerLongPress(this)">
          <div class="control-icon-wrap">
            <img class="control-icon control-icon-outline" src="${iconOff}" alt="${light.name}">
            <img class="control-icon control-icon-main" src="${iconOff}" alt="${light.name}">
          </div>
          <div class="control-label control-label--full">${light.name}</div>
        </div>
      `;
    })
    .join("");
}

function generateCurtainsControls(envKey) {
  const env = getEnvironment(envKey);
  if (!env?.curtains?.length) return "";

  const ICON_OPEN =
    CLIENT_CONFIG?.ui?.actions?.curtainOpen || "images/icons/open-curtain.svg";
  const ICON_STOP =
    CLIENT_CONFIG?.ui?.actions?.curtainStop || "images/icons/icon-stop.svg";
  const ICON_CLOSE =
    CLIENT_CONFIG?.ui?.actions?.curtainClose || "images/icons/close-curtain.svg";

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
              <img src="${ICON_OPEN}" alt="Abrir">
            </button>
            <button class="curtain-tile__btn curtain-tile__btn--stop" data-device-id="${String(curtain.id)}" onclick="curtainAction(this, 'stop')" aria-label="Parar ${curtain.name}">
              <img src="${ICON_STOP}" alt="Parar">
            </button>
            <button class="curtain-tile__btn" data-device-id="${String(curtain.id)}" onclick="curtainAction(this, 'close')" aria-label="Fechar ${curtain.name}">
              <img src="${ICON_CLOSE}" alt="Fechar">
            </button>
          </div>
        </article>
      `
    )
    .join("");
}

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

console.log('✅ CLIENT_CONFIG carregado:', CLIENT_CONFIG.clientInfo.name);
