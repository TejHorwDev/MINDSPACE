"use client";

import { useEffect } from "react";
import { MotionConfig } from "framer-motion";

/**
 * Wraps animated content. `reducedMotion="user"` makes Framer Motion
 * respect the visitor's OS-level "reduce motion" preference — animations
 * become instant instead of transforming.
 *
 * Automatically pauses expensive CSS animations when document is hidden.
 */
export function Motion({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        document.body.classList.add("ms-tab-hidden");
      } else {
        document.body.classList.remove("ms-tab-hidden");
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      document.body.classList.remove("ms-tab-hidden");
    };
  }, []);

  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
