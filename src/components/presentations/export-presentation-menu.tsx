"use client";

import React, { useState, useRef } from "react";
import {
  Download,
  FileText,
  Presentation,
  Loader2,
  ChevronDown,
  Info,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import { toPng } from "html-to-image";
import { jsPDF } from "jspdf";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SlideItem } from "@/lib/presentations/types";
import { SlideCanvas } from "./slide-canvas";
import { cn } from "@/lib/utils";

interface ExportPresentationMenuProps {
  presentationId: string;
  presentationTitle: string;
  slides: SlideItem[];
}

export function ExportPresentationMenu({
  presentationId,
  presentationTitle,
  slides,
}: ExportPresentationMenuProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [exportingFormat, setExportingFormat] = useState<"pptx" | "pdf" | null>(
    null
  );
  const [loadingMessage, setLoadingMessage] = useState("");
  const [renderSlideIdx, setRenderSlideIdx] = useState<number | null>(null);

  // Hidden container ref used for rendering slides off-screen during PDF export
  const hiddenCanvasRef = useRef<HTMLDivElement | null>(null);

  const safeFilename =
    presentationTitle
      .replace(/[/\\?%*:|"<>]/g, "-")
      .replace(/\s+/g, "_")
      .trim() || "presentation";

  // --------------------------------------------------------------------------
  // 1. PPTX EXPORT (via backend generator with speaker notes)
  // --------------------------------------------------------------------------
  const handleExportPptx = async () => {
    if (isExporting) return;
    setIsExporting(true);
    setExportingFormat("pptx");
    setLoadingMessage("Building PowerPoint deck with speaker notes...");

    try {
      const res = await fetch(`/api/presentations/${presentationId}/export/pptx`);
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to generate PowerPoint file.");
      }

      const blob = await res.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = `${safeFilename}.pptx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);

      toast.success("PowerPoint presentation downloaded successfully!");
    } catch (err: any) {
      console.error("PPTX export error:", err);
      toast.error(err.message || "Failed to export PowerPoint presentation.");
    } finally {
      setIsExporting(false);
      setExportingFormat(null);
      setLoadingMessage("");
    }
  };

  // --------------------------------------------------------------------------
  // 2. PDF EXPORT (High-fidelity slide render, 1 slide per page, slides only)
  // --------------------------------------------------------------------------
  const handleExportPdf = async () => {
    if (isExporting) return;
    setIsExporting(true);
    setExportingFormat("pdf");
    setLoadingMessage("Preparing visual slide rendering...");

    try {
      if (!slides || slides.length === 0) {
        throw new Error("No slides to export.");
      }

      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "px",
        format: [1280, 720],
        compress: true,
      });

      let capturedWithDom = false;

      // Try capturing off-screen rendered slides for exact WYSIWYG fidelity
      if (hiddenCanvasRef.current) {
        try {
          for (let i = 0; i < slides.length; i++) {
            setLoadingMessage(`Rendering slide ${i + 1} of ${slides.length}...`);
            setRenderSlideIdx(i);

            // Allow DOM repaint
            await new Promise((resolve) => setTimeout(resolve, 80));

            const slideNode = hiddenCanvasRef.current.querySelector(
              "[data-export-slide]"
            ) as HTMLElement | null;

            if (slideNode) {
              const dataUrl = await toPng(slideNode, {
                pixelRatio: 2,
                cacheBust: true,
                backgroundColor: "#ffffff",
              });

              if (i > 0) {
                pdf.addPage([1280, 720], "landscape");
              }
              pdf.addImage(
                dataUrl,
                "PNG",
                0,
                0,
                1280,
                720,
                undefined,
                "FAST"
              );
            }
          }
          capturedWithDom = true;
        } catch (domErr) {
          console.warn("DOM PDF capture fallback triggered:", domErr);
          capturedWithDom = false;
        }
      }

      // If client capture succeeded, save the PDF directly
      if (capturedWithDom) {
        setLoadingMessage("Saving PDF document...");
        pdf.save(`${safeFilename}.pdf`);
        toast.success("PDF exported successfully!");
      } else {
        // Fallback to server-side endpoint if DOM canvas was blocked
        setLoadingMessage("Fetching presentation PDF...");
        const res = await fetch(
          `/api/presentations/${presentationId}/export/pdf`
        );
        if (!res.ok) {
          throw new Error("Failed to export PDF presentation.");
        }
        const blob = await res.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = downloadUrl;
        link.download = `${safeFilename}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(downloadUrl);
        toast.success("PDF presentation downloaded!");
      }
    } catch (err: any) {
      console.error("PDF export error:", err);
      toast.error(err.message || "Failed to export PDF presentation.");
    } finally {
      setIsExporting(false);
      setExportingFormat(null);
      setLoadingMessage("");
      setRenderSlideIdx(null);
    }
  };

  const currentRenderingSlide =
    renderSlideIdx !== null && slides[renderSlideIdx]
      ? slides[renderSlideIdx]
      : null;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            disabled={isExporting}
            className={cn(
              "h-8 px-2.5 text-xs font-medium border-border/80 cursor-pointer gap-1.5 transition-colors",
              isExporting && "opacity-80"
            )}
            title="Export presentation as PPTX or PDF"
          >
            {isExporting ? (
              <Loader2 className="size-3.5 animate-spin text-primary" />
            ) : (
              <Download className="size-3.5 text-muted-foreground" />
            )}
            <span className="hidden sm:inline">Export</span>
            <ChevronDown className="size-3 text-muted-foreground ml-0.5" />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-72 p-1.5 shadow-lg">
          <DropdownMenuLabel className="text-xs font-semibold px-2 py-1 flex items-center justify-between">
            <span>Export Presentation</span>
            <span className="text-[10px] font-mono text-muted-foreground">
              {slides.length} {slides.length === 1 ? "slide" : "slides"}
            </span>
          </DropdownMenuLabel>

          <DropdownMenuSeparator />

          {/* Option 1: PPTX */}
          <DropdownMenuItem
            onClick={handleExportPptx}
            disabled={isExporting}
            className="flex items-start gap-2.5 p-2 rounded-md cursor-pointer hover:bg-secondary/70 focus:bg-secondary/70 group"
          >
            <div className="size-8 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-amber-500/20 transition-colors">
              <Presentation className="size-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-foreground">
                  PowerPoint (.pptx)
                </span>
                <span className="text-[10px] font-mono px-1 rounded bg-secondary text-muted-foreground border border-border/50">
                  PPTX
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">
                Editable presentation · Includes private speaker notes
              </p>
            </div>
          </DropdownMenuItem>

          {/* Option 2: PDF */}
          <DropdownMenuItem
            onClick={handleExportPdf}
            disabled={isExporting}
            className="flex items-start gap-2.5 p-2 rounded-md cursor-pointer hover:bg-secondary/70 focus:bg-secondary/70 group mt-1"
          >
            <div className="size-8 rounded-md bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-rose-500/20 transition-colors">
              <FileText className="size-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-foreground">
                  PDF Document (.pdf)
                </span>
                <span className="text-[10px] font-mono px-1 rounded bg-secondary text-muted-foreground border border-border/50">
                  PDF
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">
                16:9 slides · One per page (slides only, clean for sharing)
              </p>
            </div>
          </DropdownMenuItem>

          <DropdownMenuSeparator className="my-1.5" />

          {/* Note Callout */}
          <div className="p-2 bg-muted/40 rounded-md border border-border/40 text-[11px] text-muted-foreground flex items-start gap-1.5">
            <Info className="size-3.5 text-primary shrink-0 mt-0.5" />
            <p className="leading-snug">
              <strong>PowerPoint</strong> includes your speaker notes.{" "}
              <strong>PDF</strong> is formatted for audience presentation and
              excludes notes.
            </p>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* ------------------------------------------------------------- */}
      {/* FLOATING EXPORT PROGRESS OVERLAY                              */}
      {/* ------------------------------------------------------------- */}
      {isExporting && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl bg-card/95 border border-border/80 shadow-2xl backdrop-blur-md animate-in slide-in-from-bottom-3 duration-200">
          <Loader2 className="size-4 animate-spin text-primary shrink-0" />
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-foreground">
              {exportingFormat === "pptx"
                ? "Exporting PowerPoint (.pptx)"
                : "Exporting Presentation PDF"}
            </span>
            <span className="text-[11px] text-muted-foreground">
              {loadingMessage}
            </span>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* OFF-SCREEN HIGH-FIDELITY 16:9 SLIDE CONTAINER FOR PDF CAPTURE */}
      {/* ------------------------------------------------------------- */}
      <div
        ref={hiddenCanvasRef}
        aria-hidden="true"
        className="fixed -left-[9999px] top-0 pointer-events-none select-none z-[-100] opacity-100"
        style={{ width: "1280px", height: "720px", overflow: "hidden" }}
      >
        {currentRenderingSlide && (
          <div
            data-export-slide="true"
            style={{ width: "1280px", height: "720px" }}
            className="w-[1280px] h-[720px] bg-background text-foreground flex flex-col justify-between overflow-hidden"
          >
            <SlideCanvas
              slide={currentRenderingSlide}
              slideNumber={(renderSlideIdx ?? 0) + 1}
              totalSlides={slides.length}
              exportMode={true}
            />
          </div>
        )}
      </div>
    </>
  );
}
