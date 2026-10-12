import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import { createEmailVerificationToken, verifyEmailVerificationToken } from "@/lib/auth-tokens";

/**
 * GET /api/auth/verify-email
 * Generates a verification token for the authenticated user, or verifies a provided ?token=...
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");

  // If verifying a token
  if (token) {
    const user = await verifyEmailVerificationToken(token);
    if (!user) {
      return NextResponse.json(
        { error: "Verification link is invalid or expired." },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Email address ${user.email} successfully verified!`,
      email: user.email,
    });
  }

  // Otherwise, generate a verification token for the current user
  const session = await getAuthSession();
  if (!session?.user?.id || !session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const generatedToken = createEmailVerificationToken({
    id: session.user.id,
    email: session.user.email,
  });

  return NextResponse.json({
    success: true,
    verificationUrl: `/verify-email?token=${encodeURIComponent(generatedToken)}`,
    token: generatedToken,
  });
}
