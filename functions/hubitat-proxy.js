/**
 * Cloudflare Function: hubitat-proxy
 * Proxy para Maker API do Hubitat (resolve CORS e protege credenciais)
 */

// Configuração da Maker API (pode vir de environment variables ou hardcoded)
const HUBITAT_BASE_URL =
  "https://cloud.hubitat.com/api/df90ffba-2205-41f8-8f62-ec4c430ae94f/apps/144";
const HUBITAT_ACCESS_TOKEN = "94f13f9f-2842-48ea-a860-02eda566a02a";

/**
 * CORS headers para permitir requisições do frontend
 */
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

/**
 * Handler principal da Function
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
  const deviceId = url.searchParams.get("device");
  const command = url.searchParams.get("command");
  const value = url.searchParams.get("value");

  if (!deviceId) {
    return new Response(
      JSON.stringify({ error: "Missing device parameter" }),
      {
        status: 400,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      }
    );
  }

  try {
    // Construir URL do Hubitat
    let hubitatUrl = `${HUBITAT_BASE_URL}/devices/${deviceId}`;

    if (command) {
      hubitatUrl += `/${command}`;
      if (value) {
        hubitatUrl += `/${value}`;
      }
    }

    hubitatUrl += `?access_token=${HUBITAT_ACCESS_TOKEN}`;

    // Fazer request para Hubitat
    const hubitatResponse = await fetch(hubitatUrl, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    const responseText = await hubitatResponse.text();

    // Retornar resposta com CORS headers
    return new Response(responseText, {
      status: hubitatResponse.status,
      headers: {
        ...CORS_HEADERS,
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: "Proxy error",
        message: error.message,
      }),
      {
        status: 500,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      }
    );
  }
}
