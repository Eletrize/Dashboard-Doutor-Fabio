// ALL_LIGHT_IDS agora está definido em script.js (carregado primeiro)

// === CONFIGURAÇÃO DO CENÁRIO DORMIR ===
// Dispositivos da Varanda (Ambiente 1)
const VARANDA_LUZES = ["44", "95", "96", "41", "45", "40", "31"];
const VARANDA_CORTINAS = ["109", "115", "116"];
const VARANDA_AC = "110";
const VARANDA_TV = "111";

// Dispositivos do Living (Ambiente 2)
const LIVING_LUZES = ["57", "61", "75", "76", "49", "58", "20"];
const LIVING_CORTINAS = ["119"];
const LIVING_AC = "167";

// Receiver/Música
const RECEIVER = "15";

let masterConfirmCallback = null;

function showPopup(message, onConfirm) {
  const popup = document.getElementById("confirmation-popup");
  const messageEl = document.getElementById("popup-message");
  const confirmBtn = document.getElementById("popup-confirm");
  const cancelBtn = document.getElementById("popup-cancel");
  const overlay = popup;

  messageEl.textContent = message;
  masterConfirmCallback = onConfirm;

  popup.style.display = "flex";

  confirmBtn.onclick = () => {
    if (typeof masterConfirmCallback === "function") {
      masterConfirmCallback();
    }
  };
  cancelBtn.onclick = hidePopup;
  overlay.onclick = (e) => {
    if (e.target === overlay) {
      hidePopup();
    }
  };
}

function hidePopup() {
  const popup = document.getElementById("confirmation-popup");
  popup.style.display = "none";
  const confirmBtn = document.getElementById("popup-confirm");
  confirmBtn.onclick = null;
  masterConfirmCallback = null;
}

// DEPRECATED: função removida com novos cenários de expediente
// function updateMasterLightToggleState() {
//     const btn = document.getElementById('master-light-toggle-btn');
//     if (!btn) return;
//     // ... código comentado
// }

function handleMasterLightToggle() {
  const btn = document.getElementById("master-light-toggle-btn");
  const action = btn.dataset.action;

  const message =
    action === "on"
      ? "Você tem certeza que gostaria de ligar tudo?"
      : "Você tem certeza que gostaria de desligar tudo?";

  showPopup(message, () => executeMasterLightToggle(action));
}

function executeMasterLightToggle(action) {
  // Usar machine rules dos relay boards para otimização:
  // Dispositivos 264 e 265: MasterONOFF-RelayBoard-01 e 02
  // Button 1 (push 1) = Master ON para ambos os relay boards
  // Button 2 (push 2) = Master OFF para ambos os relay boards

  const relayDevices = ["264", "265"]; // Ambos os relay boards
  const buttonValue = action === "on" ? "1" : "2"; // Button 1 = ON, Button 2 = OFF

  console.log(
    `🎯 Executando master ${action} via relay boards otimizados (devices ${relayDevices.join(
      ", "
    )}, button ${buttonValue})`
  );

  // Enviar comandos para ambos os relay boards em paralelo
  const promises = relayDevices.map((deviceId) => {
    console.log(`📡 Enviando push ${buttonValue} para device ${deviceId}`);
    return sendHubitatCommand(deviceId, "push", buttonValue);
  });

  Promise.all(promises)
    .then(() => {
      console.log(
        `✅ Master light toggle ${action} enviado com sucesso para ambos os relay boards`
      );

      // Atualizar estados locais de todos os dispositivos após comando bem-sucedido
      ALL_LIGHT_IDS.forEach((id) => {
        setStoredState(id, action);
      });

      // Forçar atualização da UI após 1 segundo para dar tempo dos relay boards processarem
      setTimeout(() => {
        updateMasterLightToggleState();
        // Forçar polling para sincronizar estados reais
        if (typeof updateDeviceStatesFromServer === "function") {
          updateDeviceStatesFromServer();
        }
      }, 1000);

      hidePopup();
    })
    .catch((err) => {
      console.error(
        `❌ Master light toggle ${action} falhou em um ou mais relay boards:`,
        err
      );
      hidePopup();
    });
}

function handleMasterCurtainToggle(action) {
  const message =
    action === "open"
      ? "Você tem certeza que gostaria de subir todas as cortinas?"
      : "Você tem certeza que gostaria de descer todas as cortinas?";

  showPopup(message, () => executeMasterCurtainToggle(action));
}

function executeMasterCurtainToggle(action) {
  const promises = ALL_CURTAIN_IDS.map((id) => sendCurtainCommand(id, action));

  Promise.all(promises)
    .then(() => {
      console.log(`Master curtain toggle ${action} complete.`);
      hidePopup();
    })
    .catch((err) => {
      console.error(`Master curtain toggle ${action} failed:`, err);
      hidePopup();
    });
}

// Funções para controlar todas as cortinas via botão virtual do Hubitat (ID 44)
function handleMasterCurtainsOpen() {
  showPopup("Você tem certeza que gostaria de abrir todas as cortinas?", () => {
    executeMasterCurtainsAction("open");
  });
}

function handleMasterCurtainsClose() {
  showPopup(
    "Você tem certeza que gostaria de fechar todas as cortinas?",
    () => {
      executeMasterCurtainsAction("close");
    }
  );
}

function executeMasterCurtainsAction(action) {
  const deviceId = "44"; // Virtual Button "Todas-Cortinas"
  const pushButton = action === "open" ? "1" : "3"; // 1 = abrir, 3 = fechar

  console.log(
    `🎬 Executando ação master curtinas: ${action} (ID: ${deviceId}, push: ${pushButton})`
  );

  // Adicionar feedback visual (loading)
  const btnId =
    action === "open"
      ? "master-curtains-open-btn"
      : "master-curtains-close-btn";
  const btn = document.getElementById(btnId);
  if (btn) {
    btn.classList.add("loading");
  }

  // Enviar comando para o Virtual Button
  sendHubitatCommand(deviceId, "push", pushButton)
    .then(() => {
      console.log(`✅ Comando master curtinas ${action} executado com sucesso`);
      hidePopup();
    })
    .catch((error) => {
      console.error(
        `❌ Erro ao executar comando master curtinas ${action}:`,
        error
      );
      showErrorMessage(
        `Erro ao ${action === "open" ? "abrir" : "fechar"} cortinas: ${
          error.message
        }`
      );
    })
    .finally(() => {
      // Remover feedback visual
      if (btn) {
        btn.classList.remove("loading");
      }
    });
}

// === CENÁRIO DORMIR ===
// Desliga tudo da Varanda e Living (luzes, AC, receiver) e fecha cortinas

function handleCenarioDormir() {
  showPopup(
    "Executar cenário Dormir? Isso irá desligar luzes, TV, ar condicionado, receiver e fechar cortinas da Varanda e Living.",
    executeCenarioDormir
  );
}

function executeCenarioDormir() {
  console.log("🌙 Iniciando cenário: Dormir (Desligamento Geral Varanda + Living)");

  // Adicionar feedback visual
  const btn = document.getElementById("cenario-dormir-btn");
  if (btn) btn.classList.add("loading");

  const promises = [];

  // === DESLIGAR LUZES ===
  // Varanda
  VARANDA_LUZES.forEach((deviceId) => {
    console.log(`💡 Desligando luz Varanda ${deviceId}`);
    promises.push(sendHubitatCommand(deviceId, "off"));
    setStoredState(deviceId, "off");
  });

  // Living
  LIVING_LUZES.forEach((deviceId) => {
    console.log(`💡 Desligando luz Living ${deviceId}`);
    promises.push(sendHubitatCommand(deviceId, "off"));
    setStoredState(deviceId, "off");
  });

  // === FECHAR CORTINAS ===
  // Varanda
  VARANDA_CORTINAS.forEach((deviceId) => {
    console.log(`🪟 Fechando cortina Varanda ${deviceId}`);
    promises.push(sendHubitatCommand(deviceId, "close"));
  });

  // Living
  LIVING_CORTINAS.forEach((deviceId) => {
    console.log(`🪟 Fechando cortina Living ${deviceId}`);
    promises.push(sendHubitatCommand(deviceId, "close"));
  });

  // === DESLIGAR AR CONDICIONADO ===
  console.log(`❄️ Desligando AC Varanda ${VARANDA_AC}`);
  promises.push(sendHubitatCommand(VARANDA_AC, "off"));

  console.log(`❄️ Desligando AC Living ${LIVING_AC}`);
  promises.push(sendHubitatCommand(LIVING_AC, "off"));

  // === DESLIGAR TV ===
  console.log(`📺 Desligando TV Varanda ${VARANDA_TV}`);
  promises.push(sendHubitatCommand(VARANDA_TV, "off"));

  // === DESLIGAR RECEIVER ===
  console.log(`🎵 Desligando Receiver ${RECEIVER}`);
  promises.push(sendHubitatCommand(RECEIVER, "off"));

  Promise.all(promises)
    .then(() => {
      console.log("✅ Cenário Dormir executado com sucesso");
      setTimeout(() => {
        if (typeof syncAllVisibleControls === "function") {
          syncAllVisibleControls(true);
        }
      }, 500);
      hidePopup();
    })
    .catch((error) => {
      console.error("❌ Erro ao executar Cenário Dormir:", error);
      if (typeof showErrorMessage === "function") {
        showErrorMessage(`Erro ao executar cenário Dormir: ${error.message}`);
      }
    })
    .finally(() => {
      if (btn) btn.classList.remove("loading");
    });
}

function initScenesPage() {
  updateMasterLightToggleState();
}
