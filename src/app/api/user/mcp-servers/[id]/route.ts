import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAuthSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { encryptSecret, maskSecret, decryptSecret } from "@/lib/crypto";
import { validateSafeMcpUrl, SSRF_GENERIC_ERROR } from "@/lib/ssrf";
import { isMcpFeatureEnabled } from "@/lib/mcp";

type RouteContext = { params: Promise<{ id: string }> };

const updateMcpSchema = z.object({
  name: z.string().trim().min(1).max(60).optional(),
  url: z
    .string()
    .trim()
    .min(1)
    .max(500)
    .refine((val) => /^https?:\/\//i.test(val), {
      message: "Endpoint URL must begin with http:// or https://",
    })
    .optional(),
  authToken: z.string().trim().max(1000).optional().nullable(),
  active: z.boolean().optional(),
});

export async function PATCH(req: NextRequest, context: RouteContext) {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const enabledPlatformWide = await isMcpFeatureEnabled();
  if (!enabledPlatformWide) {
    return NextResponse.json(
      { error: "Personal MCP servers are currently disabled platform-wide by administrators." },
      { status: 403 }
    );
  }

  const { id } = await context.params;

  // Confirm server belongs to user
  const existing = await db.userMCPServer.findFirst({
    where: { id, userId: session.user.id },
  });

  if (!existing) {
    return NextResponse.json({ error: "MCP server connection not found." }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = updateMcpSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid input." },
      { status: 400 }
    );
  }

  const updateData: any = {};
  if (parsed.data.name !== undefined) updateData.name = parsed.data.name;
  if (parsed.data.url !== undefined) {
    const ssrfCheck = await validateSafeMcpUrl(parsed.data.url);
    if (!ssrfCheck.safe) {
      return NextResponse.json(
        { error: SSRF_GENERIC_ERROR },
        { status: 400 }
      );
    }
    updateData.url = parsed.data.url;
  }
  if (parsed.data.active !== undefined) updateData.active = parsed.data.active;
  if (parsed.data.authToken !== undefined) {
    const trimmed = (parsed.data.authToken || "").trim();
    updateData.authToken = trimmed ? encryptSecret(trimmed) : null;
  }

  const updated = await db.userMCPServer.update({
    where: { id },
    data: updateData,
  });

  const decToken = updated.authToken ? decryptSecret(updated.authToken) : null;

  return NextResponse.json({
    success: true,
    server: {
      id: updated.id,
      name: updated.name,
      url: updated.url,
      hasAuthToken: Boolean(decToken && decToken.length > 0),
      maskedAuthToken: maskSecret(decToken),
      active: updated.active,
    },
  });
}

export async function DELETE(_req: NextRequest, context: RouteContext) {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;

  const existing = await db.userMCPServer.findFirst({
    where: { id, userId: session.user.id },
  });

  if (!existing) {
    return NextResponse.json({ error: "MCP server connection not found." }, { status: 404 });
  }

  await db.userMCPServer.delete({
    where: { id },
  });

  return NextResponse.json({
    success: true,
    message: "MCP server connection removed.",
  });
}
