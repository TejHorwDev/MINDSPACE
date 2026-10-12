"use client";

import React, { useEffect, useRef } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import { StarterKit } from "@tiptap/starter-kit";
import { Underline } from "@tiptap/extension-underline";
import { Placeholder } from "@tiptap/extension-placeholder";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  List,
  ListOrdered,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SlideTextRegionProps {
  content: any;
  onChange: (json: any) => void;
  placeholder?: string;
  className?: string;
  headingLevel?: 1 | 2 | 3;
  minHeight?: string;
  onFocus?: () => void;
  onBlur?: () => void;
}

export function SlideTextRegion({
  content,
  onChange,
  placeholder = "Type here...",
  className,
  headingLevel,
  minHeight = "auto",
  onFocus,
  onBlur,
}: SlideTextRegionProps) {
  const isInternalUpdateRef = useRef(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: headingLevel
          ? {
              levels: [headingLevel],
            }
          : false,
      }),
      Underline,
      Placeholder.configure({
        placeholder,
        emptyEditorClass:
          "before:content-[attr(data-placeholder)] before:text-muted-foreground/40 before:float-left before:pointer-events-none before:h-0",
      }),
    ],
    content: content || {
      type: "doc",
      content: [
        headingLevel
          ? {
              type: "heading",
              attrs: { level: headingLevel },
              content: [],
            }
          : { type: "paragraph", content: [] },
      ],
    },
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: cn(
          "outline-hidden focus:outline-hidden prose prose-sm dark:prose-invert max-w-none transition-colors",
          className
        ),
      },
    },
    onUpdate: ({ editor }) => {
      isInternalUpdateRef.current = true;
      const json = editor.getJSON();
      onChange(json);
    },
    onFocus: () => {
      if (onFocus) onFocus();
    },
    onBlur: () => {
      if (onBlur) onBlur();
    },
  });

  // Keep editor content in sync when changed externally (e.g. undo, slide change)
  useEffect(() => {
    if (!editor) return;

    if (isInternalUpdateRef.current) {
      isInternalUpdateRef.current = false;
      return;
    }

    if (content) {
      const currentContent = JSON.stringify(editor.getJSON());
      const nextContent = JSON.stringify(content);
      if (currentContent !== nextContent) {
        editor.commands.setContent(content, { emitUpdate: false });
      }
    }
  }, [content, editor]);

  if (!editor) {
    return (
      <div
        className={cn(
          "rounded-lg p-2 text-muted-foreground/40 min-h-[3rem]",
          className
        )}
        style={{ minHeight }}
      >
        {placeholder}
      </div>
    );
  }

  return (
    <div className="relative group/region">
      {/* Floating Mini Formatting Toolbar when text is selected */}
      {editor.isFocused && (
        <div className="absolute -top-10 left-0 z-30 flex items-center gap-0.5 p-1 rounded-lg bg-card/95 border border-border/80 shadow-md backdrop-blur-md opacity-0 group-hover/region:opacity-100 focus-within:opacity-100 transition-opacity">
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={cn(
              "p-1 rounded text-xs transition-colors hover:bg-secondary",
              editor.isActive("bold")
                ? "bg-secondary text-foreground font-bold"
                : "text-muted-foreground"
            )}
            title="Bold (Ctrl+B)"
          >
            <Bold className="size-3.5" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={cn(
              "p-1 rounded text-xs transition-colors hover:bg-secondary",
              editor.isActive("italic")
                ? "bg-secondary text-foreground font-bold"
                : "text-muted-foreground"
            )}
            title="Italic (Ctrl+I)"
          >
            <Italic className="size-3.5" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            className={cn(
              "p-1 rounded text-xs transition-colors hover:bg-secondary",
              editor.isActive("underline")
                ? "bg-secondary text-foreground font-bold"
                : "text-muted-foreground"
            )}
            title="Underline (Ctrl+U)"
          >
            <UnderlineIcon className="size-3.5" />
          </button>

          {!headingLevel && (
            <>
              <span className="w-px h-3 bg-border/80 mx-0.5" />
              <button
                type="button"
                onClick={() => editor.chain().focus().toggleBulletList().run()}
                className={cn(
                  "p-1 rounded text-xs transition-colors hover:bg-secondary",
                  editor.isActive("bulletList")
                    ? "bg-secondary text-foreground font-bold"
                    : "text-muted-foreground"
                )}
                title="Bullet List"
              >
                <List className="size-3.5" />
              </button>
              <button
                type="button"
                onClick={() => editor.chain().focus().toggleOrderedList().run()}
                className={cn(
                  "p-1 rounded text-xs transition-colors hover:bg-secondary",
                  editor.isActive("orderedList")
                    ? "bg-secondary text-foreground font-bold"
                    : "text-muted-foreground"
                )}
                title="Numbered List"
              >
                <ListOrdered className="size-3.5" />
              </button>
            </>
          )}
        </div>
      )}

      {/* Editor Content Area */}
      <div
        className="rounded-lg p-1.5 transition-all focus-within:ring-1 focus-within:ring-primary/40 focus-within:bg-secondary/15 hover:bg-secondary/10"
        style={{ minHeight }}
      >
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
