import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAdminSession } from "@/lib/admin";
import { db } from "@/lib/db";

type RouteContext = { params: Promise<{ id: string }> };

const socialLinksSchema = z
  .object({
    github: z.string().url().optional(),
    linkedin: z.string().url().optional(),
    instagram: z.string().url().optional(),
    twitter: z.string().url().optional(),
    website: z.string().url().optional(),
  })
  .refine(
    (links) => Object.values(links).some((value) => value && value.length > 0),
    { message: "At least one social link is required." }
  );

const photoUrlSchema = z
  .string()
  .max(2000)
  .optional()
  .refine(
    (val) => !val || val === "" || val.startsWith("/") || /^https?:\/\//i.test(val),
    { message: "Must be a valid URL or uploaded image path." }
  )
  .or(z.literal(""));

const updateSchema = z.object({
  name: z.string().trim().min(1).max(80),
  role: z.string().trim().min(1).max(60),
  bio: z.string().trim().min(1).max(2000),
  photoUrl: photoUrlSchema,
  socialLinks: socialLinksSchema,
  order: z.number().int().min(0).optional(),
});

export async function PATCH(request: NextRequest, context: RouteContext) {
  const { status, session } = await getAdminSession();
  if (!session) {
    return NextResponse.json(
      { error: status === 401 ? "Unauthorized" : "Admin access required." },
      { status }
    );
  }

  const { id } = await context.params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid data." },
      { status: 400 }
    );
  }

  const { photoUrl, ...data } = parsed.data;

  try {
    const developer = await db.developer.update({
      where: { id },
      data: {
        ...data,
        photoUrl: photoUrl || null,
        socialLinks: data.socialLinks,
      },
    });
    return NextResponse.json({ developer });
  } catch (error) {
    console.error("Admin update developer error:", error);
    return NextResponse.json(
      { error: "Developer not found or update failed." },
      { status: 500 }
    );
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  const { status, session } = await getAdminSession();
  if (!session) {
    return NextResponse.json(
      { error: status === 401 ? "Unauthorized" : "Admin access required." },
      { status }
    );
  }

  const { id } = await context.params;

  try {
    await db.developer.delete({ where: { id } });
    return NextResponse.json({ message: "Developer deleted." });
  } catch (error) {
    console.error("Admin delete developer error:", error);
    return NextResponse.json(
      { error: "Developer not found or delete failed." },
      { status: 500 }
    );
  }
}
