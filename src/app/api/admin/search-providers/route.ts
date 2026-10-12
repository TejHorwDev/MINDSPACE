import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const { status, session } = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Admin access required." }, { status });
  }

  const providers = await db.searchProvider.findMany({
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

  const { name, provider, baseUrl, apiKey, notes, active, priority, searchDepth, maxResults } = body;

  if (!name || !provider) {
    return NextResponse.json({ error: "Name and provider type are required." }, { status: 400 });
  }

  const highestPriority = await db.searchProvider.findFirst({
    orderBy: { priority: "desc" },
    select: { priority: true },
  });
  const defaultPriority = (highestPriority?.priority || 0) + 1;

  const created = await db.searchProvider.create({
    data: {
      name: name.trim(),
      provider: provider.trim().toLowerCase(),
      baseUrl: baseUrl && baseUrl.trim() !== "" ? baseUrl.trim() : null,
      apiKey: apiKey && apiKey.trim() !== "" ? apiKey.trim() : null,
      notes: notes && notes.trim() !== "" ? notes.trim() : null,
      active: active !== undefined ? Boolean(active) : true,
      priority: typeof priority === "number" ? priority : defaultPriority,
      searchDepth: searchDepth ? String(searchDepth).trim() : "basic",
      maxResults: typeof maxResults === "number" ? maxResults : 5,
    },
  });

  const { logAdminAction } = await import("@/lib/activity-log");
  await logAdminAction({
    adminUserId: session.user.id,
    action: "search_provider_created",
    targetType: "search_provider",
    targetId: created.id,
    details: { name: created.name, provider: created.provider },
  });

  return NextResponse.json({ provider: created }, { status: 201 });
}
