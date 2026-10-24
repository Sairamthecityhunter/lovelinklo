import { headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  resolveChatGPTUser,
  trustChatGPTIdentityHeaders,
  type ChatGPTIdentity,
} from "@/lib/chatgpt-identity";
import {
  currentSessionUser,
  emailSignInPath,
  emailSignOutPath,
  safeAuthReturnPath,
} from "@/lib/session-auth";

export type ChatGPTUser = ChatGPTIdentity;

export async function getChatGPTUser(
  request?: Request,
): Promise<ChatGPTUser | null> {
  const sessionUser = await currentSessionUser(request);
  if (sessionUser) return sessionUser;
  // Vercel / lovelinklos.vercel.app: session cookie only. Do not read
  // client-spoofable oai-authenticated-user-* headers as identity.
  if (!trustChatGPTIdentityHeaders()) return null;

  return resolveChatGPTUser({
    sessionUser: null,
    requestHeaders: request?.headers ?? (await headers()),
  });
}

export async function requireChatGPTUser(
  returnTo: string,
): Promise<ChatGPTUser> {
  const user = await getChatGPTUser();
  if (user) return user;

  redirect(emailSignInPath(safeAuthReturnPath(returnTo, "/")));
}

export function chatGPTSignInPath(returnTo: string): string {
  return emailSignInPath(returnTo);
}

export function chatGPTSignOutPath(returnTo = "/login"): string {
  return emailSignOutPath(returnTo);
}
