"use client";

import { useState } from "react";
import { Loader2, Plus, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import type { EditorFile } from "../types";

type NewFileDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  parentFolder?: string;
  existingPaths: string[];
  onCreated: (file: EditorFile) => void;
};

const SUGGESTIONS = [
  { label: "main.py", desc: "Python script" },
  { label: "main.cpp", desc: "C++ program" },
  { label: "Main.java", desc: "Java class" },
  { label: "Program.cs", desc: "C# program" },
  { label: "main.go", desc: "Go program" },
  { label: "index.js", desc: "JavaScript" },
  { label: "index.html", desc: "HTML Page" },
  { label: "styles.css", desc: "CSS Styles" },
];

function getStarterContent(path: string): string {
  const ext = path.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "py":
      return `def main():\n    print("Hello from Python in Mindspace!")\n\nif __name__ == "__main__":\n    main()\n`;
    case "cpp":
    case "cc":
      return `#include <iostream>\n\nint main() {\n    std::cout << "Hello from C++ in Mindspace!" << std::endl;\n    return 0;\n}\n`;
    case "c":
      return `#include <stdio.h>\n\nint main() {\n    printf("Hello from C in Mindspace!\\n");\n    return 0;\n}\n`;
    case "cs":
      return `using System;\n\nclass Program {\n    static void Main(string[] args) {\n        Console.WriteLine("Hello from C# in Mindspace!");\n    }\n}\n`;
    case "java":
      return `public class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello from Java in Mindspace!");\n    }\n}\n`;
    case "go":
      return `package main\n\nimport "fmt"\n\nfunc main() {\n    fmt.Println("Hello from Go in Mindspace!")\n}\n`;
    case "rs":
      return `fn main() {\n    println!("Hello from Rust in Mindspace!");\n}\n`;
    case "html":
      return `<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n  <title>New Page</title>\n  <link rel="stylesheet" href="styles.css">\n</head>\n<body>\n  <h1>Welcome to Mindspace</h1>\n  <p>Start writing your code here.</p>\n</body>\n</html>\n`;
    case "css":
      return `/* Custom Styles */\nbody {\n  font-family: system-ui, sans-serif;\n  line-height: 1.6;\n  margin: 0;\n  padding: 2rem;\n}\n`;
    case "js":
      return `// JavaScript code\nconsole.log("Hello from Node.js in Mindspace!");\n`;
    case "ts":
      return `const message: string = "Hello from TypeScript in Mindspace!";\nconsole.log(message);\n`;
    case "json":
      return `{\n  "name": "project"\n}\n`;
    default:
      return "";
  }
}

export function NewFileDialog({
  open,
  onOpenChange,
  projectId,
  parentFolder = "",
  existingPaths,
  onCreated,
}: NewFileDialogProps) {
  const { toast } = useToast();
  const [filePath, setFilePath] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleOpenChange = (nextOpen: boolean) => {
    if (!loading) {
      if (!nextOpen) {
        setFilePath("");
        setError(null);
      }
      onOpenChange(nextOpen);
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const rawPath = filePath.replace(/^\/+/, "").trim();

    if (!rawPath) {
      setError("Please enter a file name.");
      return;
    }

    const cleanPath = parentFolder && !rawPath.includes("/")
      ? `${parentFolder}/${rawPath}`
      : rawPath;

    if (existingPaths.includes(cleanPath)) {
      setError(`A file named "${cleanPath}" already exists.`);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const defaultContent = getStarterContent(cleanPath);
      const res = await fetch(`/api/projects/${projectId}/files`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          path: cleanPath,
          content: defaultContent,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create file.");
      }

      onCreated(data.file);
      toast({
        title: "File created",
        description: `“${cleanPath}” has been created.`,
      });
      handleOpenChange(false);
    } catch (err: any) {
      setError(err?.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Plus className="size-4 text-primary" aria-hidden="true" />
              New File
            </DialogTitle>
            <DialogDescription>
              {parentFolder
                ? `Create a file inside “${parentFolder}”. Any extension allowed.`
                : "Create a code file in any language (Python, C++, Java, Node, Go, Rust, HTML, etc.)."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="file-name-input">File Name</Label>
              <Input
                id="file-name-input"
                autoFocus
                placeholder="e.g. main.py, utils.js, script.cpp"
                value={filePath}
                onChange={(e) => {
                  setFilePath(e.target.value);
                  if (error) setError(null);
                }}
                disabled={loading}
              />
            </div>

            {/* Quick Suggestions */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
                <Sparkles className="size-3 text-primary" aria-hidden="true" />
                <span>Common Templates</span>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s.label}
                    type="button"
                    onClick={() => {
                      setFilePath(s.label);
                      setError(null);
                    }}
                    className="flex items-center justify-between rounded-md border border-border/60 bg-secondary/40 px-2 py-1 text-left text-xs transition-colors hover:bg-secondary hover:text-foreground"
                  >
                    <span className="font-mono text-[11px]">{s.label}</span>
                    <span className="text-[10px] text-muted-foreground">{s.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <p className="text-xs font-medium text-destructive">{error}</p>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !filePath.trim()}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" />
                  Creating...
                </>
              ) : (
                "Create File"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
