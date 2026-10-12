"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { AlertCircle, ArrowRight, CheckCircle2, HelpCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function LoginForm({ googleEnabled }: { googleEnabled: boolean }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string; general?: string }>({});
  const [submitting, setSubmitting] = useState(false);
  const [forgotModalOpen, setForgotModalOpen] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFieldErrors({});

    const trimmedEmail = email.trim();
    const errors: { email?: string; password?: string; general?: string } = {};

    if (!trimmedEmail) {
      errors.email = "Please enter your email address.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      errors.email = "Please enter a valid email address.";
    }

    if (!password) {
      errors.password = "Please enter your password.";
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setSubmitting(true);
    try {
      const result = await signIn("credentials", {
        redirect: false,
        email: trimmedEmail,
        password,
      });

      if (result?.error) {
        const isCredError = result.error === "CredentialsSignin" || result.error.includes("Invalid");
        if (isCredError) {
          setFieldErrors({
            password: "Incorrect email or password. Please check your credentials.",
          });
        } else {
          setFieldErrors({
            general: result.error,
          });
        }
        setSubmitting(false);
        return;
      }

      if (result?.ok) {
        router.push("/dashboard");
        router.refresh();
        return;
      }

      setFieldErrors({ general: "Unable to sign in. Please try again." });
      setSubmitting(false);
    } catch (err) {
      setFieldErrors({
        general: err instanceof Error ? err.message : "Something went wrong. Please try again.",
      });
      setSubmitting(false);
    }
  }

  return (
    <>
      <Card className="rounded-2xl border border-border/80 bg-card shadow-sm animate-in fade-in-50 slide-in-from-bottom-2 duration-300 ease-out">
        <CardHeader className="space-y-1.5 pb-4">
          <div className="flex items-center gap-2">
            <div className="size-6 rounded-md bg-foreground text-background flex items-center justify-center font-black text-xs">
              M
            </div>
            <CardTitle className="text-xl font-bold tracking-tight">Welcome back</CardTitle>
          </div>
          <CardDescription className="text-xs text-muted-foreground">
            Sign in to continue building your projects on MINDSPACE.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {fieldErrors.general ? (
            <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive flex items-start gap-2">
              <AlertCircle className="size-4 shrink-0 mt-0.5" />
              <span>{fieldErrors.general}</span>
            </div>
          ) : null}

          <form onSubmit={handleSubmit} className="flex flex-col gap-3.5" noValidate>
            {/* Email Field */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="email" className="text-xs font-semibold">
                  Email
                </Label>
              </div>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="you@school.edu"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (fieldErrors.email) setFieldErrors((prev) => ({ ...prev, email: undefined }));
                }}
                required
                disabled={submitting}
                aria-invalid={!!fieldErrors.email}
                className={`h-9 text-xs rounded-xl ${
                  fieldErrors.email ? "border-destructive focus-visible:ring-destructive/30" : ""
                }`}
              />
              {fieldErrors.email ? (
                <p className="text-[11px] font-medium text-destructive flex items-center gap-1">
                  <AlertCircle className="size-3 shrink-0" />
                  <span>{fieldErrors.email}</span>
                </p>
              ) : null}
            </div>

            {/* Password Field */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-xs font-semibold">
                  Password
                </Label>
                <Link
                  href="/forgot-password"
                  className="text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                >
                  Forgot password?
                </Link>
              </div>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (fieldErrors.password) setFieldErrors((prev) => ({ ...prev, password: undefined }));
                }}
                required
                disabled={submitting}
                aria-invalid={!!fieldErrors.password}
                className={`h-9 text-xs rounded-xl ${
                  fieldErrors.password ? "border-destructive focus-visible:ring-destructive/30" : ""
                }`}
              />
              {fieldErrors.password ? (
                <p className="text-[11px] font-medium text-destructive flex items-center gap-1">
                  <AlertCircle className="size-3 shrink-0" />
                  <span>{fieldErrors.password}</span>
                </p>
              ) : null}
            </div>

            <Button
              type="submit"
              disabled={submitting}
              className="mt-1 h-9 rounded-xl font-semibold text-xs bg-foreground text-background hover:bg-foreground/90 transition-all shadow-xs"
            >
              {submitting ? (
                <>
                  <Loader2 className="size-3.5 animate-spin mr-1.5" aria-hidden="true" />
                  Signing in…
                </>
              ) : (
                "Sign In"
              )}
            </Button>
          </form>

          {googleEnabled ? (
            <div className="pt-2">
              <div className="relative my-3">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border/80" />
                </div>
                <div className="relative flex justify-center text-[11px]">
                  <span className="bg-card px-2 text-muted-foreground">or continue with</span>
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                className="w-full h-9 rounded-xl text-xs font-medium border-border/80 hover:bg-secondary/60"
                onClick={() => void signIn("google", { callbackUrl: "/dashboard" })}
              >
                <svg viewBox="0 0 24 24" className="size-3.5 mr-2" aria-hidden="true">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Continue with Google
              </Button>
            </div>
          ) : null}

          <p className="pt-2 text-center text-xs text-muted-foreground">
            Don&apos;t have an account?{" "}
            <Link href="/signup" className="font-semibold text-foreground underline-offset-4 hover:underline">
              Create one
            </Link>
          </p>
        </CardContent>
      </Card>

      {/* Forgot Password Modal */}
      <Dialog open={forgotModalOpen} onOpenChange={setForgotModalOpen}>
        <DialogContent className="max-w-md rounded-2xl border border-border/80 bg-card p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Password Reset Help</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              MINDSPACE runs on local workspace authentication.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2 text-xs text-muted-foreground leading-relaxed">
            <p>
              To reset your credentials in your local environment, you can ask your platform administrator or contact support. If you have admin access, you can update user records directly via the Admin Console.
            </p>
            <div className="rounded-xl border border-border/60 bg-secondary/40 p-3 text-[11px] text-foreground">
              Tip: You can also register a fresh account at any time from the Sign Up page.
            </div>
          </div>
          <DialogFooter>
            <Button
              size="sm"
              onClick={() => setForgotModalOpen(false)}
              className="h-8 rounded-xl text-xs font-semibold"
            >
              Got it
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
