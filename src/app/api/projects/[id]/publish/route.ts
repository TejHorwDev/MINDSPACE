import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  publishProject,
  PUBLISH_DURATION_MS,
  cleanupExpiredProjects,
} from "@/lib/publish-manager";

type RouteParams = {
  params: Promise<{ id: string }>;
};

/**
 * GET /api/projects/[id]/publish
 * Returns the current publication status and remaining time for the project.
 */
export async function GET(req: Request, { params }: RouteParams) {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  // Run cleanup check in case expiration threshold was reached
  await cleanupExpiredProjects();

  const project = await db.project.findFirst({
    where: { id, ownerId: session.user.id },
    select: {
      id: true,
      name: true,
      isPublished: true,
      publicSlug: true,
      publishedAt: true,
    },
  });

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const now = Date.now();
  const publishedAtMs = project.publishedAt ? new Date(project.publishedAt).getTime() : 0;
  const expiresAtMs = publishedAtMs + PUBLISH_DURATION_MS;
  const isExpired = !project.isPublished || !project.publishedAt || now >= expiresAtMs;
  const msRemaining = Math.max(0, expiresAtMs - now);
  const minutesRemaining = Math.ceil(msRemaining / (60 * 1000));

  return NextResponse.json({
    isPublished: project.isPublished && !isExpired,
    publicSlug: project.publicSlug,
    publishedAt: project.publishedAt,
    expiresAt: project.publishedAt ? new Date(expiresAtMs).toISOString() : null,
    isExpired,
    msRemaining,
    minutesRemaining,
    publicUrl: project.publicSlug ? `/p/${project.publicSlug}` : null,
  });
}

/**
 * POST /api/projects/[id]/publish
 * Publishes or republishes the project for 30 minutes.
 */
export async function POST(req: Request, { params }: RouteParams) {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    let body: any = null;
    try {
      body = await req.json();
    } catch {
      // Body is optional
    }

    const result = await publishProject(id, session.user.id, body?.files);
    return NextResponse.json({
      success: true,
      message: "Project published for 30 minutes",
      ...result,
    });
  } catch (error: any) {
    console.error("Publish project error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to publish project" },
      { status: 500 }
    );
  }
}
