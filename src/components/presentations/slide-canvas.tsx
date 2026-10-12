"use client";

import React from "react";
import { SlideItem } from "@/lib/presentations/types";
import { SlideTextRegion } from "./slide-text-region";
import { SlideImageRegion } from "./slide-image-region";
import { cn } from "@/lib/utils";

interface SlideCanvasProps {
  slide: SlideItem;
  slideNumber: number;
  totalSlides: number;
  onChange?: (updatedContentJson: any) => void;
  presentMode?: boolean;
  exportMode?: boolean;
}

export function SlideCanvas({
  slide,
  slideNumber,
  totalSlides,
  onChange,
  presentMode = false,
  exportMode = false,
}: SlideCanvasProps) {
  const content = slide.contentJson || {};

  const handleUpdateField = (key: string, value: any) => {
    if (!onChange) return;
    const nextContent = {
      ...content,
      [key]: value,
    };
    onChange(nextContent);
  };

  const handleUpdateImage = ({
    imageUrl,
    imageAlt,
  }: {
    imageUrl: string;
    imageAlt?: string;
  }) => {
    if (!onChange) return;
    const nextContent = {
      ...content,
      imageUrl,
      imageAlt: imageAlt || content.imageAlt || "",
    };
    onChange(nextContent);
  };

  return (
    <div
      className={cn(
        "w-full max-w-4xl aspect-[16/9] rounded-2xl border border-border/80 bg-card text-card-foreground shadow-2xl relative flex flex-col justify-between overflow-hidden transition-all select-text",
        presentMode
          ? "max-w-none w-full h-full max-h-[92vh] rounded-none border-none shadow-none p-10 md:p-16 lg:p-20"
          : exportMode
          ? "max-w-none w-full h-full rounded-none border-none shadow-none p-12 bg-card text-card-foreground"
          : "p-8 sm:p-10 md:p-14"
      )}
      style={{
        boxShadow:
          presentMode || exportMode
            ? "none"
            : "0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(255, 255, 255, 0.05)",
      }}
    >
      {/* ------------------------------------------------------------- */}
      {/* 1. TITLE SLIDE LAYOUT                                         */}
      {/* ------------------------------------------------------------- */}
      {slide.layoutType === "title" && (
        <div className="flex-1 flex flex-col justify-center items-center text-center max-w-3xl mx-auto w-full my-auto space-y-4">
          <div className="w-full">
            <SlideTextRegion
              content={content.title}
              onChange={(json) => handleUpdateField("title", json)}
              placeholder="Presentation Title"
              headingLevel={1}
              className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-foreground text-center"
            />
          </div>
          <div className="w-full max-w-xl">
            <SlideTextRegion
              content={content.subtitle}
              onChange={(json) => handleUpdateField("subtitle", json)}
              placeholder="Subtitle, presenter name, or date"
              className="text-base sm:text-lg md:text-xl text-muted-foreground font-medium text-center"
            />
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 2. TITLE + CONTENT LAYOUT                                     */}
      {/* ------------------------------------------------------------- */}
      {slide.layoutType === "title-content" && (
        <div className="flex-1 flex flex-col justify-start w-full space-y-6">
          <div className="pb-3 border-b border-border/50">
            <SlideTextRegion
              content={content.heading}
              onChange={(json) => handleUpdateField("heading", json)}
              placeholder="Slide Heading"
              headingLevel={2}
              className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground"
            />
          </div>
          <div className="flex-1 overflow-auto">
            <SlideTextRegion
              content={content.body}
              onChange={(json) => handleUpdateField("body", json)}
              placeholder="Click to add slide content or bullet points..."
              className="text-sm sm:text-base md:text-lg leading-relaxed text-foreground/90"
              minHeight="140px"
            />
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 3. TWO-COLUMN LAYOUT                                          */}
      {/* ------------------------------------------------------------- */}
      {slide.layoutType === "two-column" && (
        <div className="flex-1 flex flex-col justify-start w-full space-y-6">
          <div className="pb-3 border-b border-border/50">
            <SlideTextRegion
              content={content.heading}
              onChange={(json) => handleUpdateField("heading", json)}
              placeholder="Slide Heading"
              headingLevel={2}
              className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground"
            />
          </div>
          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6 overflow-auto">
            <div className="rounded-xl p-3 bg-secondary/15 border border-border/40 flex flex-col">
              <SlideTextRegion
                content={content.col1}
                onChange={(json) => handleUpdateField("col1", json)}
                placeholder="Left column points..."
                className="text-sm sm:text-base leading-relaxed text-foreground/90 flex-1"
                minHeight="120px"
              />
            </div>
            <div className="rounded-xl p-3 bg-secondary/15 border border-border/40 flex flex-col">
              <SlideTextRegion
                content={content.col2}
                onChange={(json) => handleUpdateField("col2", json)}
                placeholder="Right column points..."
                className="text-sm sm:text-base leading-relaxed text-foreground/90 flex-1"
                minHeight="120px"
              />
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 4. IMAGE + TEXT LAYOUT                                        */}
      {/* ------------------------------------------------------------- */}
      {slide.layoutType === "image-text" && (
        <div className="flex-1 flex flex-col justify-start w-full space-y-6">
          <div className="pb-3 border-b border-border/50">
            <SlideTextRegion
              content={content.heading}
              onChange={(json) => handleUpdateField("heading", json)}
              placeholder="Slide Heading"
              headingLevel={2}
              className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground"
            />
          </div>
          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch overflow-auto">
            <div className="h-full flex items-center justify-center">
              <SlideImageRegion
                imageUrl={content.imageUrl}
                imageAlt={content.imageAlt}
                onChange={handleUpdateImage}
                readOnly={exportMode}
                className="h-full w-full max-h-[300px]"
              />
            </div>
            <div className="flex flex-col justify-center overflow-auto">
              <SlideTextRegion
                content={content.body}
                onChange={(json) => handleUpdateField("body", json)}
                placeholder="Accompanying explanation or commentary..."
                className="text-sm sm:text-base leading-relaxed text-foreground/90"
                minHeight="120px"
              />
            </div>
          </div>
        </div>
      )}

      {/* Slide Footer Chrome (Slide number & subtle watermark) */}
      <div className="mt-4 pt-2 border-t border-border/20 flex items-center justify-between text-[11px] text-muted-foreground/60 select-none">
        <span className="font-mono">MINDSPACE Studio</span>
        <span className="font-mono font-semibold">
          {slideNumber} / {totalSlides}
        </span>
      </div>
    </div>
  );
}
