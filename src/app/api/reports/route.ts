import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { sanitizePlainText } from "@/lib/sanitize";

const reportSchema = z.object({
  slug: z.string().trim().min(1, "Project slug is required"),
  reason: z.string().trim().min(1, "Reason is required").max(100),
  details: z.string().trim().max(1000).optional(),
});

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = reportSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid input" },
      { status: 400 }
    );
  }

  const { slug, reason, details } = parsed.data;

  const project = await db.project.findFirst({
    where: { publicSlug: slug },
    select: { id: true },
  });

  if (!project) {
    return NextResponse.json(
      { error: "Published project not found." },
      { status: 404 }
    );
  }

  const cleanDetails = details ? sanitizePlainText(details) : null;
  const cleanReason = sanitizePlainText(reason);

  const report = await db.report.create({
    data: {
      projectId: project.id,
      reason: cleanReason,
      details: cleanDetails,
      status: "pending",
    },
  });

  return NextResponse.json({
    success: true,
    message: "Thank you. Your report has been submitted to the MINDSPACE security team for review.",
    reportId: report.id,
  });
}
