/**
 * Dashboard Eletrize (Cloudflare) - ConfiguraÃ§Ã£o do cliente
 *
 * Objetivo: permitir adicionar/remover ambientes e dispositivos editando apenas este arquivo,
 * similar ao modelo do LongPing, mas mantendo o funcionamento Cloudflare (Pages/Functions).
 */

const CLIENT_CONFIG = {
  // Modo de teste local: mantÃ©m estados no dashboard sem depender do Hubitat.
  // Use false para voltar ao comportamento normal.
  development: {
    stateOnlyMode: false,
    mqtt: {
      enabled: false,
      brokerUrl: "",
      username: "",
      password: "",
      clientIdPrefix: "dashboard-eletrize",
      stateTopicPrefix: "eletrize/devices",
      qos: 0,
      retain: true,
      libraryUrl: "https://unpkg.com/mqtt/dist/mqtt.min.js",
    },
  },

  // Segredos e regras de allowlist ficam no backend (Cloudflare Functions),
  auth: {
    enabled: true,
    supabaseUrl: "https://ojuavodurcfndjuukvnj.supabase.co",
    supabaseAnonKey: "sb_publishable_ktCS7oV4-VVx8sPylYc6EQ_Nyk4lpab",
    allowEmailSignUp: false,
    allowGoogleLogin: false,
    requireEmailConfirmation: true,
    // ApÃ³s OAuth (Google), o usuÃ¡rio volta para esta URL.
    redirectTo: "",
  },

  clientInfo: {
    name: "Doutor Fabio",
    projectName: "Dashboard Residencial",
    location: "RibeirÃ£o Preto, SP",
    version: "1.5",
  },

  // ConfiguraÃ§Ã£o da Maker API (Hubitat) centralizada no config.js
  makerApi: {
    cloud: {
      enabled: true,
      // URL base completa do app da Maker API (inclui apiId e appId)
      appBaseUrl:
        "https://cloud.hubitat.com/api/917e2dba-9f0d-49ab-905f-b3e1a7f7c4ad/apps/7",
      // Token de acesso fornecido pela Maker API
      accessToken: "c5a8aac8-69cc-42e2-84dc-c0b6519d72bd",
      // Quais dispositivos devem usar a nuvem: "*"/"all" para todos ou uma lista de IDs
      deviceIds: "*",
      // Endpoints diretos Ãºteis (mantidos aqui para fÃ¡cil consulta)
      endpoints: {
        devices:
          "https://cloud.hubitat.com/api/917e2dba-9f0d-49ab-905f-b3e1a7f7c4ad/apps/7/devices?access_token=c5a8aac8-69cc-42e2-84dc-c0b6519d72bd",
        devicesAll:
          "https://cloud.hubitat.com/api/917e2dba-9f0d-49ab-905f-b3e1a7f7c4ad/apps/7/devices/all?access_token=c5a8aac8-69cc-42e2-84dc-c0b6519d72bd",
        deviceInfo:
          "https://cloud.hubitat.com/api/917e2dba-9f0d-49ab-905f-b3e1a7f7c4ad/apps/7/devices/[Device ID]?access_token=c5a8aac8-69cc-42e2-84dc-c0b6519d72bd",
        deviceData:
          "https://cloud.hubitat.com/api/917e2dba-9f0d-49ab-905f-b3e1a7f7c4ad/apps/7/devices/deviceData/[Device ID]?access_token=c5a8aac8-69cc-42e2-84dc-c0b6519d72bd",
        deviceEvents:
          "https://cloud.hubitat.com/api/917e2dba-9f0d-49ab-905f-b3e1a7f7c4ad/apps/7/devices/[Device ID]/events?access_token=c5a8aac8-69cc-42e2-84dc-c0b6519d72bd",
        deviceCommands:
          "https://cloud.hubitat.com/api/917e2dba-9f0d-49ab-905f-b3e1a7f7c4ad/apps/7/devices/[Device ID]/commands?access_token=c5a8aac8-69cc-42e2-84dc-c0b6519d72bd",
        deviceCapabilities:
          "https://cloud.hubitat.com/api/917e2dba-9f0d-49ab-905f-b3e1a7f7c4ad/apps/7/devices/[Device ID]/capabilities?access_token=c5a8aac8-69cc-42e2-84dc-c0b6519d72bd",
        deviceAttribute:
          "https://cloud.hubitat.com/api/917e2dba-9f0d-49ab-905f-b3e1a7f7c4ad/apps/7/devices/[Device ID]/attribute/[Attribute]?access_token=c5a8aac8-69cc-42e2-84dc-c0b6519d72bd",
        sendDeviceCommand:
          "https://cloud.hubitat.com/api/917e2dba-9f0d-49ab-905f-b3e1a7f7c4ad/apps/7/devices/[Device ID]/[Command]/[Secondary value]?access_token=c5a8aac8-69cc-42e2-84dc-c0b6519d72bd",
        setDeviceLabel:
          "https://cloud.hubitat.com/api/917e2dba-9f0d-49ab-905f-b3e1a7f7c4ad/apps/7/devices/[Device ID]/setLabel?label=[Label]&access_token=c5a8aac8-69cc-42e2-84dc-c0b6519d72bd",
        setDeviceDriver:
          "https://cloud.hubitat.com/api/917e2dba-9f0d-49ab-905f-b3e1a7f7c4ad/apps/7/devices/[Device ID]/setDriver?namespace=[Driver Namespace]&name=[Driver Name]&access_token=c5a8aac8-69cc-42e2-84dc-c0b6519d72bd",
        sendPostUrl:
          "https://cloud.hubitat.com/api/917e2dba-9f0d-49ab-905f-b3e1a7f7c4ad/apps/7/postURL/[URL]?access_token=c5a8aac8-69cc-42e2-84dc-c0b6519d72bd",
        setHubVariable:
          "https://cloud.hubitat.com/api/917e2dba-9f0d-49ab-905f-b3e1a7f7c4ad/apps/7/hubvariables/[Variable Name]/[Value]?access_token=c5a8aac8-69cc-42e2-84dc-c0b6519d72bd",
        modesList:
          "https://cloud.hubitat.com/api/917e2dba-9f0d-49ab-905f-b3e1a7f7c4ad/apps/7/modes?access_token=c5a8aac8-69cc-42e2-84dc-c0b6519d72bd",
        setMode:
          "https://cloud.hubitat.com/api/917e2dba-9f0d-49ab-905f-b3e1a7f7c4ad/apps/7/modes/[Mode ID]?access_token=c5a8aac8-69cc-42e2-84dc-c0b6519d72bd",
      },
    },
  },

  // Overrides globais de Ã­cones (vale para TODOS os botÃµes)
  // Chave: caminho atual (ex.: "images/icons/icon-mute.svg")
  // Valor: novo caminho (ex.: "images/icons/whatsapp.svg")
  // Dica: isso tambÃ©m cobre botÃµes estÃ¡ticos (mÃºsica, cortinas, AC, etc.).
  ui: {
    // Itens de UI reutilizÃ¡veis (nome + Ã­cone) para abas/botÃµes principais
    // Use as chaves abaixo no app: lights, curtains, comfort, music, tv, htv, home, scenes
    items: {
      lights: { label: "Luzes", icon: "images/icons/icon-small-light-off.svg" },
      curtains: { label: "Cortinas", icon: "images/icons/icon-curtain.svg" },
      comfort: {
        label: "Ar Condicionado",
        icon: "images/icons/ar-condicionado.svg",
      },
      music: { label: "MÃºsica", icon: "images/icons/icon-musica.svg" },
      tv: { label: "Televisão", icon: "images/icons/icon-tv.svg" },
      htv: { label: "HTV", icon: "images/icons/icon-htv.svg" },
      home: { label: "Home", icon: "images/icons/icon-home.svg" },
      scenes: { label: "CenÃ¡rios", icon: "images/icons/icon-scenes.svg" },
      bluray: { label: "Blu-ray", icon: "images/icons/icon-bluray.svg" },
      appletv: { label: "Apple TV", icon: "images/icons/icon-apple-tv.svg" },
      clarotv: { label: "Claro TV", icon: "images/icons/icon-clarotv.svg" },
      roku: { label: "Roku", icon: "images/icons/icon-roku.svg" },
      games: { label: "Games", icon: "images/icons/icon-games.svg" },
      hidromassagem: {
        label: "Hidromassagem",
        icon: "images/icons/icon-hidromassagem.svg",
      },
    },

    // Ãcones on/off padronizados por tipo (reutilizÃ¡veis em qualquer botão toggle)
    toggles: {
      light: {
        on: "images/icons/icon-small-light-on.svg",
        off: "images/icons/icon-small-light-off.svg",
      },
      dimmer: {
        on: "images/icons/icon-dimmer.svg",
        off: "images/icons/icon-dimmer.svg",
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

    // Ãcones de aÃ§Ãµes (setas, voltar, stop etc.)
    actions: {
      back: "images/icons/back-button.svg",
      curtainOpen: "images/icons/open-curtain.svg",
      curtainStop: "images/icons/icon-stop.svg",
      curtainClose: "images/icons/close-curtain.svg",
    },

    // Ãcones por tipo de movimento de cortina (configurÃ¡vel por ambiente/cortina)
    curtainTypes: {
      lateral: {
        open: "images/icons/open-curtain.svg",
        stop: "images/icons/icon-stop.svg",
        close: "images/icons/close-curtain.svg",
      },
      vertical: {
        open: "images/icons/arrow-up.svg",
        stop: "images/icons/icon-stop.svg",
        close: "images/icons/arrow-down.svg",
      },
    },

    iconOverrides: {
      // Exemplos (descomente e ajuste conforme necessidade):
      // "images/icons/icon-mute.svg": "images/icons/icon-volume.svg",
      // "images/icons/arrow-up.svg": "images/icons/icon-ac-aleta-alta.svg",
    },

    // Tabelas de comandos por controle (referÃªncia / logging)
    controlCommands: {
      // Apple TV: comandos reconhecidos pelo hub (mesmo que nem todos tenham botão)
      appletv: [
        "configure",
        "cursorCenter",
        "cursorDown",
        "cursorLeft",
        "cursorRight",
        "cursorUp",
        "initialize",
        "keepalive",
        "menu",
        "off",
        "on",
        "play",
        "push",
        "reconnect",
        "refresh",
      ],

      // Claro TV: comandos suportados (inclui os sem botão dedicado)
      clarotv: [
        "agora",
        "blue",
        "channelDown",
        "channelUp",
        "configure",
        "cursorCenter",
        "cursorDown",
        "cursorLeft",
        "cursorRight",
        "cursorUp",
        "favoritos",
        "forward",
        "green",
        "info",
        "initialize",
        "keepalive",
        "menu",
        "mosaico",
        "music",
        "num1",
        "num2",
        "num3",
        "num4",
        "num5",
        "num0",
        "num6",
        "num7",
        "num8",
        "num9",
        "off",
        "on",
        "play",
        "portal",
        "power",
        "ppv",
        "push",
        "rec",
        "reconnect",
        "red",
        "refresh",
        "replay",
        "rewind",
        "sair",
        "stop",
        "voltar",
        "yellow",
      ],

      // Roku: comandos suportados no controle da Varanda
      roku: [
        "appletv",
        "asteriscom",
        "back",
        "configure",
        "cursorDown",
        "cursorLeft",
        "cursorOK",
        "cursorRight",
        "cursorUp",
        "disney",
        "home",
        "initialize",
        "netflix",
        "next",
        "off",
        "on",
        "play",
        "previous",
        "primevideo",
        "push",
      ],
    },
  },

  environments: {
    ambiente1: {
      name: "Home Theater",
      photo: "photo-hometeather.webp",
      visible: true,
      order: 1,
      controlIds: {
        receiver: "12409",
        receiverVolume: "12409",
        tvControl: "4",
        musicMetadata: "12409",
      },
      lights: [
        { id: "12243", name: "Spots Painel" },
        { id: "12229", name: "Spots", type: "dimmer", defaultLevel: 100 },
      ],
      quickActions: [
        {
          type: "lights",
          devices: [
            { id: "12243", commandOn: "on", commandOff: "off" },
            {
              id: "12229",
              commandOn: "setLevel",
              commandOff: "off",
              valueOn: 100,
            },
          ],
        },
      ],
      curtainMotionType: "vertical",
      airConditioner: {
        zones: [{ id: "Home", name: "Home", deviceId: "2" }],
        controls: { zoneSelector: false, aletas: true, windfree: true },
        temperature: { min: 18, max: 25, default: 22 },
      },
      curtains: [{ id: "12298", name: "Cortina" }],
      tv: [
        {
          id: "4",
          name: "Televisão",
          controlDeviceId: "4",
          powerDeviceId: "4",
          volumeDeviceId: "12409",
          displayDeviceId: "4",
          inputDeviceId: "4",
          receiverDeviceId: "12409",
        },
      ],
      bluray: [
        {
          id: "5",
          name: "Blu-ray",
          volumeDeviceId: "12409",
          displayDeviceId: "4",
          receiverDeviceId: "12409",
        },
      ],
      appletv: [
        {
          id: "6",
          name: "Apple TV",
          volumeDeviceId: "12409",
          displayDeviceId: "4",
          receiverDeviceId: "12409",
        },
      ],
      music: [
        {
          id: "12409",
          name: "Denon",
          metadataDeviceId: "12409",
          transportDeviceId: "12409",
          controlDeviceId: "12409",
          volumeDeviceId: "12409",
          powerDeviceId: "12409",
        },
      ],
      clarotv: [
        {
          id: "7",
          name: "NET",
          volumeDeviceId: "12409",
          displayDeviceId: "4",
          receiverDeviceId: "12409",
        },
      ],
    },

    ambiente2: {
      name: "Living",
      photo: "photo-living.webp",
      visible: true,
      order: 2,
      lights: [
        { id: "12244", name: "Canjiquinha" },
        { id: "12245", name: "Entrada" },
        { id: "12246", name: "Spots" },
        { id: "12247", name: "Sanca" },
        { id: "12233", name: "Lustre", type: "dimmer", defaultLevel: 60 },
        { id: "12231", name: "Spots Dimmer", type: "dimmer", defaultLevel: 100 },
      ],
      quickActions: [
        {
          type: "lights",
          devices: [
            { id: "12244", commandOn: "on", commandOff: "off" },
            { id: "12245", commandOn: "on", commandOff: "off" },
            { id: "12246", commandOn: "on", commandOff: "off" },
            { id: "12247", commandOn: "on", commandOff: "off" },
            {
              id: "12233",
              commandOn: "setLevel",
              commandOff: "off",
              valueOn: 60,
            },
            {
              id: "12231",
              commandOn: "setLevel",
              commandOff: "off",
              valueOn: 100,
            },
          ],
        },
      ],
      curtains: [
        {
          name: "Todas",
          description: "Aciona todas as cortinas do ambiente",
          targets: ["9", "12"],
          commands: { open: "open", stop: "stop", close: "close" },
        },
        { id: "9", name: "Corredor" },
        { id: "12", name: "Varanda" },
      ],
      airConditioner: {
        deviceId: "10",
        brand: "carrier",
        zones: [{ id: "Living", name: "Living" }],
        controls: { zoneSelector: false, aletas: true, windfree: false },
        temperature: { min: 17, max: 24, default: 23 },
      },
    },

    ambiente3: {
      name: "Varanda",
      photo: "photo-varanda.webp",
      visible: true,
      order: 3,
      controlIds: {
        poolLight: "270",
        poolWaterfall: "152",
        poolHydromassage: "153",
        poolDeck: "161",
        poolAwning: "162",
        screen: "19",
        screenReceiver: "18",
        screenRemote: "114",
        screenVolume: "18",
      },
      curtainMotionType: "lateral",
      lights: [
        { id: "12248", name: "Spots" },
        { id: "12249", name: "Churrasqueira" },
        { id: "12230", name: "Pendente", type: "dimmer", defaultLevel: 100 },
      ],
      quickActions: [
        {
          type: "lights",
          devices: [
            { id: "12248", commandOn: "on", commandOff: "off" },
            { id: "12249", commandOn: "on", commandOff: "off" },
            {
              id: "12230",
              commandOn: "setLevel",
              commandOff: "off",
              valueOn: 100,
            },
          ],
        },
      ],
      curtains: [
        {
          name: "Todas",
          description: "Aciona Todas as cortinas do ambiente",
          targets: ["11", "13", "15", "14"],
          commands: { open: "open", stop: "stop", close: "close" },
        },
        {
          name: "Esquerda",
          description: "Aciona cortinas a esquerda",
          targets: ["11", "13"],
          commands: { open: "open", stop: "stop", close: "close" },
        },
        {
          name: "Direita",
          description: "Aciona cortinas a direita",
          targets: ["15", "14"],
          commands: { open: "open", stop: "stop", close: "close" },
        },
        { id: "11", name: "Churrasqueira" },
        { id: "13", name: "Central Esquerda" },
        { id: "15", name: "Central Direita" },
        { id: "14", name: "Corredor" },
      ],
      airConditioner: {
        deviceId: "16",
        brand: "carrier",
        zones: [{ id: "Varanda", name: "Varanda" }],
        controls: { zoneSelector: false, aletas: true, windfree: false },
        temperature: { min: 18, max: 25, default: 22 },
      },
      roku: [{ id: "20", name: "Roku" }],
      games: [{ id: "123", name: "Games" }],
      music: [
        {
          id: "18",
          name: "Denon",
          volumeDeviceId: "18",
          powerDeviceId: "18",
        },
      ],
      tv: [{ id: "19", name: "Televisão" }],
    },

    ambiente4: {
      name: "Piscina",
      photo: "photo-placeholder.webp",
      visible: true,
      order: 4,
      lights: [
        { id: "12250", name: "Espetos Corredor" },
        { id: "12252", name: "Piscina" },
        { id: "12452", name: "LED Piscina" },
      ],
      quickActions: [
        {
          type: "lights",
          devices: [
            { id: "12250", commandOn: "on", commandOff: "off" },
            { id: "12252", commandOn: "on", commandOff: "off" },
            { id: "12452", commandOn: "on", commandOff: "off" },
          ],
        },
      ],
      hidromassagem: [{ id: "130", name: "Hidromassagem" }],
    },

    ambiente5: {
      name: "Escritório",
      photo: "photo-escritorio.webp",
      visible: true,
      order: 5,
      curtains: [{ id: "373", name: "Cortina" }],
      airConditioner: {
        deviceId: "350",
        zones: [{ id: "escritorio", name: "Escritório", deviceId: "350" }],
        controls: { zoneSelector: false, aletas: true, windfree: true },
        temperature: { min: 18, max: 25, default: 22 },
      },
    },

    ambiente6: {
      name: "Escada",
      photo: "photo-escada.webp",
      visible: true,
      order: 6,
      lights: [{ id: "316", name: "Trilho" }],
      quickActions: [
        {
          type: "lights",
          devices: [{ id: "316", commandOn: "on", commandOff: "off" }],
        },
      ],
    },

    ambiente7: {
      name: "Brinquedoteca",
      photo: "photo-brinquedoteca.webp",
      visible: true,
      order: 7,
      tv: [{ id: "382", name: "Televisão" }],
      airConditioner: {
        deviceId: "379",
        brand: "samsung",
        zones: [
          { id: "Brinquedoteca", name: "Brinquedoteca", deviceId: "379" },
        ],
        controls: { zoneSelector: false, aletas: true, windfree: true },
        temperature: { min: 18, max: 25, default: 22 },
      },
    },

    ambiente8: {
      name: "Suíte Milena",
      photo: "photo-suitemilena.webp",
      visible: true,
      order: 8,
      curtains: [{ id: "51", name: "Cortina" }],
      airConditioner: {
        zones: [{ id: "suitemilena", name: "Suíte Milena", deviceId: "188" }],
        controls: { zoneSelector: false, aletas: true, windfree: false },
        temperature: { min: 18, max: 25, default: 22 },
      },
      tv: [{ id: "53", name: "Televisão" }],
      music: [{ id: "54", name: "MÃºsica" }],
      clarotv: [{ id: "55", name: "Claro TV" }],
    },

    ambiente9: {
      name: "Suíte Fabio",
      photo: "photo-suitefabio.webp",
      visible: true,
      order: 10,
      lights: [],
      curtains: [{ id: "52", name: "Cortina" }],
      airConditioner: {
        zones: [{ id: "suitemaster", name: "Suíte Master", deviceId: "180" }],
        controls: { zoneSelector: false, aletas: true, windfree: true },
        temperature: { min: 18, max: 25, default: 22 },
      },
    },

    ambiente10: {
      name: "Suíte Laura",
      photo: "photo-suitelaura.webp",
      visible: true,
      order: 10,
      lights: [],
      curtains: [{ id: "52", name: "Cortina" }],
      airConditioner: {
        zones: [{ id: "suitemaster", name: "Suíte Master", deviceId: "180" }],
        controls: { zoneSelector: false, aletas: true, windfree: true },
        temperature: { min: 18, max: 25, default: 22 },
      },
    },
  },

  devices: {
    audioDefaults: {
      commandDeviceId: "12409",
      metadataDeviceId: "12409",
    },
    legacyControls: {
      piscinaTelao: {
        screen: "19",
        receiver: "18",
        remote: "114",
        volume: "18",
      },
      suiteMaster: {
        tv: "183",
        htv: "189",
      },
      suite1: {
        tv: "184",
        htv: "190",
      },
      suite2: {
        tv: "185",
        htv: "191",
      },
    },
    airConditionerBrands: {
      default: {
        label: "Padrao",
        commands: {
          powerOn: "on",
          powerOff: "off",
          tempPrefix: "temp",
          swingOn: "swingOn",
          swingOff: "swingOff",
          windfree: "windfree",
        },
        attributes: {
          swing: {
            key: "swing",
            on: ["on", "moving", "swing", "true"],
            off: ["off", "parada", "stop", "stopped", "false"],
          },
          temperature: [
            "temperature",
            "coolingsetpoint",
            "thermostatsetpoint",
            "setpoint",
          ],
        },
      },
      carrier: {
        label: "Carrier",
        commands: {
          powerOn: "on",
          powerOff: "off",
          tempPrefix: "temp",
          swingToggle: "swingToggle",
        },
        attributes: {
          swing: {
            key: "swing",
            on: ["on", "moving", "swing", "true"],
            off: ["off", "parada", "stop", "stopped", "false"],
          },
          temperature: [
            "temperature",
            "coolingsetpoint",
            "thermostatsetpoint",
            "setpoint",
          ],
        },
        availableCommands: [
          "configure",
          "initialize",
          "keepalive",
          "off",
          "on",
          "push",
          "reconnect",
          "refresh",
          "setVariable",
          "swingToggle",
          "temp17",
          "temp18",
          "temp19",
          "temp20",
          "temp21",
          "temp22",
          "temp23",
          "temp24",
        ],
      },
    },
    // Inicializa????o por ambiente (dispositivos com comando "initialize")
    initializeDevicesByEnv: {
      ambiente1: ["5", "2", "12409", "7", "6", "4"],
    },

    // O polling atual usa ALL_LIGHT_IDS tambÃ©m para volume do Denon
    extraPollingDevices: ["12409"],
  },
};

/**
 * Bottom Navigation (pill + glass) configuration.
 * Ajuste este bloco para mudar layout, estilo e comportamento da bottom nav.
 */
const bottomNavConfig = {
  enabled: true,
  breakpoint: 768,
  // Mantem a navbar visivel em qualquer largura de tela.
  showOnDesktop: true,
  showOnLandscapeMobile: true,
  landscapeMaxHeight: 560,
  landscapeMaxWidth: 1024,

  // Layout geral da barra
  containerStyle: {
    width: "fit-content",
    maxWidth: "360px",
    height: "80px",
    padding: "8px 4px",
    bottomOffset: "18px",
    itemGap: "0px",
    itemMinTouch: "44px",
    // Largura horizontal de cada item (aproxima/afasta os elementos)
    itemSlotWidth: "68px",
    iconSize: "22px",
    labelSize: "11px",
    // Tamanho da barrinha (notch) quando a nav recolhe no scroll
    notchWidth: "62px",
    notchHeight: "9px",
    // Ajuste aqui o pequeno respiro no fim do conteudo (degrau)
    contentPaddingBottom: "12px",
    // Ajuste aqui o espaco de ancoragem inferior de layouts absolutos/fixos
    dockSpaceBottom: "12px",
  },

  // Glassmorphism
  glassStyle: {
    background: "rgba(8, 8, 8, 0.86)",
    fallbackBackground: "rgba(8, 8, 8, 0.94)",
    borderColor: "rgba(255, 255, 255, 0.06)",
    blur: "16px",
    shadow: "0 6px 14px rgba(0, 0, 0, 0.36), 0 14px 24px rgba(0, 0, 0, 0.28)",
    innerGlow:
      "linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 36%, rgba(255,255,255,0.00) 100%)",
  },

  // Estado ativo e transicoes
  activeStyle: {
    highlightColor: "#FFFFFF",
    highlightSize: "62px",
    textColor: "rgba(255, 255, 255, 0.84)",
    textColorActive: "#ffffff",
    iconTint: "rgba(255, 255, 255, 0.96)",
    iconTintActive: "#101010",
    labelWeight: 500,
    labelWeightActive: 700,
    transitionDuration: "240ms",
    transitionEasing: "cubic-bezier(0.2, 0.8, 0.2, 1)",
    iconPopScale: 1.1,
  },

  // Comportamento da barra durante o scroll
  behavior: {
    autoHideOnScroll: true,
    scrollDelta: 8,
    revealAtTop: 10,
    // Atalho nas pÃ¡ginas de controle: recolhe a nav para um Ãºnico botão Home.
    controlHomeShortcut: {
      enabled: true,
      // Aplicar atalho somente em pÃ¡ginas de controle (nÃ£o em qualquer rota).
      onlyControlRoutes: true,
      includeRoutes: ["scenes-criar"],
      // Rotas de controle seguem o padrÃ£o: ambiente{n}-{controle}
      controlRoutePattern: "^ambiente\\d+-",
      // Rotas principais que mantÃªm a barra completa no centro.
      // Todas as demais rotas entram no modo compacto de retorno.
      primaryRoutes: ["home", "ambientes", "curtains", "scenes"],
      // Como localizar o item de Home dentro de items[].
      homePath: "ambientes",
      homeId: "ambientes",
      // No modo compacto, mantÃ©m sempre visÃ­vel (sem notch de scroll).
      disableAutoHide: true,
      // Ajustes visuais do botão recolhido no canto inferior esquerdo.
      leftOffset: "16px",
      bottomOffset: "18px",
      size: "68px",
      padding: "7px",
      highlightSize: "54px",
      iconSize: "24px",
      background: "rgba(8, 8, 8, 0.88)",
      fallbackBackground: "rgba(8, 8, 8, 0.95)",
      borderColor: "rgba(255, 255, 255, 0.08)",
      blur: "16px",
      shadow: "0 8px 16px rgba(0, 0, 0, 0.34), 0 16px 26px rgba(0, 0, 0, 0.24)",
    },
  },

  items: [
    {
      id: "home",
      label: "Home",
      path: "home",
      icon: "images/icons/icon-home.svg",
      visible: true,
      disabled: false,
      external: false,
      order: 1,
      styleOverrides: {},
      ariaLabel: "Ir para Home",
      tooltip: "Home",
    },
    {
      id: "ambientes",
      label: "Ambientes",
      path: "ambientes",
      icon: "images/icons/icon-ambientes.svg",
      visible: true,
      disabled: false,
      external: false,
      order: 2,
      styleOverrides: {},
      ariaLabel: "Ir para Ambientes",
      tooltip: "Ambientes",
    },
    {
      id: "curtains",
      label: "Cortinas",
      path: "curtains",
      icon: "images/icons/icon-curtain.svg",
      visible: true,
      disabled: false,
      external: false,
      order: 3,
      styleOverrides: {},
      ariaLabel: "Ir para Cortinas",
      tooltip: "Cortinas",
    },
    {
      id: "scenes",
      label: "Cenarios",
      path: "scenes",
      icon: "images/icons/icon-scenes.svg",
      visible: true,
      disabled: false,
      external: false,
      order: 4,
      styleOverrides: {},
      ariaLabel: "Ir para Cenarios",
      tooltip: "Cenarios",
    },
    {
      id: "admin-permissoes",
      label: "Permissoes",
      path: "admin-permissoes",
      icon: "images/icons/icon-settings.svg",
      visible: true,
      disabled: false,
      external: false,
      order: 5,
      styleOverrides: {},
      ariaLabel: "Ir para Permissoes",
      tooltip: "Permissoes",
      adminOnly: true,
    },
  ],
};

const DEFAULT_WEATHER_CONFIG = {
  city: "Ribeirao Preto",
  latitude: -21.1775,
  longitude: -47.8103,
  timezone: "America/Sao_Paulo",
  refreshMinutes: 15,
};

const DEFAULT_MAIN_DASHBOARD_CONFIG = {
  nowPlayingDeviceId: "18",
  controls: {
    transportDeviceId: "18",
    audioDeviceId: "18",
    commands: {
      play: "play",
      pause: "pause",
      next: "nextTrack",
      previous: "previousTrack",
      mute: "mute",
      unmute: "unmute",
    },
  },
  previewNowPlaying: {
    enabled: false,
    status: "playing",
    track: "Blinding Lights",
    artist: "The Weeknd",
    album: "After Hours",
    artwork: "assets/images/music-placeholder.png",
    muted: false,
  },
};

function cloneJson(value, fallback = {}) {
  try {
    return JSON.parse(JSON.stringify(value ?? fallback));
  } catch (_) {
    return JSON.parse(JSON.stringify(fallback));
  }
}

function getWeatherConfig() {
  const override = CLIENT_CONFIG?.weather || {};
  return {
    ...DEFAULT_WEATHER_CONFIG,
    ...override,
  };
}

function getMainDashboardConfig() {
  const override = CLIENT_CONFIG?.mainDashboard || {};
  const merged = {
    ...DEFAULT_MAIN_DASHBOARD_CONFIG,
    ...override,
    controls: {
      ...(DEFAULT_MAIN_DASHBOARD_CONFIG.controls || {}),
      ...(override.controls || {}),
      commands: {
        ...((DEFAULT_MAIN_DASHBOARD_CONFIG.controls || {}).commands || {}),
        ...((override.controls || {}).commands || {}),
      },
    },
    previewNowPlaying: {
      ...(DEFAULT_MAIN_DASHBOARD_CONFIG.previewNowPlaying || {}),
      ...(override.previewNowPlaying || {}),
    },
  };

  return cloneJson(merged, DEFAULT_MAIN_DASHBOARD_CONFIG);
}

// =========================
// Helpers (API pÃºblica)
// =========================

function getDashboardAccessApi() {
  return window.dashboardAccess || null;
}

function hasAnyEnvironmentAccess(envKey) {
  const accessApi = getDashboardAccessApi();
  if (!accessApi || typeof accessApi.hasAnyEnvironmentAccess !== "function") {
    return true;
  }
  return accessApi.hasAnyEnvironmentAccess(envKey);
}

function canViewEnvironment(envKey) {
  const accessApi = getDashboardAccessApi();
  if (!accessApi || typeof accessApi.canViewEnvironment !== "function") {
    return true;
  }
  return accessApi.canViewEnvironment(envKey);
}

function canUseDeviceIdForView(deviceId) {
  const accessApi = getDashboardAccessApi();
  if (!accessApi || typeof accessApi.isDeviceAllowed !== "function") {
    return true;
  }
  return accessApi.isDeviceAllowed(deviceId, "view");
}

function getVisibleEnvironments() {
  if (!CLIENT_CONFIG?.environments) return [];
  return Object.entries(CLIENT_CONFIG.environments)
    .filter(
      ([key, env]) => env && env.visible === true && canViewEnvironment(key),
    )
    .sort((a, b) => (a[1].order || 0) - (b[1].order || 0))
    .map(([key, env]) => ({ key, ...env }));
}

function getEnvironment(envKey) {
  if (!hasAnyEnvironmentAccess(envKey)) {
    return null;
  }
  return (
    (CLIENT_CONFIG?.environments && CLIENT_CONFIG.environments[envKey]) || null
  );
}

function normalizeConfigId(value, fallback = "") {
  if (value === undefined || value === null || value === "") {
    return fallback ? String(fallback) : "";
  }
  return String(value).trim();
}

function normalizeEnvironmentDevice(device) {
  if (!device || typeof device !== "object") return null;

  const baseId = normalizeConfigId(device.id || device.deviceId);
  if (!baseId) return null;

  return {
    ...device,
    id: baseId,
    deviceId: baseId,
    metadataId: normalizeConfigId(
      device.metadataDeviceId || device.metadataId,
      baseId,
    ),
    transportId: normalizeConfigId(
      device.transportDeviceId || device.transportId,
      baseId,
    ),
    volumeId: normalizeConfigId(
      device.volumeDeviceId || device.volumeId,
      baseId,
    ),
    powerId: normalizeConfigId(device.powerDeviceId || device.powerId, baseId),
    controlId: normalizeConfigId(
      device.controlDeviceId || device.controlId,
      baseId,
    ),
    receiverId: normalizeConfigId(device.receiverDeviceId || device.receiverId),
    displayId: normalizeConfigId(device.displayDeviceId || device.displayId),
    inputId: normalizeConfigId(device.inputDeviceId || device.inputId),
  };
}

function getEnvironmentDeviceList(envKey, field) {
  const env = getEnvironment(envKey);
  if (!env) return [];

  const list = Array.isArray(env?.[field]) ? env[field] : [];
  return list
    .map((device) => normalizeEnvironmentDevice(device))
    .filter(Boolean);
}

function getEnvironmentPrimaryDevice(envKey, field, index = 0) {
  const list = getEnvironmentDeviceList(envKey, field);
  if (!list.length) return null;

  const parsedIndex = Number.parseInt(index, 10);
  const safeIndex =
    Number.isFinite(parsedIndex) && parsedIndex >= 0 ? parsedIndex : 0;

  return list[safeIndex] || null;
}

function getEnvironmentDeviceBinding(envKey, field, bindingKey, index = 0) {
  const device = getEnvironmentPrimaryDevice(envKey, field, index);
  if (!device) return "";

  const key = String(bindingKey || "")
    .trim()
    .toLowerCase();

  if (!key || key === "id" || key === "device" || key === "deviceid") {
    return device.id;
  }

  if (key === "metadata" || key === "metadataid") return device.metadataId;
  if (key === "transport" || key === "transportid") return device.transportId;
  if (key === "volume" || key === "volumeid") return device.volumeId;
  if (key === "power" || key === "powerid") return device.powerId;
  if (key === "control" || key === "controlid") return device.controlId;
  if (key === "receiver" || key === "receiverid") return device.receiverId;
  if (key === "display" || key === "displayid") return device.displayId;
  if (key === "input" || key === "inputid") return device.inputId;

  const bindingName = String(bindingKey || "").trim();
  return normalizeConfigId(device[bindingName] || device[`${bindingName}Id`]);
}

function getEnvironmentControlId(envKey, controlKey) {
  const env = getEnvironment(envKey);
  if (!env?.controlIds || typeof env.controlIds !== "object") return "";
  return normalizeConfigId(env.controlIds[controlKey]);
}

function getLegacyControlId(groupKey, controlKey) {
  return normalizeConfigId(
    CLIENT_CONFIG?.devices?.legacyControls?.[groupKey]?.[controlKey],
  );
}

function getAudioDefaults() {
  const defaults = CLIENT_CONFIG?.devices?.audioDefaults || {};
  return {
    commandDeviceId: normalizeConfigId(defaults.commandDeviceId),
    metadataDeviceId: normalizeConfigId(defaults.metadataDeviceId),
  };
}

function getEnvironmentLightIds(envKey) {
  const env = getEnvironment(envKey);
  if (!env?.lights) return [];
  return env.lights.map((light) => String(light.id));
}

function normalizeCurtainTargets(curtain) {
  if (!curtain) return [];

  const rawTargets =
    Array.isArray(curtain.targets) && curtain.targets.length > 0
      ? curtain.targets
      : curtain?.id || curtain?.deviceId
        ? [curtain.id || curtain.deviceId]
        : [];

  return rawTargets
    .map((target) => {
      if (target && typeof target === "object") {
        const id = target.id || target.deviceId;
        if (!id) return null;
        return { id: String(id), config: target };
      }

      if (target === undefined || target === null || target === "") {
        return null;
      }

      return { id: String(target), config: {} };
    })
    .filter(Boolean);
}

function getCurtainActionConfig(source, action) {
  if (!source || typeof source !== "object") {
    return { command: null, value: undefined };
  }

  const commandByAction =
    source.commands && typeof source.commands === "object"
      ? source.commands[action]
      : undefined;
  const commandByAlias =
    source[`${action}Command`] ??
    source[`command${action.charAt(0).toUpperCase() + action.slice(1)}`] ??
    (typeof source[action] === "string" ? source[action] : undefined);

  const valueByAction =
    source.values && typeof source.values === "object"
      ? source.values[action]
      : undefined;
  const valueByAlias =
    source[`${action}Value`] ??
    source[`value${action.charAt(0).toUpperCase() + action.slice(1)}`];

  return {
    command:
      commandByAction !== undefined && commandByAction !== null
        ? String(commandByAction)
        : commandByAlias !== undefined && commandByAlias !== null
          ? String(commandByAlias)
          : null,
    value:
      valueByAction !== undefined
        ? valueByAction
        : valueByAlias !== undefined
          ? valueByAlias
          : undefined,
  };
}

function buildCurtainActionPlan(curtain, action) {
  const targets = normalizeCurtainTargets(curtain);
  if (!targets.length) return [];

  const curtainConfig = getCurtainActionConfig(curtain, action);

  return targets.map((target) => {
    const targetConfig = getCurtainActionConfig(target.config, action);
    const command = targetConfig.command || curtainConfig.command || action;
    const value =
      targetConfig.value !== undefined
        ? targetConfig.value
        : curtainConfig.value !== undefined
          ? curtainConfig.value
          : undefined;

    const payload = { id: String(target.id), command: String(command) };
    if (value !== undefined && value !== null && value !== "") {
      payload.value = value;
    }
    return payload;
  });
}

function encodeCurtainActionPlan(plan) {
  return encodeURIComponent(JSON.stringify(Array.isArray(plan) ? plan : []));
}

function buildCurtainControlModel(curtain, env = null) {
  const targets = normalizeCurtainTargets(curtain);
  if (!targets.length) return null;

  const openPlan = buildCurtainActionPlan(curtain, "open");
  const stopPlan = buildCurtainActionPlan(curtain, "stop");
  const closePlan = buildCurtainActionPlan(curtain, "close");
  const deviceIds = targets.map((target) => String(target.id));
  const firstId = deviceIds[0] || "";
  const icons = resolveCurtainIconsByType(curtain, env);

  return {
    title: curtain?.name || curtain?.title || `Cortina ${firstId}`,
    description: curtain?.description || "",
    deviceId: firstId,
    deviceIds: deviceIds.join(","),
    actionOpen: encodeCurtainActionPlan(openPlan),
    actionStop: encodeCurtainActionPlan(stopPlan),
    actionClose: encodeCurtainActionPlan(closePlan),
    curtainMotionType: icons.motionType,
    iconOpen: icons.open,
    iconStop: icons.stop,
    iconClose: icons.close,
    isGroup: deviceIds.length > 1,
  };
}

function getEnvironmentCurtainIds(envKey) {
  const env = getEnvironment(envKey);
  if (!env?.curtains) return [];
  const ids = [];
  env.curtains.forEach((curtain) => {
    normalizeCurtainTargets(curtain).forEach((target) => ids.push(target.id));
  });
  return Array.from(new Set(ids));
}

function getAllCurtainIds() {
  const ids = [];
  getVisibleEnvironments().forEach((env) => {
    (env.curtains || []).forEach((curtain) => {
      normalizeCurtainTargets(curtain).forEach((target) => ids.push(target.id));
    });
  });
  return Array.from(new Set(ids));
}

function getAllLightIds() {
  const ids = [];
  getVisibleEnvironments().forEach((env) => {
    (env.lights || []).forEach((light) => ids.push(String(light.id)));
  });
  (CLIENT_CONFIG?.devices?.extraPollingDevices || []).forEach((id) => {
    if (canUseDeviceIdForView(id)) {
      ids.push(String(id));
    }
  });
  return Array.from(new Set(ids));
}

function getAcDeviceIds() {
  const ids = {};
  getVisibleEnvironments().forEach((env) => {
    const acConfig = env?.airConditioner || null;
    const explicitAcId = acConfig?.deviceId ? String(acConfig.deviceId) : "";
    const firstZoneId = Array.isArray(acConfig?.zones)
      ? String(acConfig.zones.find((zone) => zone?.deviceId)?.deviceId || "")
      : "";
    const resolvedAcId = explicitAcId || firstZoneId;
    if (resolvedAcId) {
      // ConfiguraÃ§Ã£o por ambiente (deviceId/zones) tem precedÃªncia sobre mapa legado.
      ids[env.key] = resolvedAcId;
    }
  });
  return ids;
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
  return (
    (CLIENT_CONFIG?.ui?.iconOverrides && {
      ...CLIENT_CONFIG.ui.iconOverrides,
    }) ||
    {}
  );
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

function resolveCurtainMotionType(curtain, env) {
  const rawType =
    curtain?.curtainMotionType || env?.curtainMotionType || "lateral";
  return String(rawType || "lateral")
    .trim()
    .toLowerCase();
}

function resolveCurtainIconsByType(curtain, env) {
  const motionType = resolveCurtainMotionType(curtain, env);
  const typeIcons = CLIENT_CONFIG?.ui?.curtainTypes?.[motionType] || {};
  const defaultTypeIcons = CLIENT_CONFIG?.ui?.curtainTypes?.lateral || {};
  const actionIcons = CLIENT_CONFIG?.ui?.actions || {};

  return {
    motionType,
    open:
      curtain?.iconOpen ||
      curtain?.icons?.open ||
      typeIcons.open ||
      defaultTypeIcons.open ||
      actionIcons.curtainOpen ||
      "images/icons/open-curtain.svg",
    stop:
      curtain?.iconStop ||
      curtain?.icons?.stop ||
      typeIcons.stop ||
      defaultTypeIcons.stop ||
      actionIcons.curtainStop ||
      "images/icons/icon-stop.svg",
    close:
      curtain?.iconClose ||
      curtain?.icons?.close ||
      typeIcons.close ||
      defaultTypeIcons.close ||
      actionIcons.curtainClose ||
      "images/icons/close-curtain.svg",
  };
}

function buildCurtainSectionsFromConfig() {
  return getVisibleEnvironments()
    .filter((env) => Array.isArray(env.curtains) && env.curtains.length > 0)
    .map((env) => ({
      key: env.key,
      name: env.name,
      curtains: env.curtains
        .map((curtain) => buildCurtainControlModel(curtain, env))
        .filter(Boolean),
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

  const LED_MODE_DEVICE_ID = "12451";

  const DEFAULT_ICON_ON =
    CLIENT_CONFIG?.ui?.toggles?.light?.on ||
    "images/icons/icon-small-light-on.svg";
  const DEFAULT_ICON_OFF =
    CLIENT_CONFIG?.ui?.toggles?.light?.off ||
    "images/icons/icon-small-light-off.svg";

  const DIMMER_ICON_ON =
    CLIENT_CONFIG?.ui?.toggles?.dimmer?.on || "images/icons/icon-dimmer-on.svg";
  const DIMMER_ICON_OFF =
    CLIENT_CONFIG?.ui?.toggles?.dimmer?.off ||
    "images/icons/icon-dimmer-off.svg";

  const buildLedModeCard = (linkedLedId) => `
        <div class="control-card control-card--led-mode control-card--led-mode-disabled" data-state="off" data-device-id="${LED_MODE_DEVICE_ID}" data-led-device-id="${linkedLedId}" data-icon-on="images/icons/ledmode.svg" data-icon-off="images/icons/ledmode.svg" data-light-name="LED Mode" aria-disabled="true" onclick="toggleLedModeControl(this)">
          <div class="control-icon-wrap">
            <img class="control-icon control-icon-outline" src="images/icons/ledmode.svg" alt="LED Mode">
            <img class="control-icon control-icon-main" src="images/icons/ledmode.svg" alt="LED Mode">
          </div>
          <div class="control-label">LED Mode</div>
        </div>
      `;

  return env.lights
    .map((light, index) => {
      const dimmerEnabled = isDimmerLight(light);

      // Dimmers usam icon-dimmer; a luz acesa aparece no background quando on.
      const defaultIconOn = dimmerEnabled ? DIMMER_ICON_ON : DEFAULT_ICON_ON;
      const defaultIconOff = dimmerEnabled ? DIMMER_ICON_OFF : DEFAULT_ICON_OFF;

      const iconOn = dimmerEnabled
        ? light?.iconOn || light?.icon?.on || light?.icons?.on || defaultIconOn
        : DEFAULT_ICON_ON;
      const iconOff = dimmerEnabled
        ? light?.iconOff ||
          light?.icon?.off ||
          light?.icons?.off ||
          defaultIconOff
        : DEFAULT_ICON_OFF;
      const defaultLevel = normalizeDimmerLevel(light?.defaultLevel, 80);
      const deviceId = String(light.id);
      const isPoolLedControl = envKey === "ambiente4" && deviceId === "12452";

      // Todas as luzes agora tÃªm Ã­cone de background (light-on com 60% opacity quando ligado)
      const backgroundIcon = DEFAULT_ICON_ON;

      if (!dimmerEnabled) {
        const lightCard = `
        <div class="control-card" data-state="off" data-device-id="${deviceId}" data-light-name="${light.name}" data-light-index="${index}" data-icon-on="${iconOn}" data-icon-off="${iconOff}" data-icon-bg="${backgroundIcon}" onclick="toggleRoomControl(this)">
          <div class="control-icon-wrap">
            <img class="control-icon control-icon-bg" src="${backgroundIcon}" alt="" style="opacity: 0;">
            <img class="control-icon control-icon-outline" src="${iconOff}" alt="${light.name}">
            <img class="control-icon control-icon-main" src="${iconOff}" alt="${light.name}">
          </div>
          <div class="control-label">${light.name}</div>
        </div>
      `;

        return isPoolLedControl ? `${lightCard}${buildLedModeCard(deviceId)}` : lightCard;
      }

      const sliderId = `${envKey}-${deviceId}-dimmer`;

      return `
        <div class="control-card control-card--dimmer" data-state="off" data-device-id="${deviceId}" data-light-name="${light.name}" data-light-index="${index}" data-icon-on="${iconOn}" data-icon-off="${iconOff}" data-icon-bg="${backgroundIcon || ""}" data-control-type="dimmer" data-default-level="${defaultLevel}" onclick="toggleDimmerControl(event, this)" onmousedown="startDimmerLongPress(event, this)" onmouseup="cancelDimmerLongPress(this)" onmouseleave="cancelDimmerLongPress(this)" ontouchstart="startDimmerLongPress(event, this)" ontouchend="cancelDimmerLongPress(this)" ontouchcancel="cancelDimmerLongPress(this)">
          <div class="control-icon-wrap">
            ${backgroundIcon ? `<img class="control-icon control-icon-bg" src="${backgroundIcon}" alt="" style="opacity: 0;">` : ""}
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

  const buildCurtainDataAttributes = (curtain) =>
    [
      curtain?.deviceId ? `data-device-id="${curtain.deviceId}"` : "",
      curtain?.deviceIds ? `data-device-ids="${curtain.deviceIds}"` : "",
      curtain?.actionOpen ? `data-action-open="${curtain.actionOpen}"` : "",
      curtain?.actionStop ? `data-action-stop="${curtain.actionStop}"` : "",
      curtain?.actionClose ? `data-action-close="${curtain.actionClose}"` : "",
    ]
      .filter(Boolean)
      .join(" ");

  const curtains = env.curtains
    .map((curtainConfig) => buildCurtainControlModel(curtainConfig, env))
    .filter(Boolean);

  const isSingleCurtain = curtains.length === 1;

  return curtains
    .map((curtain) => {
      const openLabel =
        curtain?.curtainMotionType === "vertical" ? "Subir" : "Abrir";
      const closeLabel =
        curtain?.curtainMotionType === "vertical" ? "Descer" : "Fechar";

      return `
        <article class="curtain-tile curtain-tile--transparent${isSingleCurtain ? " curtain-tile--full-width" : ""}" data-device-id="${curtain.deviceId}" data-device-ids="${curtain.deviceIds}" data-environment="${env.name}">
          <header class="curtain-tile__header curtain-tile__header--minimal">
            <h3 class="curtain-tile__title">${curtain.title}</h3>
            <div class="curtain-tile__line"></div>
          </header>
          <div class="curtain-tile__actions">
            <button class="curtain-tile__btn" ${buildCurtainDataAttributes(curtain)} onclick="curtainAction(this, 'open')" aria-label="${openLabel} ${curtain.title}">
              <img src="${curtain.iconOpen}" alt="${openLabel}">
            </button>
            <button class="curtain-tile__btn curtain-tile__btn--stop" ${buildCurtainDataAttributes(curtain)} onclick="curtainAction(this, 'stop')" aria-label="Parar ${curtain.title}">
              <img src="${curtain.iconStop}" alt="Parar">
            </button>
            <button class="curtain-tile__btn" ${buildCurtainDataAttributes(curtain)} onclick="curtainAction(this, 'close')" aria-label="${closeLabel} ${curtain.title}">
              <img src="${curtain.iconClose}" alt="${closeLabel}">
            </button>
          </div>
        </article>
      `;
    })
    .join("");
}

function getBottomNavConfig() {
  const accessApi = getDashboardAccessApi();
  if (!accessApi || typeof accessApi.filterNavItems !== "function") {
    return bottomNavConfig;
  }

  return {
    ...bottomNavConfig,
    items: accessApi.filterNavItems(bottomNavConfig.items || []),
  };
}

function getAuthConfig() {
  const auth = CLIENT_CONFIG?.auth || {};

  return {
    enabled: auth.enabled === true,
    supabaseUrl:
      typeof auth.supabaseUrl === "string" ? auth.supabaseUrl.trim() : "",
    supabaseAnonKey:
      typeof auth.supabaseAnonKey === "string"
        ? auth.supabaseAnonKey.trim()
        : "",
    allowEmailSignUp: auth.allowEmailSignUp === true,
    allowGoogleLogin: auth.allowGoogleLogin !== false,
    requireEmailConfirmation: auth.requireEmailConfirmation !== false,
    redirectTo:
      typeof auth.redirectTo === "string" ? auth.redirectTo.trim() : "",
  };
}

window.CLIENT_CONFIG = CLIENT_CONFIG;
window.bottomNavConfig = bottomNavConfig;
window.getBottomNavConfig = getBottomNavConfig;
window.getWeatherConfig = getWeatherConfig;
window.getMainDashboardConfig = getMainDashboardConfig;
window.getVisibleEnvironments = getVisibleEnvironments;
window.getEnvironment = getEnvironment;
window.getEnvironmentDeviceList = getEnvironmentDeviceList;
window.getEnvironmentPrimaryDevice = getEnvironmentPrimaryDevice;
window.getEnvironmentDeviceBinding = getEnvironmentDeviceBinding;
window.getEnvironmentControlId = getEnvironmentControlId;
window.getLegacyControlId = getLegacyControlId;
window.getAudioDefaults = getAudioDefaults;
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
window.getAuthConfig = getAuthConfig;

console.log("âœ… CLIENT_CONFIG carregado:", CLIENT_CONFIG.clientInfo.name);
