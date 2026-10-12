"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, CheckCircle2, KeyRound, Loader2, Mail } from "lucide-react";
import { AuthShell } from "@/components/layout/auth-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<{ message: string; resetUrl?: string } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const trimmed = email.trim();
    if (!trimmed) {
      setError("Please enter your account email address.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to process request.");
      }

      setSuccessData({
        message: data.message,
        resetUrl: data.resetUrl,
      });
    } catch (err: any) {
      setError(err.message || "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthShell>
      <Card className="rounded-2xl border border-border/80 bg-card shadow-sm animate-in fade-in-50 slide-in-from-bottom-2 duration-300 ease-out">
        <CardHeader className="space-y-1.5 pb-4">
          <div className="flex items-center gap-2">
            <div className="size-6 rounded-md bg-foreground text-background flex items-center justify-center font-black text-xs">
              <KeyRound className="size-3.5" />
            </div>
            <CardTitle className="text-xl font-bold tracking-tight">Reset password</CardTitle>
          </div>
          <CardDescription className="text-xs text-muted-foreground">
            Enter your email address and we&apos;ll send you instructions to reset your password.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {successData ? (
            <div className="space-y-4 animate-in fade-in-50 duration-300">
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-xs text-emerald-400 space-y-2">
                <div className="flex items-center gap-2 font-semibold text-emerald-300">
                  <CheckCircle2 className="size-4" />
                  <span>Reset link generated!</span>
                </div>
                <p className="text-emerald-400/90 leading-relaxed font-sans">
                  {successData.message}
                </p>
              </div>

              {successData.resetUrl && (
                <div className="space-y-2 pt-2">
                  <span className="text-[11px] font-mono text-muted-foreground block">
                    Direct local reset link:
                  </span>
                  <Button
                    asChild
                    className="w-full h-9 rounded-xl text-xs font-semibold bg-foreground text-background hover:bg-foreground/90 shadow-xs"
                  >
                    <Link href={successData.resetUrl}>
                      Proceed to Reset Password
                      <ArrowRight className="ml-1.5 size-3.5" />
                    </Link>
                  </Button>
                </div>
              )}

              <div className="pt-2 text-center">
                <Link
                  href="/login"
                  className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ArrowLeft className="size-3.5" />
                  <span>Return to Log In</span>
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              {error && (
                <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
                  {error}
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="reset-email" className="text-xs font-semibold">
                  Account Email
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                  <Input
                    id="reset-email"
                    type="email"
                    placeholder="you@school.edu"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={submitting}
                    className="h-9 pl-9 text-xs rounded-xl"
                    required
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={submitting}
                className="w-full h-9 rounded-xl font-semibold text-xs bg-foreground text-background hover:bg-foreground/90 transition-all shadow-xs"
              >
                {submitting ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin mr-1.5" />
                    Generating link…
                  </>
                ) : (
                  "Send Reset Link"
                )}
              </Button>

              <div className="text-center pt-2">
                <Link
                  href="/login"
                  className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ArrowLeft className="size-3.5" />
                  <span>Return to Log In</span>
                </Link>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </AuthShell>
  );
}
