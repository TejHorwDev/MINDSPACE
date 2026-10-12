"use client";

import { X } from "lucide-react";
import { FileIcon } from "./file-icon";
import type { EditorFile } from "./types";

type FileTabsProps = {
  files: EditorFile[];
  openFileIds: string[];
  activeFileId: string | null;
  dirtyFileIds: Set<string>;
  onSelectTab: (fileId: string) => void;
  onCloseTab: (fileId: string) => void;
};

export function FileTabs({
  files,
  openFileIds,
  activeFileId,
  dirtyFileIds,
  onSelectTab,
  onCloseTab,
}: FileTabsProps) {
  const fileMap = new Map(files.map((f) => [f.id, f]));

  return (
    <div
      role="tablist"
      aria-label="Open editor tabs"
      className="flex h-10 w-full items-center overflow-x-auto border-b border-border bg-muted/40 px-2 scrollbar-none"
    >
      <div className="flex items-center gap-1">
        {openFileIds.map((fileId) => {
          const file = fileMap.get(fileId);
          if (!file) return null;

          const isActive = fileId === activeFileId;
          const isDirty = dirtyFileIds.has(fileId);

          return (
            <div
              key={fileId}
              role="tab"
              aria-selected={isActive}
              tabIndex={0}
              onClick={() => onSelectTab(fileId)}
              onAuxClick={(e) => {
                // Middle click closes tab
                if (e.button === 1) {
                  e.preventDefault();
                  onCloseTab(fileId);
                }
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSelectTab(fileId);
                }
              }}
              className={`group flex h-8 max-w-[180px] min-w-[100px] items-center gap-2 rounded-t-md border-t-2 px-3 text-xs font-medium cursor-pointer transition-colors select-none ${
                isActive
                  ? "border-primary bg-background text-foreground shadow-xs"
                  : "border-transparent bg-transparent text-muted-foreground hover:bg-muted/70 hover:text-foreground"
              }`}
            >
              <FileIcon path={file.path} className="size-3.5" />
              <span className="truncate flex-1" title={file.path}>
                {file.path}
              </span>

              {/* Dirty indicator or close button */}
              <div className="flex items-center shrink-0">
                {isDirty ? (
                  <span
                    className="size-2 rounded-full bg-amber-500 group-hover:hidden"
                    title="Unsaved changes"
                    aria-label="Unsaved changes"
                  />
                ) : null}

                <button
                  type="button"
                  tabIndex={-1}
                  onClick={(e) => {
                    e.stopPropagation();
                    onCloseTab(fileId);
                  }}
                  className={`rounded-xs p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors ${
                    isDirty ? "hidden group-hover:inline-flex" : "inline-flex"
                  }`}
                  aria-label={`Close ${file.path}`}
                >
                  <X className="size-3" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
