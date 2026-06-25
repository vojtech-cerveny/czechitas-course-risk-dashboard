import { NextResponse } from "next/server";
import { thresholdsSchema, saveThresholds, getThresholds } from "@/lib/settings";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json(getThresholds());
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = thresholdsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.issues.map((i) => i.message).join(", ") },
      { status: 400 },
    );
  }
  const saved = saveThresholds(parsed.data);
  return NextResponse.json({ ok: true, thresholds: saved });
}
