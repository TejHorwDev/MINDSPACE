"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function SignupForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{
    name?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
    general?: string;
  }>({});
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFieldErrors({});

    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    const errors: typeof fieldErrors = {};

    if (!trimmedName) {
      errors.name = "Please enter your name.";
    }
    if (!trimmedEmail) {
      errors.email = "Please enter your email address.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      errors.email = "Please enter a valid email address.";
    }
    if (password.length < 8) {
      errors.password = "Password must be at least 8 characters.";
    }
    if (password !== confirmPassword) {
      errors.confirmPassword = "Passwords do not match.";
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: trimmedName,
          email: trimmedEmail,
          password,
        }),
      });

      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
      };

      if (!response.ok) {
        const errorMsg = data.error ?? "Registration failed. Please try again.";
        if (errorMsg.toLowerCase().includes("email") || errorMsg.toLowerCase().includes("taken") || errorMsg.toLowerCase().includes("exists")) {
          setFieldErrors({ email: "This email address is already registered." });
        } else if (errorMsg.toLowerCase().includes("password")) {
          setFieldErrors({ password: errorMsg });
        } else {
          setFieldErrors({ general: errorMsg });
        }
        setSubmitting(false);
        return;
      }

      // Account created — automatically sign in
      const result = await signIn("credentials", {
        redirect: false,
        email: trimmedEmail,
        password,
      });

      if (result?.ok) {
        router.push("/dashboard");
        router.refresh();
        return;
      }

      router.push("/login");
    } catch (err) {
      setFieldErrors({
        general: err instanceof Error ? err.message : "Something went wrong. Please try again.",
      });
      setSubmitting(false);
    }
  }

  return (
    <Card className="rounded-2xl border border-border/80 bg-card shadow-sm animate-in fade-in-50 slide-in-from-bottom-2 duration-300 ease-out">
      <CardHeader className="space-y-1.5 pb-4">
        <div className="flex items-center gap-2">
          <div className="size-6 rounded-md bg-foreground text-background flex items-center justify-center font-black text-xs">
            M
          </div>
          <CardTitle className="text-xl font-bold tracking-tight">Create your workspace</CardTitle>
        </div>
        <CardDescription className="text-xs text-muted-foreground">
          Sign up with your email to start building modern web apps.
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
          {/* Name Field */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name" className="text-xs font-semibold">
              Name
            </Label>
            <Input
              id="name"
              type="text"
              autoComplete="name"
              placeholder="Your full name"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (fieldErrors.name) setFieldErrors((prev) => ({ ...prev, name: undefined }));
              }}
              required
              maxLength={80}
              disabled={submitting}
              aria-invalid={!!fieldErrors.name}
              className={`h-9 text-xs rounded-xl ${
                fieldErrors.name ? "border-destructive focus-visible:ring-destructive/30" : ""
              }`}
            />
            {fieldErrors.name ? (
              <p className="text-[11px] font-medium text-destructive flex items-center gap-1">
                <AlertCircle className="size-3 shrink-0" />
                <span>{fieldErrors.name}</span>
              </p>
            ) : null}
          </div>

          {/* Email Field */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email" className="text-xs font-semibold">
              Email
            </Label>
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
            <Label htmlFor="password" className="text-xs font-semibold">
              Password
            </Label>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              placeholder="At least 8 characters"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (fieldErrors.password) setFieldErrors((prev) => ({ ...prev, password: undefined }));
              }}
              required
              minLength={8}
              maxLength={128}
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
            ) : (
              <p className="text-[10px] text-muted-foreground">Use 8 or more characters.</p>
            )}
          </div>

          {/* Confirm Password Field */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="confirmPassword" className="text-xs font-semibold">
              Confirm Password
            </Label>
            <Input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              placeholder="Repeat your password"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                if (fieldErrors.confirmPassword) setFieldErrors((prev) => ({ ...prev, confirmPassword: undefined }));
              }}
              required
              minLength={8}
              maxLength={128}
              disabled={submitting}
              aria-invalid={!!fieldErrors.confirmPassword}
              className={`h-9 text-xs rounded-xl ${
                fieldErrors.confirmPassword ? "border-destructive focus-visible:ring-destructive/30" : ""
              }`}
            />
            {fieldErrors.confirmPassword ? (
              <p className="text-[11px] font-medium text-destructive flex items-center gap-1">
                <AlertCircle className="size-3 shrink-0" />
                <span>{fieldErrors.confirmPassword}</span>
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
                Creating account…
              </>
            ) : (
              "Create Account"
            )}
          </Button>
        </form>

        <p className="pt-2 text-center text-xs text-muted-foreground">
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-foreground underline-offset-4 hover:underline">
            Log in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
