import { NextResponse, type NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE_SECONDS,
  signSessionToken,
} from "@/lib/jwt";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

function genericError() {
  return NextResponse.json(
    { error: "Incorrect PIN." },
    { status: 401 }
  );
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const userId =
    typeof body === "object" && body !== null && "userId" in body
      ? String((body as Record<string, unknown>).userId)
      : "";
  const pin =
    typeof body === "object" && body !== null && "pin" in body
      ? String((body as Record<string, unknown>).pin)
      : "";

  if (!userId || !/^\d{4}$/.test(pin)) {
    return NextResponse.json(
      { error: "Missing or invalid credentials." },
      { status: 400 }
    );
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });

  if (!user || !user.isActive) {
    return genericError();
  }

  const now = new Date();
  if (user.lockedUntil && user.lockedUntil > now) {
    return NextResponse.json(
      {
        error: `Account locked. Try again after ${user.lockedUntil.toLocaleTimeString()}.`,
        lockedUntil: user.lockedUntil.toISOString(),
      },
      { status: 423 }
    );
  }

  const ok = await bcrypt.compare(pin, user.pinHash);

  if (!ok) {
    const nextAttempts = user.failedAttempts + 1;
    const shouldLock = nextAttempts >= MAX_FAILED_ATTEMPTS;
    const lockedUntil = shouldLock
      ? new Date(now.getTime() + LOCKOUT_MINUTES * 60 * 1000)
      : null;

    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedAttempts: shouldLock ? 0 : nextAttempts,
        lockedUntil,
      },
    });

    if (shouldLock && lockedUntil) {
      return NextResponse.json(
        {
          error: `Too many failed attempts. Locked for ${LOCKOUT_MINUTES} minutes.`,
          lockedUntil: lockedUntil.toISOString(),
        },
        { status: 423 }
      );
    }
    return genericError();
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      failedAttempts: 0,
      lockedUntil: null,
      lastLoginAt: now,
    },
  });

  const token = await signSessionToken({
    sub: user.id,
    name: user.name,
    role: user.role,
  });

  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
  return res;
}
