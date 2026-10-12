import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin";
import { db } from "@/lib/db";
import { testSearchProviderConnection, resolveSearchApiKey } from "@/lib/search/search-provider";

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

  const providerRecord = await db.searchProvider.findUnique({
    where: { id },
  });

  if (!providerRecord) {
    return NextResponse.json({ error: "Search provider not found." }, { status: 404 });
  }

  let body: any = {};
  try {
    body = await req.json();
  } catch {
    // Body is optional
  }

  const candidateKey =
    body.apiKey !== undefined && body.apiKey !== null ? String(body.apiKey).trim() : "";
  const apiKey = candidateKey || resolveSearchApiKey(providerRecord);

  if (!apiKey) {
    return NextResponse.json(
      {
        success: false,
        message: "No API key configured for this search provider. Please enter or save an API key first.",
        error: "Missing API key",
      },
      { status: 400 }
    );
  }

  const providerType = body.provider?.trim() || providerRecord.provider;
  const baseUrl = body.baseUrl !== undefined ? body.baseUrl?.trim() : providerRecord.baseUrl;

  const testResult = await testSearchProviderConnection({
    provider: providerType,
    apiKey,
    baseUrl,
  });

  return NextResponse.json(testResult, { status: testResult.success ? 200 : 400 });
}
