import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  MAX_UPLOAD_SIZE_BYTES,
  validateImageMagicBytes,
  processImageForStorage,
  checkUserStorageQuota,
  saveProjectAsset,
  sanitizeFilename,
} from "@/lib/asset-manager";

type RouteParams = {
  params: Promise<{ id: string }>;
};

/**
 * GET /api/projects/[id]/assets
 * Lists all assets for this project with storage quota information.
 */
export async function GET(req: Request, { params }: RouteParams) {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: projectId } = await params;
  const project = await db.project.findFirst({
    where: { id: projectId, ownerId: session.user.id },
  });

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const assets = await db.projectAsset.findMany({
    where: { projectId },
    orderBy: { createdAt: "desc" },
  });

  const quota = await checkUserStorageQuota(session.user.id, 0);

  const formatted = assets.map((a) => ({
    ...a,
    url: `/api/projects/${projectId}/assets/${a.id}`,
    relativePath: `assets/${a.filename}`,
  }));

  return NextResponse.json({
    assets: formatted,
    quota: {
      currentStorageMB: quota.currentStorageMB,
      maxStorageMB: quota.maxStorageMB,
    },
  });
}

/**
 * POST /api/projects/[id]/assets
 * Uploads an image asset (supports multipart/form-data or JSON dataUrl).
 * Validates magic bytes, auto-resizes, strips EXIF, sanitizes filename, and checks storage limit.
 */
export async function POST(req: Request, { params }: RouteParams) {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: projectId } = await params;
  const project = await db.project.findFirst({
    where: { id: projectId, ownerId: session.user.id },
  });

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  try {
    let rawBuffer: Buffer;
    let originalName: string = "image.png";

    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file") as File | null;
      if (!file) {
        return NextResponse.json({ error: "No image file provided." }, { status: 400 });
      }

      if (file.size > MAX_UPLOAD_SIZE_BYTES) {
        return NextResponse.json(
          { error: `File too large. Maximum image size is 5MB (got ${(file.size / (1024 * 1024)).toFixed(1)}MB).` },
          { status: 400 }
        );
      }

      originalName = file.name || "image.png";
      const arrayBuffer = await file.arrayBuffer();
      rawBuffer = Buffer.from(arrayBuffer);
    } else {
      // JSON body with base64 dataUrl (from inline preview upload)
      const body = await req.json();
      if (!body?.dataUrl) {
        return NextResponse.json({ error: "Missing image dataUrl." }, { status: 400 });
      }

      originalName = body.filename || "image.png";
      const dataUrl = String(body.dataUrl);
      const matches = dataUrl.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);

      if (!matches || matches.length !== 3) {
        return NextResponse.json({ error: "Invalid dataUrl format." }, { status: 400 });
      }

      rawBuffer = Buffer.from(matches[2], "base64");
      if (rawBuffer.length > MAX_UPLOAD_SIZE_BYTES) {
        return NextResponse.json(
          { error: `Image too large. Maximum size is 5MB.` },
          { status: 400 }
        );
      }
    }

    // 1. Validate real image content (magic bytes)
    const magic = validateImageMagicBytes(rawBuffer);
    if (!magic.isValid) {
      return NextResponse.json(
        { error: "Invalid or unsupported image file. Only JPG, PNG, WebP, GIF, and SVG are accepted." },
        { status: 400 }
      );
    }

    // 2. Check storage quota against AccountPlan
    const quotaCheck = await checkUserStorageQuota(session.user.id, rawBuffer.length);
    if (!quotaCheck.allowed) {
      return NextResponse.json({ error: quotaCheck.error }, { status: 403 });
    }

    // 3. Process image with Sharp (strip EXIF, auto-resize if oversized)
    const processed = await processImageForStorage(rawBuffer, magic.format);

    // 4. Sanitize filename
    const cleanFilename = sanitizeFilename(originalName);

    // 5. Save to disk and database asset record
    const saved = await saveProjectAsset(projectId, cleanFilename, processed);

    // 6. Automatically create or update as a project file in the project directory
    const dataUrl = `data:${processed.mimeType};base64,${processed.buffer.toString("base64")}`;
    const existingFile = await db.projectFile.findFirst({
      where: { projectId, path: cleanFilename },
    });

    let projectFile;
    if (existingFile) {
      projectFile = await db.projectFile.update({
        where: { id: existingFile.id },
        data: { content: dataUrl },
      });
    } else {
      projectFile = await db.projectFile.create({
        data: {
          projectId,
          path: cleanFilename,
          content: dataUrl,
        },
      });
    }

    return NextResponse.json(
      {
        asset: {
          ...saved,
          filename: cleanFilename,
          dataUrl,
          projectFile,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("[Project Assets API] Upload error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to process image upload." },
      { status: 500 }
    );
  }
}
