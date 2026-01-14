# Hubitat Cloud API - Referência de Comandos

## Base URL

```
https://cloud.hubitat.com/api/e45cb756-9028-44c2-8a00-e6fb3651856c/apps/15
```

## Access Token

```
access_token=1d9b367b-e4cd-4042-b726-718b759a82ef
```

---

## Endpoints Disponíveis

### 1. Get Device Info

Obtém informações completas de um dispositivo.

**URL:**

```
GET /devices/[Device ID]?access_token=1d9b367b-e4cd-4042-b726-718b759a82ef
```

**Exemplo:**

```
https://cloud.hubitat.com/api/e45cb756-9028-44c2-8a00-e6fb3651856c/apps/15/devices/111?access_token=1d9b367b-e4cd-4042-b726-718b759a82ef
```

---

### 2. Get Device Event History

Obtém histórico de eventos de um dispositivo.

**URL:**

```
GET /devices/[Device ID]/events?access_token=1d9b367b-e4cd-4042-b726-718b759a82ef
```

**Exemplo:**

```
https://cloud.hubitat.com/api/e45cb756-9028-44c2-8a00-e6fb3651856c/apps/15/devices/111/events?access_token=1d9b367b-e4cd-4042-b726-718b759a82ef
```

---

### 3. Get Device Commands

Lista todos os comandos disponíveis para um dispositivo.

**URL:**

```
GET /devices/[Device ID]/commands?access_token=1d9b367b-e4cd-4042-b726-718b759a82ef
```

**Exemplo:**

```
https://cloud.hubitat.com/api/e45cb756-9028-44c2-8a00-e6fb3651856c/apps/15/devices/111/commands?access_token=1d9b367b-e4cd-4042-b726-718b759a82ef
```

---

### 4. Get Device Capabilities

Lista todas as capabilities de um dispositivo.

**URL:**

```
GET /devices/[Device ID]/capabilities?access_token=1d9b367b-e4cd-4042-b726-718b759a82ef
```

**Exemplo:**

```
https://cloud.hubitat.com/api/e45cb756-9028-44c2-8a00-e6fb3651856c/apps/15/devices/111/capabilities?access_token=1d9b367b-e4cd-4042-b726-718b759a82ef
```

---

### 5. Get Device Attribute

Obtém o valor de um atributo específico.

**URL:**

```
GET /devices/[Device ID]/attribute/[Attribute]?access_token=1d9b367b-e4cd-4042-b726-718b759a82ef
```

**Exemplo:**

```
https://cloud.hubitat.com/api/e45cb756-9028-44c2-8a00-e6fb3651856c/apps/15/devices/15/attribute/volume?access_token=1d9b367b-e4cd-4042-b726-718b759a82ef
```

---

### 6. Send Device Command ⭐ **IMPORTANTE**

Envia um comando para um dispositivo.

**URL:**

```
GET /devices/[Device ID]/[Command]/[Secondary value]?access_token=1d9b367b-e4cd-4042-b726-718b759a82ef
```

**Estrutura:**

- `[Device ID]` - ID do dispositivo (ex: 111)
- `[Command]` - Nome do comando (ex: pushButton)
- `[Secondary value]` - Valor secundário/parâmetro (ex: 25) - **OPCIONAL**

**Exemplos:**

#### Comando sem parâmetro:

```
https://cloud.hubitat.com/api/e45cb756-9028-44c2-8a00-e6fb3651856c/apps/15/devices/111/on?access_token=1d9b367b-e4cd-4042-b726-718b759a82ef
```

#### Comando com parâmetro (pushButton):

```
https://cloud.hubitat.com/api/e45cb756-9028-44c2-8a00-e6fb3651856c/apps/15/devices/111/pushButton/25?access_token=1d9b367b-e4cd-4042-b726-718b759a82ef
```

#### Comando setVolume:

```
https://cloud.hubitat.com/api/e45cb756-9028-44c2-8a00-e6fb3651856c/apps/15/devices/15/setVolume/50?access_token=1d9b367b-e4cd-4042-b726-718b759a82ef
```

---

### 7. Send POST URL

Envia um POST para uma URL codificada.

**URL:**

```
GET /postURL/[URL]?access_token=1d9b367b-e4cd-4042-b726-718b759a82ef
```

---

### 8. Set Hub Variable

Define o valor de uma variável do hub.

**URL:**

```
GET /hubvariables/[Variable Name]/[Value]?access_token=1d9b367b-e4cd-4042-b726-718b759a82ef
```

---

### 9. Get Modes List

Lista todos os modos disponíveis.

**URL:**

```
GET /modes?access_token=1d9b367b-e4cd-4042-b726-718b759a82ef
```

**Exemplo:**

```
https://cloud.hubitat.com/api/e45cb756-9028-44c2-8a00-e6fb3651856c/apps/15/modes?access_token=1d9b367b-e4cd-4042-b726-718b759a82ef
```

---

### 10. Set Mode

Define um modo específico.

**URL:**

```
GET /modes/[Mode ID]?access_token=1d9b367b-e4cd-4042-b726-718b759a82ef
```

---

## 📺 Comandos do Controle de TV (Device 111)

### Formato Correto para Device 111

O device 111 expõe comandos individuais para cada ação do controle.

**Template:**

```
/devices/111/[Comando]?access_token=...
```

### Mapeamento de Botões TV:

| Botão         | Comando        | URL Completa                                 |
| ------------- | -------------- | -------------------------------------------- |
| ON            | `on`           | `/devices/111/on?access_token=...`           |
| OFF           | `off`          | `/devices/111/off?access_token=...`          |
| UP            | `cursorUp`     | `/devices/111/cursorUp?access_token=...`     |
| DOWN          | `cursorDown`   | `/devices/111/cursorDown?access_token=...`   |
| LEFT          | `cursorLeft`   | `/devices/111/cursorLeft?access_token=...`   |
| RIGHT         | `cursorRight`  | `/devices/111/cursorRight?access_token=...`  |
| OK            | `cursorCenter` | `/devices/111/cursorCenter?access_token=...` |
| BACK          | `returnButton` | `/devices/111/returnButton?access_token=...` |
| MENU (HDMI 2) | `hdmi2`        | `/devices/111/hdmi2?access_token=...`        |
| HOME          | `home`         | `/devices/111/home?access_token=...`         |
| MUTE          | `mute`         | `/devices/111/mute?access_token=...`         |
| CH+           | `channelDown`  | `/devices/111/channelDown?access_token=...`  |
| CH-           | `channelUp`    | `/devices/111/channelUp?access_token=...`    |
| Número 0      | `num0`         | `/devices/111/num0?access_token=...`         |
| Número 1      | `num1`         | `/devices/111/num1?access_token=...`         |
| Número 2      | `num2`         | `/devices/111/num2?access_token=...`         |
| Número 3      | `num3`         | `/devices/111/num3?access_token=...`         |
| Número 4      | `num4`         | `/devices/111/num4?access_token=...`         |
| Número 5      | `num5`         | `/devices/111/num5?access_token=...`         |
| Número 6      | `num6`         | `/devices/111/num6?access_token=...`         |
| Número 7      | `num7`         | `/devices/111/num7?access_token=...`         |
| Número 8      | `num8`         | `/devices/111/num8?access_token=...`         |
| Número 9      | `num9`         | `/devices/111/num9?access_token=...`         |

---

## 🎵 Comandos do Denon (Device 15)

### Volume:

```
/devices/15/setVolume/[0-100]?access_token=...
```

### Outros comandos:

- `/devices/15/mute?access_token=...`
- `/devices/15/unmute?access_token=...`
- `/devices/15/play?access_token=...`
- `/devices/15/pause?access_token=...`
- `/devices/15/nextTrack?access_token=...`
- `/devices/15/previousTrack?access_token=...`

---

## Notas Importantes

1. **Método HTTP:** Todos os comandos usam GET (não POST)
2. **URL Encoding:** Espaços e caracteres especiais devem ser codificados
3. **Access Token:** Sempre incluir no query string
4. **pushButton:** Comando usado para dispositivos de controle remoto virtual
5. **Secondary Value:** Parâmetro adicional usado em comandos como pushButton e setVolume
