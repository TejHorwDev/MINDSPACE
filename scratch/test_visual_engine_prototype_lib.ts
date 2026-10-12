// scratch/test_visual_engine_prototype_lib.ts

export interface TagMatch {
  raw: string;
  tagName: string;
  attributes: string;
  isSelfClosing: boolean;
  startIndex: number;
  endIndex: number;
  mindspaceId?: string;
  indexOrder: number;
}

const IGNORED_TAGS = new Set([
  "!doctype",
  "html",
  "head",
  "meta",
  "link",
  "style",
  "script",
  "title",
  "base",
  "noscript",
]);

const VOID_TAGS = new Set([
  "area",
  "base",
  "br",
  "col",
  "embed",
  "hr",
  "img",
  "input",
  "link",
  "meta",
  "param",
  "source",
  "track",
  "wbr",
]);

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function camelToKebab(str: string): string {
  return str.replace(/([A-Z])/g, "-$1").toLowerCase();
}

export function serializeInlineStyles(styles: Record<string, string>): string {
  return Object.entries(styles)
    .filter(([_, val]) => val !== undefined && val !== null && val !== "")
    .map(([key, val]) => `${camelToKebab(key.trim())}: ${val.trim()};`)
    .join(" ");
}

export function parseInlineStyles(styleAttr: string): Record<string, string> {
  const result: Record<string, string> = {};
  if (!styleAttr || !styleAttr.trim()) return result;

  const declarations = styleAttr.split(";");
  for (const decl of declarations) {
    const colonIdx = decl.indexOf(":");
    if (colonIdx === -1) continue;
    const property = decl.slice(0, colonIdx).trim().toLowerCase();
    const value = decl.slice(colonIdx + 1).trim();
    if (property && value) {
      result[property] = value;
    }
  }
  return result;
}

export function scanEligibleTags(html: string): TagMatch[] {
  const results: TagMatch[] = [];
  let indexOrder = 1;

  const tokenRegex = /<!--[\s\S]*?-->|<script\b[^>]*>[\s\S]*?<\/script>|<style\b[^>]*>[\s\S]*?<\/style>|<\/([a-zA-Z0-9\-]+)>|<([a-zA-Z0-9\-]+)(\s[^>]*?)?(\/?)>/gi;

  let match: RegExpExecArray | null;
  while ((match = tokenRegex.exec(html)) !== null) {
    const raw = match[0];
    const startIndex = match.index;
    const endIndex = tokenRegex.lastIndex;

    const tagName = match[2];
    if (!tagName) continue;

    const lowerTag = tagName.toLowerCase();
    if (IGNORED_TAGS.has(lowerTag)) continue;

    const attributes = match[3] || "";
    const isSelfClosing = Boolean(match[4]) || VOID_TAGS.has(lowerTag);

    const idMatch = /\bdata-mindspace-id\s*=\s*(?:["']([^"']+)["']|([^\s>]+))/i.exec(attributes);
    const mindspaceId = idMatch ? (idMatch[1] ?? idMatch[2]) : undefined;

    results.push({
      raw,
      tagName: lowerTag,
      attributes,
      isSelfClosing,
      startIndex,
      endIndex,
      mindspaceId,
      indexOrder: indexOrder++,
    });
  }

  return results;
}

export function injectMindspaceIds(html: string): string {
  const tags = scanEligibleTags(html);
  if (tags.length === 0) return html;

  let modified = html;
  for (let i = tags.length - 1; i >= 0; i--) {
    const tag = tags[i];
    const assignedId = tag.mindspaceId || `ms-${tag.indexOrder}`;

    if (!tag.mindspaceId) {
      const selfCloseSuffix = tag.raw.trim().endsWith("/>") ? " />" : ">";
      const beforeClose = tag.raw.slice(1, tag.raw.length - (tag.raw.trim().endsWith("/>") ? 2 : 1));
      const newTag = `<${beforeClose.trim()} data-mindspace-id="${assignedId}"${selfCloseSuffix === " />" ? " />" : ">"}`;

      modified = modified.slice(0, tag.startIndex) + newTag + modified.slice(tag.endIndex);
    }
  }

  return modified;
}

export function stripMindspaceIds(html: string): string {
  return html.replace(/\s+data-mindspace-id=(?:["'][^"']*["']|[^\s>]+)/gi, "");
}

export function applyVisualInlineStyleEdit(
  html: string,
  mindspaceId: string,
  styles: Record<string, string>
): string {
  const tags = scanEligibleTags(html);
  if (tags.length === 0) return html;

  let targetTag: TagMatch | undefined = tags.find((t) => t.mindspaceId === mindspaceId);
  if (!targetTag) {
    const orderMatch = /^ms-(\d+)$/.exec(mindspaceId);
    if (orderMatch) {
      const order = parseInt(orderMatch[1], 10);
      targetTag = tags.find((t) => t.indexOrder === order);
    }
  }

  if (!targetTag) return html;

  const styleMatch = /\bstyle\s*=\s*(?:["']([^"']*)["']|([^\s>]+))/i.exec(targetTag.attributes);
  const existingStyleStr = styleMatch ? (styleMatch[1] ?? styleMatch[2] ?? "") : "";
  const existingStyles = parseInlineStyles(existingStyleStr);

  for (const [k, v] of Object.entries(styles)) {
    const propName = camelToKebab(k.trim());
    if (v === "" || v === null || v === undefined) {
      delete existingStyles[propName];
    } else {
      existingStyles[propName] = v;
    }
  }

  const newStyleStr = serializeInlineStyles(existingStyles);

  let newTagRaw: string;
  if (styleMatch) {
    const replacedAttrs = targetTag.attributes.replace(
      /\bstyle\s*=\s*(?:["'][^"']*["']|[^\s>]+)/i,
      `style="${newStyleStr}"`
    );
    const selfClose = targetTag.raw.trim().endsWith("/>") ? " />" : ">";
    newTagRaw = `<${targetTag.tagName}${replacedAttrs}${selfClose === " />" ? " />" : ">"}`;
  } else {
    const selfClose = targetTag.raw.trim().endsWith("/>") ? " />" : ">";
    newTagRaw = `<${targetTag.tagName} style="${newStyleStr}"${targetTag.attributes}${selfClose === " />" ? " />" : ">"}`;
  }

  return html.slice(0, targetTag.startIndex) + newTagRaw + html.slice(targetTag.endIndex);
}

export function applyVisualTextEdit(
  html: string,
  mindspaceId: string,
  newText: string
): string {
  const tags = scanEligibleTags(html);
  if (tags.length === 0) return html;

  let targetTag: TagMatch | undefined = tags.find((t) => t.mindspaceId === mindspaceId);
  if (!targetTag) {
    const orderMatch = /^ms-(\d+)$/.exec(mindspaceId);
    if (orderMatch) {
      const order = parseInt(orderMatch[1], 10);
      targetTag = tags.find((t) => t.indexOrder === order);
    }
  }

  if (!targetTag || targetTag.isSelfClosing) return html;

  const startOfInner = targetTag.endIndex;
  const tagToMatch = targetTag.tagName;

  const scanner = new RegExp(`<(/?)${escapeRegex(tagToMatch)}(\\s[^>]*?)?>`, "gi");
  scanner.lastIndex = startOfInner;

  let depth = 1;
  let endOfInner = -1;
  let closeTagMatch: RegExpExecArray | null;

  while ((closeTagMatch = scanner.exec(html)) !== null) {
    const isClosing = closeTagMatch[1] === "/";
    if (isClosing) {
      depth--;
      if (depth === 0) {
        endOfInner = closeTagMatch.index;
        break;
      }
    } else {
      if (!closeTagMatch[0].endsWith("/>")) {
        depth++;
      }
    }
  }

  if (endOfInner === -1) {
    return html;
  }

  return html.slice(0, startOfInner) + newText + html.slice(endOfInner);
}
