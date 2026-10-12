import dagre from "dagre";
import { MarkerType, type Node, type Edge } from "@xyflow/react";

export type FileCategory = "html" | "css" | "js" | "image" | "other";

export interface ProjectMapFile {
  id: string;
  path: string;
  content?: string | null;
  updatedAt?: Date | string | null;
}

export interface ProjectMapNodeData {
  fileId: string;
  path: string;
  filename: string;
  directory: string;
  category: FileCategory;
  extension: string;
  formattedSize: string;
  sizeBytes: number;
  inDegree: number;
  outDegree: number;
  projectId: string;
  isMissing?: boolean;
  isOrphan?: boolean;
  isHighlighted?: boolean;
  isDimmed?: boolean;
  referencedBy?: string[];
  imageUrl?: string;
  htmlTitle?: string;
  cssColors?: string[];
  onDeleteFile?: (fileId: string, filename: string) => void;
  onOpenFile?: (path: string) => void;
  onPreviewImage?: (url: string, filename: string, size: string) => void;
  [key: string]: unknown;
}

export interface ProjectMapEdgeData {
  kind: "stylesheet" | "script" | "image" | "import" | "page-link";
  isMissing?: boolean;
  label?: string;
  [key: string]: unknown;
}

/**
 * Normalizes a path string by removing leading slashes and relative markers.
 */
export function normalizePath(p: string): string {
  return p.replace(/^(\.\/|\/)+/, "").trim();
}

/**
 * Strips query parameters (?v=...) and hash anchors (#...) from a URL reference.
 */
export function cleanUrlReference(rawRef: string): string {
  return rawRef.split("?")[0].split("#")[0].trim();
}

/**
 * Determines whether a reference string points to a local project file.
 */
export function isLocalReference(rawRef: string): boolean {
  const clean = cleanUrlReference(rawRef);
  if (!clean) return false;
  const lower = clean.toLowerCase();
  if (
    lower.startsWith("http://") ||
    lower.startsWith("https://") ||
    lower.startsWith("//") ||
    lower.startsWith("data:") ||
    lower.startsWith("blob:") ||
    lower.startsWith("mailto:") ||
    lower.startsWith("tel:") ||
    lower.startsWith("#") ||
    lower.startsWith("javascript:")
  ) {
    return false;
  }
  return true;
}

/**
 * Resolves a relative path against the directory of a base file.
 */
export function resolveRelativePath(basePath: string, relativeRef: string): string {
  const cleanRef = cleanUrlReference(relativeRef.replace(/^(\.\/)+/, "").trim());
  const baseParts = basePath.split("/").slice(0, -1);
  const refParts = cleanRef.split("/");

  for (const part of refParts) {
    if (part === "..") {
      baseParts.pop();
    } else if (part !== "." && part !== "") {
      baseParts.push(part);
    }
  }

  return baseParts.join("/");
}

/**
 * Categorizes a file path into an established type for icon & badge rendering.
 */
export function getFileCategory(path: string): FileCategory {
  const ext = path.split(".").pop()?.toLowerCase() || "";
  if (ext === "html" || ext === "htm") return "html";
  if (ext === "css" || ext === "scss" || ext === "less") return "css";
  if (["js", "mjs", "cjs", "jsx", "ts", "tsx"].includes(ext)) return "js";
  if (["png", "jpg", "jpeg", "webp", "svg", "gif", "ico", "bmp", "avif"].includes(ext)) return "image";
  return "other";
}

/**
 * Formats file size human-readably (supports base64 data URLs as well).
 */
export function formatFileSize(content?: string | null): { formatted: string; bytes: number } {
  if (!content) return { formatted: "0 B", bytes: 0 };
  let bytes = 0;
  if (content.startsWith("data:") && content.includes(";base64,")) {
    const b64 = content.split(";base64,")[1] || "";
    bytes = Math.round(b64.length * 0.75);
  } else {
    bytes = new TextEncoder().encode(content).length;
  }

  if (bytes < 1024) return { formatted: `${bytes} B`, bytes };
  if (bytes < 1024 * 1024) return { formatted: `${(bytes / 1024).toFixed(1)} KB`, bytes };
  return { formatted: `${(bytes / (1024 * 1024)).toFixed(1)} MB`, bytes };
}

/**
 * Resolves an actual image preview URL from image file content.
 */
export function resolveImageUrl(content?: string | null, path?: string): string | undefined {
  if (!content) return undefined;
  const trimmed = content.trim();
  if (trimmed.startsWith("data:")) return trimmed;
  if (trimmed.startsWith("<svg") || trimmed.includes("<svg xmlns=")) {
    return `data:image/svg+xml;utf8,${encodeURIComponent(trimmed)}`;
  }
  const ext = (path?.split(".").pop() || "").toLowerCase();
  const mime =
    ext === "svg"
      ? "image/svg+xml"
      : ext === "jpg" || ext === "jpeg"
      ? "image/jpeg"
      : ext === "webp"
      ? "image/webp"
      : ext === "gif"
      ? "image/gif"
      : "image/png";
  if (trimmed.length > 20) {
    return `data:${mime};base64,${trimmed}`;
  }
  return undefined;
}

/**
 * Extracts page title from HTML content if present.
 */
export function extractHtmlTitle(content?: string | null): string | undefined {
  if (!content) return undefined;
  const match = /<title[^>]*>([^<]+)<\/title>/i.exec(content);
  return match ? match[1].trim() : undefined;
}

/**
 * Extracts distinctive hex colors from CSS content.
 */
export function extractCssColors(content?: string | null): string[] {
  if (!content) return [];
  const matches = content.match(/#(?:[0-9a-fA-F]{3,4}){1,2}\b/g) || [];
  const unique = Array.from(new Set(matches.map((c) => c.toLowerCase())));
  return unique.slice(0, 4);
}

/**
 * Tries to match a referenced target string to an actual file in the project.
 */
export function matchTargetFile(
  sourcePath: string,
  rawRef: string,
  allFiles: ProjectMapFile[]
): ProjectMapFile | undefined {
  if (!isLocalReference(rawRef)) {
    return undefined;
  }

  const clean = cleanUrlReference(rawRef);
  const normalized = normalizePath(clean);

  // 1. Direct normalized path match
  let match = allFiles.find((f) => normalizePath(f.path) === normalized);
  if (match) return match;

  // 2. Relative to source file directory
  const resolved = resolveRelativePath(sourcePath, clean);
  if (resolved) {
    match = allFiles.find((f) => normalizePath(f.path) === normalizePath(resolved));
    if (match) return match;
  }

  // 3. Basename match (e.g. "avash.png" matches "assets/avash.png" or "avash.png")
  const basename = normalized.split("/").pop() || normalized;
  match = allFiles.find((f) => {
    const fBasename = f.path.split("/").pop() || f.path;
    return fBasename.toLowerCase() === basename.toLowerCase();
  });

  return match;
}

export interface ExtractedConnection {
  sourceId: string;
  targetId: string;
  kind: "stylesheet" | "script" | "image" | "import" | "page-link";
  isMissing?: boolean;
  missingPath?: string;
  sourcePath?: string;
}

export interface GhostFileInfo {
  id: string;
  path: string;
  filename: string;
  directory: string;
  category: FileCategory;
  referencedBy: string[];
}

export interface ExtractionResult {
  connections: ExtractedConnection[];
  ghostFiles: Map<string, GhostFileInfo>;
}

/**
 * Scans code inside HTML, CSS, and JS files to auto-detect relationships
 * and broken references.
 */
export function extractFileConnections(files: ProjectMapFile[]): ExtractionResult {
  const connections: ExtractedConnection[] = [];
  const connectionSet = new Set<string>();
  const ghostFiles = new Map<string, GhostFileInfo>();

  const registerMissing = (
    sourceFile: ProjectMapFile,
    rawRef: string,
    kind: "stylesheet" | "script" | "image" | "import" | "page-link"
  ) => {
    if (!isLocalReference(rawRef)) return;
    const clean = cleanUrlReference(rawRef);
    const targetPath = normalizePath(clean);
    if (!targetPath) return;

    const ghostId = `missing:${targetPath.toLowerCase()}`;
    const edgeKey = `${sourceFile.id}->${ghostId}:${kind}`;

    if (!connectionSet.has(edgeKey)) {
      connectionSet.add(edgeKey);
      connections.push({
        sourceId: sourceFile.id,
        targetId: ghostId,
        kind,
        isMissing: true,
        missingPath: targetPath,
        sourcePath: sourceFile.path,
      });
    }

    const parts = targetPath.split("/");
    const filename = parts.pop() || targetPath;
    const directory = parts.join("/");

    if (!ghostFiles.has(ghostId)) {
      ghostFiles.set(ghostId, {
        id: ghostId,
        path: targetPath,
        filename,
        directory,
        category: getFileCategory(targetPath),
        referencedBy: [sourceFile.path],
      });
    } else {
      const existing = ghostFiles.get(ghostId)!;
      if (!existing.referencedBy.includes(sourceFile.path)) {
        existing.referencedBy.push(sourceFile.path);
      }
    }
  };

  for (const file of files) {
    const content = file.content || "";
    const category = getFileCategory(file.path);

    if (category === "html") {
      // 1. <link rel="stylesheet" href="...">
      const linkRegex = /<link\b([^>]*?)>/gi;
      let m: RegExpExecArray | null;
      while ((m = linkRegex.exec(content)) !== null) {
        const attrs = m[1];
        const hrefMatch = /\bhref\s*=\s*(?:["']([^"']+)["']|([^\s>]+))/i.exec(attrs);
        if (hrefMatch) {
          const href = hrefMatch[1] || hrefMatch[2];
          const isStylesheet =
            /\brel\s*=\s*(?:["'][^"']*\bstylesheet\b[^"']*["']|stylesheet\b)/i.test(attrs) ||
            href.toLowerCase().endsWith(".css");
          const kind = isStylesheet ? "stylesheet" : "image";
          const target = matchTargetFile(file.path, href, files);

          if (target && target.id !== file.id) {
            const key = `${file.id}->${target.id}:${kind}`;
            if (!connectionSet.has(key)) {
              connectionSet.add(key);
              connections.push({
                sourceId: file.id,
                targetId: target.id,
                kind,
                sourcePath: file.path,
              });
            }
          } else if (!target) {
            registerMissing(file, href, kind);
          }
        }
      }

      // 2. <script src="...">
      const scriptRegex = /<script\b[^>]*?\bsrc\s*=\s*(?:["']([^"']+)["']|([^\s>]+))[^>]*?>/gi;
      while ((m = scriptRegex.exec(content)) !== null) {
        const src = m[1] || m[2];
        const target = matchTargetFile(file.path, src, files);
        if (target && target.id !== file.id) {
          const key = `${file.id}->${target.id}:script`;
          if (!connectionSet.has(key)) {
            connectionSet.add(key);
            connections.push({
              sourceId: file.id,
              targetId: target.id,
              kind: "script",
              sourcePath: file.path,
            });
          }
        } else if (!target) {
          registerMissing(file, src, "script");
        }
      }

      // 3. <img src="...">
      const imgRegex = /<img\b[^>]*?\bsrc\s*=\s*(?:["']([^"']+)["']|([^\s>]+))[^>]*?>/gi;
      while ((m = imgRegex.exec(content)) !== null) {
        const src = m[1] || m[2];
        const target = matchTargetFile(file.path, src, files);
        if (target && target.id !== file.id) {
          const key = `${file.id}->${target.id}:image`;
          if (!connectionSet.has(key)) {
            connectionSet.add(key);
            connections.push({
              sourceId: file.id,
              targetId: target.id,
              kind: "image",
              sourcePath: file.path,
            });
          }
        } else if (!target) {
          registerMissing(file, src, "image");
        }
      }

      // 4. CSS url('...') in inline styles
      const cssUrlRegex = /url\(\s*(["']?)([^"')]+)\1\s*\)/gi;
      while ((m = cssUrlRegex.exec(content)) !== null) {
        const urlRef = m[2];
        const target = matchTargetFile(file.path, urlRef, files);
        if (target && target.id !== file.id) {
          const key = `${file.id}->${target.id}:image`;
          if (!connectionSet.has(key)) {
            connectionSet.add(key);
            connections.push({
              sourceId: file.id,
              targetId: target.id,
              kind: "image",
              sourcePath: file.path,
            });
          }
        } else if (!target) {
          registerMissing(file, urlRef, "image");
        }
      }

      // 5. Internal page links <a href="about.html">
      const aRegex = /<a\b[^>]*?\bhref\s*=\s*(?:["']([^"']+)["']|([^\s>]+))[^>]*?>/gi;
      while ((m = aRegex.exec(content)) !== null) {
        const href = m[1] || m[2];
        const isHtmlRef = href.endsWith(".html") || href.endsWith(".htm");
        const target = matchTargetFile(file.path, href, files);

        if (target && target.id !== file.id && (target.path.endsWith(".html") || target.path.endsWith(".htm"))) {
          const key = `${file.id}->${target.id}:page-link`;
          if (!connectionSet.has(key)) {
            connectionSet.add(key);
            connections.push({
              sourceId: file.id,
              targetId: target.id,
              kind: "page-link",
              sourcePath: file.path,
            });
          }
        } else if (!target && isHtmlRef) {
          registerMissing(file, href, "page-link");
        }
      }
    } else if (category === "css") {
      // 1. @import url(...)
      const importRegex = /@import\s+(?:url\(['"]?([^'"\)]+)['"]?\)|['"]([^'"]+)['"])\s*;/gi;
      let m: RegExpExecArray | null;
      while ((m = importRegex.exec(content)) !== null) {
        const ref = m[1] || m[2];
        const target = matchTargetFile(file.path, ref, files);
        if (target && target.id !== file.id) {
          const key = `${file.id}->${target.id}:import`;
          if (!connectionSet.has(key)) {
            connectionSet.add(key);
            connections.push({
              sourceId: file.id,
              targetId: target.id,
              kind: "import",
              sourcePath: file.path,
            });
          }
        } else if (!target) {
          registerMissing(file, ref, "import");
        }
      }

      // 2. url(...) in CSS
      const cssUrlRegex = /url\(\s*(["']?)([^"')]+)\1\s*\)/gi;
      while ((m = cssUrlRegex.exec(content)) !== null) {
        const urlRef = m[2];
        const target = matchTargetFile(file.path, urlRef, files);
        if (target && target.id !== file.id) {
          const key = `${file.id}->${target.id}:image`;
          if (!connectionSet.has(key)) {
            connectionSet.add(key);
            connections.push({
              sourceId: file.id,
              targetId: target.id,
              kind: "image",
              sourcePath: file.path,
            });
          }
        } else if (!target) {
          registerMissing(file, urlRef, "image");
        }
      }
    } else if (category === "js") {
      const jsImportRegex = /(?:import\s+(?:[\w*\s{},]*from\s+)?|require\()\s*['"]([^'"]+)['"]/gi;
      let m: RegExpExecArray | null;
      while ((m = jsImportRegex.exec(content)) !== null) {
        const ref = m[1];
        const target = matchTargetFile(file.path, ref, files);
        if (target && target.id !== file.id) {
          const key = `${file.id}->${target.id}:script`;
          if (!connectionSet.has(key)) {
            connectionSet.add(key);
            connections.push({
              sourceId: file.id,
              targetId: target.id,
              kind: "script",
              sourcePath: file.path,
            });
          }
        } else if (!target && (ref.startsWith("./") || ref.startsWith("../") || ref.endsWith(".js") || ref.endsWith(".ts"))) {
          registerMissing(file, ref, "script");
        }
      }
    }
  }

  return { connections, ghostFiles };
}

export interface GeneratedProjectMap {
  nodes: Node<ProjectMapNodeData>[];
  edges: Edge[];
  stats: {
    totalFiles: number;
    realFiles: number;
    missingFiles: number;
    orphanFiles: number;
    totalConnections: number;
    imageCount: number;
    cssCount: number;
    jsCount: number;
    htmlCount: number;
  };
}

/**
 * Builds React Flow nodes and edges with clean hierarchical Dagre auto-layout,
 * full image preview extraction, metadata, and color-coded edge routing.
 */
export function buildProjectMapGraph(
  files: ProjectMapFile[],
  projectId: string,
  handlers?: {
    onDeleteFile?: (fileId: string, filename: string) => void;
    onOpenFile?: (path: string) => void;
    onPreviewImage?: (url: string, filename: string, size: string) => void;
  }
): GeneratedProjectMap {
  if (files.length === 0) {
    return {
      nodes: [],
      edges: [],
      stats: {
        totalFiles: 0,
        realFiles: 0,
        missingFiles: 0,
        orphanFiles: 0,
        totalConnections: 0,
        imageCount: 0,
        cssCount: 0,
        jsCount: 0,
        htmlCount: 0,
      },
    };
  }

  const { connections, ghostFiles } = extractFileConnections(files);

  // Compute degree counts
  const inDegreeMap = new Map<string, number>();
  const outDegreeMap = new Map<string, number>();

  for (const c of connections) {
    outDegreeMap.set(c.sourceId, (outDegreeMap.get(c.sourceId) || 0) + 1);
    inDegreeMap.set(c.targetId, (inDegreeMap.get(c.targetId) || 0) + 1);
  }

  const entryCandidate =
    files.find((f) => f.path === "index.html" || f.path === "main.py") ||
    files.find((f) => getFileCategory(f.path) === "html");
  const entryId = entryCandidate?.id;

  const rawNodes: Node<ProjectMapNodeData>[] = [];
  let orphanCount = 0;
  let imageCount = 0;
  let cssCount = 0;
  let jsCount = 0;
  let htmlCount = 0;

  // 1. Build nodes for real files
  for (const file of files) {
    const parts = file.path.split("/");
    const filename = parts.pop() || file.path;
    const directory = parts.join("/");
    const category = getFileCategory(file.path);
    const ext = filename.split(".").pop()?.toUpperCase() || "";
    const { formatted, bytes } = formatFileSize(file.content);

    if (category === "image") imageCount++;
    if (category === "css") cssCount++;
    if (category === "js") jsCount++;
    if (category === "html") htmlCount++;

    const inDeg = inDegreeMap.get(file.id) || 0;
    const outDeg = outDegreeMap.get(file.id) || 0;

    const isEntry = file.id === entryId || file.path === "index.html" || file.path === "main.py";
    const isOrphan = !isEntry && inDeg === 0;
    if (isOrphan) orphanCount++;

    const imageUrl = category === "image" ? resolveImageUrl(file.content, file.path) : undefined;
    const htmlTitle = category === "html" ? extractHtmlTitle(file.content) : undefined;
    const cssColors = category === "css" ? extractCssColors(file.content) : undefined;

    rawNodes.push({
      id: file.id,
      type: "projectFileNode",
      position: { x: 0, y: 0 },
      data: {
        fileId: file.id,
        path: file.path,
        filename,
        directory,
        category,
        extension: ext,
        formattedSize: formatted,
        sizeBytes: bytes,
        inDegree: inDeg,
        outDegree: outDeg,
        projectId,
        isMissing: false,
        isOrphan,
        imageUrl,
        htmlTitle,
        cssColors,
        onDeleteFile: handlers?.onDeleteFile,
        onOpenFile: handlers?.onOpenFile,
        onPreviewImage: handlers?.onPreviewImage,
      },
    });
  }

  // 2. Build nodes for missing ghost files
  for (const [ghostId, ghost] of ghostFiles) {
    const inDeg = inDegreeMap.get(ghostId) || 1;
    const ext = ghost.filename.split(".").pop()?.toUpperCase() || "";

    rawNodes.push({
      id: ghostId,
      type: "projectFileNode",
      position: { x: 0, y: 0 },
      data: {
        fileId: ghostId,
        path: ghost.path,
        filename: ghost.filename,
        directory: ghost.directory,
        category: ghost.category,
        extension: ext,
        formattedSize: "Missing",
        sizeBytes: 0,
        inDegree: inDeg,
        outDegree: 0,
        projectId,
        isMissing: true,
        isOrphan: false,
        referencedBy: ghost.referencedBy,
        onDeleteFile: undefined,
        onOpenFile: undefined,
      },
    });
  }

  // 3. Build color-coded smoothstep edges
  const edges: Edge[] = connections.map((conn) => {
    const edgeId = `edge-${conn.sourceId}-${conn.targetId}-${conn.kind}`;
    const isMissing = !!conn.isMissing;

    // Distinctive color-coded edge strokes
    let strokeColor = "currentColor";
    if (isMissing) {
      strokeColor = "#ef4444"; // Red for broken/missing
    } else if (conn.kind === "stylesheet") {
      strokeColor = "#38bdf8"; // Sky blue for CSS
    } else if (conn.kind === "image") {
      strokeColor = "#c084fc"; // Purple for Images
    } else if (conn.kind === "script") {
      strokeColor = "#34d399"; // Emerald for Scripts
    } else if (conn.kind === "page-link") {
      strokeColor = "#fbbf24"; // Amber for Page links
    }

    return {
      id: edgeId,
      source: conn.sourceId,
      target: conn.targetId,
      type: "smoothstep",
      animated: isMissing,
      markerEnd: {
        type: MarkerType.ArrowClosed,
        width: 14,
        height: 14,
        color: strokeColor,
      },
      style: {
        strokeWidth: isMissing ? 1.75 : 1.5,
        stroke: strokeColor,
        strokeDasharray: isMissing ? "5 5" : undefined,
        opacity: isMissing ? 0.95 : 0.65,
      },
      data: {
        kind: conn.kind,
        isMissing,
      },
    };
  });

  // 4. Clean Hierarchical Auto-Layout via Dagre with dimension awareness
  const g = new dagre.graphlib.Graph();
  g.setGraph({
    rankdir: "LR",
    align: "UL",
    nodesep: 40,
    ranksep: 90,
    marginx: 40,
    marginy: 40,
  });
  g.setDefaultEdgeLabel(() => ({}));

  // Define node dimensions tailored to card content
  const getNodeDimensions = (node: Node<ProjectMapNodeData>) => {
    if (node.data.isMissing) {
      return { width: 240, height: 85 };
    }
    if (node.data.category === "image") {
      // Image card contains a visual thumbnail preview!
      return { width: 260, height: 215 };
    }
    if (node.data.category === "html") {
      return { width: 260, height: node.data.htmlTitle ? 125 : 110 };
    }
    if (node.data.category === "css") {
      return { width: 260, height: node.data.cssColors?.length ? 120 : 105 };
    }
    return { width: 260, height: 105 };
  };

  // Add nodes to Dagre
  for (const node of rawNodes) {
    const dim = getNodeDimensions(node);
    g.setNode(node.id, dim);
  }

  // Add edges to Dagre
  for (const edge of edges) {
    g.setEdge(edge.source, edge.target);
  }

  // Run layout
  dagre.layout(g);

  // Map back to React Flow coordinates
  const nodes = rawNodes.map((node) => {
    const dagreNode = g.node(node.id);
    const dim = getNodeDimensions(node);

    const x = dagreNode ? Math.round(dagreNode.x - dim.width / 2) : 0;
    const y = dagreNode ? Math.round(dagreNode.y - dim.height / 2) : 0;

    return {
      ...node,
      position: { x, y },
    };
  });

  return {
    nodes,
    edges,
    stats: {
      totalFiles: nodes.length,
      realFiles: files.length,
      missingFiles: ghostFiles.size,
      orphanFiles: orphanCount,
      totalConnections: edges.length,
      imageCount,
      cssCount,
      jsCount,
      htmlCount,
    },
  };
}
