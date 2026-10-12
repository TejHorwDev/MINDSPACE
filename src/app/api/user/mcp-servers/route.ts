import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAuthSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { encryptSecret, decryptSecret, maskSecret } from "@/lib/crypto";
import { validateSafeMcpUrl, SSRF_GENERIC_ERROR } from "@/lib/ssrf";
import { isMcpFeatureEnabled } from "@/lib/mcp";

export const dynamic = "force-dynamic";

const createMcpSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(60, "Name too long"),
  url: z
    .string()
    .trim()
    .min(1, "URL is required")
    .max(500, "URL too long")
    .refine((val) => /^https?:\/\//i.test(val), {
      message: "Endpoint URL must begin with http:// or https://",
    }),
  authToken: z.string().trim().max(1000).optional().nullable(),
  active: z.boolean().default(true),
});

export async function GET() {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const enabledPlatformWide = await isMcpFeatureEnabled();

  const servers = await db.userMCPServer.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      url: true,
      authToken: true,
      active: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  const safeServers = servers.map((s) => {
    const decToken = s.authToken ? decryptSecret(s.authToken) : null;
    return {
      id: s.id,
      name: s.name,
      url: s.url,
      hasAuthToken: Boolean(decToken && decToken.length > 0),
      maskedAuthToken: maskSecret(decToken),
      active: s.active,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
    };
  });

  return NextResponse.json({
    servers: safeServers,
    enabledPlatformWide,
  });
}

export async function POST(req: NextRequest) {
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

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = createMcpSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid input." },
      { status: 400 }
    );
  }

  const { name, url, authToken, active } = parsed.data;

  // SSRF Protection: Reject private ranges, localhost, link-local, cloud metadata, and unresolvable addresses
  const ssrfCheck = await validateSafeMcpUrl(url);
  if (!ssrfCheck.safe) {
    return NextResponse.json(
      { error: SSRF_GENERIC_ERROR },
      { status: 400 }
    );
  }

  const encryptedToken = authToken ? encryptSecret(authToken) : null;

  const server = await db.userMCPServer.create({
    data: {
      userId: session.user.id,
      name,
      url,
      authToken: encryptedToken,
      active,
    },
  });

  return NextResponse.json({
    success: true,
    server: {
      id: server.id,
      name: server.name,
      url: server.url,
      hasAuthToken: Boolean(authToken),
      maskedAuthToken: maskSecret(authToken),
      active: server.active,
    },
  });
}
