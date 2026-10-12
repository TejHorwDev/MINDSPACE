import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAuthSession } from "@/lib/auth";
import { db } from "@/lib/db";

type RouteContext = { params: Promise<{ id: string }> };

const createFileSchema = z.object({
  path: z
    .string()
    .trim()
    .min(1, "File name cannot be empty.")
    .max(255, "File path is too long.")
    .refine(
      (val) => !val.includes("..") && !val.includes("\\"),
      "File name cannot contain relative path traversals."
    ),
  content: z.string().optional().default(""),
});

async function getOwnedProject(id: string, userId: string) {
  return db.project.findFirst({
    where: { id, ownerId: userId },
    select: { id: true, name: true },
  });
}

export async function GET(_request: NextRequest, context: RouteContext) {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const project = await getOwnedProject(id, session.user.id);
  if (!project) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }

  try {
    const files = await db.projectFile.findMany({
      where: { projectId: id },
      orderBy: { path: "asc" },
      select: {
        id: true,
        projectId: true,
        path: true,
        content: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({ files });
  } catch (error) {
    console.error("List project files error:", error);
    return NextResponse.json(
      { error: "Failed to load project files." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const project = await getOwnedProject(id, session.user.id);
  if (!project) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
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

    const parsed = createFileSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid input." },
        { status: 400 }
      );
    }

    // Normalize path: strip leading slashes and trim
    const normalizedPath = parsed.data.path.replace(/^\/+/, "").trim();
    if (!normalizedPath) {
      return NextResponse.json(
        { error: "Please provide a valid file name." },
        { status: 400 }
      );
    }

    // Check for duplicate path in this project
    const existing = await db.projectFile.findUnique({
      where: {
        projectId_path: {
          projectId: id,
          path: normalizedPath,
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: `A file named "${normalizedPath}" already exists.` },
        { status: 409 }
      );
    }

    // Check account plan storage quota
    const { checkStorageQuota } = await import("@/lib/account-plans");
    const addedBytes = Buffer.byteLength(parsed.data.content, "utf8");
    const quotaCheck = await checkStorageQuota(session.user.id, addedBytes);
    if (!quotaCheck.allowed) {
      return NextResponse.json(
        {
          error: `Storage quota exceeded. Your ${quotaCheck.planName} plan allows up to ${quotaCheck.maxStorageMB}MB of storage. Upgrade to Pro for more!`,
          code: "STORAGE_LIMIT_EXCEEDED",
        },
        { status: 403 }
      );
    }

    const file = await db.projectFile.create({
      data: {
        projectId: id,
        path: normalizedPath,
        content: parsed.data.content,
      },
      select: {
        id: true,
        projectId: true,
        path: true,
        content: true,
        updatedAt: true,
      },
    });

    // Update project timestamp
    await db.project.update({
      where: { id },
      data: { updatedAt: new Date() },
    });

    return NextResponse.json({ file }, { status: 201 });
  } catch (error) {
    console.error("Create project file error:", error);
    return NextResponse.json(
      { error: "Failed to create file. Please try again." },
      { status: 500 }
    );
  }
}
