"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, CheckCircle2, AlertCircle, Loader2, MailCheck, ShieldCheck } from "lucide-react";
import { AuthShell } from "@/components/layout/auth-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [loading, setLoading] = useState(Boolean(token));
  const [status, setStatus] = useState<"idle" | "success" | "error">(token ? "idle" : "success");
  const [message, setMessage] = useState(
    token ? "Verifying email token…" : "Your student account email is confirmed and ready for cloud IDE access."
  );

  useEffect(() => {
    if (!token) return;

    fetch(`/api/auth/verify-email?token=${encodeURIComponent(token)}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setStatus("success");
          setMessage(data.message || "Your email address has been successfully verified!");
        } else {
          setStatus("error");
          setMessage(data.error || "The email verification link is invalid or has expired.");
        }
      })
      .catch(() => {
        setStatus("error");
        setMessage("Unable to verify email at this time. Please try again.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [token]);

  return (
    <Card className="rounded-2xl border border-border/80 bg-card shadow-sm animate-in fade-in-50 slide-in-from-bottom-2 duration-300 ease-out">
      <CardHeader className="space-y-1.5 pb-4 text-center">
        <div className="size-12 rounded-full bg-foreground/5 border border-border/80 text-foreground mx-auto flex items-center justify-center">
          {loading ? (
            <Loader2 className="size-5 animate-spin" />
          ) : status === "success" ? (
            <MailCheck className="size-5 text-emerald-500" />
          ) : (
            <AlertCircle className="size-5 text-destructive" />
          )}
        </div>
        <CardTitle className="text-xl font-bold tracking-tight">
          {loading
            ? "Verifying your email…"
            : status === "success"
            ? "Email Confirmed"
            : "Verification Failed"}
        </CardTitle>
        <CardDescription className="text-xs text-muted-foreground">
          MINDSPACE Developer Authentication
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4 text-center">
        <p className="text-xs text-muted-foreground leading-relaxed">
          {message}
        </p>

        <div className="pt-2 flex flex-col gap-2">
          <Button
            asChild
            className="w-full h-9 rounded-xl text-xs font-semibold bg-foreground text-background hover:bg-foreground/90 shadow-xs"
          >
            <Link href="/dashboard">
              Go to Dashboard
            </Link>
          </Button>

          <Button
            asChild
            variant="outline"
            className="w-full h-9 rounded-xl text-xs font-medium border-border/80 hover:bg-secondary/60"
          >
            <Link href="/login">
              Sign In
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function VerifyEmailPage() {
  return (
    <AuthShell>
      <Suspense fallback={
        <div className="p-8 text-center text-xs text-muted-foreground">
          Checking verification…
        </div>
      }>
        <VerifyEmailContent />
      </Suspense>
    </AuthShell>
  );
}
