import fs from "fs";
import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { deleteProjectAsset } from "@/lib/asset-manager";

type RouteParams = {
  params: Promise<{ id: string; assetId: string }>;
};

/**
 * GET /api/projects/[id]/assets/[assetId]
 * Serves the raw image file from disk.
 * Supports public rendering for preview, iframe, and published views.
 */
export async function GET(req: Request, { params }: RouteParams) {
  const { id: projectId, assetId } = await params;

  const asset = await db.projectAsset.findFirst({
    where: { id: assetId, projectId },
  });

  if (!asset || !fs.existsSync(asset.storedPath)) {
    return new NextResponse("Asset not found", { status: 404 });
  }

  try {
    const fileBuffer = fs.readFileSync(asset.storedPath);
    return new NextResponse(new Uint8Array(fileBuffer), {
      status: 200,
      headers: {
        "Content-Type": asset.mimeType || "image/png",
        "Content-Length": fileBuffer.length.toString(),
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error: any) {
    console.error("[Project Assets API] Serving error:", error);
    return new NextResponse("Internal server error", { status: 500 });
  }
}

/**
 * DELETE /api/projects/[id]/assets/[assetId]
 * Deletes the asset file from disk and database record.
 */
export async function DELETE(req: Request, { params }: RouteParams) {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: projectId, assetId } = await params;
  const project = await db.project.findFirst({
    where: { id: projectId, ownerId: session.user.id },
  });

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const deleted = await deleteProjectAsset(assetId, projectId);
  if (!deleted) {
    return NextResponse.json({ error: "Asset not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true, assetId });
}
