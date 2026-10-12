import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { stripMindspaceIds } from "@/lib/visual-edit-engine";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const archiverPkg = require("archiver");

function createZipArchive(options?: any) {
  if (typeof archiverPkg === "function") {
    return archiverPkg("zip", options);
  }
  if (archiverPkg?.default && typeof archiverPkg.default === "function") {
    return archiverPkg.default("zip", options);
  }
  if (archiverPkg?.ZipArchive) {
    return new archiverPkg.ZipArchive(options);
  }
  if (archiverPkg?.Archiver) {
    return new archiverPkg.Archiver("zip", options);
  }
  throw new Error("Unable to initialize zip archiver");
}

type RouteParams = {
  params: Promise<{ id: string }>;
};

/**
 * GET /api/projects/[id]/download
 * Generates and downloads a .zip archive of all project files, preserving structure.
 */
export async function GET(req: Request, { params }: RouteParams) {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const project = await db.project.findFirst({
    where: { id, ownerId: session.user.id },
    include: {
      files: {
        orderBy: { path: "asc" },
      },
      assets: {
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  try {
    const archive = createZipArchive({ zlib: { level: 9 } });
    const chunks: Buffer[] = [];

    archive.on("data", (chunk: Buffer) => {
      chunks.push(chunk);
    });

    const zipPromise = new Promise<Buffer>((resolve, reject) => {
      archive.on("end", () => resolve(Buffer.concat(chunks)));
      archive.on("error", (err: any) => reject(err));
    });

    // Add each project file preserving its path (sanitizing visual edit IDs from HTML)
    for (const file of project.files) {
      if (
        typeof file.content === "string" &&
        file.content.startsWith("data:") &&
        file.content.includes(";base64,")
      ) {
        const base64Data = file.content.split(";base64,")[1];
        archive.append(Buffer.from(base64Data, "base64"), { name: file.path });
      } else {
        const isHtml = file.path.endsWith(".html") || file.path.endsWith(".htm");
        const cleanContent = isHtml ? stripMindspaceIds(file.content) : file.content;
        archive.append(cleanContent, { name: file.path });
      }
    }

    // Add all uploaded image assets into root, assets/ and alias path
    const fs = await import("fs");
    for (const asset of project.assets) {
      if (fs.existsSync(asset.storedPath)) {
        const assetBuffer = fs.readFileSync(asset.storedPath);
        archive.append(assetBuffer, { name: asset.filename });
        archive.append(assetBuffer, { name: `assets/${asset.filename}` });
        archive.append(assetBuffer, { name: `api/projects/${project.id}/assets/${asset.id}` });
      }
    }

    // Fallback if no files exist yet
    if (project.files.length === 0 && project.assets.length === 0) {
      archive.append(
        `# ${project.name}\n\nEmpty project started on MINDSPACE.\nCreated at: ${project.createdAt.toISOString()}\n`,
        { name: "README.md" }
      );
    }

    await archive.finalize();
    const zipBuffer = await zipPromise;

    const safeName =
      project.name
        .toLowerCase()
        .replace(/[^a-z0-9_-]+/g, "-")
        .replace(/^-+|-+$/g, "") || "project";

    return new NextResponse(new Uint8Array(zipBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${safeName}.zip"`,
        "Content-Length": zipBuffer.length.toString(),
        "Cache-Control": "no-cache",
      },
    });
  } catch (error: any) {
    console.error("ZIP download error:", error);
    return NextResponse.json(
      { error: "Failed to generate project archive" },
      { status: 500 }
    );
  }
}
