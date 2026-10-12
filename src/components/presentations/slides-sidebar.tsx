"use client";

import React, { useState } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import {
  Plus,
  Heading1,
  LayoutTemplate,
  Columns2,
  Image as ImageIcon,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { SlideItem, SlideLayoutType, STARTER_LAYOUTS } from "@/lib/presentations/types";
import { SortableSlideThumbnail } from "./sortable-slide-thumbnail";
import { cn } from "@/lib/utils";

interface SlidesSidebarProps {
  slides: SlideItem[];
  selectedSlideId: string;
  onSelectSlide: (slideId: string) => void;
  onAddSlide: (layoutType: SlideLayoutType) => void;
  onDuplicateSlide: (slideId: string) => void;
  onDeleteSlide: (slideId: string) => void;
  onReorderSlides: (reorderedSlideIds: string[]) => void;
  className?: string;
}

function getLayoutOptionIcon(type: SlideLayoutType) {
  switch (type) {
    case "title":
      return <Heading1 className="size-4 text-blue-500" />;
    case "title-content":
      return <LayoutTemplate className="size-4 text-emerald-500" />;
    case "two-column":
      return <Columns2 className="size-4 text-amber-500" />;
    case "image-text":
      return <ImageIcon className="size-4 text-purple-500" />;
  }
}

export function SlidesSidebar({
  slides,
  selectedSlideId,
  onSelectSlide,
  onAddSlide,
  onDuplicateSlide,
  onDeleteSlide,
  onReorderSlides,
  className,
}: SlidesSidebarProps) {
  const [isAddPopoverOpen, setIsAddPopoverOpen] = useState(false);
  const [slideToDelete, setSlideToDelete] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = slides.findIndex((s) => s.id === active.id);
      const newIndex = slides.findIndex((s) => s.id === over.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        const reordered = arrayMove(slides, oldIndex, newIndex);
        onReorderSlides(reordered.map((s) => s.id));
      }
    }
  };

  const handleConfirmDelete = () => {
    if (slideToDelete) {
      onDeleteSlide(slideToDelete);
      setSlideToDelete(null);
    }
  };

  return (
    <aside
      className={cn(
        "w-64 sm:w-72 border-r border-border/80 bg-card/60 backdrop-blur-md flex flex-col h-full shrink-0 select-none",
        className
      )}
    >
      {/* Sidebar Header */}
      <div className="p-3.5 border-b border-border/70 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-xs text-foreground tracking-wide uppercase font-mono">
            Slides
          </span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-secondary text-muted-foreground border border-border/60">
            {slides.length}
          </span>
        </div>

        {/* Add Slide Popover with 4 Layouts */}
        <Popover open={isAddPopoverOpen} onOpenChange={setIsAddPopoverOpen}>
          <PopoverTrigger asChild>
            <Button
              size="sm"
              variant="default"
              className="h-7 px-2.5 text-xs font-semibold gap-1 bg-foreground text-background hover:bg-foreground/90 shadow-2xs cursor-pointer"
            >
              <Plus className="size-3.5" />
              <span>Add Slide</span>
              <ChevronDown className="size-3 opacity-60 ml-0.5" />
            </Button>
          </PopoverTrigger>
          <PopoverContent
            align="end"
            className="w-64 p-2 bg-card border-border/80 rounded-2xl shadow-xl space-y-1"
          >
            <div className="px-2 py-1 text-[11px] font-medium text-muted-foreground">
              Choose Slide Layout
            </div>
            {STARTER_LAYOUTS.map((layout) => (
              <button
                key={layout.type}
                type="button"
                onClick={() => {
                  onAddSlide(layout.type);
                  setIsAddPopoverOpen(false);
                }}
                className="w-full flex items-start gap-2.5 p-2 rounded-xl text-left hover:bg-secondary/70 transition-colors cursor-pointer group"
              >
                <div className="p-1.5 rounded-lg bg-secondary border border-border/60 group-hover:border-foreground/20 shrink-0">
                  {getLayoutOptionIcon(layout.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-foreground">
                    {layout.name}
                  </p>
                  <p className="text-[10px] text-muted-foreground line-clamp-1">
                    {layout.description}
                  </p>
                </div>
              </button>
            ))}
          </PopoverContent>
        </Popover>
      </div>

      {/* Slide Thumbnails Sortable List */}
      <div className="flex-1 overflow-y-auto p-2.5 space-y-1.5">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={slides.map((s) => s.id)}
            strategy={verticalListSortingStrategy}
          >
            {slides.map((slide, index) => (
              <SortableSlideThumbnail
                key={slide.id}
                slide={slide}
                index={index}
                isSelected={slide.id === selectedSlideId}
                onSelect={() => onSelectSlide(slide.id)}
                onDuplicate={() => onDuplicateSlide(slide.id)}
                onDelete={() => setSlideToDelete(slide.id)}
                canDelete={slides.length > 1}
              />
            ))}
          </SortableContext>
        </DndContext>
      </div>

      {/* Delete Confirmation Alert Dialog */}
      <AlertDialog
        open={Boolean(slideToDelete)}
        onOpenChange={(open) => !open && setSlideToDelete(null)}
      >
        <AlertDialogContent className="bg-card border-border/80">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-sm font-bold text-foreground">
              Delete this slide?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground">
              This will remove the slide and its content from your presentation deck. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="text-xs h-8">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="text-xs h-8 bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Slide
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </aside>
  );
}
