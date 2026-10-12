import fs from "fs";
import path from "path";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { escapeHtml } from "@/lib/sanitize";
import {
  PUBLISH_DURATION_MS,
  renderExpiredHtml,
  renderNotFoundHtml,
  deletePublishedFiles,
  getPublishedFolderPath,
  preparePublishedHtml,
} from "@/lib/publish-manager";

type RouteParams = {
  params: Promise<{ slug: string }>;
};

/**
 * GET /p/[slug]
 * Serves the published project or the clean expired page.
 */
export async function GET(req: Request, { params }: RouteParams) {
  const { slug } = await params;

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

  // If expired, clean up files and show friendly expired page (HTTP 200, never a broken 404)
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

  // Project is live and published!
  const indexPath = path.join(getPublishedFolderPath(slug), "index.html");

  if (fs.existsSync(indexPath)) {
    const html = fs.readFileSync(indexPath, "utf-8");
    return new NextResponse(preparePublishedHtml(html, slug), {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    });
  }

  // Fallback: if file was temporarily removed, read index.html from ProjectFiles
  const indexFile = project.files.find((f) => f.path === "index.html") || project.files[0];
  const fallbackHtml = indexFile?.content || `<h1>${escapeHtml(project.name)}</h1>`;

  return new NextResponse(preparePublishedHtml(fallbackHtml, slug), {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-cache, no-store, must-revalidate",
    },
  });
}
