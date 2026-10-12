import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAuthSession } from "@/lib/auth";
import { db } from "@/lib/db";

const renameProjectSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Please enter a project name.")
    .max(100, "Project name must be 100 characters or fewer."),
});

type RouteContext = { params: Promise<{ id: string }> };

async function getOwnedProject(id: string, userId: string) {
  return db.project.findFirst({
    where: { id, ownerId: userId },
    select: {
      id: true,
      name: true,
      createdAt: true,
      updatedAt: true,
    },
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

  return NextResponse.json({ project });
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;

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

    const parsed = renameProjectSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid input." },
        { status: 400 }
      );
    }

    const existing = await getOwnedProject(id, session.user.id);
    if (!existing) {
      return NextResponse.json(
        { error: "Project not found." },
        { status: 404 }
      );
    }

    const project = await db.project.update({
      where: { id },
      data: { name: parsed.data.name },
      select: {
        id: true,
        name: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Activity log entry: renamed (only when the name actually changed)
    if (existing.name !== parsed.data.name) {
      await db.projectActivity.create({
        data: {
          projectId: id,
          action: "renamed",
          detail: parsed.data.name,
        },
      });
    }

    return NextResponse.json({ project });
  } catch (error) {
    console.error("Rename project error:", error);
    return NextResponse.json(
      { error: "Failed to rename the project. Please try again." },
      { status: 500 }
    );
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;

  try {
    const existing = await getOwnedProject(id, session.user.id);
    if (!existing) {
      return NextResponse.json(
        { error: "Project not found." },
        { status: 404 }
      );
    }

    await db.project.delete({ where: { id } });

    return NextResponse.json({ message: "Project deleted." });
  } catch (error) {
    console.error("Delete project error:", error);
    return NextResponse.json(
      { error: "Failed to delete the project. Please try again." },
      { status: 500 }
    );
  }
}
