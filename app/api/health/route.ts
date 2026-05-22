import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { searchTenders } from "@/lib/mercado-publico/client";

type CheckResult = {
  ok: boolean;
  message: string;
  details?: Record<string, unknown>;
};

export async function GET() {
  const mercadoPublico = await checkMercadoPublico();
  const supabase = await checkSupabase();

  const env = {
    mercadoPublicoTicket: Boolean(process.env.MERCADO_PUBLICO_TICKET),
    supabaseUrl: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
    supabaseAnonKey: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  };

  const ok = mercadoPublico.ok && supabase.ok && Object.values(env).every(Boolean);

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
  if (!process.env.MERCADO_PUBLICO_TICKET) {
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
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return {
      ok: false,
      message: "Faltan NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY."
    };
  }

  try {
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
