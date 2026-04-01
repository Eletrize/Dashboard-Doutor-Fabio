import {
  CORS_HEADERS,
  jsonResponse,
  requireAdminUser,
  isExplicitAdminProfile,
} from "./_auth.js";

const PROFILE_TABLE = "user_access_profiles";
const ENV_ACCESS_TABLE = "user_environment_access";
const VALID_ROLES = new Set(["admin", "morador", "convidado"]);
const VALID_ACCESS_MODES = new Set(["admin", "restricted", "full"]);
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const USERS_PER_PAGE = 200;
const MAX_USER_PAGES = 20;

function normalizeText(value) {
  return String(value || "").trim().toLowerCase();
}

function toArray(value) {
  return Array.isArray(value) ? value : [];
}

function toBoolean(value) {
  return value === true || value === "true" || value === 1 || value === "1";
}

function normalizeUuid(value) {
  const normalized = String(value || "").trim().toLowerCase();
  return UUID_PATTERN.test(normalized) ? normalized : "";
}

function sanitizeDisplayName(value) {
  return String(value || "").trim().slice(0, 80);
}

function adminJsonResponse(payload, status) {
  const response = jsonResponse(payload, status);
  response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
  response.headers.set("Pragma", "no-cache");
  response.headers.set("Expires", "0");
  response.headers.set("Vary", "Authorization");
  return response;
}

function resolveAccessMode(profile) {
  if (!profile || typeof profile !== "object") {
    return "full";
  }
  if (isExplicitAdminProfile(profile)) {
    return "admin";
  }
  return "restricted";
}

function sanitizeAccessMode(rawValue) {
  const normalized = normalizeText(rawValue);
  return VALID_ACCESS_MODES.has(normalized) ? normalized : "restricted";
}

function sanitizeRole(rawValue, accessMode) {
  if (accessMode === "admin") {
    return "admin";
  }

  const normalized = normalizeText(rawValue);
  if (!VALID_ROLES.has(normalized) || normalized === "admin") {
    return "morador";
  }

  return normalized;
}

function sortEnvironmentAccessRows(rows) {
  return toArray(rows)
    .slice()
    .sort((left, right) => {
      const leftKey = normalizeText(left?.environment_key || left?.environmentKey);
      const rightKey = normalizeText(right?.environment_key || right?.environmentKey);
      return leftKey.localeCompare(rightKey, "pt-BR");
    });
}

function sanitizeEnvironmentAccessRows(rawRows, userId) {
  const byEnvironment = new Map();

  toArray(rawRows).forEach((row) => {
    const environmentKey = normalizeText(
      row?.environmentKey || row?.environment_key,
    );
    if (!/^ambiente\d+$/.test(environmentKey)) {
      return;
    }

    let canView = toBoolean(row?.canView ?? row?.can_view);
    let canControl = toBoolean(row?.canControl ?? row?.can_control);
    let canCreateScenes = toBoolean(
      row?.canCreateScenes ?? row?.can_create_scenes,
    );

    if (canCreateScenes) {
      canControl = true;
    }
    if (canControl) {
      canView = true;
    }

    if (!canView && !canControl && !canCreateScenes) {
      byEnvironment.delete(environmentKey);
      return;
    }

    byEnvironment.set(environmentKey, {
      user_id: userId,
      environment_key: environmentKey,
      can_view: canView,
      can_control: canControl,
      can_create_scenes: canCreateScenes,
    });
  });

  return sortEnvironmentAccessRows(Array.from(byEnvironment.values()));
}

function getSupabaseServiceConfig(env) {
  const supabaseUrl = String(env?.SUPABASE_URL || "").trim().replace(/\/$/, "");
  const serviceRoleKey = String(env?.SUPABASE_SERVICE_ROLE_KEY || "").trim();

  if (!supabaseUrl || !serviceRoleKey) {
    return null;
  }

  return {
    supabaseUrl,
    serviceRoleKey,
  };
}

function buildServiceHeaders(serviceRoleKey, headers = {}, contentType = null) {
  const output = {
    Authorization: `Bearer ${serviceRoleKey}`,
    apikey: serviceRoleKey,
    Accept: "application/json",
    ...headers,
  };

  if (contentType) {
    output["Content-Type"] = contentType;
  }

  return output;
}

async function serviceRequest(env, path, options = {}) {
  const serviceConfig = getSupabaseServiceConfig(env);
  if (!serviceConfig) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured");
  }

  const url = new URL(`${serviceConfig.supabaseUrl}${path}`);
  Object.entries(options.query || {}).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    url.searchParams.set(key, String(value));
  });

  const response = await fetch(url.toString(), {
    method: options.method || "GET",
    headers: buildServiceHeaders(
      serviceConfig.serviceRoleKey,
      options.headers || {},
      options.body !== undefined ? "application/json" : null,
    ),
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  if (!response.ok) {
    const responseText = await response.text();
    throw new Error(
      `Supabase request failed (${response.status}) for ${path}: ${responseText}`,
    );
  }

  if (response.status === 204) {
    return null;
  }

  const text = await response.text();
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch (_error) {
    return text;
  }
}

async function fetchAuthUsersPage(env, page, perPage) {
  const payload = await serviceRequest(env, "/auth/v1/admin/users", {
    query: {
      page,
      per_page: perPage,
    },
  });

  if (Array.isArray(payload)) {
    return payload;
  }

  if (Array.isArray(payload?.users)) {
    return payload.users;
  }

  if (Array.isArray(payload?.data?.users)) {
    return payload.data.users;
  }

  if (Array.isArray(payload?.data)) {
    return payload.data;
  }

  return [];
}

async function fetchAllAuthUsers(env) {
  const users = [];

  for (let page = 1; page <= MAX_USER_PAGES; page += 1) {
    const batch = await fetchAuthUsersPage(env, page, USERS_PER_PAGE);
    if (!batch.length) {
      break;
    }

    users.push(...batch);

    if (batch.length < USERS_PER_PAGE) {
      break;
    }
  }

  return users;
}

async function fetchAllProfiles(env) {
  const rows = await serviceRequest(env, `/rest/v1/${PROFILE_TABLE}`, {
    query: {
      select: "user_id,role,display_name,is_admin,updated_at,created_at",
      order: "updated_at.desc",
    },
  });

  return Array.isArray(rows) ? rows : [];
}

async function fetchAllEnvironmentAccess(env) {
  const rows = await serviceRequest(env, `/rest/v1/${ENV_ACCESS_TABLE}`, {
    query: {
      select:
        "user_id,environment_key,can_view,can_control,can_create_scenes,updated_at,created_at",
      order: "environment_key.asc",
    },
  });

  return Array.isArray(rows) ? rows : [];
}

function groupRowsByUserId(rows) {
  return toArray(rows).reduce((map, row) => {
    const userId = normalizeUuid(row?.user_id);
    if (!userId) {
      return map;
    }

    if (!map.has(userId)) {
      map.set(userId, []);
    }

    map.get(userId).push(row);
    return map;
  }, new Map());
}

function mergeUserRecords(authUsers, profiles, accessRows, currentUserId, searchTerm) {
  const profileMap = new Map();
  toArray(profiles).forEach((profile) => {
    const userId = normalizeUuid(profile?.user_id);
    if (!userId) return;
    profileMap.set(userId, profile);
  });

  const accessMap = groupRowsByUserId(accessRows);
  const normalizedSearch = normalizeText(searchTerm);

  return toArray(authUsers)
    .map((user) => {
      const userId = normalizeUuid(user?.id);
      const profile = userId ? profileMap.get(userId) || null : null;
      const environmentAccess = userId
        ? sortEnvironmentAccessRows(accessMap.get(userId) || [])
        : [];
      const accessMode = resolveAccessMode(profile);
      const email = String(user?.email || "").trim().toLowerCase();
      const displayName =
        sanitizeDisplayName(profile?.display_name) ||
        sanitizeDisplayName(
          user?.user_metadata?.display_name ||
            user?.user_metadata?.full_name ||
            user?.user_metadata?.name,
        );

      return {
        id: userId,
        email,
        displayName,
        createdAt: String(user?.created_at || ""),
        lastSignInAt: String(user?.last_sign_in_at || ""),
        emailConfirmed: Boolean(user?.email_confirmed_at),
        accessMode,
        isAdmin: accessMode === "admin",
        isCurrentUser: userId === normalizeUuid(currentUserId),
        profile: profile
          ? {
              userId,
              role: String(profile.role || "morador"),
              displayName: String(profile.display_name || ""),
              isAdmin: profile.is_admin === true,
            }
          : null,
        environmentAccess: environmentAccess.map((row) => ({
          environmentKey: String(row.environment_key || ""),
          canView: row.can_view === true,
          canControl: row.can_control === true,
          canCreateScenes: row.can_create_scenes === true,
        })),
      };
    })
    .filter((user) => {
      if (!user.id || !user.email) return false;
      if (!normalizedSearch) return true;

      const haystack = [
        user.email,
        user.displayName,
        user.profile?.displayName || "",
        user.profile?.role || "",
        user.accessMode,
      ]
        .map((value) => normalizeText(value))
        .join(" ");

      return haystack.includes(normalizedSearch);
    })
    .sort((left, right) => {
      if (left.isCurrentUser && !right.isCurrentUser) return -1;
      if (!left.isCurrentUser && right.isCurrentUser) return 1;
      const leftLabel = left.displayName || left.email;
      const rightLabel = right.displayName || right.email;
      return leftLabel.localeCompare(rightLabel, "pt-BR");
    });
}

async function deleteRowsByUserId(env, tableName, userId) {
  await serviceRequest(env, `/rest/v1/${tableName}`, {
    method: "DELETE",
    query: {
      user_id: `eq.${userId}`,
    },
    headers: {
      Prefer: "return=minimal",
    },
  });
}

async function upsertProfile(env, row) {
  const payload = await serviceRequest(env, `/rest/v1/${PROFILE_TABLE}`, {
    method: "POST",
    query: {
      on_conflict: "user_id",
    },
    headers: {
      Prefer: "resolution=merge-duplicates,return=representation",
    },
    body: [row],
  });

  return Array.isArray(payload) ? payload[0] || null : null;
}

async function insertEnvironmentAccess(env, rows) {
  if (!rows.length) {
    return [];
  }

  const payload = await serviceRequest(env, `/rest/v1/${ENV_ACCESS_TABLE}`, {
    method: "POST",
    headers: {
      Prefer: "resolution=merge-duplicates,return=representation",
    },
    body: rows,
  });

  return Array.isArray(payload) ? payload : [];
}

async function persistUserAccess(env, payload) {
  const targetUserId = normalizeUuid(payload?.userId);
  if (!targetUserId) {
    throw new Error("Invalid user id");
  }

  const accessMode = sanitizeAccessMode(payload?.accessMode);
  const displayName = sanitizeDisplayName(payload?.displayName);
  const role = sanitizeRole(payload?.role, accessMode);
  const environmentAccess = sanitizeEnvironmentAccessRows(
    payload?.environmentAccess,
    targetUserId,
  );

  await deleteRowsByUserId(env, ENV_ACCESS_TABLE, targetUserId);

  if (accessMode === "full") {
    await deleteRowsByUserId(env, PROFILE_TABLE, targetUserId);
    return {
      userId: targetUserId,
      accessMode,
      profile: null,
      environmentAccess: [],
    };
  }

  const profileRow = {
    user_id: targetUserId,
    role: accessMode === "admin" ? "admin" : role,
    display_name: displayName,
    is_admin: accessMode === "admin",
  };

  const profile = await upsertProfile(env, profileRow);

  if (accessMode === "restricted") {
    await insertEnvironmentAccess(env, environmentAccess);
  }

  return {
    userId: targetUserId,
    accessMode,
    profile,
    environmentAccess,
  };
}

export async function onRequest(context) {
  const { request, env } = context;

  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: CORS_HEADERS,
    });
  }

  const adminResult = await requireAdminUser(context);
  if (!adminResult.ok) {
    return adminResult.response;
  }

  if (!getSupabaseServiceConfig(env)) {
    return adminJsonResponse(
      {
        error: "SUPABASE_SERVICE_ROLE_KEY is not configured",
      },
      500,
    );
  }

  if (request.method === "GET") {
    try {
      const url = new URL(request.url);
      const searchTerm = url.searchParams.get("q") || "";
      const [authUsers, profiles, environmentAccess] = await Promise.all([
        fetchAllAuthUsers(env),
        fetchAllProfiles(env),
        fetchAllEnvironmentAccess(env),
      ]);

      const users = mergeUserRecords(
        authUsers,
        profiles,
        environmentAccess,
        adminResult.auth.user.id,
        searchTerm,
      );

      return adminJsonResponse(
        {
          success: true,
          currentUserId: adminResult.auth.user.id,
          users,
        },
        200,
      );
    } catch (error) {
      return adminJsonResponse(
        {
          error: "Failed to load admin access data",
          message: error?.message || "Unexpected admin access error",
        },
        500,
      );
    }
  }

  if (request.method === "POST" || request.method === "PUT") {
    try {
      const body = await request.json();
      const targetUserId = normalizeUuid(body?.userId);
      if (!targetUserId) {
        return adminJsonResponse({ error: "Invalid user id" }, 400);
      }

      const requestedMode = sanitizeAccessMode(body?.accessMode);
      if (
        normalizeUuid(adminResult.auth.user.id) === targetUserId &&
        requestedMode !== "admin"
      ) {
        return adminJsonResponse(
          {
            error: "Current admin cannot remove admin access from self",
          },
          400,
        );
      }

      const saved = await persistUserAccess(env, body);
      return adminJsonResponse(
        {
          success: true,
          saved,
        },
        200,
      );
    } catch (error) {
      return adminJsonResponse(
        {
          error: "Failed to save user access",
          message: error?.message || "Unexpected save error",
        },
        500,
      );
    }
  }

  return adminJsonResponse(
    {
      error: "Method not allowed",
    },
    405,
  );
}
