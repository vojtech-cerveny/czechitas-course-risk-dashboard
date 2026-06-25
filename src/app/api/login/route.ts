import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { env } from "@/lib/env";
import { SESSION_COOKIE, createSessionToken, sessionCookieOptions } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const { password } = await req.json().catch(() => ({ password: "" }));
  if (typeof password !== "string" || password !== env.appPassword) {
    return NextResponse.json({ ok: false, error: "Incorrect password" }, { status: 401 });
  }
  const token = await createSessionToken();
  (await cookies()).set(SESSION_COOKIE, token, sessionCookieOptions());
  return NextResponse.json({ ok: true });
}
