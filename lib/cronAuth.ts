import { NextResponse } from "next/server";
import { ENV_KEYS, readEnv } from "@/lib/env";

export function requireCron(request: Request) {
  const cronSecret = readEnv(ENV_KEYS.cronSecret);
  const authorization = request.headers.get("authorization");
  const bearerToken = authorization?.startsWith("Bearer ") ? authorization.slice("Bearer ".length) : undefined;

  if (!cronSecret || bearerToken !== cronSecret) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  return null;
}
