import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import { db } from "@/lib/db";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: NextRequest, context: RouteContext) {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: projectId } = await context.params;

  const project = await db.project.findFirst({
    where: { id: projectId, ownerId: session.user.id },
    include: { files: true },
  });

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  let body: any = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const action = body.action as "create" | "rename" | "delete" | "move";

  if (action === "create") {
    const rawPath = (body.folderPath || "").replace(/^\/+|\/+$/g, "").trim();
    if (!rawPath) {
      return NextResponse.json({ error: "Folder path is required" }, { status: 400 });
    }

    const placeholderPath = `${rawPath}/.gitkeep`;
    const existing = project.files.find((f) => f.path === placeholderPath);
    if (existing) {
      return NextResponse.json({ file: existing, folderPath: rawPath });
    }

    const created = await db.projectFile.create({
      data: {
        projectId,
        path: placeholderPath,
        content: "",
      },
    });

    return NextResponse.json({ file: created, folderPath: rawPath });
  }

  if (action === "rename") {
    const oldPath = (body.oldPath || "").replace(/^\/+|\/+$/g, "").trim();
    const newPath = (body.newPath || "").replace(/^\/+|\/+$/g, "").trim();

    if (!oldPath || !newPath) {
      return NextResponse.json({ error: "Old and new folder paths required" }, { status: 400 });
    }

    const matchingFiles = project.files.filter(
      (f) => f.path === oldPath || f.path.startsWith(`${oldPath}/`)
    );

    if (matchingFiles.length === 0) {
      return NextResponse.json({ error: "Folder not found" }, { status: 404 });
    }

    const updatedFiles: any[] = [];
    for (const f of matchingFiles) {
      const remainder = f.path.slice(oldPath.length);
      const targetPath = `${newPath}${remainder}`;
      const updated = await db.projectFile.update({
        where: { id: f.id },
        data: { path: targetPath },
      });
      updatedFiles.push(updated);
    }

    return NextResponse.json({ success: true, updatedFiles });
  }

  if (action === "delete") {
    const folderPath = (body.folderPath || "").replace(/^\/+|\/+$/g, "").trim();
    if (!folderPath) {
      return NextResponse.json({ error: "Folder path required" }, { status: 400 });
    }

    const matchingFiles = project.files.filter(
      (f) => f.path === folderPath || f.path.startsWith(`${folderPath}/`)
    );

    const deletedIds = matchingFiles.map((f) => f.id);
    if (deletedIds.length > 0) {
      await db.projectFile.deleteMany({
        where: { id: { in: deletedIds } },
      });
    }

    return NextResponse.json({ success: true, deletedIds });
  }

  if (action === "move") {
    const sourcePath = (body.sourcePath || "").replace(/^\/+|\/+$/g, "").trim();
    const destFolder = (body.destinationFolder || "").replace(/^\/+|\/+$/g, "").trim();

    // Source can be a file or a folder
    const sourceFile = project.files.find((f) => f.path === sourcePath);
    if (sourceFile) {
      const fileName = sourcePath.split("/").pop()!;
      const newPath = destFolder ? `${destFolder}/${fileName}` : fileName;
      const updated = await db.projectFile.update({
        where: { id: sourceFile.id },
        data: { path: newPath },
      });
      return NextResponse.json({ success: true, updatedFiles: [updated] });
    }

    // Move folder
    const folderFiles = project.files.filter((f) => f.path.startsWith(`${sourcePath}/`));
    const folderBaseName = sourcePath.split("/").pop()!;
    const updatedFiles: any[] = [];

    for (const f of folderFiles) {
      const relative = f.path.slice(sourcePath.length + 1);
      const newPath = destFolder
        ? `${destFolder}/${folderBaseName}/${relative}`
        : `${folderBaseName}/${relative}`;
      const updated = await db.projectFile.update({
        where: { id: f.id },
        data: { path: newPath },
      });
      updatedFiles.push(updated);
    }

    return NextResponse.json({ success: true, updatedFiles });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
