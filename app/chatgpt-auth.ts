import { headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  resolveChatGPTUser,
  trustChatGPTIdentityHeaders,
  type ChatGPTIdentity,
} from "@/lib/chatgpt-identity";
import {
  readSessionTokenFromRequest,
  userFromSessionToken,
} from "@/lib/session-auth";

export type ChatGPTUser = ChatGPTIdentity;

const SIGN_IN_PATH = "/signin-with-chatgpt";
const SIGN_OUT_PATH = "/signout-with-chatgpt";
const CALLBACK_PATH = "/callback";

export async function getChatGPTUser(): Promise<ChatGPTUser | null> {
  const sessionUser = await userFromSessionToken(
    await readSessionTokenFromRequest(),
  );
  if (sessionUser) return sessionUser;
  // Vercel / lovelinklos.vercel.app: session cookie only. Do not read
  // client-spoofable oai-authenticated-user-* headers as identity.
  if (!trustChatGPTIdentityHeaders()) return null;

  return resolveChatGPTUser({
    sessionUser: null,
    requestHeaders: await headers(),
  });
}

export async function requireChatGPTUser(
  returnTo: string,
): Promise<ChatGPTUser> {
  const user = await getChatGPTUser();
  if (user) return user;

  const safeReturnTo = safeRelativeReturnPath(returnTo);
  redirect(`/login?next=${encodeURIComponent(safeReturnTo)}`);
}

export function chatGPTSignInPath(returnTo: string): string {
  const safeReturnTo = safeRelativeReturnPath(returnTo);
  return `/login?next=${encodeURIComponent(safeReturnTo)}`;
}

export function chatGPTSignOutPath(returnTo = "/"): string {
  const safeReturnTo = safeRelativeReturnPath(returnTo);
  return `${SIGN_OUT_PATH}?return_to=${encodeURIComponent(safeReturnTo)}`;
}

function safeRelativeReturnPath(value: string): string {
  if (!value.startsWith("/") || value.startsWith("//")) return "/";

  let url: URL;
  try {
    url = new URL(value, "https://app.local");
  } catch {
    return "/";
  }
  if (url.origin !== "https://app.local") return "/";
  if (isReservedAuthPath(url.pathname)) return "/";

  return `${url.pathname}${url.search}${url.hash}`;
}

function isReservedAuthPath(pathname: string): boolean {
  return (
    pathname === SIGN_IN_PATH ||
    pathname === SIGN_OUT_PATH ||
    pathname === CALLBACK_PATH ||
    pathname === "/login" ||
    pathname === "/register"
  );
}
