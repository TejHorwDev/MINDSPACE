import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAuthSession } from "@/lib/auth";
import { db } from "@/lib/db";

type RouteContext = {
  params: Promise<{ id: string; fileId: string }>;
};

const updateFileSchema = z
  .object({
    content: z.string().optional(),
    path: z
      .string()
      .trim()
      .min(1, "File name cannot be empty.")
      .max(255, "File path is too long.")
      .refine(
        (val) => !val.includes("..") && !val.includes("\\"),
        "File name cannot contain relative path traversals."
      )
      .optional(),
  })
  .refine(
    (data) => data.content !== undefined || data.path !== undefined,
    "Either content or path must be provided."
  );

async function getOwnedProjectAndFile(
  projectId: string,
  fileId: string,
  userId: string
) {
  const project = await db.project.findFirst({
    where: { id: projectId, ownerId: userId },
    select: { id: true, name: true },
  });

  if (!project) {
    return { project: null, file: null };
  }

  const file = await db.projectFile.findFirst({
    where: { id: fileId, projectId },
  });

  return { project, file };
}

export async function GET(_request: NextRequest, context: RouteContext) {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, fileId } = await context.params;
  const { project, file } = await getOwnedProjectAndFile(
    id,
    fileId,
    session.user.id
  );

  if (!project) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }
  if (!file) {
    return NextResponse.json({ error: "File not found." }, { status: 404 });
  }

  return NextResponse.json({ file });
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, fileId } = await context.params;
  const { project, file } = await getOwnedProjectAndFile(
    id,
    fileId,
    session.user.id
  );

  if (!project) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }
  if (!file) {
    return NextResponse.json({ error: "File not found." }, { status: 404 });
  }

  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON in request body." },
        { status: 400 }
      );
    }

    const parsed = updateFileSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid input." },
        { status: 400 }
      );
    }

    const dataToUpdate: { content?: string; path?: string } = {};

    if (parsed.data.content !== undefined) {
      dataToUpdate.content = parsed.data.content;
    }

    if (parsed.data.path !== undefined) {
      const normalizedPath = parsed.data.path.replace(/^\/+/, "").trim();
      if (!normalizedPath) {
        return NextResponse.json(
          { error: "Please provide a valid file name." },
          { status: 400 }
        );
      }

      if (normalizedPath !== file.path) {
        // Check if destination name already exists in this project
        const existing = await db.projectFile.findUnique({
          where: {
            projectId_path: {
              projectId: id,
              path: normalizedPath,
            },
          },
        });

        if (existing && existing.id !== fileId) {
          return NextResponse.json(
            { error: `A file named "${normalizedPath}" already exists.` },
            { status: 409 }
          );
        }
        dataToUpdate.path = normalizedPath;
      }
    }

    const updatedFile = await db.projectFile.update({
      where: { id: fileId },
      data: dataToUpdate,
      select: {
        id: true,
        projectId: true,
        path: true,
        content: true,
        updatedAt: true,
      },
    });

    // Touch project updatedAt
    await db.project.update({
      where: { id },
      data: { updatedAt: new Date() },
    });

    return NextResponse.json({ file: updatedFile });
  } catch (error) {
    console.error("Update project file error:", error);
    return NextResponse.json(
      { error: "Failed to update file. Please try again." },
      { status: 500 }
    );
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, fileId } = await context.params;
  const { project, file } = await getOwnedProjectAndFile(
    id,
    fileId,
    session.user.id
  );

  if (!project) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }
  if (!file) {
    return NextResponse.json({ error: "File not found." }, { status: 404 });
  }

  try {
    await db.projectFile.delete({
      where: { id: fileId },
    });

    // Touch project updatedAt
    await db.project.update({
      where: { id },
      data: { updatedAt: new Date() },
    });

    return NextResponse.json({ message: "File deleted successfully." });
  } catch (error) {
    console.error("Delete project file error:", error);
    return NextResponse.json(
      { error: "Failed to delete file. Please try again." },
      { status: 500 }
    );
  }
}
