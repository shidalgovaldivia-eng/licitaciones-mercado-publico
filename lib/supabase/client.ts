import { createClient } from "@supabase/supabase-js";

export function createBrowserSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    console.warn(
      "Faltan NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY. Configura ambas variables en Vercel."
    );
    return null;
  }

  if (!isValidSupabaseUrl(url)) {
    console.warn("NEXT_PUBLIC_SUPABASE_URL debe tener formato https://<project-ref>.supabase.co.");
    return null;
  }

  if (anonKey.startsWith("http")) {
    console.warn("NEXT_PUBLIC_SUPABASE_ANON_KEY parece ser una URL. Usa la anon/publishable key de Supabase.");
    return null;
  }

  return createClient(url, anonKey);
}

function isValidSupabaseUrl(value: string) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" && parsed.hostname.endsWith(".supabase.co");
  } catch {
    return false;
  }
}
