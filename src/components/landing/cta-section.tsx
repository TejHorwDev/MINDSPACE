"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, CheckCircle2, Sparkles, Terminal } from "lucide-react";
import { Button } from "@/components/ui/button";

export function CtaSection({ authed }: { authed?: boolean }) {
  return (
    <section className="relative py-24 sm:py-32 overflow-hidden border-t border-border/60">
      <div className="mx-auto max-w-[1800px] px-4 sm:px-8 lg:px-12">
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="relative overflow-hidden rounded-3xl sm:rounded-[36px] border border-border/80 bg-card p-8 sm:p-14 lg:p-20 text-center shadow-xl"
        >
          {/* Ambient subtle background glow */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 flex items-center justify-center -z-10"
          >
            <div className="h-[350px] w-[600px] rounded-full bg-indigo-500/[0.08] blur-[120px]" />
            <div className="h-[250px] w-[450px] rounded-full bg-violet-500/[0.06] blur-[100px]" />
          </div>

          <div className="mx-auto max-w-3xl space-y-6">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3.5 py-1 text-xs font-semibold text-foreground border border-border/60">
              <Sparkles className="size-3 text-indigo-500" />
              Free for Students & Independent Creators
            </span>

            <h2 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
              Ready to bring your ideas to life on the web?
            </h2>

            <p className="mx-auto max-w-xl text-sm sm:text-base text-muted-foreground leading-relaxed">
              Join thousands of students and builders turning concepts into published, high-performance websites today.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 pt-4">
              {authed ? (
                <Button
                  asChild
                  size="lg"
                  className="h-12 px-8 text-sm font-semibold bg-foreground text-background hover:bg-foreground/90 shadow-md transition-all hover:scale-[1.02]"
                >
                  <Link href="/dashboard">
                    Go to Your Dashboard
                    <ArrowRight className="ml-2 size-4" />
                  </Link>
                </Button>
              ) : (
                <Button
                  asChild
                  size="lg"
                  className="h-12 px-8 text-sm font-semibold bg-foreground text-background hover:bg-foreground/90 shadow-md transition-all hover:scale-[1.02]"
                >
                  <Link href="/signup">
                    Get Started Free
                    <ArrowRight className="ml-2 size-4" />
                  </Link>
                </Button>
              )}

              <Button
                asChild
                size="lg"
                variant="outline"
                className="h-12 px-7 text-sm font-medium border-border/80"
              >
                <Link href="/developers">
                  Explore Creator Showcase
                </Link>
              </Button>
            </div>

            {/* Value Guarantees */}
            <div className="pt-8 flex flex-wrap items-center justify-center gap-6 text-xs text-muted-foreground font-medium border-t border-border/60 mt-8">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="size-4 text-emerald-500" />
                <span>Zero server setup required</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="size-4 text-emerald-500" />
                <span>1-Click ZIP bundle export</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="size-4 text-emerald-500" />
                <span>Private by default workspace</span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
