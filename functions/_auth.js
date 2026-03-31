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

function getSupabaseRestConfig(env) {
  const supabaseUrl = String(env?.SUPABASE_URL || "").trim().replace(/\/$/, "");
  const supabaseAnonKey = String(env?.SUPABASE_ANON_KEY || "").trim();

  if (!supabaseUrl || !supabaseAnonKey) {
    return null;
  }

  return {
    supabaseUrl,
    supabaseAnonKey,
  };
}

function buildSupabaseHeaders(accessToken, anonKey) {
  return {
    Authorization: `Bearer ${accessToken}`,
    apikey: anonKey,
    Accept: "application/json",
  };
}

async function fetchSupabaseRows(tableName, queryParams, accessToken, env) {
  const restConfig = getSupabaseRestConfig(env);
  if (!restConfig) {
    throw new Error("Supabase REST is not configured on server");
  }

  const url = new URL(`${restConfig.supabaseUrl}/rest/v1/${tableName}`);
  Object.entries(queryParams || {}).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    url.searchParams.set(key, String(value));
  });

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: buildSupabaseHeaders(accessToken, restConfig.supabaseAnonKey),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(
      `Supabase query failed for ${tableName} (${response.status}): ${text}`,
    );
  }

  const payload = await response.json();
  return Array.isArray(payload) ? payload : [];
}

function normalizeAccessValue(value) {
  return String(value || "").trim().toLowerCase();
}

function buildInFilter(values) {
  const normalized = Array.from(
    new Set(
      (Array.isArray(values) ? values : [])
        .map((value) => normalizeAccessValue(value))
        .filter(Boolean),
    ),
  );

  if (normalized.length === 0) {
    return "";
  }

  return `in.(${normalized.map((value) => `"${value}"`).join(",")})`;
}

async function fetchUserAccessProfile(userId, accessToken, env) {
  const rows = await fetchSupabaseRows(
    "user_access_profiles",
    {
      select: "user_id,role,display_name,is_admin",
      user_id: `eq.${userId}`,
    },
    accessToken,
    env,
  );

  return rows[0] || null;
}

async function fetchUserEnvironmentAccess(userId, accessToken, env) {
  return fetchSupabaseRows(
    "user_environment_access",
    {
      select: "environment_key,can_view,can_control,can_create_scenes",
      user_id: `eq.${userId}`,
    },
    accessToken,
    env,
  );
}

async function fetchEnvironmentDeviceRegistry(environmentKeys, accessToken, env) {
  const inFilter = buildInFilter(environmentKeys);
  if (!inFilter) return [];

  return fetchSupabaseRows(
    "environment_device_registry",
    {
      select: "environment_key,device_id",
      environment_key: inFilter,
    },
    accessToken,
    env,
  );
}

function isAdminProfile(profile) {
  if (!profile || typeof profile !== "object") return false;
  if (profile.is_admin === true) return true;
  return normalizeAccessValue(profile.role) === "admin";
}

export function isExplicitAdminProfile(profile) {
  return isAdminProfile(profile);
}

export async function resolveUserAccessPolicy(context, authResult) {
  if (!authResult?.ok) {
    return {
      ok: false,
      response: jsonResponse({ error: "Authentication required" }, 401),
    };
  }

  if (authResult.authSkipped || !authResult.user?.id || !authResult.accessToken) {
    return {
      ok: true,
      unrestricted: true,
      profile: null,
      viewDeviceIds: new Set(),
      controlDeviceIds: new Set(),
      viewEnvironmentKeys: new Set(),
      controlEnvironmentKeys: new Set(),
      sceneEnvironmentKeys: new Set(),
    };
  }

  try {
    const profile = await fetchUserAccessProfile(
      authResult.user.id,
      authResult.accessToken,
      context.env,
    );

    if (!profile || isAdminProfile(profile)) {
      return {
        ok: true,
        unrestricted: true,
        profile: profile || null,
        viewDeviceIds: new Set(),
        controlDeviceIds: new Set(),
        viewEnvironmentKeys: new Set(),
        controlEnvironmentKeys: new Set(),
        sceneEnvironmentKeys: new Set(),
      };
    }

    const rows = await fetchUserEnvironmentAccess(
      authResult.user.id,
      authResult.accessToken,
      context.env,
    );

    const viewEnvironmentKeys = new Set();
    const controlEnvironmentKeys = new Set();
    const sceneEnvironmentKeys = new Set();

    rows.forEach((row) => {
      const envKey = normalizeAccessValue(row?.environment_key);
      if (!envKey) return;

      const canControl = row?.can_control === true;
      const canView = row?.can_view === true || canControl;
      const canCreateScenes = row?.can_create_scenes === true;

      if (canView) {
        viewEnvironmentKeys.add(envKey);
      }
      if (canControl) {
        controlEnvironmentKeys.add(envKey);
      }
      if (canCreateScenes) {
        sceneEnvironmentKeys.add(envKey);
      }
    });

    const registryRows = await fetchEnvironmentDeviceRegistry(
      Array.from(
        new Set([
          ...Array.from(viewEnvironmentKeys),
          ...Array.from(controlEnvironmentKeys),
        ]),
      ),
      authResult.accessToken,
      context.env,
    );

    const viewDeviceIds = new Set();
    const controlDeviceIds = new Set();

    registryRows.forEach((row) => {
      const envKey = normalizeAccessValue(row?.environment_key);
      const deviceId = String(row?.device_id || "").trim();
      if (!envKey || !deviceId) return;

      if (viewEnvironmentKeys.has(envKey) || controlEnvironmentKeys.has(envKey)) {
        viewDeviceIds.add(deviceId);
      }
      if (controlEnvironmentKeys.has(envKey)) {
        controlDeviceIds.add(deviceId);
      }
    });

    return {
      ok: true,
      unrestricted: false,
      profile,
      viewDeviceIds,
      controlDeviceIds,
      viewEnvironmentKeys,
      controlEnvironmentKeys,
      sceneEnvironmentKeys,
    };
  } catch (error) {
    return {
      ok: false,
      response: jsonResponse(
        {
          error: "Failed to resolve access policy",
          message: error?.message || "Unexpected access control error",
        },
        500,
      ),
    };
  }
}

export async function requireAuthenticatedUser(context) {
  const { request, env } = context;

  if (!isAuthEnabled(env)) {
    return {
      ok: true,
      authSkipped: true,
      user: null,
      accessToken: "",
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
      accessToken,
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

export async function requireAdminUser(context) {
  const auth = await requireAuthenticatedUser(context);
  if (!auth.ok) {
    return auth;
  }

  if (auth.authSkipped || !auth.user?.id || !auth.accessToken) {
    return {
      ok: false,
      response: jsonResponse(
        {
          error: "Admin authentication required",
        },
        403,
      ),
    };
  }

  try {
    const profile = await fetchUserAccessProfile(
      auth.user.id,
      auth.accessToken,
      context.env,
    );

    if (!isAdminProfile(profile)) {
      return {
        ok: false,
        response: jsonResponse(
          {
            error: "Admin access required",
          },
          403,
        ),
      };
    }

    return {
      ok: true,
      auth,
      profile,
    };
  } catch (error) {
    return {
      ok: false,
      response: jsonResponse(
        {
          error: "Admin validation failed",
          message: error?.message || "Unexpected admin validation error",
        },
        500,
      ),
    };
  }
}

