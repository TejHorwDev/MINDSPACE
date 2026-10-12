import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { runAiAutoResearch } from "@/lib/search/ai-research";

export const dynamic = "force-dynamic";

type RouteProps = {
  params: Promise<{ id: string }>;
};

/**
 * POST /api/docs/[id]/research
 * Triggers live internet research, drafts grounded content, and prepares verifiable citations.
 */
export async function POST(req: Request, { params }: RouteProps) {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const doc = await db.document.findFirst({
    where: { id, ownerId: session.user.id },
    select: { id: true },
  });

  if (!doc) {
    return NextResponse.json({ error: "Document not found." }, { status: 404 });
  }

  let body: any = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const topic = (body.topic || "").trim();
  if (!topic) {
    return NextResponse.json(
      { error: "Please enter a research topic or inquiry." },
      { status: 400 }
    );
  }

  // Check if student has BYOK configured for Google or Groq in their settings
  let byokKey: string | null = null;
  const userSettings = await db.userSettings.findUnique({
    where: { userId: session.user.id },
    select: { byokGoogleKey: true, byokGroqKey: true, byokOpenaiKey: true },
  });

  if (userSettings) {
    const rawKey =
      userSettings.byokGoogleKey ||
      userSettings.byokGroqKey ||
      userSettings.byokOpenaiKey;
    if (rawKey) {
      const { decryptSecret } = await import("@/lib/crypto");
      try {
        byokKey = decryptSecret(rawKey);
      } catch {
        // Fall back to system key
      }
    }
  }

  try {
    const result = await runAiAutoResearch({
      userId: session.user.id,
      documentId: id,
      topic,
      maxResults: body.maxResults || 5,
      byokKey,
    });

    return NextResponse.json(result);
  } catch (err: any) {
    console.error(`[POST /api/docs/${id}/research] error:`, err);
    const statusCode = err.statusCode || (err.code === "OUT_OF_CREDITS" ? 402 : 500);

    return NextResponse.json(
      {
        error: err.message || "Failed to execute AI Auto-Research.",
        code: err.code || "RESEARCH_ERROR",
      },
      { status: statusCode }
    );
  }
}
