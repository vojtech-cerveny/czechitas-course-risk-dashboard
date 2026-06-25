// Shared-password auth with an HMAC-signed cookie. Uses Web Crypto so it runs in
// both the Edge middleware and Node route handlers.

export const SESSION_COOKIE = "is_bot_session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

function getSecret(): string {
  return process.env.AUTH_SECRET ?? process.env.APP_PASSWORD ?? "";
}

async function hmac(message: string, secret: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function createSessionToken(issuedAt = nowSeconds()): Promise<string> {
  const payload = String(issuedAt);
  const sig = await hmac(payload, getSecret());
  return `${payload}.${sig}`;
}

export async function verifySessionToken(token: string | undefined | null): Promise<boolean> {
  if (!token) return false;
  const dot = token.lastIndexOf(".");
  if (dot === -1) return false;
  const payload = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = await hmac(payload, getSecret());
  if (!timingSafeEqual(sig, expected)) return false;
  const issuedAt = Number.parseInt(payload, 10);
  if (!Number.isFinite(issuedAt)) return false;
  return nowSeconds() - issuedAt < MAX_AGE_SECONDS;
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  };
}

function nowSeconds(): number {
  return Math.floor(Date.now() / 1000);
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
