import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSafeUserSettings, updateUserSettings } from "@/lib/user-settings";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const settings = await getSafeUserSettings(session.user.id);
    return NextResponse.json({ settings });
  } catch (error: any) {
    console.error("GET /api/settings error:", error);
    return NextResponse.json(
      { error: "Failed to load user settings" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: any = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  try {
    await updateUserSettings(session.user.id, body);
    const settings = await getSafeUserSettings(session.user.id);
    return NextResponse.json({ success: true, settings });
  } catch (error: any) {
    console.error("PATCH /api/settings error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to update user settings" },
      { status: 500 }
    );
  }
}
