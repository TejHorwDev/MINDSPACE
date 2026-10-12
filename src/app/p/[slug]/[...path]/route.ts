import fs from "fs";
import path from "path";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  PUBLISH_DURATION_MS,
  renderExpiredHtml,
  renderNotFoundHtml,
  deletePublishedFiles,
  getPublishedFolderPath,
  preparePublishedHtml,
} from "@/lib/publish-manager";

type RouteParams = {
  params: Promise<{ slug: string; path: string[] }>;
};

function getMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case ".html":
    case ".htm":
      return "text/html; charset=utf-8";
    case ".css":
      return "text/css; charset=utf-8";
    case ".js":
    case ".mjs":
      return "application/javascript; charset=utf-8";
    case ".json":
      return "application/json; charset=utf-8";
    case ".svg":
      return "image/svg+xml";
    case ".png":
      return "image/png";
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".gif":
      return "image/gif";
    case ".webp":
      return "image/webp";
    case ".ico":
      return "image/x-icon";
    case ".woff":
      return "font/woff";
    case ".woff2":
      return "font/woff2";
    case ".ttf":
      return "font/ttf";
    default:
      return "text/plain; charset=utf-8";
  }
}

/**
 * GET /p/[slug]/[...path]
 * Serves static sub-assets (CSS, JS, sub-pages) for a published site or the expired notice.
 */
export async function GET(req: Request, { params }: RouteParams) {
  const { slug, path: subPathSegments } = await params;
  const subPath = subPathSegments.join("/");

  const project = await db.project.findUnique({
    where: { publicSlug: slug },
    include: { files: true },
  });

  if (!project) {
    return new NextResponse(renderNotFoundHtml(slug), {
      status: 404,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  const now = Date.now();
  const publishedAtMs = project.publishedAt ? new Date(project.publishedAt).getTime() : 0;
  const isExpired =
    !project.isPublished || !project.publishedAt || now - publishedAtMs >= PUBLISH_DURATION_MS;

  if (isExpired) {
    if (project.isPublished) {
      deletePublishedFiles(slug);
      await db.project.update({
        where: { id: project.id },
        data: { isPublished: false },
      });
    }

    return new NextResponse(renderExpiredHtml(project.name, slug), {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    });
  }

  // 1. Look for static file on disk
  const targetDiskPath = path.join(getPublishedFolderPath(slug), subPath);
  if (fs.existsSync(targetDiskPath) && fs.statSync(targetDiskPath).isFile()) {
    const isHtml = subPath.endsWith(".html") || subPath.endsWith(".htm");
    const raw = fs.readFileSync(targetDiskPath);
    const body = isHtml ? preparePublishedHtml(raw.toString("utf-8"), slug) : raw;
    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": getMimeType(subPath),
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    });
  }

  // 2. Look for disk aliases (e.g. style.css <-> styles.css, script.js <-> main.js)
  const diskFolder = getPublishedFolderPath(slug);
  const diskSubBasename = path.basename(subPath);
  let diskAliasPath: string | null = null;
  if (diskSubBasename === "styles.css") diskAliasPath = path.join(diskFolder, "style.css");
  else if (diskSubBasename === "style.css") diskAliasPath = path.join(diskFolder, "styles.css");
  else if (diskSubBasename === "script.js") diskAliasPath = path.join(diskFolder, "main.js");
  else if (diskSubBasename === "main.js") diskAliasPath = path.join(diskFolder, "script.js");

  if (diskAliasPath && fs.existsSync(diskAliasPath) && fs.statSync(diskAliasPath).isFile()) {
    const raw = fs.readFileSync(diskAliasPath);
    return new NextResponse(raw, {
      status: 200,
      headers: {
        "Content-Type": getMimeType(subPath),
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    });
  }

  // 3. Fallback: search in project files (exact, basename, or alias)
  const cleanSub = subPath.replace(/^\/+/, "");
  let matchedProjectFile = project.files.find(
    (f) => f.path.replace(/^\/+/, "") === cleanSub
  );

  if (!matchedProjectFile) {
    matchedProjectFile = project.files.find(
      (f) => path.basename(f.path) === diskSubBasename
    );
  }

  if (!matchedProjectFile && cleanSub.endsWith(".css")) {
    matchedProjectFile = project.files.find((f) => f.path.endsWith(".css"));
  }

  if (!matchedProjectFile && cleanSub.endsWith(".js")) {
    matchedProjectFile = project.files.find((f) => f.path.endsWith(".js"));
  }

  if (matchedProjectFile) {
    const isHtml = matchedProjectFile.path.endsWith(".html") || matchedProjectFile.path.endsWith(".htm");
    if (isHtml) {
      const body = preparePublishedHtml(matchedProjectFile.content, slug);
      return new NextResponse(body, {
        status: 200,
        headers: {
          "Content-Type": getMimeType(matchedProjectFile.path),
          "Cache-Control": "no-cache, no-store, must-revalidate",
        },
      });
    }

    if (
      typeof matchedProjectFile.content === "string" &&
      matchedProjectFile.content.startsWith("data:") &&
      matchedProjectFile.content.includes(";base64,")
    ) {
      const base64Data = matchedProjectFile.content.split(";base64,")[1];
      const buffer = Buffer.from(base64Data, "base64");
      return new NextResponse(new Uint8Array(buffer), {
        status: 200,
        headers: {
          "Content-Type": getMimeType(matchedProjectFile.path),
          "Cache-Control": "no-cache, no-store, must-revalidate",
        },
      });
    }

    return new NextResponse(matchedProjectFile.content, {
      status: 200,
      headers: {
        "Content-Type": getMimeType(matchedProjectFile.path),
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    });
  }

  return new NextResponse("File not found in published project", {
    status: 404,
    headers: { "Content-Type": "text/plain" },
  });
}
