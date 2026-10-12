import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const { status, session } = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Admin access required." }, { status });
  }

  const providers = await db.aiProvider.findMany({
    orderBy: { priority: "asc" },
  });

  return NextResponse.json({ providers });
}

export async function POST(req: NextRequest) {
  const { status, session } = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Admin access required." }, { status });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const {
    name,
    modelKey,
    provider,
    baseUrl,
    apiKey,
    notes,
    active,
    priority,
    inputCostPerMillion,
    outputCostPerMillion,
  } = body;

  if (!name || !modelKey) {
    return NextResponse.json({ error: "Name and modelKey are required." }, { status: 400 });
  }

  const highestPriority = await db.aiProvider.findFirst({
    orderBy: { priority: "desc" },
    select: { priority: true },
  });
  const defaultPriority = (highestPriority?.priority || 0) + 1;

  const created = await db.aiProvider.create({
    data: {
      name: name.trim(),
      modelKey: modelKey.trim(),
      provider: provider ? provider.trim() : "google",
      baseUrl: baseUrl && baseUrl.trim() !== "" ? baseUrl.trim() : null,
      apiKey: apiKey && apiKey.trim() !== "" ? apiKey.trim() : null,
      notes: notes && notes.trim() !== "" ? notes.trim() : null,
      active: active !== undefined ? Boolean(active) : true,
      priority: typeof priority === "number" ? priority : defaultPriority,
      inputCostPerMillion: typeof inputCostPerMillion === "number" ? inputCostPerMillion : 0.075,
      outputCostPerMillion: typeof outputCostPerMillion === "number" ? outputCostPerMillion : 0.3,
    },
  });

  const { logAdminAction } = await import("@/lib/activity-log");
  await logAdminAction({
    adminUserId: session.user.id,
    action: "ai_provider_created",
    targetType: "ai_provider",
    targetId: created.id,
    details: { name: created.name, modelKey: created.modelKey, provider: created.provider },
  });

  return NextResponse.json({ provider: created });
}
