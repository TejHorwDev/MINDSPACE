import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAdminSession } from "@/lib/admin";
import { db } from "@/lib/db";

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

const developerSchema = z.object({
  name: z.string().trim().min(1).max(80),
  slug: z
    .string()
    .trim()
    .min(1)
    .max(80)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase words joined by dashes."),
  role: z.string().trim().min(1).max(60),
  bio: z.string().trim().min(1).max(2000),
  photoUrl: photoUrlSchema,
  socialLinks: socialLinksSchema,
  order: z.number().int().min(0).default(0),
});

const slugify = (name: string) =>
  name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

export async function GET() {
  const { status, session } = await getAdminSession();
  if (!session) {
    return NextResponse.json(
      { error: status === 401 ? "Unauthorized" : "Admin access required." },
      { status }
    );
  }

  const developers = await db.developer.findMany({
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
  });

  return NextResponse.json({ developers });
}

export async function POST(request: NextRequest) {
  const { status, session } = await getAdminSession();
  if (!session) {
    return NextResponse.json(
      { error: status === 401 ? "Unauthorized" : "Admin access required." },
      { status }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  // Auto-generate the slug from the name when not supplied.
  const candidate =
    body && typeof body === "object" && !Array.isArray(body)
      ? { ...(body as Record<string, unknown>), slug: typeof (body as { slug?: unknown }).slug === "string" ? (body as { slug: string }).slug : slugify(typeof (body as { name?: unknown }).name === "string" ? (body as { name: string }).name : "") }
      : body;

  const parsed = developerSchema.safeParse(candidate);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid data." },
      { status: 400 }
    );
  }

  const { photoUrl, ...data } = parsed.data;

  try {
    const developer = await db.developer.create({
      data: {
        ...data,
        photoUrl: photoUrl || null,
        socialLinks: data.socialLinks,
      },
    });
    return NextResponse.json({ developer }, { status: 201 });
  } catch (error) {
    console.error("Admin create developer error:", error);
    return NextResponse.json(
      { error: "Could not create this developer — the slug may already exist." },
      { status: 500 }
    );
  }
}
