"use client";

import { useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

function initialsOf(name: string) {
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function isValidDirectImageUrl(url?: string | null): boolean {
  if (!url || typeof url !== "string") return false;
  const trimmed = url.trim();
  if (!trimmed || trimmed === "null" || trimmed === "undefined") return false;

  // Local uploads are always direct images
  if (trimmed.startsWith("/uploads/")) return true;

  // Disallow common webpage links that are not direct images (e.g. ibb.co/xxx without i.ibb.co)
  if (trimmed.includes("ibb.co/") && !trimmed.includes("i.ibb.co/")) return false;
  if (trimmed.includes("imgur.com/") && !trimmed.includes("i.imgur.com/")) return false;

  return (
    trimmed.startsWith("/") ||
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://")
  );
}

export function DeveloperAvatar({
  name,
  photoUrl,
  size = 64,
  className,
}: {
  name: string;
  photoUrl?: string | null;
  size?: number;
  className?: string;
}) {
  const [hasError, setHasError] = useState(false);
  const isValid = isValidDirectImageUrl(photoUrl) && !hasError;

  if (isValid && photoUrl && !hasError) {
    return (
      <div
        className={cn(
          "relative shrink-0 overflow-hidden rounded-full border border-white/20 bg-gradient-to-br from-zinc-700 via-zinc-800 to-black shadow-md",
          className
        )}
        style={{ width: size, height: size }}
      >
        <div
          className="absolute inset-0 flex items-center justify-center text-white font-extrabold tracking-wider select-none"
          style={{ fontSize: Math.max(14, Math.round(size * 0.36)) }}
          aria-hidden="true"
        >
          {initialsOf(name)}
        </div>
        <Image
          src={photoUrl.trim()}
          alt={name}
          width={size}
          height={size}
          className="relative z-10 size-full object-cover"
          onError={() => setHasError(true)}
          unoptimized={!photoUrl.startsWith("/")}
          priority={false}
        />
      </div>
    );
  }

  // High-contrast, executive monogram fallback
  return (
    <div
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center rounded-full border border-white/20 bg-gradient-to-br from-zinc-700 via-zinc-800 to-black text-white font-extrabold tracking-wider shadow-lg select-none",
        className
      )}
      style={{
        width: size,
        height: size,
        fontSize: Math.max(14, Math.round(size * 0.36)),
      }}
      aria-label={name}
    >
      <span>{initialsOf(name)}</span>
    </div>
  );
}
