"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Check,
  Loader2,
  Play,
  X,
  LayoutTemplate,
  Plus,
  Heading1,
  Columns2,
  Image as ImageIcon,
  StickyNote,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  PresentationItem,
  SlideItem,
  SlideLayoutType,
  STARTER_LAYOUTS,
} from "@/lib/presentations/types";
import { SlidesSidebar } from "./slides-sidebar";
import { SlideCanvas } from "./slide-canvas";
import { SpeakerNotesPanel } from "./speaker-notes-panel";
import { ExportPresentationMenu } from "./export-presentation-menu";
import { getDefaultSlideContent } from "@/lib/presentations/defaults";
import { cn } from "@/lib/utils";

interface PresentationEditorViewProps {
  initialPresentation: PresentationItem;
}

export function PresentationEditorView({
  initialPresentation,
}: PresentationEditorViewProps) {
  const router = useRouter();

  // Core State
  const [presentationTitle, setPresentationTitle] = useState(
    initialPresentation.title || "Untitled Presentation"
  );
  const [slides, setSlides] = useState<SlideItem[]>(
    initialPresentation.slides || []
  );
  const [selectedSlideId, setSelectedSlideId] = useState<string>(
    initialPresentation.slides?.[0]?.id || ""
  );

  // Auto-Save Status
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "unsaved">(
    "saved"
  );
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const dirtyRef = useRef(false);

  // Present Mode (Fullscreen preview)
  const [isPresentMode, setIsPresentMode] = useState(false);

  // Layout switcher popover
  const [isLayoutPopoverOpen, setIsLayoutPopoverOpen] = useState(false);

  // Speaker Notes Collapsible Dock
  const [isNotesOpen, setIsNotesOpen] = useState(false);

  // Active slide
  const activeSlideIndex = slides.findIndex((s) => s.id === selectedSlideId);
  const activeSlide =
    activeSlideIndex !== -1 ? slides[activeSlideIndex] : slides[0];

  // --------------------------------------------------------------------------
  // Auto-save logic (debounced)
  // --------------------------------------------------------------------------
  const executeSave = useCallback(
    async (titleToSave: string, slidesToSave: SlideItem[]) => {
      setSaveStatus("saving");
      try {
        const res = await fetch(
          `/api/presentations/${initialPresentation.id}/save`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              title: titleToSave,
              slides: slidesToSave.map((s) => ({
                id: s.id,
                order: s.order,
                layoutType: s.layoutType,
                contentJson: s.contentJson,
                speakerNotes: s.speakerNotes ?? "",
              })),
            }),
          }
        );

        if (res.ok) {
          setSaveStatus("saved");
          dirtyRef.current = false;
        } else {
          setSaveStatus("unsaved");
        }
      } catch (err) {
        console.error("Save presentation error:", err);
        setSaveStatus("unsaved");
      }
    },
    [initialPresentation.id]
  );

  const triggerAutoSave = useCallback(
    (nextTitle: string, nextSlides: SlideItem[]) => {
      dirtyRef.current = true;
      setSaveStatus("unsaved");

      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }

      saveTimerRef.current = setTimeout(() => {
        executeSave(nextTitle, nextSlides);
      }, 1200);
    },
    [executeSave]
  );

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, []);

  // Update title
  const handleTitleChange = (newTitle: string) => {
    setPresentationTitle(newTitle);
    triggerAutoSave(newTitle, slides);
  };

  // Update active slide content
  const handleSlideContentChange = (updatedContentJson: any) => {
    if (!activeSlide) return;

    const nextSlides = slides.map((s) =>
      s.id === activeSlide.id ? { ...s, contentJson: updatedContentJson } : s
    );

    setSlides(nextSlides);
    triggerAutoSave(presentationTitle, nextSlides);
  };

  // Update active slide speaker notes (debounced auto-save)
  const handleSpeakerNotesChange = (newNotes: string) => {
    if (!activeSlide) return;

    const nextSlides = slides.map((s) =>
      s.id === activeSlide.id ? { ...s, speakerNotes: newNotes } : s
    );

    setSlides(nextSlides);
    triggerAutoSave(presentationTitle, nextSlides);
  };

  // Change active slide layout
  const handleChangeLayout = (newLayout: SlideLayoutType) => {
    if (!activeSlide) return;
    if (activeSlide.layoutType === newLayout) {
      setIsLayoutPopoverOpen(false);
      return;
    }

    const defaultContent = getDefaultSlideContent(newLayout);
    // Preserve existing heading / title text if possible
    const currentHeading =
      activeSlide.contentJson?.heading || activeSlide.contentJson?.title;
    if (currentHeading) {
      if (newLayout === "title") {
        defaultContent.title = currentHeading;
      } else {
        defaultContent.heading = currentHeading;
      }
    }

    const nextSlides = slides.map((s) =>
      s.id === activeSlide.id
        ? { ...s, layoutType: newLayout, contentJson: defaultContent }
        : s
    );

    setSlides(nextSlides);
    triggerAutoSave(presentationTitle, nextSlides);
    setIsLayoutPopoverOpen(false);
    toast.success(`Layout changed to ${newLayout.replace("-", " ")}`);
  };

  // Add new slide
  const handleAddSlide = async (layoutType: SlideLayoutType) => {
    try {
      const atIndex = activeSlideIndex + 1;
      const res = await fetch(
        `/api/presentations/${initialPresentation.id}/slides`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ layoutType, atIndex }),
        }
      );

      const data = await res.json();
      if (!res.ok || !data.slide) {
        throw new Error(data.error || "Failed to add slide");
      }

      const newSlide: SlideItem = data.slide;
      const nextSlides = [...slides];
      nextSlides.splice(atIndex, 0, newSlide);
      // Renumber
      nextSlides.forEach((s, idx) => {
        s.order = idx;
      });

      setSlides(nextSlides);
      setSelectedSlideId(newSlide.id);
      toast.success("New slide added");
    } catch (err: any) {
      toast.error(err.message || "Failed to add slide");
    }
  };

  // Duplicate slide
  const handleDuplicateSlide = async (slideId: string) => {
    const targetSlide = slides.find((s) => s.id === slideId);
    if (!targetSlide) return;

    try {
      const targetIdx = slides.findIndex((s) => s.id === slideId);
      const res = await fetch(
        `/api/presentations/${initialPresentation.id}/slides`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            layoutType: targetSlide.layoutType,
            atIndex: targetIdx + 1,
          }),
        }
      );

      const data = await res.json();
      if (!res.ok || !data.slide) {
        throw new Error(data.error || "Failed to duplicate slide");
      }

      // Copy content and speaker notes
      const duplicated: SlideItem = {
        ...data.slide,
        contentJson: JSON.parse(JSON.stringify(targetSlide.contentJson)),
        speakerNotes: targetSlide.speakerNotes || "",
      };

      const nextSlides = [...slides];
      nextSlides.splice(targetIdx + 1, 0, duplicated);
      nextSlides.forEach((s, idx) => {
        s.order = idx;
      });

      setSlides(nextSlides);
      setSelectedSlideId(duplicated.id);
      triggerAutoSave(presentationTitle, nextSlides);
      toast.success("Slide duplicated");
    } catch (err: any) {
      toast.error(err.message || "Failed to duplicate slide");
    }
  };

  // Delete slide
  const handleDeleteSlide = async (slideId: string) => {
    if (slides.length <= 1) {
      toast.error("A presentation must have at least one slide.");
      return;
    }

    try {
      const res = await fetch(
        `/api/presentations/${initialPresentation.id}/slides/${slideId}`,
        {
          method: "DELETE",
        }
      );

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete slide");
      }

      const nextSlides = slides.filter((s) => s.id !== slideId);
      nextSlides.forEach((s, idx) => {
        s.order = idx;
      });

      setSlides(nextSlides);

      if (selectedSlideId === slideId) {
        const deletedIndex = slides.findIndex((s) => s.id === slideId);
        const newActive =
          nextSlides[Math.min(deletedIndex, nextSlides.length - 1)];
        setSelectedSlideId(newActive.id);
      }

      toast.success("Slide deleted");
    } catch (err: any) {
      toast.error(err.message || "Failed to delete slide");
    }
  };

  // Reorder slides
  const handleReorderSlides = async (reorderedIds: string[]) => {
    const idToSlide = new Map(slides.map((s) => [s.id, s]));
    const reorderedSlides: SlideItem[] = [];

    reorderedIds.forEach((id, idx) => {
      const slide = idToSlide.get(id);
      if (slide) {
        reorderedSlides.push({ ...slide, order: idx });
      }
    });

    setSlides(reorderedSlides);

    // Call reorder endpoint
    try {
      await fetch(`/api/presentations/${initialPresentation.id}/reorder`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slideIds: reorderedIds }),
      });
    } catch (err) {
      console.error("Reorder failed on server:", err);
    }
  };

  // Slide navigation
  const handlePrevSlide = () => {
    if (activeSlideIndex > 0) {
      setSelectedSlideId(slides[activeSlideIndex - 1].id);
    }
  };

  const handleNextSlide = () => {
    if (activeSlideIndex < slides.length - 1) {
      setSelectedSlideId(slides[activeSlideIndex + 1].id);
    }
  };

  // Keyboard navigation for presentation mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isPresentMode) {
        if (e.key === "ArrowRight" || e.key === " " || e.key === "Enter") {
          e.preventDefault();
          handleNextSlide();
        } else if (e.key === "ArrowLeft" || e.key === "Backspace") {
          e.preventDefault();
          handlePrevSlide();
        } else if (e.key === "Escape") {
          e.preventDefault();
          setIsPresentMode(false);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isPresentMode, activeSlideIndex, slides]);

  return (
    <div className="flex flex-col h-screen w-full bg-background text-foreground overflow-hidden">
      {/* ------------------------------------------------------------- */}
      {/* TOP HEADER & CONTROLS TOOLBAR                                 */}
      {/* ------------------------------------------------------------- */}
      <header className="h-13 border-b border-border/80 bg-card/75 backdrop-blur-md px-4 flex items-center justify-between shrink-0 z-20">
        {/* Left: Back & Presentation Title */}
        <div className="flex items-center gap-3 min-w-0">
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
          >
            <Link href="/dashboard" className="flex items-center gap-1">
              <ChevronLeft className="size-4" />
              <span className="hidden sm:inline">Dashboard</span>
            </Link>
          </Button>

          <span className="text-muted-foreground/40 hidden sm:inline">/</span>

          <div className="flex items-center gap-2 max-w-xs sm:max-w-md">
            <Input
              value={presentationTitle}
              onChange={(e) => handleTitleChange(e.target.value)}
              placeholder="Presentation Title"
              className="h-8 px-2 text-xs font-semibold bg-transparent border-transparent hover:border-border/80 focus:border-border focus:bg-background transition-colors truncate"
            />
          </div>
        </div>

        {/* Center: Slide Navigator (Prev / Next) */}
        <div className="flex items-center gap-1 bg-secondary/60 p-0.5 rounded-xl border border-border/60">
          <button
            type="button"
            onClick={handlePrevSlide}
            disabled={activeSlideIndex <= 0}
            className={cn(
              "p-1 rounded-lg text-muted-foreground hover:text-foreground transition-colors cursor-pointer",
              activeSlideIndex <= 0 && "opacity-30 cursor-not-allowed"
            )}
            title="Previous Slide"
          >
            <ChevronLeft className="size-4" />
          </button>

          <span className="font-mono text-xs font-medium px-2 text-foreground/80 min-w-[70px] text-center select-none">
            {activeSlideIndex + 1} / {slides.length}
          </span>

          <button
            type="button"
            onClick={handleNextSlide}
            disabled={activeSlideIndex >= slides.length - 1}
            className={cn(
              "p-1 rounded-lg text-muted-foreground hover:text-foreground transition-colors cursor-pointer",
              activeSlideIndex >= slides.length - 1 &&
                "opacity-30 cursor-not-allowed"
            )}
            title="Next Slide"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>

        {/* Right: Actions, Layout Switcher & Auto-Save Badge */}
        <div className="flex items-center gap-2.5">
          {/* Layout Switcher Popover */}
          <Popover
            open={isLayoutPopoverOpen}
            onOpenChange={setIsLayoutPopoverOpen}
          >
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-2.5 text-xs font-medium border-border/80 hover:bg-secondary cursor-pointer"
              >
                <LayoutTemplate className="size-3.5 mr-1.5 text-muted-foreground" />
                <span className="hidden sm:inline capitalize">
                  {activeSlide?.layoutType.replace("-", " ") || "Layout"}
                </span>
              </Button>
            </PopoverTrigger>
            <PopoverContent
              align="end"
              className="w-56 p-1.5 bg-card border-border/80 rounded-xl shadow-lg space-y-1 text-xs"
            >
              <div className="px-2 py-1 text-[11px] font-medium text-muted-foreground">
                Change Slide Layout
              </div>
              {STARTER_LAYOUTS.map((layout) => (
                <button
                  key={layout.type}
                  type="button"
                  onClick={() => handleChangeLayout(layout.type)}
                  className={cn(
                    "w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left transition-colors cursor-pointer",
                    activeSlide?.layoutType === layout.type
                      ? "bg-secondary text-foreground font-semibold"
                      : "hover:bg-secondary/60 text-muted-foreground hover:text-foreground"
                  )}
                >
                  <span className="text-xs">{layout.name}</span>
                </button>
              ))}
            </PopoverContent>
          </Popover>

          {/* Speaker Notes Toggle Button */}
          <Button
            variant={isNotesOpen ? "secondary" : "outline"}
            size="sm"
            onClick={() => setIsNotesOpen((prev) => !prev)}
            className="h-8 px-2.5 text-xs font-medium border-border/80 cursor-pointer"
            title={isNotesOpen ? "Hide Speaker Notes" : "Show Speaker Notes"}
          >
            <StickyNote
              className={cn(
                "size-3.5 mr-1.5 transition-colors",
                Boolean(activeSlide?.speakerNotes?.trim())
                  ? "text-amber-500/90"
                  : "text-muted-foreground"
              )}
            />
            <span className="hidden sm:inline">Notes</span>
            {Boolean(activeSlide?.speakerNotes?.trim()) && (
              <span className="size-1.5 rounded-full bg-amber-500 ml-1.5" />
            )}
          </Button>

          {/* Export Presentation (PPTX / PDF) */}
          <ExportPresentationMenu
            presentationId={initialPresentation.id}
            presentationTitle={presentationTitle}
            slides={slides}
          />

          {/* Present Mode Button */}
          <Button
            size="sm"
            onClick={() => setIsPresentMode(true)}
            className="h-8 px-3 text-xs font-semibold bg-foreground text-background hover:bg-foreground/90 shadow-2xs gap-1.5 cursor-pointer"
          >
            <Play className="size-3 fill-current" />
            <span className="hidden sm:inline">Present</span>
          </Button>

          {/* Save Status Badge */}
          <div className="flex items-center gap-1.5 text-xs font-mono text-muted-foreground px-2">
            {saveStatus === "saving" && (
              <>
                <Loader2 className="size-3.5 animate-spin text-primary" />
                <span className="text-[11px]">Saving...</span>
              </>
            )}
            {saveStatus === "saved" && (
              <>
                <Check className="size-3.5 text-emerald-500" />
                <span className="text-[11px] text-emerald-600 dark:text-emerald-400">
                  Saved
                </span>
              </>
            )}
            {saveStatus === "unsaved" && (
              <span className="text-[11px] text-amber-500">Unsaved</span>
            )}
          </div>
        </div>
      </header>

      {/* ------------------------------------------------------------- */}
      {/* MAIN STUDIO AREA (Sidebar + Slide Canvas)                     */}
      {/* ------------------------------------------------------------- */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar */}
        <SlidesSidebar
          slides={slides}
          selectedSlideId={selectedSlideId}
          onSelectSlide={(id) => setSelectedSlideId(id)}
          onAddSlide={handleAddSlide}
          onDuplicateSlide={handleDuplicateSlide}
          onDeleteSlide={handleDeleteSlide}
          onReorderSlides={handleReorderSlides}
        />

        {/* Center Viewport + Docked Notes Panel */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Center Canvas Viewport */}
          <main className="flex-1 bg-background/50 overflow-y-auto p-4 sm:p-8 md:p-12 flex flex-col items-center justify-center">
            {activeSlide ? (
              <SlideCanvas
                key={activeSlide.id}
                slide={activeSlide}
                slideNumber={activeSlideIndex + 1}
                totalSlides={slides.length}
                onChange={handleSlideContentChange}
              />
            ) : (
              <div className="flex flex-col items-center gap-3 text-muted-foreground">
                <LayoutTemplate className="size-8" />
                <p className="text-sm">No slide selected.</p>
              </div>
            )}
          </main>

          {/* Collapsible Speaker Notes Dock */}
          {activeSlide && (
            <SpeakerNotesPanel
              slideNumber={activeSlideIndex + 1}
              speakerNotes={activeSlide.speakerNotes || ""}
              isOpen={isNotesOpen}
              onToggleOpen={() => setIsNotesOpen((prev) => !prev)}
              onChange={handleSpeakerNotesChange}
            />
          )}
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* PRESENT MODE OVERLAY (FULLSCREEN SLIDESHOW)                   */}
      {/* ------------------------------------------------------------- */}
      {isPresentMode && activeSlide && (
        <div className="fixed inset-0 z-50 bg-black/95 text-white flex flex-col items-center justify-between p-6 sm:p-10 animate-in fade-in duration-200">
          {/* Top Bar Controls */}
          <div className="w-full flex items-center justify-between text-xs text-white/70">
            <span className="font-semibold text-white/90">
              {presentationTitle}
            </span>
            <div className="flex items-center gap-4">
              <span className="font-mono">
                Slide {activeSlideIndex + 1} of {slides.length} (Arrow keys to navigate)
              </span>
              <button
                type="button"
                onClick={() => setIsPresentMode(false)}
                className="p-1 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
                title="Exit Present Mode (Esc)"
              >
                <X className="size-4" />
              </button>
            </div>
          </div>

          {/* Fullscreen 16:9 Canvas */}
          <div className="flex-1 w-full flex items-center justify-center my-4 overflow-hidden">
            <div className="w-full max-w-6xl aspect-[16/9] bg-zinc-900 border border-zinc-800 rounded-2xl p-10 sm:p-16 flex flex-col justify-between shadow-2xl">
              <SlideCanvas
                key={`present-${activeSlide.id}`}
                slide={activeSlide}
                slideNumber={activeSlideIndex + 1}
                totalSlides={slides.length}
                presentMode
              />
            </div>
          </div>

          {/* Bottom Controls */}
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrevSlide}
              disabled={activeSlideIndex <= 0}
              className="h-8 text-xs bg-white/10 border-white/20 text-white hover:bg-white/20"
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleNextSlide}
              disabled={activeSlideIndex >= slides.length - 1}
              className="h-8 text-xs bg-white/10 border-white/20 text-white hover:bg-white/20"
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
