import crypto from "crypto";
import { db } from "@/lib/db";

const TOKEN_SECRET = process.env.NEXTAUTH_SECRET || "mindspace-insecure-secret-key-change-me";

interface ResetTokenPayload {
  userId: string;
  email: string;
  exp: number;
  hashSig: string;
}

/**
 * Creates a stateless, tamper-proof password reset token.
 * Automatically self-invalidates once the user's password changes.
 */
export function createPasswordResetToken(user: { id: string; email: string; passwordHash: string | null }): string {
  const exp = Date.now() + 1000 * 60 * 60; // 1 hour expiration
  const hashSig = (user.passwordHash || "").slice(0, 16);
  const payload: ResetTokenPayload = {
    userId: user.id,
    email: user.email,
    exp,
    hashSig,
  };

  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto
    .createHmac("sha256", `${TOKEN_SECRET}:${user.passwordHash || "oauth"}`)
    .update(payloadB64)
    .digest("base64url");

  return `${payloadB64}.${signature}`;
}

/**
 * Verifies and decodes a password reset token.
 * Returns the matching user record if valid, or null if tampered/expired.
 */
export async function verifyPasswordResetToken(token: string) {
  try {
    const parts = token.split(".");
    if (parts.length !== 2) return null;

    const [payloadB64, signature] = parts;
    const payloadRaw = Buffer.from(payloadB64, "base64url").toString("utf-8");
    const payload: ResetTokenPayload = JSON.parse(payloadRaw);

    if (Date.now() > payload.exp) {
      return null; // Expired
    }

    const user = await db.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, email: true, passwordHash: true },
    });

    if (!user || user.email !== payload.email) {
      return null;
    }

    // Check that current passwordHash matches the signature used when token was minted
    const expectedSig = crypto
      .createHmac("sha256", `${TOKEN_SECRET}:${user.passwordHash || "oauth"}`)
      .update(payloadB64)
      .digest("base64url");

    if (signature !== expectedSig) {
      return null;
    }

    return user;
  } catch (err) {
    console.error("Token verification failed:", err);
    return null;
  }
}

/**
 * Creates a stateless email verification token.
 */
export function createEmailVerificationToken(user: { id: string; email: string }): string {
  const exp = Date.now() + 1000 * 60 * 60 * 24; // 24 hour expiration
  const payload = { userId: user.id, email: user.email, exp };
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto
    .createHmac("sha256", TOKEN_SECRET)
    .update(payloadB64)
    .digest("base64url");

  return `${payloadB64}.${signature}`;
}

/**
 * Verifies an email verification token.
 */
export async function verifyEmailVerificationToken(token: string) {
  try {
    const parts = token.split(".");
    if (parts.length !== 2) return null;

    const [payloadB64, signature] = parts;
    const expectedSig = crypto
      .createHmac("sha256", TOKEN_SECRET)
      .update(payloadB64)
      .digest("base64url");

    if (signature !== expectedSig) return null;

    const payloadRaw = Buffer.from(payloadB64, "base64url").toString("utf-8");
    const payload = JSON.parse(payloadRaw);

    if (Date.now() > payload.exp) return null;

    const user = await db.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, email: true },
    });

    if (!user || user.email !== payload.email) return null;

    return user;
  } catch {
    return null;
  }
}
