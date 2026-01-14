# 🔄 SOLUÇÃO PARA MUDANÇAS NÃO APARECEREM

## Problema
Você alterou o `config.js` mas as mudanças não aparecem no Dashboard.

## Causa
Cache do navegador + Service Worker estão mantendo a versão antiga.

## ✅ SOLUÇÃO RÁPIDA (3 passos)

### Passo 1: Abrir página de limpeza
Abra no navegador:
```
http://localhost:3000/clear-cache.html
```

### Passo 2: Limpar tudo
Clique no botão: **"🔥 LIMPAR TUDO"**

### Passo 3: Abrir Dashboard limpo
Clique no botão: **"✨ Abrir Dashboard Limpo"**

---

## 🛠️ SOLUÇÃO MANUAL (se a rápida não funcionar)

### Opção A - DevTools
1. Pressione **F12** (abrir DevTools)
2. Vá em **Application** (ou **Aplicativo**)
3. No menu esquerdo, clique em **Clear storage** (ou **Limpar armazenamento**)
4. Marque todas as opções:
   - ☑️ Unregister service workers
   - ☑️ Local and session storage
   - ☑️ Cache storage
   - ☑️ IndexedDB
5. Clique em **Clear site data** (ou **Limpar dados do site**)
6. Feche o DevTools
7. Pressione **Ctrl + Shift + R** (reload forçado)

### Opção B - Service Worker Manual
1. Pressione **F12**
2. Vá em **Application** > **Service Workers**
3. Clique em **Unregister** em cada service worker listado
4. Feche o DevTools
5. Pressione **Ctrl + F5**

### Opção C - Modo Anônimo (teste rápido)
1. Abra uma janela anônima/privada (**Ctrl + Shift + N**)
2. Acesse `http://localhost:3000`
3. Teste suas mudanças

---

## 📝 Como adicionar itens no config.js

### Exemplo - Adicionar TV:
```javascript
ambiente1: {
  name: "Home Theater",
  lights: [...],        // Mostra "Luzes"
  curtains: [...],      // Mostra "Cortinas"
  airConditioner: {...},// Mostra "Ar Condicionado"
  tv: [                 // ✅ Mostra "TV"
    { id: "111", name: "Televisão" }
  ],
}
```

### Exemplo - Adicionar Música:
```javascript
ambiente1: {
  name: "Home Theater",
  lights: [...],
  music: [              // ✅ Mostra "Música"
    { id: "123", name: "Som Ambiente" }
  ],
}
```

### Exemplo - Adicionar HTV:
```javascript
ambiente1: {
  name: "Home Theater",
  lights: [...],
  htv: [                // ✅ Mostra "HTV"
    { id: "456", name: "HTV Box" }
  ],
}
```

---

## 🐛 Debug (para desenvolvedores)

### Ver logs no console:
1. Pressione **F12**
2. Vá em **Console**
3. Recarregue a página
4. Procure por logs `[ensureConfigPage]`
5. Você verá algo como:
   ```
   [ensureConfigPage] Gerando ambiente1: {
     hasLights: true,
     hasCurtains: true,
     hasAC: true,
     hasMusic: false,
     hasTV: true,     ← deve ser true se você adicionou
     hasHTV: false
   }
   ```

### Se ainda não funcionar:
- Verifique se o `config.js` tem erros de sintaxe (vírgulas, chaves)
- Confirme que o servidor está rodando na porta correta
- Tente reiniciar o servidor local

---

## 📌 Versões Atuais
- Config: `v1.0.2`
- Scripts: `v1.0.6`
- Service Worker: `v1.2.2`

Sempre que fizer mudanças importantes, use `clear-cache.html` antes de testar!
