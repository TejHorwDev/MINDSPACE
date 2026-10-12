import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin";
import { db } from "@/lib/db";
import { testProviderConnection } from "@/lib/gemini";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { status, session } = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Admin access required." }, { status });
  }

  const { id } = await params;

  const providerRecord = await db.aiProvider.findUnique({
    where: { id },
  });

  if (!providerRecord) {
    return NextResponse.json({ error: "Provider not found." }, { status: 404 });
  }

  let body: any = {};
  try {
    body = await req.json();
  } catch {
    // Body is optional
  }

  const candidateKey = body.apiKey !== undefined && body.apiKey !== null ? body.apiKey.trim() : "";
  const apiKey =
    candidateKey ||
    providerRecord.apiKey?.trim() ||
    (providerRecord.provider === "google"
      ? process.env.GEMINI_API_KEY?.trim() || process.env.GOOGLE_AI_API_KEY?.trim()
      : providerRecord.provider === "groq"
      ? process.env.GROQ_API_KEY?.trim()
      : providerRecord.provider === "nvidia"
      ? process.env.NVIDIA_API_KEY?.trim() || process.env.NIM_API_KEY?.trim() || process.env.NVAPI_KEY?.trim()
      : process.env.OPENAI_API_KEY?.trim()) ||
    "";

  if (!apiKey) {
    return NextResponse.json(
      {
        success: false,
        message: "No API key configured for this provider. Please enter or save an API key first.",
        error: "Missing API key",
      },
      { status: 400 }
    );
  }

  const modelKey = body.modelKey?.trim() || providerRecord.modelKey;
  const providerType = body.provider?.trim() || providerRecord.provider;
  const baseUrl = body.baseUrl !== undefined ? body.baseUrl?.trim() : providerRecord.baseUrl;

  const testResult = await testProviderConnection({
    provider: providerType,
    modelKey,
    apiKey,
    baseUrl,
  });

  return NextResponse.json(testResult);
}
