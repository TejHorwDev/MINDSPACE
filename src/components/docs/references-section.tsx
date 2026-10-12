"use client";

import React, { useState } from "react";
import { Copy, Check, ExternalLink, AlertTriangle, BookOpen, Quote, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  SourceItem,
  formatApaReference,
  sortSourcesAlphabetically,
  extractCitedSourceIds,
  countCitationsBySource,
} from "@/lib/citations/apa";

type ReferencesSectionProps = {
  sources: SourceItem[];
  contentJson: any;
  onOpenSourcesPanel?: () => void;
  onHighlightSource?: (sourceId: string) => void;
};

export function ReferencesSection({
  sources,
  contentJson,
  onOpenSourcesPanel,
}: ReferencesSectionProps) {
  const [copied, setCopied] = useState(false);
  const [filterMode, setFilterMode] = useState<"cited" | "all">("all");

  const citedIds = extractCitedSourceIds(contentJson);
  const citationCounts = countCitationsBySource(contentJson);

  // Check for broken citations (citedIds that don't exist in sources)
  const existingSourceIds = new Set(sources.map((s) => s.id));
  const brokenCitationIds = citedIds.filter((id) => !existingSourceIds.has(id));
  const brokenCount = brokenCitationIds.length;

  // Filter sources according to filter mode
  const filteredSources =
    filterMode === "cited" ? sources.filter((s) => citedIds.includes(s.id)) : sources;

  const sortedSources = sortSourcesAlphabetically(filteredSources);
  const referenceEntries = sortedSources.map((s) => formatApaReference(s));

  // Copy plain text APA bibliography to clipboard
  const handleCopyBibliography = async () => {
    if (referenceEntries.length === 0) {
      toast.error("No references to copy");
      return;
    }

    const plainText = referenceEntries.map((r) => r.formattedText).join("\n\n");

    try {
      await navigator.clipboard.writeText(plainText);
      setCopied(true);
      toast.success("APA References copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy references");
    }
  };

  return (
    <section
      id="document-references-section"
      className="mt-12 pt-8 border-t border-border/80 text-foreground space-y-6"
    >
      {/* Broken Citation Alert Banner */}
      {brokenCount > 0 && (
        <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 flex items-start gap-3 text-xs text-destructive animate-in fade-in duration-200">
          <AlertTriangle className="size-4 shrink-0 mt-0.5 animate-pulse" />
          <div className="flex-1 space-y-1">
            <span className="font-bold text-sm block">
              Broken Citation Warning ({brokenCount} dangling reference{brokenCount > 1 ? "s" : ""})
            </span>
            <p className="text-muted-foreground leading-relaxed">
              Your document text contains in-text citations that point to sources that were deleted.
              They are highlighted with warning badges in the editor. Remove them or re-add the
              corresponding sources.
            </p>
          </div>
        </div>
      )}

      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-border/60">
        <div className="flex items-center gap-2.5">
          <h2 className="text-xl font-bold tracking-tight text-foreground">References</h2>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-secondary border border-border/70 text-muted-foreground">
            APA 7th Edition
          </span>
          <span className="text-xs text-muted-foreground font-mono">
            ({referenceEntries.length} {referenceEntries.length === 1 ? "source" : "sources"})
          </span>
        </div>

        {/* Top Controls */}
        <div className="flex items-center gap-2">
          {/* Filter toggle */}
          <div className="inline-flex items-center rounded-lg border border-border/70 p-0.5 bg-secondary/50 text-[11px]">
            <button
              type="button"
              onClick={() => setFilterMode("all")}
              className={`px-2.5 py-1 rounded-md transition-all cursor-pointer font-medium ${
                filterMode === "all"
                  ? "bg-background text-foreground shadow-2xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              All Sources ({sources.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterMode("cited")}
              className={`px-2.5 py-1 rounded-md transition-all cursor-pointer font-medium ${
                filterMode === "cited"
                  ? "bg-background text-foreground shadow-2xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Cited Only ({sources.filter((s) => citedIds.includes(s.id)).length})
            </button>
          </div>

          {/* Copy Button */}
          {referenceEntries.length > 0 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCopyBibliography}
              className="h-7 px-2.5 text-xs border-border/80 hover:bg-secondary cursor-pointer gap-1.5"
              title="Copy formatted APA references to clipboard"
            >
              {copied ? (
                <>
                  <Check className="size-3 text-emerald-500" />
                  <span>Copied</span>
                </>
              ) : (
                <>
                  <Copy className="size-3 text-muted-foreground" />
                  <span>Copy References</span>
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* References List */}
      {referenceEntries.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/80 bg-secondary/20 p-8 text-center space-y-3">
          <BookOpen className="size-8 text-muted-foreground mx-auto opacity-50" />
          <h3 className="text-sm font-semibold text-foreground">No references to display</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto leading-relaxed">
            {sources.length === 0
              ? "Add sources to this document using the Sources panel on the right, then cite them in your text."
              : "No sources from your library have been cited in the text yet. Click the 'Cite' button in the Sources panel to reference them."}
          </p>
          {onOpenSourcesPanel && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onOpenSourcesPanel}
              className="mt-2 text-xs h-8 border-border/80"
            >
              <Quote className="size-3 mr-1 text-muted-foreground" />
              Open Sources Panel
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-4 font-serif text-sm leading-relaxed text-foreground/90">
          {referenceEntries.map((entry) => {
            const citeCount = citationCounts[entry.sourceId] || 0;
            return (
              <div
                key={entry.id}
                id={`ref-${entry.sourceId}`}
                className="group relative pl-8 -indent-8 transition-colors rounded-lg p-2.5 -ml-2.5 hover:bg-secondary/40"
              >
                {/* Reference text with APA italics */}
                <div
                  className="inline"
                  dangerouslySetInnerHTML={{ __html: entry.formattedHtml }}
                />

                {/* Citation Count Badge */}
                <span className="inline-block indent-0 ml-2 select-none align-baseline">
                  {citeCount > 0 ? (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-full text-[10px] font-sans font-mono bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                      Cited {citeCount}×
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-1.5 py-0.2 rounded-full text-[10px] font-sans font-mono bg-secondary text-muted-foreground border border-border/60">
                      Uncited
                    </span>
                  )}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
