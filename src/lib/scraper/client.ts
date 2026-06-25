import * as cheerio from "cheerio";
import { env } from "@/lib/env";

// Minimal cookie jar over native fetch (Node 20 / undici).
class CookieJar {
  private jar = new Map<string, string>();

  ingest(res: Response) {
    // getSetCookie() returns each Set-Cookie header separately (undici extension).
    const cookies = (res.headers as Headers & { getSetCookie?: () => string[] }).getSetCookie?.() ?? [];
    for (const c of cookies) {
      const [pair] = c.split(";");
      const idx = pair.indexOf("=");
      if (idx === -1) continue;
      const name = pair.slice(0, idx).trim();
      const value = pair.slice(idx + 1).trim();
      if (name) this.jar.set(name, value);
    }
  }

  header(): string {
    return [...this.jar.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
  }
}

export class IsClient {
  private jar = new CookieJar();
  private base = env.isBaseUrl;

  private async request(path: string, init?: RequestInit): Promise<Response> {
    const url = path.startsWith("http") ? path : `${this.base}${path}`;
    const res = await fetch(url, {
      ...init,
      redirect: "manual",
      headers: {
        "User-Agent": "is-bot/1.0 (+czechitas internal course-risk dashboard)",
        Cookie: this.jar.header(),
        ...(init?.headers ?? {}),
      },
    });
    this.jar.ingest(res);
    return res;
  }

  /** Fetch a page, following redirects manually while preserving the cookie jar. */
  async get(path: string, maxRedirects = 5): Promise<string> {
    let res = await this.request(path);
    let redirects = 0;
    while (res.status >= 300 && res.status < 400 && redirects < maxRedirects) {
      const loc = res.headers.get("location");
      if (!loc) break;
      res = await this.request(loc);
      redirects++;
    }
    if (!res.ok) {
      throw new Error(`GET ${path} failed: HTTP ${res.status}`);
    }
    return res.text();
  }

  /** Authenticate against the Nette login form and store the session cookie. */
  async login(): Promise<void> {
    // 1. GET the login page: seeds the session cookie + CSRF token.
    const loginPage = await this.get("/cs/prihlasit");
    const $ = cheerio.load(loginPage);
    const token = $('input[name="_token_"]').attr("value");
    const doField =
      $('input[name="_do"]').attr("value") ?? "slotLoader-signIn-signIn-form-submit";
    if (!token) throw new Error("Login failed: CSRF _token_ not found on login page");

    // 2. POST credentials.
    const body = new URLSearchParams({
      login: env.isLogin,
      password: env.isPassword,
      _token_: token,
      _do: doField,
      sign: "Přihlásit se",
    });
    const res = await this.request("/cs/prihlasit", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });

    // Successful login → 303 redirect to /cs. A 200 means the form re-rendered (bad creds).
    if (res.status !== 303 && res.status !== 302) {
      throw new Error(
        `Login failed: expected redirect, got HTTP ${res.status}. Check IS_LOGIN/IS_PASSWORD.`,
      );
    }

    // 3. Verify we actually have an authenticated session.
    const dashboard = await this.get("/cs");
    if (/p[řr]ihl[aá]sit/i.test(dashboard) && !/odhl[aá]sit/i.test(dashboard)) {
      throw new Error("Login failed: dashboard still shows a login prompt.");
    }
  }
}
