import { SignJWT, jwtVerify, type JWTPayload } from "jose";

export const SESSION_COOKIE = "sg_session";
const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

export interface SessionPayload extends JWTPayload {
  sub: string;
  name: string;
  role: "CAPTAIN" | "DECKHAND" | "MECHANIC" | "ADMIN";
}

function getSecretKey(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      "JWT_SECRET is not set or is too short (must be at least 32 chars). See .env.example."
    );
  }
  return new TextEncoder().encode(secret);
}

export async function signSessionToken(
  payload: Omit<SessionPayload, "iat" | "exp">
): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${ONE_YEAR_SECONDS}s`)
    .sign(getSecretKey());
}

export async function verifySessionToken(
  token: string
): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey(), {
      algorithms: ["HS256"],
    });
    if (
      typeof payload.sub === "string" &&
      typeof payload.name === "string" &&
      typeof payload.role === "string"
    ) {
      return payload as SessionPayload;
    }
    return null;
  } catch {
    return null;
  }
}

export const SESSION_MAX_AGE_SECONDS = ONE_YEAR_SECONDS;
