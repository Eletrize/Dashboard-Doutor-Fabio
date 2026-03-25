# Arquitetura e Contratos

## 1) Dependências externas

- Open-Meteo:
  - `https://api.open-meteo.com/v1/forecast`
- Backend de automação:
  - `GET /polling?devices=<ids>`
  - `GET /hubitat-proxy?device=<id>&command=<cmd>[&value=<value>]`

## 2) Contratos mínimos de dados

### 2.1 Weather config
```js
{
  city: "Ribeirao Preto",
  latitude: -21.1775,
  longitude: -47.8103,
  timezone: "auto",
  refreshMinutes: 15
}
```

### 2.2 Main dashboard config
```js
{
  nowPlayingDeviceId: "29",
  controls: {
    transportDeviceId: "29",
    audioDeviceId: "15",
    commands: {
      play: "play",
      pause: "pause",
      next: "nextTrack",
      previous: "previousTrack",
      mute: "mute",
      unmute: "unmute"
    }
  },
  previewNowPlaying: {
    enabled: true,
    status: "playing",
    track: "Blinding Lights",
    artist: "The Weeknd",
    album: "After Hours",
    artwork: "images/Images/music-placeholder.png",
    muted: false
  }
}
```

### 2.3 Environments
Cada ambiente deve expor:
- `key`, `name`, `photo`
- listas opcionais por tipo: `lights`, `curtains`, `tv`, `htv`, `bluray`, `appletv`, `clarotv`, `music`, `roku`, `games`, `hidromassagem`
- `airConditioner` (`deviceId` e/ou `zones[].deviceId`)

## 3) Contrato de integração (adapters)

O módulo de Home deve receber/adaptar:
- `getStoredState(deviceId): string|null`
- `setStoredState(deviceId, state): void`
- `sendCommand(deviceId, command, value?): Promise<any>`
- `navigate(route): void`
- `getVisibleEnvironments(): Environment[]`
- `getEnvironmentPhotoMap(): Record<string,string>`

## 4) Regras de estado ativo

Estado inativo:
- `off`, `closed`, `closing`, `close`, `stopped`, `stop`, `idle`, `paused`, `pause`, `false`, `0`, `unknown`, `unavailable`, `none`, `null`.

Tudo fora disso é considerado ativo.

## 5) Comandos de desligamento

- `curtains` => comando `close`, estado final `closed`
- demais => comando `off`, estado final `off`

## 6) Persistência de último ambiente

- chave: `lastEnvironmentRoute`
- valor esperado: `ambienteN`

## 7) Regras de confiabilidade

- Não cachear `/polling` no service worker (network-only).
- Não sobrescrever estado local com `off` quando estiver offline sem confirmação real.
- Quando possível, usar debounce de refresh para evitar flicker.

