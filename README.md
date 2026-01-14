# Dashboard Eletrize - Base GenÃ©rica

Dashboard modular para controle de automaÃ§Ã£o residencial via Hubitat. Este Ã© um template base pronto para ser customizado para qualquer cliente.

## ðŸ“‹ VisÃ£o Geral

Este dashboard oferece:

- âœ… 6 ambientes genÃ©ricos configurÃ¡veis
- âœ… Controle de luzes, ar condicionado e cortinas
- âœ… 2 cenÃ¡rios customizÃ¡veis
- âœ… Interface PWA instalÃ¡vel
- âœ… Design glassmorphism responsivo
- âœ… IntegraÃ§Ã£o com Hubitat via Cloudflare Functions

## ðŸš€ Setup RÃ¡pido para Novo Cliente

### Build dos assets (CSS/JS)

Para diminuir o peso total, os arquivos servidos (`styles.css` e `script.js`) são versões minificadas geradas a partir de `styles.source.css` e `script.source.js`.
Edite **sempre** os arquivos `.source` e, depois das alterações, rode:

```bash
npm install          # primeira vez
npm run build:assets
```

Isso recompila os assets otimizados antes de publicar.


### 1. PersonalizaÃ§Ã£o BÃ¡sica

#### 1.1 InformaÃ§Ãµes do Projeto

Edite `package.json`:

```json
{
  "name": "dashboard-[nome-cliente]",
  "description": "Dashboard de automaÃ§Ã£o para [Nome Cliente]"
}
```

Edite `wrangler.toml`:

```toml
name = "dashboard-[nome-cliente]"
PROJECT_NAME = "Dashboard [Nome Cliente]"
```

#### 1.2 Branding

- **Logo**: Substitua `images/icons/Eletrize.svg` pelo logo do cliente
- **Ãcone PWA**: Substitua os arquivos em `images/pwa/` com os Ã­cones do cliente
- **TÃ­tulo**: Edite `index.html` e atualize todas as ocorrÃªncias de "Dashboard Eletrize"

#### 1.3 Fotos dos Ambientes

Defina o campo `photo` de cada ambiente em `config.js` (somente o nome base do arquivo):

```javascript
ambiente1: {
  name: "Sala",
  photo: "photo-sala",
  // ...
}
```

Coloque a imagem em `images/Images/photo-sala.jpg` e as versões otimizadas em `images/optimized/photo-sala-<largura>.webp`.

#### 1.4 Ícones dos Botões (Luzes)

Para escolher o ícone do botão de cada luz, adicione `iconOn` e `iconOff` (ou `icon: { on, off }`) no item da lista `lights` em `config.js`:

```javascript
lights: [
  {
    id: "101",
    name: "Lustre",
    iconOn: "images/icons/icon-small-light-on.svg",
    iconOff: "images/icons/icon-small-light-off.svg",
  },
]
```

#### 1.5 Ícones de Todos os Botões (Global)

Para trocar ícones de qualquer parte do dashboard (música, cortinas, ar-condicionado, navegação, etc.), use `ui.iconOverrides` no `config.js`.

Exemplo:

```javascript
ui: {
  iconOverrides: {
    "images/icons/icon-mute.svg": "images/icons/icon-volume.svg",
    "images/icons/arrow-up.svg": "images/icons/icon-ac-aleta-alta.svg",
  },
}
```

Isso substitui automaticamente qualquer `<img src="...">` que use o caminho antigo (inclusive ícones estáticos do HTML) e também funciona com botões que alternam on/off.

### 2. Configuração dos Ambientes

#### 2.1 Nomes dos Ambientes

Edite o array `rooms` em `index.html` (linha ~440):

```javascript
const rooms = [
  { name: "Sala de Estar", route: "ambiente1" },
  { name: "Quarto Principal", route: "ambiente2" },
  { name: "EscritÃ³rio", route: "ambiente3" },
  { name: "Cozinha", route: "ambiente4" },
  { name: "Sala de Jantar", route: "ambiente5" },
  { name: "Garagem", route: "ambiente6" },
];
```

#### 2.2 Dispositivos de Cada Ambiente

Para cada ambiente, edite as pÃ¡ginas correspondentes em `index.html`:

**Exemplo - Ambiente 1 (comeÃ§ando na linha ~1180):**

```html
<!-- Luzes -->
<div
  class="control-card"
  data-state="off"
  data-device-id="7"
  onclick="toggleRoomControl(this)"
>
  <div class="control-label">Lustre Principal</div>
</div>
<div
  class="control-card"
  data-state="off"
  data-device-id="8"
  onclick="toggleRoomControl(this)"
>
  <div class="control-label">Spots Embutidos</div>
</div>

<!-- Cortina -->
<article
  class="curtain-tile"
  data-device-id="42"
  data-environment="Sala de Estar"
>
  <h3 class="curtain-tile__title">Cortina Principal</h3>
</article>
```

**IDs de Dispositivos**: Substitua `data-device-id="X"` pelos IDs reais do Hubitat.

#### 2.3 Array de Cortinas

Edite `CURTAIN_SECTIONS` em `index.html` (linha ~378):

```javascript
const CURTAIN_SECTIONS = [
  {
    key: "ambiente1",
    name: "Sala de Estar",
    curtains: [{ deviceId: "42", title: "Cortina Principal" }],
  },
  // ... repita para cada ambiente que tenha cortinas
];
```

### 3. Configuração dos CenÃ¡rios

Edite `scenes.js` para personalizar os dois cenÃ¡rios:

#### CenÃ¡rio 1 (linha ~163):

```javascript
function executeCenario1() {
  console.log("ðŸŒ… Iniciando cenÃ¡rio: Bom Dia");

  const salaLights = ["7", "8"]; // IDs das luzes da sala
  const quartoLights = ["11", "12"]; // IDs das luzes do quarto
  const cortinasAbrir = ["42", "43"]; // IDs das cortinas para abrir

  // ... customize a lÃ³gica
}
```

#### CenÃ¡rio 2 (linha ~217):

```javascript
function executeCenario2() {
  console.log("ðŸŒ™ Iniciando cenÃ¡rio: Boa Noite");

  const lightsToKeepOn = ["35", "49"]; // Luzes que ficam acesas

  // ... customize a lÃ³gica
}
```

**Atualize os rÃ³tulos** em `index.html` (linha ~620):

```html
<div class="control-label">Bom Dia</div>
<!-- ... -->
<div class="control-label">Boa Noite</div>
```

### 4. Lista Completa de IDs

Atualize `ALL_LIGHT_IDS` em `script.js` (linha ~2) com TODOS os IDs de luzes:

```javascript
const ALL_LIGHT_IDS = [
  "7",
  "8",
  "9", // Sala de Estar
  "11",
  "12",
  "13", // Quarto Principal
  "35",
  "36",
  "37", // Cozinha
  // ... adicione todos os IDs
];
```

### 5. Configuração do Hubitat

#### 5.1 Obter Credenciais

1. Acesse seu Hubitat
2. VÃ¡ em **Apps** â†’ **Maker API**
3. Copie a URL completa que contÃ©m:
   - UUID do hub
   - ID do app
   - Access token

#### 5.2 Configurar Secrets no Cloudflare

```bash
# Login no Cloudflare
wrangler login

# Configurar secrets (cole os valores quando solicitado)
wrangler secret put HUBITAT_ACCESS_TOKEN
wrangler secret put HUBITAT_BASE_URL
wrangler secret put HUBITAT_FULL_URL
wrangler secret put WEBHOOK_SHARED_SECRET
```

Veja `VARIAVEIS_HUBITAT.md` para mais detalhes.

### 6. Deploy

#### Desenvolvimento Local

```bash
npm install
npm run dev
```

#### Deploy para ProduÃ§Ã£o

```bash
wrangler pages deploy . --project-name dashboard-[nome-cliente]
```

Veja `DEPLOY.md` para instruÃ§Ãµes completas.

## ðŸ“ Estrutura de Arquivos

```
/
â”œâ”€â”€ index.html              # PÃ¡gina principal (edite aqui os ambientes)
â”œâ”€â”€ script.js              # LÃ³gica de controle (edite IDs de dispositivos)
â”œâ”€â”€ scenes.js              # CenÃ¡rios (customize aqui)
â”œâ”€â”€ styles.css             # Estilos (normalmente nÃ£o precisa editar)
â”œâ”€â”€ package.json           # Metadados do projeto
â”œâ”€â”€ wrangler.toml          # Config Cloudflare
â”œâ”€â”€ manifest.json          # Config PWA
â”œâ”€â”€ functions/             # Cloudflare Functions (proxy Hubitat)
â”œâ”€â”€ images/
â”‚   â”œâ”€â”€ icons/            # Ãcones da UI
â”‚   â”œâ”€â”€ pwa/              # Ãcones do app (substitua)
â”‚   â””â”€â”€ Images/           # Fotos dos ambientes (adicione aqui)
â””â”€â”€ fonts/                # Fontes Raleway
```

## ðŸŽ¨ CustomizaÃ§Ã£o AvanÃ§ada

### Cores e Tema

Edite `styles.css` para alterar:

- Cores de fundo (variÃ¡veis CSS no `:root`)
- Opacidades do glassmorphism
- AnimaÃ§Ãµes e transiÃ§Ãµes

### Adicionar Mais Ambientes

1. Duplique uma pÃ¡gina de ambiente em `index.html`
2. Renomeie as classes para `ambiente7-page`, `ambiente7-controls-wrapper`, etc.
3. Adicione ao array `rooms`
4. Adicione CSS para `.ambiente7-page` em `styles.css` (copie de outro ambiente)

### Remover Ambientes

1. Remova a entrada do array `rooms`
2. Remova a pÃ¡gina correspondente de `index.html`
3. Opcional: remova CSS especÃ­fico

### Controles Especiais

Para adicionar tipos diferentes de controles (ventiladores, TVs, etc.):

1. Adicione os Ã­cones SVG em `images/icons/`
2. Crie controle similar aos existentes
3. Adicione handlers no `script.js`

## ðŸ”§ Troubleshooting

### Dispositivos nÃ£o respondem

- Verifique se os IDs estÃ£o corretos no Hubitat
- Confirme que as secrets do Cloudflare estÃ£o configuradas
- Veja os logs: `wrangler tail`

### Cortinas invertidas

Alguns dispositivos tÃªm comandos invertidos. Edite `script.js` (linha ~1122):

```javascript
if (deviceId === "40") {
  // ID da cortina invertida
  map = { open: 3, stop: 2, close: 1 };
}
```

### Caracteres especiais nÃ£o aparecem

O dashboard jÃ¡ tem correÃ§Ã£o automÃ¡tica para caracteres com encoding incorreto.
Edite `script.js` (linha ~717) se necessÃ¡rio adicionar mais correÃ§Ãµes.

## ðŸ“± PWA - App InstalÃ¡vel

Para ativar a instalaÃ§Ã£o como app:

1. Edite `manifest.json` com nome e descriÃ§Ã£o do cliente
2. Substitua os Ã­cones em `images/pwa/`
3. O service worker (`service-worker.js`) jÃ¡ estÃ¡ configurado

## ðŸ” SeguranÃ§a

- âœ… Todas as credenciais ficam em secrets do Cloudflare
- âœ… Proxy server-side para ocultar tokens do cliente
- âœ… CORS configurado nas functions
- âœ… Nenhuma credencial exposta no cÃ³digo frontend

## ðŸ“ž Suporte

Para questÃµes tÃ©cnicas ou customizaÃ§Ãµes especiais, consulte:

- `DEPLOY.md` - InstruÃ§Ãµes de deploy
- `VARIAVEIS_HUBITAT.md` - Setup do Hubitat
- `app-info-menu-snippets.md` - Componentes de UI

---

**Desenvolvido por Eletrize** ðŸ”Œ
