import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { ENV_KEYS, getEnvStatus, getNumberEnv, getSupabaseServerEnv, readEnv } from "@/lib/env";
import { countMercadoPublicoExternalRequestsToday } from "@/services/apiRequestLog";

type CheckResult = {
  ok: boolean;
  message: string;
  details?: Record<string, unknown>;
};

type TableCheckResult = {
  ok: boolean;
  table: string;
  reachable?: boolean;
  error?: Record<string, unknown>;
};

export async function GET() {
  const env = getEnvStatus();
  const supabase = await checkSupabase();
  const mercadoPublicoDailyLimit = getNumberEnv(ENV_KEYS.mercadoPublicoDailyLimit, 10000);
  const mercadoPublicoRequestsToday = await countMercadoPublicoExternalRequestsToday();
  const missingEnvVars = getMissingEnvVars();

  const ok =
    missingEnvVars.length === 0 &&
    supabase.ok &&
    env.validMercadoPublicoTicket &&
    env.validSupabaseUrl &&
    env.validSupabaseAnonKey;

  return NextResponse.json(
    {
      ok,
      missingEnvVars,
      mercadoPublicoDailyLimit,
      mercadoPublicoRequestsToday,
      cacheEnabled: env.cacheEnabled,
      env,
      checks: {
        mercadoPublico: {
          ok: Boolean(readEnv(ENV_KEYS.mercadoPublicoTicket)),
          message: "Health no consulta Mercado Público para no gastar cuota diaria."
        },
        supabase,
        cache: {
          ok: env.cacheEnabled,
          message: env.cacheEnabled
            ? "Cache Supabase habilitado con SUPABASE_SERVICE_ROLE_KEY."
            : "Cache Supabase deshabilitado. Configura SUPABASE_SERVICE_ROLE_KEY para guardar respuestas y contar cuota."
        }
      }
    },
    { status: ok ? 200 : 503 }
  );
}

function getMissingEnvVars() {
  return [
    ENV_KEYS.mercadoPublicoTicket,
    ENV_KEYS.supabaseUrl,
    ENV_KEYS.supabaseAnonKey,
    ENV_KEYS.supabaseServiceRoleKey,
    ENV_KEYS.adminApiKey
  ].filter((key) => !readEnv(key));
}

async function checkSupabase(): Promise<CheckResult> {
  try {
    const env = getSupabaseServerEnv();

    if (!env) {
      return {
        ok: false,
        message: "Falta SUPABASE_SERVICE_ROLE_KEY o NEXT_PUBLIC_SUPABASE_URL no es válida."
      };
    }

    const supabase = createClient(env.url, env.serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    });

    const tableChecks = await Promise.all([
      checkTable(supabase, "licitaciones_cache", "cache_key"),
      checkTable(supabase, "api_request_log", "id"),
      checkTable(supabase, "tender_alerts", "id")
    ]);

    const failedChecks = tableChecks.filter((check) => !check.ok);

    if (failedChecks.length > 0) {
      return {
        ok: false,
        message: "No fue posible validar una o más tablas operativas en Supabase.",
        details: {
          projectHost: new URL(env.url).hostname,
          failedTables: failedChecks,
          allTables: tableChecks,
          hint: "Verifica que ejecutaste lib/supabase/schema.sql en el mismo proyecto Supabase de NEXT_PUBLIC_SUPABASE_URL y que SUPABASE_SERVICE_ROLE_KEY corresponde a ese proyecto."
        }
      };
    }

    return {
      ok: true,
      message: "Supabase respondió correctamente con service role y las tablas operativas están disponibles.",
      details: {
        projectHost: new URL(env.url).hostname,
        tables: tableChecks
      }
    };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error && error.message ? error.message : "No fue posible consultar Supabase."
    };
  }
}

async function checkTable(
  supabase: SupabaseClient,
  table: string,
  column: string
): Promise<TableCheckResult> {
  const { error } = await supabase.from(table).select(column).limit(1);

  if (error) {
    return {
      ok: false,
      table,
      error: serializeUnknownError(error)
    };
  }

  return {
    ok: true,
    table,
    reachable: true
  };
}

function serializeUnknownError(error: unknown) {
  if (!error) {
    return {
      message: "Error desconocido sin payload."
    };
  }

  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      cause: error.cause ? String(error.cause) : undefined
    };
  }

  if (typeof error === "object") {
    const record = error as Record<string, unknown>;
    const ownProperties = Object.fromEntries(
      Object.getOwnPropertyNames(error).map((key) => [key, record[key]])
    );

    return {
      message: typeof record.message === "string" ? record.message : String(error),
      code: record.code,
      details: record.details,
      hint: record.hint,
      status: record.status,
      statusCode: record.statusCode,
      ownProperties
    };
  }

  return {
    message: String(error)
  };
}
