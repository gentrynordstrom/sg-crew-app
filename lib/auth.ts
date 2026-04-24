import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { User } from "@prisma/client";
import { prisma } from "./prisma";
import { SESSION_COOKIE, verifySessionToken, type SessionPayload } from "./jwt";

export async function getSession(): Promise<SessionPayload | null> {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

/**
 * Returns the current user (from DB) if the session cookie is valid AND the
 * user is still active. If not, returns null. This is the canonical "am I
 * logged in right now" check and must be called from every protected page /
 * server action (middleware only verifies the JWT signature — it cannot hit
 * Prisma from the Edge runtime).
 */
export async function getActiveUser(): Promise<User | null> {
  const session = await getSession();
  if (!session) return null;
  const user = await prisma.user.findUnique({ where: { id: session.sub } });
  if (!user || !user.isActive) return null;
  return user;
}

export async function requireActiveSession(): Promise<User> {
  const user = await getActiveUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireAdmin(): Promise<User> {
  const user = await requireActiveSession();
  if (user.role !== "ADMIN") redirect("/");
  return user;
}

/**
 * Require the current user to have one of the specified roles.
 * Redirects to "/" if the role is not permitted.
 */
export async function requireRole(roles: import("@prisma/client").Role[]): Promise<User> {
  const user = await requireActiveSession();
  if (!roles.includes(user.role)) redirect("/");
  return user;
}
