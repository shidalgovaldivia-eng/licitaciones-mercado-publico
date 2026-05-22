export const ENV_KEYS = {
  mercadoPublicoTicket: "MERCADO_PUBLICO_TICKET",
  supabaseUrl: "NEXT_PUBLIC_SUPABASE_URL",
  supabaseAnonKey: "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  supabaseServiceRoleKey: "SUPABASE_SERVICE_ROLE_KEY",
  mercadoPublicoDailyLimit: "MERCADO_PUBLICO_DAILY_LIMIT",
  mercadoPublicoCacheTtlMinutes: "MERCADO_PUBLICO_CACHE_TTL_MINUTES",
  adminApiKey: "ADMIN_API_KEY"
} as const;

export type EnvKey = (typeof ENV_KEYS)[keyof typeof ENV_KEYS];

export class MissingEnvError extends Error {
  constructor(key: EnvKey) {
    super(`Falta la variable de entorno ${key}. Configúrala en Vercel y reinicia el deploy.`);
    this.name = "MissingEnvError";
  }
}

export class InvalidEnvError extends Error {
  constructor(key: EnvKey, expected: string) {
    super(`La variable ${key} no tiene un formato válido. Valor esperado: ${expected}.`);
    this.name = "InvalidEnvError";
  }
}

export function readEnv(key: EnvKey) {
  const value = process.env[key];

  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function requireEnv(key: EnvKey) {
  const value = readEnv(key);

  if (!value) {
    throw new MissingEnvError(key);
  }

  return value;
}

export function getEnvStatus() {
  const mercadoPublicoTicket = readEnv(ENV_KEYS.mercadoPublicoTicket);
  const supabaseUrl = readEnv(ENV_KEYS.supabaseUrl);
  const supabaseAnonKey = readEnv(ENV_KEYS.supabaseAnonKey);
  const supabaseServiceRoleKey = readEnv(ENV_KEYS.supabaseServiceRoleKey);
  const adminApiKey = readEnv(ENV_KEYS.adminApiKey);

  return {
    mercadoPublicoTicket: Boolean(mercadoPublicoTicket),
    supabaseUrl: Boolean(supabaseUrl),
    supabaseAnonKey: Boolean(supabaseAnonKey),
    supabaseServiceRoleKey: Boolean(supabaseServiceRoleKey),
    adminApiKey: Boolean(adminApiKey),
    validSupabaseUrl: Boolean(supabaseUrl && isValidUrl(supabaseUrl)),
    validSupabaseAnonKey: Boolean(supabaseAnonKey && !supabaseAnonKey.startsWith("http")),
    validMercadoPublicoTicket: Boolean(mercadoPublicoTicket && mercadoPublicoTicket.length >= 20),
    cacheEnabled: Boolean(supabaseUrl && supabaseServiceRoleKey)
  };
}

export function getSupabaseServerEnv() {
  const url = readEnv(ENV_KEYS.supabaseUrl);
  const serviceRoleKey = readEnv(ENV_KEYS.supabaseServiceRoleKey);

  if (!url || !serviceRoleKey || !isValidUrl(url)) {
    return null;
  }

  return { url, serviceRoleKey };
}

export function getNumberEnv(key: EnvKey, fallback: number) {
  const value = readEnv(key);
  if (!value) {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function requireSupabasePublicEnv() {
  const url = requireEnv(ENV_KEYS.supabaseUrl);
  const anonKey = requireEnv(ENV_KEYS.supabaseAnonKey);

  if (!isValidUrl(url)) {
    throw new InvalidEnvError(ENV_KEYS.supabaseUrl, "https://<project-ref>.supabase.co");
  }

  if (anonKey.startsWith("http")) {
    throw new InvalidEnvError(ENV_KEYS.supabaseAnonKey, "una anon key, no una URL");
  }

  return { url, anonKey };
}

function isValidUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname.endsWith(".supabase.co");
  } catch {
    return false;
  }
}
