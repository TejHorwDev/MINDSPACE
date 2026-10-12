// src/lib/asset-manager.ts
import fs from "fs";
import path from "path";
import crypto from "crypto";
import sharp from "sharp";
import { db } from "@/lib/db";

export const MAX_UPLOAD_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

export interface ProcessedAsset {
  buffer: Buffer;
  mimeType: string;
  ext: string;
  sizeBytes: number;
  width?: number;
  height?: number;
}

/**
 * Returns absolute directory path on disk for project uploads.
 */
export function getProjectUploadsDir(projectId: string): string {
  const dir = path.join(process.cwd(), "data", "uploads", projectId);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

/**
 * Sanitizes uploaded filename to prevent directory traversal and special character attacks.
 */
export function sanitizeFilename(rawName: string): string {
  const parsed = path.parse(rawName);
  const cleanBase = parsed.name
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "asset";
  const ext = parsed.ext.toLowerCase().replace(/[^a-z0-9.]/g, "") || ".png";
  return `${cleanBase}${ext}`;
}

/**
 * Validates real magic bytes of image buffers.
 * Rejects disguised executables, scripts, or non-image payloads.
 */
export function validateImageMagicBytes(buffer: Buffer): { isValid: boolean; format: string; mimeType: string } {
  if (!buffer || buffer.length < 4) {
    return { isValid: false, format: "", mimeType: "" };
  }

  // 1. PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return { isValid: true, format: "png", mimeType: "image/png" };
  }

  // 2. JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { isValid: true, format: "jpeg", mimeType: "image/jpeg" };
  }

  // 3. GIF: 47 49 46 38 (GIF8)
  if (
    buffer[0] === 0x47 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x38
  ) {
    return { isValid: true, format: "gif", mimeType: "image/gif" };
  }

  // 4. WebP: RIFF .... WEBP
  if (
    buffer.length >= 12 &&
    buffer.toString("ascii", 0, 4) === "RIFF" &&
    buffer.toString("ascii", 8, 12) === "WEBP"
  ) {
    return { isValid: true, format: "webp", mimeType: "image/webp" };
  }

  // 5. SVG: Text check containing <svg (safe non-executable)
  const headerText = buffer.slice(0, 1024).toString("utf-8").toLowerCase();
  if (headerText.includes("<svg") && !headerText.includes("<script") && !headerText.includes("javascript:")) {
    return { isValid: true, format: "svg", mimeType: "image/svg+xml" };
  }

  return { isValid: false, format: "", mimeType: "" };
}

/**
 * Processes image buffer with Sharp:
 * - Auto-orients image
 * - Strips all EXIF metadata for student privacy
 * - Resizes if dimensions exceed 2048px
 * - Re-encodes cleanly
 */
export async function processImageForStorage(
  rawBuffer: Buffer,
  detectedFormat: string
): Promise<ProcessedAsset> {
  if (detectedFormat === "svg") {
    return {
      buffer: rawBuffer,
      mimeType: "image/svg+xml",
      ext: ".svg",
      sizeBytes: rawBuffer.length,
    };
  }

  const image = sharp(rawBuffer);
  const metadata = await image.metadata();

  let transform = image.rotate(); // Auto-rotate by EXIF orientation tag then strip EXIF

  const maxWidth = 2048;
  const maxHeight = 2048;
  if ((metadata.width && metadata.width > maxWidth) || (metadata.height && metadata.height > maxHeight)) {
    transform = transform.resize({
      width: maxWidth,
      height: maxHeight,
      fit: "inside",
      withoutEnlargement: true,
    });
  }

  let finalBuffer: Buffer;
  let mimeType: string;
  let ext: string;

  if (detectedFormat === "jpeg" || detectedFormat === "jpg") {
    finalBuffer = await transform.jpeg({ quality: 85, mozjpeg: true }).toBuffer();
    mimeType = "image/jpeg";
    ext = ".jpg";
  } else if (detectedFormat === "png") {
    finalBuffer = await transform.png({ compressionLevel: 8 }).toBuffer();
    mimeType = "image/png";
    ext = ".png";
  } else if (detectedFormat === "webp") {
    finalBuffer = await transform.webp({ quality: 85 }).toBuffer();
    mimeType = "image/webp";
    ext = ".webp";
  } else if (detectedFormat === "gif") {
    finalBuffer = await transform.gif().toBuffer();
    mimeType = "image/gif";
    ext = ".gif";
  } else {
    // Default fallback to WebP for modern efficiency
    finalBuffer = await transform.webp({ quality: 85 }).toBuffer();
    mimeType = "image/webp";
    ext = ".webp";
  }

  const finalMeta = await sharp(finalBuffer).metadata();

  return {
    buffer: finalBuffer,
    mimeType,
    ext,
    sizeBytes: finalBuffer.length,
    width: finalMeta.width,
    height: finalMeta.height,
  };
}

/**
 * Checks storage quota against the student's AccountPlan.maxStorageMB limit.
 */
export async function checkUserStorageQuota(
  userId: string,
  additionalBytes: number
): Promise<{ allowed: boolean; currentStorageMB: number; maxStorageMB: number; error?: string }> {
  const user = await db.user.findUnique({
    where: { id: userId },
    include: {
      accountPlan: true,
      projects: {
        select: { id: true },
      },
    },
  });

  if (!user) {
    return { allowed: false, currentStorageMB: 0, maxStorageMB: 50, error: "User not found" };
  }

  const projectIds = user.projects.map((p) => p.id);
  const totalAssets = await db.projectAsset.aggregate({
    where: { projectId: { in: projectIds } },
    _sum: { sizeBytes: true },
  });

  const existingBytes = totalAssets._sum.sizeBytes || 0;
  const currentStorageMB = existingBytes / (1024 * 1024);
  const maxStorageMB = user.accountPlan?.maxStorageMB || 50;

  const projectedMB = (existingBytes + additionalBytes) / (1024 * 1024);

  if (projectedMB > maxStorageMB) {
    return {
      allowed: false,
      currentStorageMB: Number(currentStorageMB.toFixed(2)),
      maxStorageMB,
      error: `Storage quota exceeded (${currentStorageMB.toFixed(1)} MB of ${maxStorageMB} MB used). Upgrade plan to upload more images.`,
    };
  }

  return {
    allowed: true,
    currentStorageMB: Number(currentStorageMB.toFixed(2)),
    maxStorageMB,
  };
}

/**
 * Stores asset on disk and inserts record in db.projectAsset.
 */
export async function saveProjectAsset(
  projectId: string,
  filename: string,
  processed: ProcessedAsset
) {
  const assetId = `ast_${crypto.randomBytes(8).toString("hex")}`;
  const uploadsDir = getProjectUploadsDir(projectId);
  const diskFilename = `${assetId}${processed.ext}`;
  const storedPath = path.join(uploadsDir, diskFilename);

  fs.writeFileSync(storedPath, processed.buffer);

  const asset = await db.projectAsset.create({
    data: {
      id: assetId,
      projectId,
      filename,
      storedPath,
      mimeType: processed.mimeType,
      sizeBytes: processed.sizeBytes,
      width: processed.width,
      height: processed.height,
    },
  });

  return {
    ...asset,
    url: `/api/projects/${projectId}/assets/${asset.id}`,
    relativePath: `assets/${asset.filename}`,
  };
}

/**
 * Deletes asset file from disk and deletes DB record.
 */
export async function deleteProjectAsset(assetId: string, projectId: string) {
  const asset = await db.projectAsset.findFirst({
    where: { id: assetId, projectId },
  });

  if (!asset) return null;

  if (fs.existsSync(asset.storedPath)) {
    try {
      fs.unlinkSync(asset.storedPath);
    } catch (err) {
      console.warn(`[Asset Manager] Failed to unlink file at ${asset.storedPath}:`, err);
    }
  }

  await db.projectAsset.delete({
    where: { id: assetId },
  });

  return asset;
}
