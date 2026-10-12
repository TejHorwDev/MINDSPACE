"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEditor, EditorContent } from "@tiptap/react";
import { StarterKit } from "@tiptap/starter-kit";
import { Underline } from "@tiptap/extension-underline";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";

import {
  ArrowLeft,
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  List,
  ListOrdered,
  Quote,
  Code,
  Minus,
  Table as TableIcon,
  Plus,
  Undo,
  Redo,
  Check,
  Loader2,
  Clock,
  AlertTriangle,
  ChevronDown,
  BookOpen,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import {
  CitationExtension,
  CitationContext,
  updateGlobalSourcesRegistry,
} from "./citation-extension";
import { SourcesSidebar } from "./sources-sidebar";
import { ReferencesSection } from "./references-section";
import { ResearchModal } from "./research-modal";
import { SourceItem, formatInTextCitation } from "@/lib/citations/apa";

interface DocumentEditorViewProps {
  documentId: string;
  initialTitle: string;
  initialContentJson: any;
  initialSources?: SourceItem[];
  updatedAt: string | Date;
}

type SaveStatus = "saved" | "saving" | "unsaved" | "error";

export function DocumentEditorView({
  documentId,
  initialTitle,
  initialContentJson,
  initialSources = [],
}: DocumentEditorViewProps) {
  const router = useRouter();
  const [title, setTitle] = useState(initialTitle || "Untitled Document");
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("saved");
  const [wordCount, setWordCount] = useState<number>(0);
  const [charCount, setCharCount] = useState<number>(0);

  // Sources and Citations state
  const [sources, setSources] = useState<SourceItem[]>(initialSources);
  const [isSourcesOpen, setIsSourcesOpen] = useState(false);
  const [isResearchOpen, setIsResearchOpen] = useState(false);
  const [contentJson, setContentJson] = useState<any>(initialContentJson || null);
  const [highlightedSourceId, setHighlightedSourceId] = useState<string | null>(null);

  const saveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const currentTitleRef = useRef(title);
  currentTitleRef.current = title;

  // Persist save to server
  const saveDocument = useCallback(
    async (jsonContent: any, docTitle: string) => {
      setSaveStatus("saving");
      try {
        const res = await fetch(`/api/docs/${documentId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: docTitle.trim() || "Untitled Document",
            contentJson: jsonContent,
          }),
        });

        if (!res.ok) {
          throw new Error("Failed to auto-save document.");
        }

        setSaveStatus("saved");
      } catch (err) {
        console.error("Auto-save error:", err);
        setSaveStatus("error");
        toast.error("Auto-save failed. Check connection.");
      }
    },
    [documentId]
  );

  // Initialize Tiptap with Citation Extension
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Underline,
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
      CitationExtension.configure({
        sources,
        onCitationClick: (sourceId) => {
          setHighlightedSourceId(sourceId);
          setIsSourcesOpen(true);
        },
      }),
    ],
    content: initialContentJson || {
      type: "doc",
      content: [{ type: "paragraph" }],
    },
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: "tiptap focus:outline-hidden",
      },
    },
    onUpdate: ({ editor }) => {
      setSaveStatus("unsaved");

      const json = editor.getJSON();
      setContentJson(json);

      // Update word & character count
      const text = editor.getText();
      const words = text.trim() ? text.trim().split(/\s+/).filter(Boolean).length : 0;
      setWordCount(words);
      setCharCount(text.length);

      // Debounced auto-save (1200ms)
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
      saveTimerRef.current = setTimeout(() => {
        saveDocument(json, currentTitleRef.current);
      }, 1200);
    },
  });

  // Calculate initial word count on mount
  useEffect(() => {
    if (editor) {
      const text = editor.getText();
      const words = text.trim() ? text.trim().split(/\s+/).filter(Boolean).length : 0;
      setWordCount(words);
      setCharCount(text.length);
      setContentJson(editor.getJSON());
    }
  }, [editor]);

  // Keep global citation sources registry synchronized
  useEffect(() => {
    updateGlobalSourcesRegistry(sources, (sourceId) => {
      setHighlightedSourceId(sourceId);
      setIsSourcesOpen(true);
    });

    // Force a light ProseMirror state refresh so atom nodes re-render with updated source details or warnings
    if (editor && !editor.isDestroyed) {
      editor.view.dispatch(editor.state.tr);
    }
  }, [sources, editor]);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, []);

  // Title change handler
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value;
    setTitle(newTitle);
    setSaveStatus("unsaved");

    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }
    saveTimerRef.current = setTimeout(() => {
      if (editor) {
        saveDocument(editor.getJSON(), newTitle);
      }
    }, 1200);
  };

  // Immediate save on blur or title enter
  const handleTitleBlur = () => {
    if (editor) {
      saveDocument(editor.getJSON(), title);
    }
  };

  // Ctrl+S / Cmd+S manual save handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        if (editor) {
          if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
          saveDocument(editor.getJSON(), currentTitleRef.current);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [editor, saveDocument]);

  // Insert in-text citation at cursor
  const handleInsertCitation = (source: SourceItem) => {
    if (!editor) return;
    const displayText = formatInTextCitation(source);
    editor.chain().focus().insertCitation({
      sourceId: source.id,
      displayText,
    }).run();

    const json = editor.getJSON();
    setContentJson(json);
    saveDocument(json, currentTitleRef.current);
    toast.success(`Inserted citation ${displayText}`);
  };

  const handleSourcesChange = (newSources: SourceItem[]) => {
    setSources(newSources);
    updateGlobalSourcesRegistry(newSources, (sourceId) => {
      setHighlightedSourceId(sourceId);
      setIsSourcesOpen(true);
    });
  };

  const handleApplyResearch = useCallback(
    (newSources: SourceItem[], jsonNodes: any[]) => {
      setSources((prev) => {
        const existingIds = new Set(prev.map((s) => s.id));
        const toAdd = newSources.filter((s) => !existingIds.has(s.id));
        const merged = [...prev, ...toAdd];
        updateGlobalSourcesRegistry(merged, (sourceId) => {
          setHighlightedSourceId(sourceId);
          setIsSourcesOpen(true);
        });
        return merged;
      });

      if (editor && jsonNodes.length > 0) {
        editor.chain().focus().insertContent(jsonNodes).run();
        const currentJson = editor.getJSON();
        setContentJson(currentJson);
        saveDocument(currentJson, currentTitleRef.current);
      }
    },
    [editor, saveDocument]
  );

  const isTableActive = Boolean(editor?.isActive("table"));

  return (
    <CitationContext.Provider
      value={{
        sources,
        onCitationClick: (sourceId) => {
          setHighlightedSourceId(sourceId);
          setIsSourcesOpen(true);
        },
      }}
    >
      <div className="flex-1 w-full flex flex-col bg-background min-h-screen">
        {/* Top Document Header Bar */}
        <header className="sticky top-14 z-30 shrink-0 border-b border-border/80 bg-background/95 backdrop-blur-md px-4 sm:px-8 py-2.5">
          <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
            {/* Left: Back Link & Document Title */}
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <Button
                asChild
                variant="ghost"
                size="sm"
                className="h-8 px-2 text-muted-foreground hover:text-foreground gap-1.5 shrink-0"
              >
                <Link href="/dashboard">
                  <ArrowLeft className="size-4" />
                  <span className="hidden sm:inline">Dashboard</span>
                </Link>
              </Button>

              <span className="text-border h-4 w-px bg-border shrink-0" />

              <div className="min-w-0 flex-1 max-w-lg">
                <input
                  type="text"
                  value={title}
                  onChange={handleTitleChange}
                  onBlur={handleTitleBlur}
                  placeholder="Untitled Document"
                  className="w-full text-sm sm:text-base font-bold bg-transparent border-b border-transparent hover:border-border/80 focus:border-foreground/50 focus:outline-hidden text-foreground px-1 py-0.5 rounded-sm transition-colors"
                />
              </div>
            </div>

            {/* Right: Research Button, Sources Toggle, Word Count, Save Indicator */}
            <div className="flex items-center gap-2 sm:gap-3 shrink-0 text-xs">
              {/* AI Auto-Research Button */}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsResearchOpen(true)}
                className="h-7 px-2.5 text-xs font-semibold gap-1.5 transition-all cursor-pointer border-indigo-500/40 bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 hover:text-indigo-300 shadow-2xs"
                title="AI Auto-Research with live web sources"
              >
                <Sparkles className="size-3.5 text-indigo-400" />
                <span>Research</span>
              </Button>

              {/* Sources Toggle Button */}
              <Button
                type="button"
                variant={isSourcesOpen ? "secondary" : "outline"}
                size="sm"
                onClick={() => setIsSourcesOpen(!isSourcesOpen)}
                className={`h-7 px-2.5 text-xs font-semibold gap-1.5 transition-all cursor-pointer ${
                  isSourcesOpen
                    ? "bg-secondary text-foreground border-foreground/30 shadow-xs"
                    : "border-border/80 text-muted-foreground hover:text-foreground"
                }`}
                title="Toggle Sources sidebar"
              >
                <BookOpen className="size-3.5 text-indigo-400" />
                <span>Sources</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-background border border-border/70 text-foreground">
                  {sources.length}
                </span>
              </Button>

              <span className="text-border h-3 w-px bg-border hidden sm:inline" />

              {/* Word count display */}
              <span className="text-muted-foreground font-mono text-[11px] hidden sm:inline">
                {wordCount} {wordCount === 1 ? "word" : "words"}
              </span>

              <span className="text-border h-3 w-px bg-border hidden sm:inline" />

              {/* Auto-save Status Indicator */}
              <div className="flex items-center gap-1.5 font-mono text-[11px]">
                {saveStatus === "saving" && (
                  <>
                    <Loader2 className="size-3 animate-spin text-muted-foreground" />
                    <span className="text-muted-foreground">Saving...</span>
                  </>
                )}
                {saveStatus === "saved" && (
                  <>
                    <Check className="size-3 text-emerald-500" />
                    <span className="text-muted-foreground">Saved</span>
                  </>
                )}
                {saveStatus === "unsaved" && (
                  <>
                    <Clock className="size-3 text-amber-500" />
                    <span className="text-muted-foreground">Unsaved</span>
                  </>
                )}
                {saveStatus === "error" && (
                  <>
                    <AlertTriangle className="size-3 text-destructive" />
                    <span className="text-destructive font-medium">Save error</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Floating / Sticky Clean Writing Toolbar */}
        <div className="sticky top-[105px] z-20 w-full border-b border-border/60 bg-card/90 backdrop-blur-md py-1.5 px-4">
          <div className="max-w-4xl mx-auto flex flex-wrap items-center justify-between gap-1 sm:gap-1.5">
            {/* Group 1: Headings & Paragraph */}
            <div className="flex items-center gap-0.5">
              <Button
                type="button"
                variant={editor?.isActive("paragraph") ? "secondary" : "ghost"}
                size="sm"
                onClick={() => editor?.chain().focus().setParagraph().run()}
                className="h-7 px-2 text-xs font-medium cursor-pointer"
                title="Normal paragraph"
              >
                Text
              </Button>
              <Button
                type="button"
                variant={editor?.isActive("heading", { level: 1 }) ? "secondary" : "ghost"}
                size="sm"
                onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()}
                className="h-7 px-2 text-xs font-semibold cursor-pointer"
                title="Heading 1"
              >
                H1
              </Button>
              <Button
                type="button"
                variant={editor?.isActive("heading", { level: 2 }) ? "secondary" : "ghost"}
                size="sm"
                onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
                className="h-7 px-2 text-xs font-semibold cursor-pointer"
                title="Heading 2"
              >
                H2
              </Button>
              <Button
                type="button"
                variant={editor?.isActive("heading", { level: 3 }) ? "secondary" : "ghost"}
                size="sm"
                onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}
                className="h-7 px-2 text-xs font-semibold cursor-pointer"
                title="Heading 3"
              >
                H3
              </Button>
            </div>

            <span className="text-border h-4 w-px bg-border/80 hidden sm:inline" />

            {/* Group 2: Inline Formatting */}
            <div className="flex items-center gap-0.5">
              <Button
                type="button"
                variant={editor?.isActive("bold") ? "secondary" : "ghost"}
                size="sm"
                onClick={() => editor?.chain().focus().toggleBold().run()}
                className="size-7 p-0 cursor-pointer"
                title="Bold (Ctrl+B)"
              >
                <Bold className="size-3.5" />
              </Button>
              <Button
                type="button"
                variant={editor?.isActive("italic") ? "secondary" : "ghost"}
                size="sm"
                onClick={() => editor?.chain().focus().toggleItalic().run()}
                className="size-7 p-0 cursor-pointer"
                title="Italic (Ctrl+I)"
              >
                <Italic className="size-3.5" />
              </Button>
              <Button
                type="button"
                variant={editor?.isActive("underline") ? "secondary" : "ghost"}
                size="sm"
                onClick={() => editor?.chain().focus().toggleUnderline().run()}
                className="size-7 p-0 cursor-pointer"
                title="Underline (Ctrl+U)"
              >
                <UnderlineIcon className="size-3.5" />
              </Button>
              <Button
                type="button"
                variant={editor?.isActive("strike") ? "secondary" : "ghost"}
                size="sm"
                onClick={() => editor?.chain().focus().toggleStrike().run()}
                className="size-7 p-0 cursor-pointer"
                title="Strikethrough"
              >
                <Strikethrough className="size-3.5" />
              </Button>
            </div>

            <span className="text-border h-4 w-px bg-border/80 hidden sm:inline" />

            {/* Group 3: Lists & Blocks */}
            <div className="flex items-center gap-0.5">
              <Button
                type="button"
                variant={editor?.isActive("bulletList") ? "secondary" : "ghost"}
                size="sm"
                onClick={() => editor?.chain().focus().toggleBulletList().run()}
                className="size-7 p-0 cursor-pointer"
                title="Bullet list"
              >
                <List className="size-3.5" />
              </Button>
              <Button
                type="button"
                variant={editor?.isActive("orderedList") ? "secondary" : "ghost"}
                size="sm"
                onClick={() => editor?.chain().focus().toggleOrderedList().run()}
                className="size-7 p-0 cursor-pointer"
                title="Numbered list"
              >
                <ListOrdered className="size-3.5" />
              </Button>
              <Button
                type="button"
                variant={editor?.isActive("blockquote") ? "secondary" : "ghost"}
                size="sm"
                onClick={() => editor?.chain().focus().toggleBlockquote().run()}
                className="size-7 p-0 cursor-pointer"
                title="Blockquote"
              >
                <Quote className="size-3.5" />
              </Button>
              <Button
                type="button"
                variant={editor?.isActive("codeBlock") ? "secondary" : "ghost"}
                size="sm"
                onClick={() => editor?.chain().focus().toggleCodeBlock().run()}
                className="size-7 p-0 cursor-pointer"
                title="Code block"
              >
                <Code className="size-3.5" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => editor?.chain().focus().setHorizontalRule().run()}
                className="size-7 p-0 cursor-pointer"
                title="Horizontal rule"
              >
                <Minus className="size-3.5" />
              </Button>
            </div>

            <span className="text-border h-4 w-px bg-border/80 hidden sm:inline" />

            {/* Group 4: Table Tools */}
            <div className="flex items-center gap-0.5">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant={isTableActive ? "secondary" : "ghost"}
                    size="sm"
                    className="h-7 px-2 text-xs gap-1 cursor-pointer"
                    title="Table tools"
                  >
                    <TableIcon className="size-3.5" />
                    <span className="hidden sm:inline">Table</span>
                    <ChevronDown className="size-3 opacity-60" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 text-xs">
                  {!isTableActive ? (
                    <DropdownMenuItem
                      onClick={() =>
                        editor
                          ?.chain()
                          .focus()
                          .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
                          .run()
                      }
                      className="cursor-pointer"
                    >
                      Insert 3×3 Table
                    </DropdownMenuItem>
                  ) : (
                    <>
                      <DropdownMenuItem
                        onClick={() => editor?.chain().focus().addColumnBefore().run()}
                        className="cursor-pointer"
                      >
                        Add Column Before
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => editor?.chain().focus().addColumnAfter().run()}
                        className="cursor-pointer"
                      >
                        Add Column After
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => editor?.chain().focus().deleteColumn().run()}
                        className="cursor-pointer"
                      >
                        Delete Column
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => editor?.chain().focus().addRowBefore().run()}
                        className="cursor-pointer"
                      >
                        Add Row Before
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => editor?.chain().focus().addRowAfter().run()}
                        className="cursor-pointer"
                      >
                        Add Row After
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => editor?.chain().focus().deleteRow().run()}
                        className="cursor-pointer"
                      >
                        Delete Row
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => editor?.chain().focus().deleteTable().run()}
                        className="text-destructive focus:text-destructive cursor-pointer"
                      >
                        Delete Table
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <span className="text-border h-4 w-px bg-border/80 hidden sm:inline" />

            {/* Group 5: Citations "Cite" Command Button */}
            <div className="flex items-center gap-0.5">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 px-2.5 text-xs font-semibold gap-1.5 border-border/80 hover:bg-secondary cursor-pointer"
                    title="Insert APA in-text citation at cursor"
                  >
                    <BookOpen className="size-3 text-indigo-400" />
                    <span>Cite</span>
                    <ChevronDown className="size-3 opacity-60" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64 text-xs p-1">
                  {sources.length === 0 ? (
                    <div className="p-3 text-center space-y-2">
                      <p className="text-xs text-muted-foreground">No sources in library</p>
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => setIsSourcesOpen(true)}
                        className="h-7 text-xs w-full font-semibold cursor-pointer"
                      >
                        <Plus className="size-3 mr-1" />
                        Add Source to Cite
                      </Button>
                    </div>
                  ) : (
                    <>
                      <div className="px-2 py-1.5 text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                        Insert APA In-Text Citation
                      </div>
                      <div className="max-h-60 overflow-y-auto space-y-0.5">
                        {sources.map((s) => (
                          <DropdownMenuItem
                            key={s.id}
                            onClick={() => handleInsertCitation(s)}
                            className="cursor-pointer py-1.5 px-2 flex flex-col items-start gap-0.5 rounded-lg"
                          >
                            <div className="flex items-center justify-between w-full">
                              <span className="font-semibold text-foreground truncate max-w-[170px]">
                                {s.title}
                              </span>
                              <span className="font-mono text-[10px] text-indigo-400 font-semibold shrink-0">
                                {formatInTextCitation(s)}
                              </span>
                            </div>
                            {s.authors && (
                              <span className="text-[10px] text-muted-foreground truncate max-w-full">
                                {s.authors}
                              </span>
                            )}
                          </DropdownMenuItem>
                        ))}
                      </div>
                      <DropdownMenuSeparator className="my-1" />
                      <DropdownMenuItem
                        onClick={() => setIsSourcesOpen(true)}
                        className="cursor-pointer text-indigo-400 font-medium py-1.5 rounded-lg"
                      >
                        <BookOpen className="size-3.5 mr-2" />
                        Manage Sources ({sources.length})
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <span className="text-border h-4 w-px bg-border/80 hidden sm:inline" />

            {/* Group 6: Undo / Redo */}
            <div className="flex items-center gap-0.5">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={!editor?.can().undo()}
                onClick={() => editor?.chain().focus().undo().run()}
                className="size-7 p-0 cursor-pointer"
                title="Undo (Ctrl+Z)"
              >
                <Undo className="size-3.5" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={!editor?.can().redo()}
                onClick={() => editor?.chain().focus().redo().run()}
                className="size-7 p-0 cursor-pointer"
                title="Redo (Ctrl+Y)"
              >
                <Redo className="size-3.5" />
              </Button>
            </div>
          </div>
        </div>

        {/* Focused Writing Canvas + Collapsible Sources Sidebar Layout */}
        <div className="flex-1 w-full flex relative">
          <main className="flex-1 min-w-0 max-w-4xl mx-auto px-6 sm:px-12 py-8 sm:py-12">
            <div className="min-h-[560px] rounded-2xl border border-border/80 bg-card p-8 sm:p-14 shadow-xs">
              {editor ? (
                <EditorContent editor={editor} />
              ) : (
                <div className="min-h-[220px] flex items-center justify-center">
                  <Loader2 className="size-5 animate-spin text-muted-foreground" />
                </div>
              )}
              {/* Auto-generated APA References section */}
              <ReferencesSection
                sources={sources}
                contentJson={contentJson}
                onOpenSourcesPanel={() => setIsSourcesOpen(true)}
                onHighlightSource={(id) => setHighlightedSourceId(id)}
              />
            </div>
          </main>

          {/* Collapsible Sources Sidebar */}
          <SourcesSidebar
            documentId={documentId}
            sources={sources}
            contentJson={contentJson}
            isOpen={isSourcesOpen}
            onClose={() => setIsSourcesOpen(false)}
            onInsertCitation={handleInsertCitation}
            onSourcesChange={handleSourcesChange}
            highlightedSourceId={highlightedSourceId}
          />
        </div>

        {/* AI Auto-Research Modal */}
        <ResearchModal
          documentId={documentId}
          open={isResearchOpen}
          onOpenChange={setIsResearchOpen}
          onApplyResearch={handleApplyResearch}
        />
      </div>
    </CitationContext.Provider>
  );
}
