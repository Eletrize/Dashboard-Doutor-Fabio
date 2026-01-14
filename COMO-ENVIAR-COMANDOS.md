# Como os Comandos de Luz Funcionam

## 📊 Fluxo Geral

```
Clique do Usuário
    ↓
toggleRoomControl() [script.js:345]
    ↓
sendHubitatCommand(deviceId, "on" ou "off", [opcional: value])
    ↓
Hubitat Proxy (functions/hubitat-proxy.js)
    ↓
Hubitat Cloud API
    ↓
Dispositivo Recebe Comando
```

---

## 1️⃣ ETAPA 1: Clique do Usuário (HTML)

### Exemplo de um Card de Luz:

```html
<div
  class="control-card"
  data-state="off"
  data-device-id="238"
  onclick="toggleRoomControl(this)"
>
  <img
    class="control-icon"
    src="images/icons/icon-small-light-off.svg"
    alt="Spots Hall"
  />
  <div class="control-label">Spots Hall</div>
</div>
```

**Dados Importantes:**

- `data-device-id="238"` - ID do dispositivo
- `onclick="toggleRoomControl(this)"` - Função chamada ao clicar

---

## 2️⃣ ETAPA 2: Função toggleRoomControl() (script.js:345)

```javascript
function toggleRoomControl(el) {
  const deviceId = el.dataset.deviceId; // Extrai ID do card (ex: "238")
  const isOff = (el.dataset.state || "off") === "off";
  const newState = isOff ? "on" : "off"; // Alterna estado

  // Determina o comando:
  // - Se está OFF e clica → newState = "on" → comando = "on"
  // - Se está ON e clica → newState = "off" → comando = "off"

  console.log(`Enviando comando ${newState} para dispositivo ${deviceId}`);

  // Chama a função que envia o comando
  sendHubitatCommand(deviceId, newState === "on" ? "on" : "off");
}
```

**Resumo:**

1. Extrai o `deviceId` do elemento clicado
2. Determina o novo estado (on/off)
3. Chama `sendHubitatCommand(deviceId, comando)`

---

## 3️⃣ ETAPA 3: Função sendHubitatCommand() (script.js:2425)

```javascript
async function sendHubitatCommand(deviceId, command, value) {
  // Parâmetros:
  // - deviceId: ID do dispositivo (ex: "238")
  // - command: comando a executar (ex: "on" ou "off")
  // - value: parâmetro opcional (ex: "50" para volume)

  // Constrói a URL do proxy:
  const proxyUrl = `${HUBITAT_PROXY_URL}?device=${deviceId}&command=${encodeURIComponent(
    command
  )}${value !== undefined ? `&value=${encodeURIComponent(value)}` : ""}`;

  // Exemplos de URLs geradas:
  // - /hubitat-proxy?device=238&command=on
  // - /hubitat-proxy?device=238&command=off
  // - /hubitat-proxy?device=15&command=setVolume&value=50
  // - /hubitat-proxy?device=111&command=cursorUp

  // Faz o fetch da URL
  const response = await fetch(proxyUrl);
  return JSON.parse(response.text());
}
```

**Parâmetros de sendHubitatCommand:**
| Parâmetro | Obrigatório | Exemplo | Descrição |
|-----------|------------|---------|-----------|
| deviceId | ✅ Sim | "238" | ID do dispositivo no Hubitat |
| command | ✅ Sim | "on" | Nome do comando |
| value | ❌ Não | "50" | Valor secundário (volume, número botão, etc) |

---

## 4️⃣ ETAPA 4: Hubitat Proxy (functions/hubitat-proxy.js)

```javascript
// Recebe os parâmetros da URL:
const device = url.searchParams.get("device"); // "238"
const command = url.searchParams.get("command"); // "on"
const value = url.searchParams.get("value"); // null (para on/off)

// Monta a URL final da API do Hubitat:
let cmdUrl = `${HUBITAT_BASE_URL}/devices/${device}/${encodeURIComponent(
  command
)}`;

if (value) cmdUrl += `/${encodeURIComponent(value)}`;
cmdUrl += `?access_token=${HUBITAT_ACCESS_TOKEN}`;

// Exemplos finais gerados:
// Para luz ON:
//   https://cloud.hubitat.com/api/.../devices/238/on?access_token=...
//
// Para luz OFF:
//   https://cloud.hubitat.com/api/.../devices/238/off?access_token=...
//
// Para TV (cursorUp):
//   https://cloud.hubitat.com/api/.../devices/111/cursorUp?access_token=...
```

---

## 📋 Resumo: Ordem dos Parâmetros

### Para Luzes (on/off):

```
deviceId → comando
238 → "on"
238 → "off"
```

### Para Outros Dispositivos:

```
deviceId → comando → [valor opcional]
111 → "cursorUp"
15 → "setVolume" → "50"
```

---

## 🔄 Exemplo Completo: Acender a Luz "Spots Hall" (ID 238)

### 1. HTML Clicado:

```html
<div onclick="toggleRoomControl(this)" data-device-id="238" data-state="off">
  Spots Hall
</div>
```

### 2. JavaScript Executa:

```javascript
toggleRoomControl(element)
  → deviceId = "238"
  → newState = "on"
  → sendHubitatCommand("238", "on")
```

### 3. URL Enviada para Proxy:

```
/hubitat-proxy?device=238&command=on
```

### 4. Proxy Monta URL Final:

```
https://cloud.hubitat.com/api/e45cb756-9028-44c2-8a00-e6fb3651856c/apps/15/devices/238/on?access_token=1d9b367b-e4cd-4042-b726-718b759a82ef
```

### 5. Hubitat Recebe e Executa:

```
Acender o dispositivo 238 (Spots Hall)
```

---

## 📝 Conclusão

**Resposta à sua pergunta:**

✅ **Sim, é primeiro o ID, depois o comando:**

```
sendHubitatCommand(deviceId, command, [value])
                    ↑         ↑       ↑
                  Primeiro  Segundo  Terceiro (opcional)
```

**Exemplos:**

- Luzes: `sendHubitatCommand("238", "on")` → Acende luz 238
- TV: `sendHubitatCommand("111", "cursorUp")` → Move cursor para cima
- Denon: `sendHubitatCommand("15", "setVolume", "50")` → Seta volume para 50 no Denon
