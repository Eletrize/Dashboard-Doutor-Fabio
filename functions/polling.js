/**
 * Cloudflare Function: polling
 * Busca estados de múltiplos dispositivos do Hubitat
 */

// Configuração da Maker API
const HUBITAT_BASE_URL =
  "https://cloud.hubitat.com/api/df90ffba-2205-41f8-8f62-ec4c430ae94f/apps/144";
const HUBITAT_ACCESS_TOKEN = "94f13f9f-2842-48ea-a860-02eda566a02a";

/**
 * CORS headers
 */
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

/**
 * Handler principal
 */
export async function onRequest(context) {
  const { request } = context;

  // Handle preflight OPTIONS
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: CORS_HEADERS,
    });
  }

  const url = new URL(request.url);
  const devicesParam = url.searchParams.get("devices");
  const healthCheck = url.searchParams.get("health");

  // Health check
  if (healthCheck) {
    return new Response(JSON.stringify({ status: "ok" }), {
      status: 200,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  if (!devicesParam) {
    return new Response(
      JSON.stringify({ error: "Missing devices parameter" }),
      {
        status: 400,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      }
    );
  }

  try {
    // Buscar todos os dispositivos do Hubitat
    const hubitatUrl = `${HUBITAT_BASE_URL}/devices/all?access_token=${HUBITAT_ACCESS_TOKEN}`;

    const hubitatResponse = await fetch(hubitatUrl, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!hubitatResponse.ok) {
      throw new Error(`Hubitat API error: ${hubitatResponse.status}`);
    }

    const allDevices = await hubitatResponse.json();

    // Filtrar apenas os dispositivos solicitados
    const requestedIds = devicesParam.split(",").map((id) => id.trim());
    const devices = {};

    allDevices.forEach((device) => {
      const deviceId = String(device.id);
      if (!requestedIds.includes(deviceId)) return;

      let state = "off";
      let level = null;
      let volume = null;

      // Extrair atributos
      if (Array.isArray(device.attributes)) {
        const switchAttr = device.attributes.find(
          (attr) => attr.name === "switch"
        );
        if (switchAttr) {
          state = switchAttr.currentValue || switchAttr.value || state;
        }

        const levelAttr = device.attributes.find(
          (attr) => attr.name === "level"
        );
        if (levelAttr) {
          level = levelAttr.currentValue ?? levelAttr.value ?? level;
        }

        const volumeAttr = device.attributes.find(
          (attr) => attr.name === "volume"
        );
        if (volumeAttr) {
          volume = volumeAttr.currentValue ?? volumeAttr.value ?? volume;
        }
      } else if (device.attributes && typeof device.attributes === "object") {
        if (device.attributes.switch !== undefined) {
          state = device.attributes.switch;
        }
        if (device.attributes.level !== undefined) {
          level = device.attributes.level;
        }
        if (device.attributes.volume !== undefined) {
          volume = device.attributes.volume;
        }
      }

      devices[deviceId] = {
        success: true,
        state,
      };

      if (level !== null && level !== undefined) {
        devices[deviceId].level = level;
      }

      if (volume !== null && volume !== undefined) {
        devices[deviceId].volume = volume;
      }
    });

    return new Response(
      JSON.stringify({
        success: true,
        devices,
        timestamp: new Date().toISOString(),
      }),
      {
        status: 200,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: "Polling error",
        message: error.message,
      }),
      {
        status: 500,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      }
    );
  }
}
