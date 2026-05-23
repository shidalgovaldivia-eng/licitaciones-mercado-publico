import { NextResponse } from "next/server";
import { ENV_KEYS, readEnv } from "@/lib/env";

export function requireAdmin(request: Request) {
  const adminApiKey = readEnv(ENV_KEYS.adminApiKey);
  const authorization = request.headers.get("authorization");
  const bearerToken = authorization?.startsWith("Bearer ") ? authorization.slice("Bearer ".length) : undefined;
  const requestApiKey = request.headers.get("x-admin-api-key") ?? bearerToken;

  if (!adminApiKey || requestApiKey !== adminApiKey) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  return null;
}
