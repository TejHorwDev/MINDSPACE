"use client";

import React, { createContext, useContext } from "react";
import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer, NodeViewWrapper } from "@tiptap/react";
import { AlertTriangle, BookOpen } from "lucide-react";
import { SourceItem, formatInTextCitation } from "@/lib/citations/apa";
import { toast } from "sonner";

// Citation Context to broadcast sources list and click events to NodeViews
export type CitationContextType = {
  sources: SourceItem[];
  onCitationClick?: (sourceId: string) => void;
};

export const CitationContext = createContext<CitationContextType>({
  sources: [],
});

export function useCitationContext() {
  return useContext(CitationContext);
}

// Global registry fallback so node views always have access even if outside context boundary
let globalSourcesMap: Map<string, SourceItem> = new Map();
let globalCitationClickHandler: ((sourceId: string) => void) | null = null;

export function updateGlobalSourcesRegistry(
  sources: SourceItem[],
  onClick?: (sourceId: string) => void
) {
  globalSourcesMap = new Map(sources.map((s) => [s.id, s]));
  if (onClick) {
    globalCitationClickHandler = onClick;
  }
}

/**
 * React NodeView for rendering inline citations
 */
export function CitationNodeComponent(props: any) {
  const { node, extension } = props;
  const sourceId = node.attrs.sourceId as string;
  const initialDisplayText = node.attrs.displayText as string;

  // Try context first, fallback to extension options, fallback to global registry
  const context = useCitationContext();
  const sources =
    context.sources && context.sources.length > 0
      ? context.sources
      : (extension.options?.sources as SourceItem[]) || [];

  const source = sources.find((s) => s.id === sourceId) || globalSourcesMap.get(sourceId);

  // Compute live APA in-text format if source is present
  const liveDisplayText = source
    ? formatInTextCitation(source)
    : initialDisplayText || "(Unknown Source)";

  const isBroken = !source;

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (isBroken) {
      toast.error(
        `Broken citation: The referenced source (${initialDisplayText || sourceId}) was deleted from this document.`,
        {
          description: "Remove this marker or re-add the source in the Sources panel.",
        }
      );
      return;
    }

    if (context.onCitationClick) {
      context.onCitationClick(sourceId);
    } else if (globalCitationClickHandler) {
      globalCitationClickHandler(sourceId);
    }

    // Scroll to reference entry if it exists
    const targetElement = document.getElementById(`ref-${sourceId}`);
    if (targetElement) {
      targetElement.scrollIntoView({ behavior: "smooth", block: "center" });
      targetElement.classList.add("ring-2", "ring-indigo-500", "bg-indigo-500/10");
      setTimeout(() => {
        targetElement.classList.remove("ring-2", "ring-indigo-500", "bg-indigo-500/10");
      }, 2000);
    }
  };

  return (
    <NodeViewWrapper as="span" className="inline-block align-baseline select-none mx-0.5">
      {isBroken ? (
        <span
          onClick={handleClick}
          title="⚠️ Broken citation: Source was deleted from this document."
          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-destructive/10 border border-destructive/40 text-[11px] font-mono font-semibold text-destructive hover:bg-destructive/20 cursor-pointer transition-colors shadow-2xs"
        >
          <AlertTriangle className="size-3 text-destructive shrink-0 animate-pulse" />
          <span>[⚠️ Missing Source: {initialDisplayText || "Deleted"}]</span>
        </span>
      ) : (
        <span
          onClick={handleClick}
          title={`Click to jump to APA reference for: ${source.title}`}
          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-secondary/80 hover:bg-secondary border border-border/80 text-[11px] font-mono font-semibold text-foreground hover:border-indigo-500/60 cursor-pointer transition-all shadow-2xs group"
        >
          <BookOpen className="size-2.5 text-muted-foreground group-hover:text-indigo-400 transition-colors shrink-0" />
          <span>{liveDisplayText}</span>
        </span>
      )}
    </NodeViewWrapper>
  );
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    citation: {
      insertCitation: (options: { sourceId: string; displayText: string }) => ReturnType;
    };
  }
}

export const CitationExtension = Node.create({
  name: "citation",
  group: "inline",
  inline: true,
  atom: true,
  selectable: true,

  addOptions() {
    return {
      sources: [] as SourceItem[],
      onCitationClick: undefined as ((sourceId: string) => void) | undefined,
    };
  },

  addAttributes() {
    return {
      sourceId: {
        default: "",
        parseHTML: (element) => element.getAttribute("data-source-id") || "",
        renderHTML: (attributes) => ({
          "data-source-id": attributes.sourceId,
        }),
      },
      displayText: {
        default: "",
        parseHTML: (element) => element.getAttribute("data-display-text") || "",
        renderHTML: (attributes) => ({
          "data-display-text": attributes.displayText,
        }),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-type="citation"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "span",
      mergeAttributes({ "data-type": "citation" }, HTMLAttributes),
      HTMLAttributes["data-display-text"] || "(Citation)",
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(CitationNodeComponent);
  },

  addCommands() {
    return {
      insertCitation:
        (options: { sourceId: string; displayText: string }) =>
        ({ chain }) => {
          return chain()
            .focus()
            .insertContent({
              type: this.name,
              attrs: {
                sourceId: options.sourceId,
                displayText: options.displayText,
              },
            })
            .insertContent(" ")
            .run();
        },
    };
  },
});
