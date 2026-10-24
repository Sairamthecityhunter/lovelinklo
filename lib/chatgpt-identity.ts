export type ChatGPTIdentity = {
  userId: string;
  displayName: string;
  email: string;
  fullName: string | null;
};

export const CHATGPT_USER_ID_HEADER = "oai-authenticated-user-id";
export const CHATGPT_USER_EMAIL_HEADER = "oai-authenticated-user-email";
export const CHATGPT_USER_FULL_NAME_HEADER = "oai-authenticated-user-full-name";
export const CHATGPT_USER_FULL_NAME_ENCODING_HEADER =
  "oai-authenticated-user-full-name-encoding";

const PERCENT_ENCODED_UTF8 = "percent-encoded-utf-8";

export type HeaderTrustEnv = {
  VERCEL?: string;
  VERCEL_ENV?: string;
};

function envString(env: object, name: string): string | undefined {
  const value = (env as Record<string, unknown>)[name];
  return typeof value === "string" ? value : undefined;
}

function headerTrustSignals(env: object): HeaderTrustEnv {
  return {
    VERCEL: envString(env, "VERCEL"),
    VERCEL_ENV: envString(env, "VERCEL_ENV"),
  };
}

/**
 * Vercel (production, preview, and `vercel dev`) accepts arbitrary client
 * request headers. Trusting `oai-authenticated-user-*` there is
 * account-takeover: anyone can impersonate a user when no session cookie is
 * present. ChatGPT Sites injects those headers at the platform edge after
 * sign-in and does not set `VERCEL`, so the header fallback stays available
 * only on that non-Vercel path.
 */
export function trustChatGPTIdentityHeaders(env: object = process.env): boolean {
  const {VERCEL, VERCEL_ENV} = headerTrustSignals(env);
  if (VERCEL) return false;
  if (VERCEL_ENV === "production" || VERCEL_ENV === "preview") {
    return false;
  }
  return true;
}

export function userFromChatGPTIdentityHeaders(
  requestHeaders: { get(name: string): string | null },
): ChatGPTIdentity | null {
  const userId = requestHeaders.get(CHATGPT_USER_ID_HEADER);
  const email = requestHeaders.get(CHATGPT_USER_EMAIL_HEADER);
  if (!userId || !email) return null;

  const encodedFullName = requestHeaders.get(CHATGPT_USER_FULL_NAME_HEADER);
  const fullName =
    encodedFullName &&
    requestHeaders.get(CHATGPT_USER_FULL_NAME_ENCODING_HEADER) ===
      PERCENT_ENCODED_UTF8
      ? safeDecodeURIComponent(encodedFullName)
      : null;

  return {
    userId,
    displayName: fullName ?? email,
    email,
    fullName,
  };
}

export function resolveChatGPTUser(input: {
  sessionUser: ChatGPTIdentity | null;
  requestHeaders: { get(name: string): string | null };
  env?: object;
}): ChatGPTIdentity | null {
  if (input.sessionUser) return input.sessionUser;
  if (!trustChatGPTIdentityHeaders(input.env ?? process.env)) return null;
  return userFromChatGPTIdentityHeaders(input.requestHeaders);
}

function safeDecodeURIComponent(value: string): string | null {
  try {
    return decodeURIComponent(value);
  } catch {
    return null;
  }
}
