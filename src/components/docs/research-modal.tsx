"use client";

import React, { useState, useEffect } from "react";
import {
  Sparkles,
  Globe,
  Check,
  AlertTriangle,
  Loader2,
  ExternalLink,
  BookOpen,
  ArrowRight,
  ShieldCheck,
  RotateCcw,
  Search,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SourceItem } from "@/lib/citations/apa";

export interface ProposedSourcePreview {
  tempId: string;
  resultIndex: number;
  title: string;
  url: string;
  publisher: string;
  authors?: string | null;
  publishedDate?: string | null;
  accessedDate: string;
  sourceType: string;
  snippetPreview: string;
  inTextCitation: string;
}

export interface ResearchDraftData {
  topic: string;
  summary: string;
  draftMarkdown: string;
  draftJsonNodes: any[];
  proposedSources: ProposedSourcePreview[];
  searchProviderName: string;
  aiModelName: string;
  creditsCostUSD: number;
  remainingCredits: number;
}

interface ResearchModalProps {
  documentId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApplyResearch: (newSources: SourceItem[], jsonNodes: any[]) => void;
}

export function ResearchModal({
  documentId,
  open,
  onOpenChange,
  onApplyResearch,
}: ResearchModalProps) {
  // Provider Availability state
  const [checkingStatus, setCheckingStatus] = useState(true);
  const [isProviderAvailable, setIsProviderAvailable] = useState(false);
  const [providerName, setProviderName] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Search Input state
  const [topic, setTopic] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchStep, setSearchStep] = useState<1 | 2 | 3>(1);

  // Review Draft state
  const [draftData, setDraftData] = useState<ResearchDraftData | null>(null);
  const [isApplying, setIsApplying] = useState(false);
  const [reviewTab, setReviewTab] = useState<"preview" | "sources">("preview");

  // Check provider status whenever modal opens
  useEffect(() => {
    if (!open) return;

    let mounted = true;
    setCheckingStatus(true);

    fetch(`/api/docs/${documentId}/research/status`)
      .then((res) => res.json())
      .then((data) => {
        if (!mounted) return;
        setIsProviderAvailable(Boolean(data.available));
        setProviderName(data.providerName || null);
        setStatusMessage(data.message || null);
      })
      .catch((err) => {
        if (!mounted) return;
        console.error("Failed to check search status:", err);
        setIsProviderAvailable(false);
        setStatusMessage("Failed to reach server to verify search provider status.");
      })
      .finally(() => {
        if (mounted) setCheckingStatus(false);
      });

    return () => {
      mounted = false;
    };
  }, [documentId, open]);

  // Quick suggestion topics
  const suggestions = [
    "Online Education Challenges in Nepal",
    "Impact of Artificial Intelligence on Higher Education",
    "Renewable Energy Infrastructure in South Asia",
    "Mental Health Support for University Students",
  ];

  const handleStartResearch = async () => {
    if (!topic.trim()) {
      toast.error("Please enter a research topic or question.");
      return;
    }

    setIsSearching(true);
    setSearchStep(1);

    // Dynamic steps simulation for high UX engagement
    const stepTimer1 = setTimeout(() => setSearchStep(2), 1800);
    const stepTimer2 = setTimeout(() => setSearchStep(3), 3600);

    try {
      const res = await fetch(`/api/docs/${documentId}/research`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: topic.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Research failed.");
      }

      setDraftData(data);
      toast.success(
        `Retrieved ${data.proposedSources.length} verified sources and drafted section!`
      );
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to complete AI Auto-Research.");
    } finally {
      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);
      setIsSearching(false);
    }
  };

  const handleRejectDraft = () => {
    setDraftData(null);
    toast.info("Research draft discarded. Your document was not modified.");
  };

  const handleApplyDraft = async () => {
    if (!draftData) return;

    setIsApplying(true);
    try {
      const res = await fetch(`/api/docs/${documentId}/research/apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          proposedSources: draftData.proposedSources,
          draftJsonNodes: draftData.draftJsonNodes,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to apply research to document.");
      }

      onApplyResearch(data.createdSources, data.remappedNodes);

      toast.success(
        `Added research section & ${data.createdSources.length} verified sources to References!`
      );

      // Close modal and reset state
      setDraftData(null);
      setTopic("");
      onOpenChange(false);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to insert research section.");
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-card border-border/80 shadow-2xl p-0 overflow-hidden">
        {/* Header */}
        <DialogHeader className="p-5 pb-4 border-b border-border/70 bg-secondary/30">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="flex size-8 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                <Sparkles className="size-4" />
              </div>
              <div>
                <DialogTitle className="text-sm font-bold text-foreground">
                  AI Auto-Research
                </DialogTitle>
                <DialogDescription className="text-[11px] text-muted-foreground">
                  Real internet search • Grounded facts • Auto-generated APA citations
                </DialogDescription>
              </div>
            </div>

            {/* Provider indicator badge */}
            {isProviderAvailable && providerName && (
              <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <Globe className="size-3" />
                <span>{providerName}</span>
              </span>
            )}
          </div>
        </DialogHeader>

        <div className="p-5 space-y-5">
          {/* 1. CHECKING PROVIDER STATUS */}
          {checkingStatus ? (
            <div className="py-12 flex flex-col items-center justify-center space-y-2 text-center">
              <Loader2 className="size-6 animate-spin text-indigo-400" />
              <p className="text-xs text-muted-foreground">
                Connecting to search provider...
              </p>
            </div>
          ) : !isProviderAvailable ? (
            /* 2. DISABLED STATE: NO SEARCH PROVIDER CONFIGURED */
            <div className="space-y-4 py-2">
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-500 space-y-2">
                <div className="flex items-center gap-2 font-semibold text-xs">
                  <AlertTriangle className="size-4 shrink-0" />
                  <span>Search Provider Not Configured</span>
                </div>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  {statusMessage ||
                    "AI Auto-Research requires a real web search provider (e.g. Tavily, SerpAPI, or Bing) configured in the Admin console to retrieve verifiable real-world sources without hallucinations."}
                </p>
              </div>

              <div className="p-4 rounded-xl bg-secondary/40 border border-border/70 space-y-2">
                <div className="flex items-center gap-2 text-xs font-medium text-foreground">
                  <ShieldCheck className="size-4 text-indigo-400 shrink-0" />
                  <span>MINDSPACE Honesty Guarantee</span>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Unlike generic AI chatbots that invent facts and nonexistent references, Docs Studio will never fabricate citations or synthesize claims without live, verifiable web results.
                </p>
              </div>

              <p className="text-[11px] text-muted-foreground text-center">
                Ask an administrator to configure an active search provider in{" "}
                <code className="text-foreground font-mono">/admin → Search Providers</code>.
              </p>
            </div>
          ) : draftData ? (
            /* 3. DRAFT REVIEW SCREEN (APPLY / REJECT PATTERN) */
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-2 p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-300">
                <div className="flex items-center gap-2 text-xs font-semibold">
                  <ShieldCheck className="size-4 text-indigo-400 shrink-0" />
                  <span>Grounded Section Ready for Review</span>
                </div>
                <span className="text-[10px] font-mono font-medium text-indigo-400">
                  {draftData.proposedSources.length} Sources Cited
                </span>
              </div>

              <Tabs
                value={reviewTab}
                onValueChange={(v) => setReviewTab(v as "preview" | "sources")}
                className="w-full"
              >
                <TabsList className="grid grid-cols-2 h-8 bg-secondary/60">
                  <TabsTrigger value="preview" className="text-xs">
                    Draft Preview & Citations
                  </TabsTrigger>
                  <TabsTrigger value="sources" className="text-xs">
                    Verified Sources ({draftData.proposedSources.length})
                  </TabsTrigger>
                </TabsList>

                {/* Tab 1: Formatted Text Preview */}
                <TabsContent value="preview" className="mt-3">
                  <div className="max-h-[300px] overflow-y-auto p-4 rounded-xl border border-border/80 bg-background text-xs leading-relaxed space-y-3 font-sans select-text">
                    {draftData.summary && (
                      <div className="p-2.5 rounded-lg bg-secondary/50 border border-border/70 text-[11px] italic text-muted-foreground">
                        {draftData.summary}
                      </div>
                    )}
                    <div className="whitespace-pre-wrap font-sans text-foreground leading-relaxed">
                      {draftData.draftMarkdown}
                    </div>
                  </div>
                </TabsContent>

                {/* Tab 2: Sources Cards */}
                <TabsContent value="sources" className="mt-3">
                  <div className="max-h-[300px] overflow-y-auto space-y-2.5 pr-1">
                    {draftData.proposedSources.map((s, idx) => (
                      <div
                        key={s.tempId || idx}
                        className="p-3 rounded-xl border border-border/80 bg-secondary/30 space-y-1.5"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="font-semibold text-xs text-foreground leading-tight">
                            {s.title}
                          </span>
                          <span className="font-mono text-[10px] font-bold text-indigo-400 shrink-0 px-1.5 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20">
                            {s.inTextCitation}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                          <span className="font-medium text-foreground">{s.publisher}</span>
                          {s.publishedDate && (
                            <>
                              <span>•</span>
                              <span>{s.publishedDate}</span>
                            </>
                          )}
                        </div>

                        {s.snippetPreview && (
                          <p className="text-[11px] text-muted-foreground/90 line-clamp-2 leading-relaxed bg-background/50 p-1.5 rounded border border-border/50">
                            &quot;{s.snippetPreview}&quot;
                          </p>
                        )}

                        <a
                          href={s.url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-[10px] text-indigo-400 hover:underline pt-0.5"
                        >
                          <Globe className="size-2.5" />
                          <span className="truncate max-w-[280px]">{s.url}</span>
                          <ExternalLink className="size-2.5 shrink-0" />
                        </a>
                      </div>
                    ))}
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          ) : (
            /* 4. TOPIC INPUT FORM */
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-foreground">
                  What topic or inquiry would you like to research?
                </Label>
                <div className="relative">
                  <Input
                    placeholder="e.g. Online Education Challenges in Nepal..."
                    value={topic}
                    disabled={isSearching}
                    onChange={(e) => setTopic(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !isSearching && topic.trim()) {
                        handleStartResearch();
                      }
                    }}
                    className="h-9 pr-9 text-xs bg-secondary/50 border-border/80 focus:border-indigo-500/80"
                  />
                  <Search className="size-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                </div>
              </div>

              {/* Quick Suggestions */}
              <div className="space-y-1.5">
                <span className="text-[11px] text-muted-foreground font-medium">
                  Suggested topics:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {suggestions.map((s, idx) => (
                    <button
                      key={idx}
                      type="button"
                      disabled={isSearching}
                      onClick={() => setTopic(s)}
                      className="text-[11px] px-2.5 py-1 rounded-lg bg-secondary/60 hover:bg-secondary border border-border/70 text-muted-foreground hover:text-foreground text-left cursor-pointer transition-colors"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Progress step bar during live search */}
              {isSearching && (
                <div className="p-4 rounded-xl bg-secondary/40 border border-border/80 space-y-2.5 animate-pulse">
                  <div className="flex items-center justify-between text-xs font-medium">
                    <span className="text-foreground">Researching live internet...</span>
                    <span className="font-mono text-[10px] text-indigo-400">Step {searchStep} of 3</span>
                  </div>

                  <div className="space-y-1 text-[11px]">
                    <div
                      className={`flex items-center gap-2 ${
                        searchStep >= 1 ? "text-indigo-400 font-medium" : "text-muted-foreground"
                      }`}
                    >
                      {searchStep > 1 ? (
                        <Check className="size-3 text-emerald-400" />
                      ) : (
                        <Loader2 className="size-3 animate-spin" />
                      )}
                      <span>1. Searching the live web via {providerName || "search engine"}...</span>
                    </div>

                    <div
                      className={`flex items-center gap-2 ${
                        searchStep >= 2 ? "text-indigo-400 font-medium" : "text-muted-foreground"
                      }`}
                    >
                      {searchStep > 2 ? (
                        <Check className="size-3 text-emerald-400" />
                      ) : searchStep === 2 ? (
                        <Loader2 className="size-3 animate-spin" />
                      ) : (
                        <span className="size-3 rounded-full border border-border" />
                      )}
                      <span>2. Extracting verified facts and eliminating ungrounded claims...</span>
                    </div>

                    <div
                      className={`flex items-center gap-2 ${
                        searchStep >= 3 ? "text-indigo-400 font-medium" : "text-muted-foreground"
                      }`}
                    >
                      {searchStep === 3 ? (
                        <Loader2 className="size-3 animate-spin" />
                      ) : (
                        <span className="size-3 rounded-full border border-border" />
                      )}
                      <span>3. Drafting section and generating real APA in-text citations...</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Pricing & Credit Notice */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-secondary/30 border border-border/60 text-[11px] text-muted-foreground">
                <span>Draws from your standard AI credit balance</span>
                <span className="font-mono text-foreground font-semibold">
                  ~0.85 credits
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <DialogFooter className="p-4 border-t border-border/70 bg-secondary/20 gap-2">
          {draftData ? (
            /* Review Mode: Apply / Reject */
            <div className="flex items-center justify-between w-full gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRejectDraft}
                disabled={isApplying}
                className="h-8 px-3.5 text-xs text-muted-foreground hover:text-foreground border-border/80"
              >
                <RotateCcw className="size-3 mr-1.5" />
                Reject Draft
              </Button>

              <Button
                size="sm"
                onClick={handleApplyDraft}
                disabled={isApplying}
                className="h-8 px-4 text-xs font-semibold bg-foreground text-background hover:bg-foreground/90 shadow-xs"
              >
                {isApplying ? (
                  <>
                    <Loader2 className="size-3 mr-1.5 animate-spin" />
                    Inserting Section...
                  </>
                ) : (
                  <>
                    <Check className="size-3 mr-1.5" />
                    Insert into Document
                  </>
                )}
              </Button>
            </div>
          ) : (
            /* Input Mode: Cancel / Start Research */
            <div className="flex items-center justify-end w-full gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onOpenChange(false)}
                disabled={isSearching}
                className="h-8 text-xs"
              >
                Cancel
              </Button>

              <Button
                size="sm"
                disabled={isSearching || !isProviderAvailable || !topic.trim()}
                onClick={handleStartResearch}
                className="h-8 px-4 text-xs font-semibold bg-foreground text-background hover:bg-foreground/90 shadow-xs"
              >
                {isSearching ? (
                  <>
                    <Loader2 className="size-3 mr-1.5 animate-spin" />
                    Searching Live Web...
                  </>
                ) : (
                  <>
                    <Sparkles className="size-3 mr-1.5" />
                    Start Auto-Research
                  </>
                )}
              </Button>
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
