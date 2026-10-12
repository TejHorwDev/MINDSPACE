import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const SECRET = process.env.NEXTAUTH_SECRET || "mindspace-encryption-key-for-byok-and-secrets-32bytes";

function getKey(): Buffer {
  return crypto.createHash("sha256").update(SECRET).digest();
}

/**
 * Encrypts a plaintext string using AES-256-GCM.
 * Output format: ivHex:authTagHex:encryptedHex
 */
export function encryptSecret(plainText: string): string {
  if (!plainText) return "";
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
  let encrypted = cipher.update(plainText, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag().toString("hex");
  return `${iv.toString("hex")}:${authTag}:${encrypted}`;
}

/**
 * Decrypts an encrypted string produced by encryptSecret.
 * Handles legacy/unencrypted keys gracefully if any exist.
 */
export function decryptSecret(cipherText: string | null | undefined): string | null {
  if (!cipherText) return null;
  const parts = cipherText.split(":");
  if (parts.length !== 3) {
    // If not in 3-part encrypted format, it may be a raw key
    return cipherText;
  }
  try {
    const [ivHex, authTagHex, encryptedHex] = parts;
    const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), Buffer.from(ivHex, "hex"));
    decipher.setAuthTag(Buffer.from(authTagHex, "hex"));
    let decrypted = decipher.update(encryptedHex, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  } catch (err) {
    console.error("Decryption error:", err);
    return null;
  }
}

/**
 * Masks a secret string for safe display, e.g. "sk-p...90AB"
 */
export function maskSecret(secret: string | null | undefined): string {
  if (!secret) return "";
  const trimmed = secret.trim();
  if (trimmed.length <= 8) return "••••••••";
  return `${trimmed.slice(0, 6)}••••••••${trimmed.slice(-4)}`;
}
