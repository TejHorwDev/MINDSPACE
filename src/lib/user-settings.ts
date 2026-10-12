import { db } from "@/lib/db";
import { encryptSecret, decryptSecret, maskSecret } from "@/lib/crypto";

export interface SafeUserSettings {
  editorTheme: string;
  fontSize: number;
  tabSize: number;
  wordWrap: boolean;
  minimap: boolean;
  aiAutoApprove: boolean;
  aiDefaultModelId: string | null;
  hasGoogleKey: boolean;
  hasGroqKey: boolean;
  hasOpenaiKey: boolean;
  hasNvidiaKey: boolean;
  maskedGoogleKey: string;
  maskedGroqKey: string;
  maskedOpenaiKey: string;
  maskedNvidiaKey: string;
  hasSeenMcpTrustWarning: boolean;
}

/**
 * Retrieves raw or created UserSettings row for a user.
 */
export async function getOrCreateUserSettings(userId: string) {
  let settings = await db.userSettings.findUnique({
    where: { userId },
  });

  if (!settings) {
    settings = await db.userSettings.create({
      data: {
        userId,
        editorTheme: "vs-dark",
        fontSize: 14,
        tabSize: 2,
        wordWrap: true,
        minimap: false,
        aiAutoApprove: false,
        hasSeenMcpTrustWarning: false,
      },
    });
  }

  return settings;
}

/**
 * Returns safe frontend settings with masked BYOK keys.
 * Never leaks raw plaintext or encrypted ciphertext to the browser.
 */
export async function getSafeUserSettings(userId: string): Promise<SafeUserSettings> {
  const s = await getOrCreateUserSettings(userId);

  const decGoogle = decryptSecret(s.byokGoogleKey);
  const decGroq = decryptSecret(s.byokGroqKey);
  const decOpenai = decryptSecret(s.byokOpenaiKey);
  const decNvidia = decryptSecret(s.byokNvidiaKey);

  return {
    editorTheme: s.editorTheme || "vs-dark",
    fontSize: s.fontSize || 14,
    tabSize: s.tabSize || 2,
    wordWrap: s.wordWrap ?? true,
    minimap: s.minimap ?? false,
    aiAutoApprove: s.aiAutoApprove ?? false,
    aiDefaultModelId: s.aiDefaultModelId || null,
    hasGoogleKey: Boolean(decGoogle && decGoogle.trim().length > 0),
    hasGroqKey: Boolean(decGroq && decGroq.trim().length > 0),
    hasOpenaiKey: Boolean(decOpenai && decOpenai.trim().length > 0),
    hasNvidiaKey: Boolean(decNvidia && decNvidia.trim().length > 0),
    maskedGoogleKey: maskSecret(decGoogle),
    maskedGroqKey: maskSecret(decGroq),
    maskedOpenaiKey: maskSecret(decOpenai),
    maskedNvidiaKey: maskSecret(decNvidia),
    hasSeenMcpTrustWarning: Boolean(s.hasSeenMcpTrustWarning),
  };
}

/**
 * Updates a user's settings, encrypting any BYOK keys before saving to DB.
 */
export async function updateUserSettings(
  userId: string,
  data: {
    editorTheme?: string;
    fontSize?: number;
    tabSize?: number;
    wordWrap?: boolean;
    minimap?: boolean;
    aiAutoApprove?: boolean;
    aiDefaultModelId?: string | null;
    byokGoogleKey?: string | null;
    byokGroqKey?: string | null;
    byokOpenaiKey?: string | null;
    byokNvidiaKey?: string | null;
    hasSeenMcpTrustWarning?: boolean;
  }
) {
  // Ensure settings record exists
  await getOrCreateUserSettings(userId);

  const updateData: any = {};

  if (data.editorTheme !== undefined) updateData.editorTheme = data.editorTheme;
  if (data.fontSize !== undefined) updateData.fontSize = Number(data.fontSize);
  if (data.tabSize !== undefined) updateData.tabSize = Number(data.tabSize);
  if (data.wordWrap !== undefined) updateData.wordWrap = Boolean(data.wordWrap);
  if (data.minimap !== undefined) updateData.minimap = Boolean(data.minimap);
  if (data.aiAutoApprove !== undefined) updateData.aiAutoApprove = Boolean(data.aiAutoApprove);
  if (data.aiDefaultModelId !== undefined) updateData.aiDefaultModelId = data.aiDefaultModelId;
  if (data.hasSeenMcpTrustWarning !== undefined) updateData.hasSeenMcpTrustWarning = Boolean(data.hasSeenMcpTrustWarning);

  // Encrypt BYOK keys if provided (empty string / null means remove key)
  if (data.byokGoogleKey !== undefined) {
    const trimmed = (data.byokGoogleKey || "").trim();
    updateData.byokGoogleKey = trimmed ? encryptSecret(trimmed) : null;
  }
  if (data.byokGroqKey !== undefined) {
    const trimmed = (data.byokGroqKey || "").trim();
    updateData.byokGroqKey = trimmed ? encryptSecret(trimmed) : null;
  }
  if (data.byokOpenaiKey !== undefined) {
    const trimmed = (data.byokOpenaiKey || "").trim();
    updateData.byokOpenaiKey = trimmed ? encryptSecret(trimmed) : null;
  }
  if (data.byokNvidiaKey !== undefined) {
    const trimmed = (data.byokNvidiaKey || "").trim();
    updateData.byokNvidiaKey = trimmed ? encryptSecret(trimmed) : null;
  }

  const updated = await db.userSettings.update({
    where: { userId },
    data: updateData,
  });

  return updated;
}

/**
 * Decrypts a student's personal BYOK key for server-side AI execution.
 */
export async function getDecryptedByokKey(
  userId: string,
  provider: "google" | "groq" | "openai" | "nvidia"
): Promise<string | null> {
  const settings = await db.userSettings.findUnique({
    where: { userId },
    select: {
      byokGoogleKey: true,
      byokGroqKey: true,
      byokOpenaiKey: true,
      byokNvidiaKey: true,
    },
  });

  if (!settings) return null;

  let rawEncrypted: string | null = null;
  if (provider === "google") rawEncrypted = settings.byokGoogleKey;
  if (provider === "groq") rawEncrypted = settings.byokGroqKey;
  if (provider === "openai") rawEncrypted = settings.byokOpenaiKey;
  if (provider === "nvidia") rawEncrypted = settings.byokNvidiaKey;

  return decryptSecret(rawEncrypted);
}
