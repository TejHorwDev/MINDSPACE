import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin";
import { testProviderConnection } from "@/lib/gemini";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const { status, session } = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Admin access required." }, { status });
  }

  let body: any = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { provider, modelKey, apiKey, baseUrl } = body;

  if (!provider || !modelKey || !apiKey) {
    return NextResponse.json(
      {
        success: false,
        message: "Provider, modelKey, and apiKey are required to test connection.",
        error: "Missing required fields",
      },
      { status: 400 }
    );
  }

  const result = await testProviderConnection({
    provider: provider.trim(),
    modelKey: modelKey.trim(),
    apiKey: apiKey.trim(),
    baseUrl: baseUrl && typeof baseUrl === "string" ? baseUrl.trim() : null,
  });

  return NextResponse.json(result);
}
