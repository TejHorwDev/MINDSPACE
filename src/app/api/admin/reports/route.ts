import { NextResponse } from "next/server";
import { getStaffSession } from "@/lib/admin";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const { session, status } = await getStaffSession();
  if (!session) {
    return NextResponse.json({ error: "Staff access required." }, { status });
  }

  const reports = await db.report.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      project: {
        select: {
          id: true,
          name: true,
          publicSlug: true,
          isPublished: true,
          owner: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
        },
      },
    },
  });

  return NextResponse.json({ reports });
}
