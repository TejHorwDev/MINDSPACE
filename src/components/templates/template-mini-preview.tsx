"use client";

import { useMemo, useState } from "react";
import { bundleProjectFiles } from "@/lib/preview-bundler";
import type { UnifiedTemplate } from "@/lib/templates/service";

export function TemplateMiniPreview({ template }: { template: UnifiedTemplate }) {
  const [loaded, setLoaded] = useState(false);

  const bundledHtml = useMemo(() => {
    try {
      const editorFiles = template.files.map((f) => ({
        id: f.path,
        projectId: "mini-preview",
        name: f.path.split("/").pop() || f.path,
        path: f.path,
        content: f.content,
        isEntry: f.path === "index.html",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }));

      const raw = bundleProjectFiles("index.html", editorFiles, {});
      // Inject scrollbar-hiding and overflow-hidden styles for crisp preview
      const cleanStyles = `
        <style>
          html, body {
            overflow: hidden !important;
            scrollbar-width: none !important;
            -ms-overflow-style: none !important;
            user-select: none !important;
            pointer-events: none !important;
          }
          ::-webkit-scrollbar { display: none !important; }
        </style>
      `;

      if (raw.includes("</head>")) {
        return raw.replace("</head>", `${cleanStyles}</head>`);
      }
      return `${cleanStyles}${raw}`;
    } catch {
      return "";
    }
  }, [template]);

  return (
    <div className="relative h-full w-full overflow-hidden bg-zinc-950 select-none">
      {/* Responsive Scaled High-DPI Mini Viewport (fills 100% of parent) */}
      <div className="absolute top-0 left-0 w-[250%] h-[250%] origin-top-left scale-[0.4] pointer-events-none select-none">
        <iframe
          srcDoc={bundledHtml}
          title={template.name}
          onLoad={() => setLoaded(true)}
          className={`w-full h-full border-0 bg-white transition-opacity duration-200 ${
            loaded ? "opacity-100" : "opacity-0"
          }`}
          tabIndex={-1}
          aria-hidden="true"
          loading="lazy"
          sandbox="allow-scripts allow-same-origin"
        />
      </div>

      {/* Subtle edge vignette */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />
    </div>
  );
}
