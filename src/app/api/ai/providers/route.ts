import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { getSafeUserSettings } from "@/lib/user-settings";

export const dynamic = "force-dynamic";

/**
 * Returns safe public metadata for active AI providers plus any personal BYOK keys configured by the student.
 * Safe for frontend consumption: no keys, no pricing, no internal config.
 */
export async function GET() {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const adminProviders = await db.aiProvider.findMany({
      where: { active: true },
      orderBy: { priority: "asc" },
      select: {
        id: true,
        name: true,
      },
    });

    const userSettings = await getSafeUserSettings(session.user.id);
    const byokOptions: Array<{ id: string; name: string; isByok: boolean }> = [];

    if (userSettings.hasGoogleKey) {
      byokOptions.push({
        id: "byok-google",
        name: "My Gemini Key (BYOK)",
        isByok: true,
      });
    }
    if (userSettings.hasGroqKey) {
      byokOptions.push({
        id: "byok-groq",
        name: "My Groq Key (BYOK)",
        isByok: true,
      });
    }
    if (userSettings.hasOpenaiKey) {
      byokOptions.push({
        id: "byok-openai",
        name: "My OpenAI Key (BYOK)",
        isByok: true,
      });
    }
    if (userSettings.hasNvidiaKey) {
      byokOptions.push({
        id: "byok-nvidia",
        name: "My NVIDIA NIM Key (BYOK)",
        isByok: true,
      });
    }

    return NextResponse.json({
      providers: [...adminProviders, ...byokOptions],
      byokCount: byokOptions.length,
    });
  } catch (error) {
    console.error("Failed to fetch active AI providers:", error);
    return NextResponse.json(
      { error: "Failed to retrieve providers" },
      { status: 500 }
    );
  }
}
