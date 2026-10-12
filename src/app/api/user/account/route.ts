import { NextRequest, NextResponse } from "next/server";
import { compare } from "bcryptjs";
import { getAuthSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { deletePublishedFiles } from "@/lib/publish-manager";

export async function DELETE(req: NextRequest) {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  let body: { password?: string; confirmation?: string } = {};
  try {
    body = await req.json();
  } catch {
    // Empty body is handled below
  }

  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      passwordHash: true,
    },
  });

  if (!user) {
    return NextResponse.json({ error: "User account not found." }, { status: 404 });
  }

  const typedConfirmation = (body.confirmation || "").trim();
  const enteredPassword = (body.password || "").trim();

  // Validate confirmation
  if (user.passwordHash) {
    // For password-based accounts, require either correct password OR typed DELETE confirmation
    if (enteredPassword) {
      const isValid = await compare(enteredPassword, user.passwordHash);
      if (!isValid) {
        return NextResponse.json(
          { error: "Incorrect password. Please enter your valid password to confirm deletion." },
          { status: 400 }
        );
      }
    } else if (typedConfirmation === "DELETE") {
      // Confirmed with typed DELETE
    } else {
      return NextResponse.json(
        { error: "Please re-enter your account password or type DELETE to confirm deletion." },
        { status: 400 }
      );
    }
  } else {
    // For OAuth accounts without a password, require typed DELETE
    if (typedConfirmation !== "DELETE") {
      return NextResponse.json(
        { error: "Please type DELETE in all uppercase to confirm account deletion." },
        { status: 400 }
      );
    }
  }

  try {
    // 1. Delete all static published folders on disk
    const projects = await db.project.findMany({
      where: { ownerId: userId },
      select: { publicSlug: true },
    });

    for (const project of projects) {
      if (project.publicSlug) {
        deletePublishedFiles(project.publicSlug);
      }
    }

    // 2. Delete user record (cascades to Project, ProjectFile, AiChatMessage, UserSettings, CreditTransaction)
    await db.user.delete({
      where: { id: userId },
    });

    return NextResponse.json({
      success: true,
      message: "Your account and all associated projects and settings have been permanently deleted.",
    });
  } catch (err: any) {
    console.error("Account deletion failed:", err);
    return NextResponse.json(
      { error: "Failed to delete account. Please try again or contact support." },
      { status: 500 }
    );
  }
}
