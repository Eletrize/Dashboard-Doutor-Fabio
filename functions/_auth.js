const DEFAULT_HUBITAT_BASE_URL =
  "https://cloud.hubitat.com/api/df90ffba-2205-41f8-8f62-ec4c430ae94f/apps/144";
const DEFAULT_HUBITAT_ACCESS_TOKEN = "94f13f9f-2842-48ea-a860-02eda566a02a";

export const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "*",
  "Access-Control-Max-Age": "86400",
};

function normalizeCsv(rawValue) {
  return String(rawValue || "")
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
}

function isFlagEnabled(rawValue, defaultValue) {
  if (rawValue === undefined || rawValue === null || rawValue === "") {
    return defaultValue;
  }

  const normalized = String(rawValue).trim().toLowerCase();

  if (["1", "true", "yes", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "off"].includes(normalized)) return false;

  return defaultValue;
}

export function jsonResponse(payload, status) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...CORS_HEADERS,
      "Content-Type": "application/json",
    },
  });
}

export function getHubitatCredentials(env) {
  const hubitatBaseUrl =
    String(env?.HUBITAT_BASE_URL || DEFAULT_HUBITAT_BASE_URL).trim();
  const hubitatAccessToken =
    String(env?.HUBITAT_ACCESS_TOKEN || DEFAULT_HUBITAT_ACCESS_TOKEN).trim();

  if (!hubitatBaseUrl || !hubitatAccessToken) {
    return {
      ok: false,
      response: jsonResponse(
        {
          error: "Hubitat credentials are not configured",
        },
        500
      ),
    };
  }

  return {
    ok: true,
    baseUrl: hubitatBaseUrl.replace(/\/$/, ""),
    accessToken: hubitatAccessToken,
  };
}

function isAuthEnabled(env) {
  const forcedFlag = env?.AUTH_ENABLED;

  if (forcedFlag !== undefined && forcedFlag !== null && forcedFlag !== "") {
    return isFlagEnabled(forcedFlag, false);
  }

  return Boolean(env?.SUPABASE_URL && env?.SUPABASE_ANON_KEY);
}

function getBearerToken(request) {
  const authHeader = request.headers.get("authorization") || "";
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || "";
}

function isUserAllowedByEmail(email, env) {
  const normalizedEmail = String(email || "").trim().toLowerCase();
  if (!normalizedEmail) return false;

  const allowlistedEmails = normalizeCsv(env?.ALLOWED_EMAILS);
  const allowlistedDomains = normalizeCsv(env?.ALLOWED_EMAIL_DOMAINS).map(
    (domain) => domain.replace(/^@/, "")
  );

  if (allowlistedEmails.length === 0 && allowlistedDomains.length === 0) {
    return true;
  }

  if (allowlistedEmails.includes(normalizedEmail)) {
    return true;
  }

  const emailDomain = normalizedEmail.split("@")[1] || "";
  if (!emailDomain) return false;

  return allowlistedDomains.includes(emailDomain);
}

async function getSupabaseUserFromToken(accessToken, env) {
  const supabaseUrl = String(env?.SUPABASE_URL || "").trim().replace(/\/$/, "");
  const supabaseAnonKey = String(env?.SUPABASE_ANON_KEY || "").trim();

  if (!supabaseUrl || !supabaseAnonKey) {
    return {
      ok: false,
      status: 500,
      payload: {
        error: "Supabase auth is not configured on server",
      },
    };
  }

  const endpoint = `${supabaseUrl}/auth/v1/user`;
  const response = await fetch(endpoint, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      apikey: supabaseAnonKey,
    },
  });

  if (!response.ok) {
    return {
      ok: false,
      status: 401,
      payload: {
        error: "Invalid or expired auth token",
      },
    };
  }

  const user = await response.json();
  return {
    ok: true,
    user,
  };
}

export async function requireAuthenticatedUser(context) {
  const { request, env } = context;

  if (!isAuthEnabled(env)) {
    return {
      ok: true,
      authSkipped: true,
      user: null,
    };
  }

  const accessToken = getBearerToken(request);
  if (!accessToken) {
    return {
      ok: false,
      response: jsonResponse(
        {
          error: "Authentication required",
        },
        401
      ),
    };
  }

  try {
    const supabaseResult = await getSupabaseUserFromToken(accessToken, env);
    if (!supabaseResult.ok) {
      return {
        ok: false,
        response: jsonResponse(supabaseResult.payload, supabaseResult.status),
      };
    }

    const user = supabaseResult.user;
    const email = String(user?.email || "").trim().toLowerCase();

    if (!email) {
      return {
        ok: false,
        response: jsonResponse(
          {
            error: "Authenticated user does not include email",
          },
          403
        ),
      };
    }

    const requireVerifiedEmail = isFlagEnabled(env?.REQUIRE_EMAIL_VERIFIED, true);
    if (requireVerifiedEmail && !user?.email_confirmed_at) {
      return {
        ok: false,
        response: jsonResponse(
          {
            error: "Email not verified",
          },
          403
        ),
      };
    }

    if (!isUserAllowedByEmail(email, env)) {
      return {
        ok: false,
        response: jsonResponse(
          {
            error: "Email is not allowlisted",
          },
          403
        ),
      };
    }

    return {
      ok: true,
      authSkipped: false,
      user,
    };
  } catch (error) {
    return {
      ok: false,
      response: jsonResponse(
        {
          error: "Auth validation failed",
          message: error?.message || "Unexpected auth error",
        },
        500
      ),
    };
  }
}

