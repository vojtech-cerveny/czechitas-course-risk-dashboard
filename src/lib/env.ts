// Centralised env access. Throws early if a required var is missing at use-time.
function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

export const env = {
  isBaseUrl: process.env.IS_BASE_URL ?? "https://is.czechitas.cz",
  get isLogin() {
    return required("IS_LOGIN");
  },
  get isPassword() {
    return required("IS_PASSWORD");
  },
  get updateToken() {
    return required("UPDATE_TOKEN");
  },
  get appPassword() {
    return required("APP_PASSWORD");
  },
  // Secret used to sign the auth session cookie. Falls back to APP_PASSWORD-derived value.
  get authSecret() {
    return process.env.AUTH_SECRET ?? required("APP_PASSWORD");
  },
  databasePath: process.env.DATABASE_PATH ?? "./data/is-bot.sqlite",
};

// States we actively track (open / upcoming courses marketing can still influence).
export const TRACKED_STATES = [
  "realization_registration_open",
  "realization_published",
  "realization_preparation",
  "approved",
] as const;

// Transitional post-registration states swept only for courses already in our DB,
// so a course that leaves the tracked lists (registration closed / course running)
// keeps getting state + registered-count updates instead of freezing at its last
// pre-transition snapshot. Evaluation/done are terminal enough to leave frozen.
export const FOLLOWUP_STATES = [
  "realization_registration_closed",
  "in_progress",
] as const;
