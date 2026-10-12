"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  Camera,
  CheckCircle2,
  ExternalLink,
  Github,
  Globe,
  Instagram,
  Linkedin,
  Loader2,
  Settings,
  Sparkles,
  Twitter,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import { DeveloperAvatar } from "@/components/developers/developer-avatar";
import { Button } from "@/components/ui/button";
import { safeUrl } from "@/lib/sanitize";

type SocialLinks = {
  github?: string;
  linkedin?: string;
  instagram?: string;
  twitter?: string;
  website?: string;
};

const SOCIAL_META: {
  key: keyof SocialLinks;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { key: "github", label: "GitHub", icon: Github },
  { key: "linkedin", label: "LinkedIn", icon: Linkedin },
  { key: "twitter", label: "X / Twitter", icon: Twitter },
  { key: "instagram", label: "Instagram", icon: Instagram },
  { key: "website", label: "Portfolio", icon: Globe },
];

interface DeveloperProfileHeaderProps {
  developer: {
    id: string;
    name: string;
    slug: string;
    role: string;
    bio: string;
    photoUrl?: string | null;
    socialLinks?: SocialLinks | null;
  };
  isAdmin?: boolean;
}

export function DeveloperProfileHeader({
  developer,
  isAdmin = false,
}: DeveloperProfileHeaderProps) {
  const [photoUrl, setPhotoUrl] = useState<string | null>(developer.photoUrl || null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const links = developer.socialLinks || {};
  const socials = SOCIAL_META.filter((meta) => links[meta.key]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const toastId = toast.loading("Uploading photo...");

    try {
      // 1. Upload to local disk via /api/upload
      const formData = new FormData();
      formData.append("file", file);

      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const uploadData = await uploadRes.json();
      if (!uploadRes.ok || !uploadData.url) {
        throw new Error(uploadData.error || "Failed to upload image.");
      }

      const uploadedUrl = uploadData.url;

      // 2. Save new photoUrl to developer record
      const updateRes = await fetch(`/api/developers/${developer.slug}/photo`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photoUrl: uploadedUrl }),
      });

      const updateData = await updateRes.json();
      if (!updateRes.ok) {
        throw new Error(updateData.error || "Failed to save photo to profile.");
      }

      setPhotoUrl(uploadedUrl);
      toast.success("Profile photo updated successfully!", { id: toastId });
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to update profile photo.", { id: toastId });
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  return (
    <div className="relative overflow-hidden rounded-3xl sm:rounded-[36px] border border-border/80 bg-card p-8 sm:p-12 lg:p-16 shadow-xl">
      {/* Subtle Atmospheric Monochrome Backdrop */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 flex items-center justify-center overflow-hidden"
      >
        <div className="h-[380px] w-[650px] rounded-full bg-white/[0.02] blur-[130px]" />
        <div className="h-[280px] w-[500px] rounded-full bg-white/[0.015] blur-[110px]" />
        <div className="absolute inset-0 studio-dots-bg opacity-20" />
      </div>

      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8">
        {/* Left: Avatar + Identity */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 sm:gap-8">
          <div className="relative group shrink-0">
            <DeveloperAvatar
              name={developer.name}
              photoUrl={photoUrl}
              size={120}
              className="ring-4 ring-background shadow-2xl transition-all duration-300 group-hover:ring-foreground/20"
            />

            <div
              className="absolute -bottom-1 -right-1 flex size-7 items-center justify-center rounded-full bg-emerald-500 text-white shadow-md ring-2 ring-background"
              title="Verified Creator"
            >
              <CheckCircle2 className="size-4" />
            </div>

            {/* Quick Upload Action for Admins */}
            {isAdmin && (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  className="hidden"
                  onChange={handleFileChange}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="absolute inset-0 flex flex-col items-center justify-center rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-xs cursor-pointer disabled:cursor-not-allowed"
                  title="Upload local photo"
                >
                  {uploading ? (
                    <Loader2 className="size-6 animate-spin" />
                  ) : (
                    <>
                      <Camera className="size-5" />
                      <span className="text-[10px] font-semibold tracking-wider mt-0.5 uppercase">Upload</span>
                    </>
                  )}
                </button>
              </>
            )}
          </div>

          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.05] px-3 py-1 text-xs font-semibold text-neutral-200 border border-white/10 font-mono">
                <Sparkles className="size-3 text-neutral-400" />
                Verified Creator
              </span>
              <span className="text-xs font-mono font-medium text-muted-foreground uppercase bg-secondary/80 px-2.5 py-1 rounded-md border border-border/60">
                Core Builder
              </span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-foreground">
              {developer.name}
            </h1>

            <p className="text-base sm:text-xl font-medium text-muted-foreground">
              {developer.role}
            </p>
          </div>
        </div>

        {/* Right: Actions & Social Links */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
          {isAdmin && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="h-10 px-4 rounded-xl border-border/80 shadow-2xs hover:bg-secondary gap-2"
            >
              {uploading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Upload className="size-4 text-muted-foreground" />
              )}
              <span>Upload Local Photo</span>
            </Button>
          )}

          {isAdmin && (
            <Button
              asChild
              variant="outline"
              size="sm"
              className="h-10 px-4 rounded-xl border-border/80 shadow-2xs hover:bg-secondary gap-2"
            >
              <Link href="/admin">
                <Settings className="size-4 text-muted-foreground" />
                <span>Admin Panel</span>
              </Link>
            </Button>
          )}

          {socials.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              {socials.map(({ key, label, icon: Icon }) => (
                <Button
                  key={key}
                  asChild
                  variant="outline"
                  size="sm"
                  className="h-10 px-4 rounded-xl border-border/80 hover:bg-secondary transition-all"
                >
                  <a
                    href={safeUrl(links[key]) || "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`${developer.name} on ${label}`}
                  >
                    <Icon className="size-4 mr-2 text-muted-foreground" />
                    {label}
                    <ArrowUpRight className="size-3 ml-1 text-muted-foreground" />
                  </a>
                </Button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
