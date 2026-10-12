"use client";

import React, { useId } from "react";
import {
  StickyNote,
  ChevronDown,
  ChevronUp,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SpeakerNotesPanelProps {
  slideNumber: number;
  speakerNotes: string;
  isOpen: boolean;
  onToggleOpen: () => void;
  onChange: (notes: string) => void;
}

export function SpeakerNotesPanel({
  slideNumber,
  speakerNotes,
  isOpen,
  onToggleOpen,
  onChange,
}: SpeakerNotesPanelProps) {
  const textareaId = useId();
  const trimmed = speakerNotes.trim();
  const wordCount = trimmed ? trimmed.split(/\s+/).length : 0;
  const charCount = speakerNotes.length;

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={onToggleOpen}
        className={cn(
          "w-full h-9 px-4 shrink-0 flex items-center justify-between",
          "border-t border-border/70 bg-card/75 dark:bg-zinc-900/75 backdrop-blur-md",
          "hover:bg-secondary/40 transition-colors text-xs text-muted-foreground",
          "cursor-pointer select-none group"
        )}
        aria-label="Expand speaker notes panel"
      >
        <div className="flex items-center gap-2 min-w-0">
          <StickyNote
            className={cn(
              "size-3.5 transition-colors",
              trimmed ? "text-amber-500/80" : "text-muted-foreground/70 group-hover:text-foreground"
            )}
          />
          <span className="font-medium text-foreground/80 group-hover:text-foreground">
            Speaker Notes
          </span>
          <span className="text-[11px] text-muted-foreground/60 hidden sm:inline">
            (Slide {slideNumber})
          </span>

          {trimmed ? (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono bg-secondary/80 text-muted-foreground border border-border/50">
              {wordCount} {wordCount === 1 ? "word" : "words"}
            </span>
          ) : (
            <span className="text-[11px] text-muted-foreground/50 italic hidden md:inline">
              Click to add private reminder cues...
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 text-muted-foreground group-hover:text-foreground">
          <span className="text-[11px] font-medium hidden sm:inline">Notes</span>
          <ChevronUp className="size-3.5 transition-transform group-hover:-translate-y-0.5" />
        </div>
      </button>
    );
  }

  return (
    <div
      className={cn(
        "w-full shrink-0 flex flex-col transition-all duration-200 ease-in-out",
        "h-36 sm:h-44 border-t border-border/70",
        "bg-card/90 dark:bg-zinc-900/90 backdrop-blur-md shadow-2xs"
      )}
    >
      {/* Header bar */}
      <div className="h-8 px-4 flex items-center justify-between border-b border-border/60 bg-muted/20 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <StickyNote className="size-3.5 text-amber-500/80 dark:text-amber-400/80 shrink-0" />
          <span className="text-xs font-semibold text-foreground">
            Speaker Notes
          </span>
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono bg-secondary text-muted-foreground border border-border/50">
            Slide {slideNumber}
          </span>
          <span className="text-[10px] font-mono text-muted-foreground/70 hidden sm:inline">
            {wordCount} {wordCount === 1 ? "word" : "words"} · {charCount} chars
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] text-muted-foreground/60 hidden md:inline select-none">
            Presenter reminder cues · Not visible on slide
          </span>

          {trimmed && (
            <button
              type="button"
              onClick={() => onChange("")}
              className="text-[11px] text-muted-foreground hover:text-destructive px-1.5 py-0.5 rounded hover:bg-secondary/60 transition-colors cursor-pointer"
              title="Clear notes for this slide"
            >
              Clear
            </button>
          )}

          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onToggleOpen}
            className="size-6 rounded-md text-muted-foreground hover:text-foreground cursor-pointer"
            title="Collapse notes panel"
          >
            <ChevronDown className="size-3.5" />
          </Button>
        </div>
      </div>

      {/* Textarea body */}
      <div className="flex-1 p-3 px-4 overflow-hidden flex flex-col">
        <label htmlFor={textareaId} className="sr-only">
          Speaker notes for slide {slideNumber}
        </label>
        <textarea
          id={textareaId}
          value={speakerNotes}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Add private speaker notes for this slide... (e.g. key takeaways to mention, timing cues, questions for the audience)"
          className={cn(
            "w-full flex-1 resize-none bg-transparent border-0 focus:outline-none focus:ring-0",
            "text-xs sm:text-[13px] leading-relaxed text-foreground placeholder:text-muted-foreground/45",
            "font-normal selection:bg-amber-500/20"
          )}
          autoFocus={false}
          spellCheck
        />
      </div>
    </div>
  );
}
