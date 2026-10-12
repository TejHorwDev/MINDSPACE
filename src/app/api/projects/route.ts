import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAuthSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { getTemplateBySlug } from "@/lib/templates/service";

const createProjectSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Please enter a project name.")
    .max(100, "Project name must be 100 characters or fewer."),
  // Optional — defaults to blank.
  templateId: z.string().trim().default("blank"),
});

export async function GET() {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const projects = await db.project.findMany({
      where: { ownerId: session.user.id },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        name: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    return NextResponse.json({ projects });
  } catch (error) {
    console.error("List projects error:", error);
    return NextResponse.json(
      { error: "Failed to load projects." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid request. Please try again." },
        { status: 400 }
      );
    }

    const parsed = createProjectSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid input." },
        { status: 400 }
      );
    }

    // Enforce Account Plan Project Limits
    const { checkCanCreateProject } = await import("@/lib/account-plans");
    const limitCheck = await checkCanCreateProject(session.user.id);
    if (!limitCheck.allowed) {
      return NextResponse.json(
        {
          error: `Project limit reached. Your ${limitCheck.planName} plan allows up to ${limitCheck.maxProjects} projects. Upgrade to Pro for more!`,
          code: "PROJECT_LIMIT_REACHED",
        },
        { status: 403 }
      );
    }

    const templateId = parsed.data.templateId;
    let templateFiles: { path: string; content: string }[] = [];

    if (templateId !== "blank") {
      const templateData = await getTemplateBySlug(templateId);
      if (templateData && templateData.files) {
        templateFiles = templateData.files;
      }
    }

    // Project + starter files + default chat session + activity entry all commit together
    const project = await db.$transaction(async (tx) => {
      const created = await tx.project.create({
        data: {
          name: parsed.data.name,
          ownerId: session.user.id,
          templateUsed: templateId,
          files: templateFiles.length
            ? {
                createMany: {
                  data: templateFiles.map((file) => ({
                    path: file.path,
                    content: file.content,
                  })),
                },
              }
            : undefined,
          chatSessions: {
            create: {
              userId: session.user.id,
              title: "Initial Chat",
            },
          },
        },
        select: {
          id: true,
          name: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      await tx.projectActivity.create({
        data: {
          projectId: created.id,
          action: "created",
          detail: created.name,
        },
      });

      return created;
    });

    return NextResponse.json({ project }, { status: 201 });
  } catch (error) {
    console.error("Create project error:", error);
    return NextResponse.json(
      { error: "Failed to create the project. Please try again." },
      { status: 500 }
    );
  }
}
