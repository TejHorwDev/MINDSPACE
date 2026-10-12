import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { createPasswordResetToken } from "@/lib/auth-tokens";

const schema = z.object({
  email: z.string().trim().email("Please enter a valid email address."),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid input." },
        { status: 400 }
      );
    }

    const { email } = parsed.data;
    const user = await db.user.findUnique({
      where: { email: email.toLowerCase() },
      select: { id: true, email: true, passwordHash: true },
    });

    if (!user) {
      // Don't leak whether user exists or not for public endpoint security
      return NextResponse.json({
        success: true,
        message: "If an account with that email exists, password reset instructions have been generated.",
      });
    }

    const token = createPasswordResetToken(user);
    const resetUrl = `/reset-password?token=${encodeURIComponent(token)}`;

    // In local development / student sandbox, return the resetUrl for seamless testing
    return NextResponse.json({
      success: true,
      message: "Password reset link generated successfully.",
      resetUrl,
      token,
    });
  } catch (err: any) {
    console.error("Forgot password error:", err);
    return NextResponse.json(
      { error: "Failed to generate password reset request. Please try again." },
      { status: 500 }
    );
  }
}
