import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin";
import { db } from "@/lib/db";
import { isMcpFeatureEnabled } from "@/lib/mcp";

export const dynamic = "force-dynamic";

export async function GET() {
  const { session, status } = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Admin access required." }, { status });
  }

  const enabled = await isMcpFeatureEnabled();

  const totalServersCount = await db.userMCPServer.count();
  const activeServersCount = await db.userMCPServer.count({ where: { active: true } });

  // Get count of distinct users who configured MCP servers (METADATA ONLY - NO SECRETS)
  const distinctUsers = await db.userMCPServer.groupBy({
    by: ["userId"],
    _count: {
      _all: true,
    },
  });

  return NextResponse.json({
    enabled,
    totalServersCount,
    activeServersCount,
    usersWithMcpCount: distinctUsers.length,
  });
}

export async function PATCH(req: NextRequest) {
  const { session, status } = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Admin access required." }, { status });
  }

  let body: { enabled?: boolean } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (typeof body.enabled !== "boolean") {
    return NextResponse.json({ error: "Field 'enabled' boolean is required." }, { status: 400 });
  }

  const settingValue = body.enabled ? "true" : "false";

  await db.systemSetting.upsert({
    where: { key: "allowUserMcpServers" },
    update: { value: settingValue },
    create: { key: "allowUserMcpServers", value: settingValue },
  });

  return NextResponse.json({
    success: true,
    enabled: body.enabled,
    message: body.enabled
      ? "Personal MCP servers are now permitted platform-wide."
      : "Personal MCP servers have been disabled platform-wide.",
  });
}
