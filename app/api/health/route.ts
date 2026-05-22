import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { ENV_KEYS, getEnvStatus, readEnv, requireSupabasePublicEnv } from "@/lib/env";
import { searchTenders } from "@/lib/mercado-publico/client";

type CheckResult = {
  ok: boolean;
  message: string;
  details?: Record<string, unknown>;
};

export async function GET() {
  const mercadoPublico = await checkMercadoPublico();
  const supabase = await checkSupabase();
  const env = getEnvStatus();

  const ok =
    mercadoPublico.ok &&
    supabase.ok &&
    env.mercadoPublicoTicket &&
    env.supabaseUrl &&
    env.supabaseAnonKey &&
    env.validMercadoPublicoTicket &&
    env.validSupabaseUrl &&
    env.validSupabaseAnonKey;

  return NextResponse.json(
    {
      ok,
      env,
      checks: {
        mercadoPublico,
        supabase
      }
    },
    { status: ok ? 200 : 503 }
  );
}

async function checkMercadoPublico(): Promise<CheckResult> {
  if (!readEnv(ENV_KEYS.mercadoPublicoTicket)) {
    return {
      ok: false,
      message: "Falta MERCADO_PUBLICO_TICKET."
    };
  }

  try {
    const tenders = await searchTenders({ status: "activas" });

    return {
      ok: true,
      message: "Mercado Público respondió correctamente.",
      details: {
        tenders: tenders.length
      }
    };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "No fue posible consultar Mercado Público."
    };
  }
}

async function checkSupabase(): Promise<CheckResult> {
  try {
    const { url, anonKey } = requireSupabasePublicEnv();
    const supabase = createClient(url, anonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    });

    const { error, count } = await supabase
      .from("tender_alerts")
      .select("id", { count: "exact", head: true });

    if (error) {
      return {
        ok: false,
        message: error.message,
        details: {
          code: error.code
        }
      };
    }

    return {
      ok: true,
      message: "Supabase respondió correctamente y la tabla tender_alerts está disponible.",
      details: {
        count
      }
    };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "No fue posible consultar Supabase."
    };
  }
}
