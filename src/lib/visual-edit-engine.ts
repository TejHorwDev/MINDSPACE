// src/lib/visual-edit-engine.ts

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

export const IGNORED_TAGS = new Set([
  "!doctype",
  "html",
  "head",
  "body",
  "meta",
  "link",
  "style",
  "script",
  "title",
  "base",
  "noscript",
]);

export const VOID_TAGS = new Set([
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

/**
 * Escapes characters for safe RegExp generation.
 */
export function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Converts CSS camelCase to kebab-case (e.g., backgroundColor -> background-color).
 */
export function camelToKebab(str: string): string {
  return str.replace(/([A-Z])/g, "-$1").toLowerCase();
}

/**
 * Converts CSS kebab-case to camelCase (e.g., background-color -> backgroundColor).
 */
export function kebabToCamel(str: string): string {
  return str.replace(/-([a-z])/g, (_, char) => char.toUpperCase());
}

/**
 * Normalizes CSS key-value pairs into a clean inline style string.
 */
export function serializeInlineStyles(styles: Record<string, string>): string {
  return Object.entries(styles)
    .filter(([_, val]) => val !== undefined && val !== null && val !== "")
    .map(([key, val]) => {
      // Ensure url('...') uses single quotes to never break HTML style="..." double quotes
      const cleanVal = val.trim().replace(/url\(["']?([^"')]+)["']?\)/gi, "url('$1')");
      return `${camelToKebab(key.trim())}: ${cleanVal};`;
    })
    .join(" ");
}

/**
 * Parses existing inline style attribute into a dictionary.
 */
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

/**
 * Scans an HTML string for opening tags outside of comments, script, and style blocks.
 */
export function scanEligibleTags(html: string): TagMatch[] {
  const results: TagMatch[] = [];
  let indexOrder = 1;

  // Regex matches comments, scripts, styles, closing tags, and opening tags
  const tokenRegex =
    /<!--[\s\S]*?-->|<script\b[^>]*>[\s\S]*?<\/script>|<style\b[^>]*>[\s\S]*?<\/style>|<\/([a-zA-Z0-9\-]+)>|<([a-zA-Z0-9\-]+)(\s[^>]*?)?(\/?)>/gi;

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

    // Extract existing data-mindspace-id if present
    const idMatch =
      /\bdata-mindspace-id\s*=\s*(?:["']([^"']+)["']|([^\s>]+))/i.exec(attributes);
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

/**
 * Finds the full range (start index, end index, outer HTML) of an element including its matching closing tag.
 */
export function findFullElementRange(
  html: string,
  tag: TagMatch
): { start: number; end: number; outerHtml: string } {
  if (tag.isSelfClosing) {
    return {
      start: tag.startIndex,
      end: tag.endIndex,
      outerHtml: html.slice(tag.startIndex, tag.endIndex),
    };
  }

  const startOfInner = tag.endIndex;
  const tagToMatch = tag.tagName;

  const scanner = new RegExp(`<(\/?)${escapeRegex(tagToMatch)}(\\s[^>]*?)?>`, "gi");
  scanner.lastIndex = startOfInner;

  let depth = 1;
  let fullEnd = -1;
  let closeTagMatch: RegExpExecArray | null;

  while ((closeTagMatch = scanner.exec(html)) !== null) {
    const isClosing = closeTagMatch[1] === "/";
    if (isClosing) {
      depth--;
      if (depth === 0) {
        fullEnd = scanner.lastIndex;
        break;
      }
    } else {
      if (!closeTagMatch[0].endsWith("/>") && !VOID_TAGS.has(tagToMatch)) {
        depth++;
      }
    }
  }

  if (fullEnd === -1) {
    fullEnd = tag.endIndex;
  }

  return {
    start: tag.startIndex,
    end: fullEnd,
    outerHtml: html.slice(tag.startIndex, fullEnd),
  };
}

/**
 * Locates an element TagMatch by explicit data-mindspace-id or deterministic sequence order.
 */
export function locateTagMatch(tags: TagMatch[], mindspaceId: string): TagMatch | undefined {
  let targetTag: TagMatch | undefined = tags.find((t) => t.mindspaceId === mindspaceId);
  if (!targetTag) {
    const orderMatch = /^ms-(\d+)$/.exec(mindspaceId);
    if (orderMatch) {
      const order = parseInt(orderMatch[1], 10);
      targetTag = tags.find((t) => t.indexOrder === order);
    }
  }
  return targetTag;
}

/**
 * Injects deterministic data-mindspace-id attributes into all eligible opening HTML tags.
 * Only runs for Editor-mode Live Preview rendering. Never runs for published or exported sites.
 */
export function injectMindspaceIds(html: string): string {
  const tags = scanEligibleTags(html);
  if (tags.length === 0) return html;

  // Reconstruct string by replacing tags in reverse order to preserve original character indices
  let modified = html;
  for (let i = tags.length - 1; i >= 0; i--) {
    const tag = tags[i];
    const assignedId = tag.mindspaceId || `ms-${tag.indexOrder}`;

    if (!tag.mindspaceId) {
      const isSelfClose = tag.raw.trim().endsWith("/>");
      const tagContent = tag.raw.slice(1, tag.raw.length - (isSelfClose ? 2 : 1));
      const newTag = `<${tagContent.trim()} data-mindspace-id="${assignedId}"${
        isSelfClose ? " />" : ">"
      }`;

      modified =
        modified.slice(0, tag.startIndex) + newTag + modified.slice(tag.endIndex);
    }
  }

  return modified;
}

/**
 * Strips all data-mindspace-id attributes and visual editing artifacts from HTML.
 * Used for published sites and downloaded ZIP archives to guarantee 100% clean public code.
 */
export function stripMindspaceIds(html: string): string {
  if (!html) return "";
  let clean = html.replace(/\s+data-mindspace-id=(?:["'][^"']*["']|[^\s>]+)/gi, "");
  // Remove any injected visual editor script or styles if present
  clean = clean.replace(
    /<script\b[^>]*data-mindspace-visual-editor=["']true["'][\s\S]*?<\/script>/gi,
    ""
  );
  clean = clean.replace(
    /<style\b[^>]*id=["']mindspace-visual-editor-styles["'][\s\S]*?<\/style>/gi,
    ""
  );
  clean = clean.replace(
    /<div\b[^>]*id=["']mindspace-visual-toolbar["'][\s\S]*?<\/div>/gi,
    ""
  );
  clean = clean.replace(
    /<div\b[^>]*id=["']mindspace-insertion-indicator["'][\s\S]*?<\/div>/gi,
    ""
  );
  clean = clean.replace(
    /<div\b[^>]*id=["']mindspace-drag-ghost["'][\s\S]*?<\/div>/gi,
    ""
  );
  return clean;
}

/**
 * Automatically repairs malformed inline style attributes in HTML where double quotes
 * were erroneously inserted inside url("..."), causing premature closure of style="...".
 */
export function repairMalformedInlineStyles(html: string): string {
  if (!html) return "";
  return html.replace(
    /\bstyle\s*=\s*"([^"]*?url\()"(.*?)"(\)[^>]*?)"/gi,
    'style="$1\'$2\'$3"'
  );
}

/**
 * Applies an inline style change to an element identified by mindspaceId.
 * Merges with existing inline styles and never alters shared CSS stylesheets or classes.
 */
export function applyVisualInlineStyleEdit(
  html: string,
  mindspaceId: string,
  styles: Record<string, string>
): string {
  const sanitizedHtml = repairMalformedInlineStyles(html);
  const tags = scanEligibleTags(sanitizedHtml);
  if (tags.length === 0) return sanitizedHtml;

  const targetTag = locateTagMatch(tags, mindspaceId);
  if (!targetTag) {
    console.warn(`[MINDSPACE Visual Edit] Target element "${mindspaceId}" not found for style edit.`);
    return sanitizedHtml;
  }

  // Extract existing inline style safely supporting both single and double quotes
  const styleMatch =
    /\bstyle\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i.exec(targetTag.attributes);
  const existingStyleStr = styleMatch
    ? (styleMatch[1] ?? styleMatch[2] ?? styleMatch[3] ?? "")
    : "";
  const existingStyles = parseInlineStyles(existingStyleStr);

  // Merge new style properties
  for (const [k, v] of Object.entries(styles)) {
    const propName = camelToKebab(k.trim());
    if (v === "" || v === null || v === undefined) {
      delete existingStyles[propName];
    } else {
      existingStyles[propName] = v;
    }
  }

  const newStyleStr = serializeInlineStyles(existingStyles);

  // Rebuild opening tag
  let newTagRaw: string;
  const isSelfClose = targetTag.raw.trim().endsWith("/>");
  const closingSuffix = isSelfClose ? " />" : ">";

  const styleReplaceRegex = /\bstyle\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/i;
  if (styleMatch) {
    const replacedAttrs = targetTag.attributes.replace(
      styleReplaceRegex,
      newStyleStr ? `style="${newStyleStr}"` : ""
    );
    newTagRaw = `<${targetTag.tagName}${replacedAttrs}${closingSuffix}`;
  } else {
    newTagRaw = newStyleStr
      ? `<${targetTag.tagName} style="${newStyleStr}"${targetTag.attributes}${closingSuffix}`
      : targetTag.raw;
  }

  return (
    sanitizedHtml.slice(0, targetTag.startIndex) + newTagRaw + sanitizedHtml.slice(targetTag.endIndex)
  );
}

/**
 * Applies a text or innerHTML change to an element identified by mindspaceId.
 * Preserves nested child HTML structures cleanly without destructive innerText stripping.
 */
export function applyVisualTextEdit(
  html: string,
  mindspaceId: string,
  newContent: string
): string {
  const tags = scanEligibleTags(html);
  if (tags.length === 0) return html;

  const targetTag = locateTagMatch(tags, mindspaceId);
  if (!targetTag || targetTag.isSelfClosing) {
    console.warn(`[MINDSPACE Visual Edit] Target element "${mindspaceId}" not found for text edit.`);
    return html;
  }

  const range = findFullElementRange(html, targetTag);
  const startOfInner = targetTag.endIndex;
  const endOfInner = range.end - (`</${targetTag.tagName}>`).length;

  if (endOfInner < startOfInner) {
    return html;
  }

  // Clean any visual edit IDs or transient classes that might have leaked into newContent
  const cleanContent = stripMindspaceIds(newContent)
    .replace(/\s*mindspace-content-editing/g, "")
    .replace(/\s*mindspace-visual-selected/g, "")
    .replace(/\s*mindspace-visual-hovered/g, "");

  return html.slice(0, startOfInner) + cleanContent + html.slice(endOfInner);
}

/**
 * Applies an image source or background-image change to an element identified by mindspaceId.
 */
export function applyVisualImageChange(
  html: string,
  mindspaceId: string,
  newSrc: string,
  isBackground: boolean = false
): string {
  const sanitizedHtml = repairMalformedInlineStyles(html);
  const tags = scanEligibleTags(sanitizedHtml);
  if (tags.length === 0) return sanitizedHtml;

  const targetTag = locateTagMatch(tags, mindspaceId);
  if (!targetTag) {
    console.warn(`[MINDSPACE Visual Edit] Target element "${mindspaceId}" not found for image change.`);
    return sanitizedHtml;
  }

  if (isBackground || targetTag.tagName !== "img") {
    // Apply as background-image style with cover and center positioning using single quotes
    let updated = applyVisualInlineStyleEdit(sanitizedHtml, mindspaceId, {
      backgroundImage: `url('${newSrc}')`,
      backgroundSize: "cover",
      backgroundPosition: "center",
      backgroundRepeat: "no-repeat",
    });

    // If element has simple placeholder text (e.g. initials "ML" or "✦"), clear it so the photo is unobstructed
    try {
      const freshTags = scanEligibleTags(updated);
      const freshTag = locateTagMatch(freshTags, mindspaceId);
      if (freshTag) {
        const range = findFullElementRange(updated, freshTag);
        const inner = updated.slice(freshTag.endIndex, range.end - (`</${freshTag.tagName}>`).length).trim();
        if (inner && !/<[a-z]/i.test(inner)) {
          updated = applyVisualTextEdit(updated, mindspaceId, "");
        }
      }
    } catch (err) {}

    return updated;
  }

  // Update src attribute on <img> tag safely supporting single or double quotes
  const srcMatch = /\bsrc\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i.exec(targetTag.attributes);
  const isSelfClose = targetTag.raw.trim().endsWith("/>");
  const closingSuffix = isSelfClose ? " />" : ">";

  let newTagRaw: string;
  const srcReplaceRegex = /\bsrc\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/i;
  if (srcMatch) {
    const replacedAttrs = targetTag.attributes.replace(
      srcReplaceRegex,
      `src="${newSrc}"`
    );
    newTagRaw = `<${targetTag.tagName}${replacedAttrs}${closingSuffix}`;
  } else {
    newTagRaw = `<${targetTag.tagName} src="${newSrc}"${targetTag.attributes}${closingSuffix}`;
  }

  return (
    sanitizedHtml.slice(0, targetTag.startIndex) + newTagRaw + sanitizedHtml.slice(targetTag.endIndex)
  );
}

/**
 * Reorders an element among its siblings within the source HTML markup.
 * Uses full element range boundaries to relocate outer markup cleanly.
 */
export function applyVisualReorder(
  html: string,
  movedId: string,
  targetId: string,
  position: "before" | "after"
): string {
  const tags = scanEligibleTags(html);
  const movedTag = locateTagMatch(tags, movedId);
  const targetTag = locateTagMatch(tags, targetId);

  if (!movedTag || !targetTag) {
    console.warn("[MINDSPACE Visual Reorder] Elements not found:", { movedId, targetId });
    return html;
  }

  if (movedTag.startIndex === targetTag.startIndex) {
    return html;
  }

  const movedRange = findFullElementRange(html, movedTag);
  const targetRange = findFullElementRange(html, targetTag);

  const movedOuter = movedRange.outerHtml;

  if (movedRange.start < targetRange.start) {
    const beforeMoved = html.slice(0, movedRange.start);
    const insertPoint = position === "before" ? targetRange.start : targetRange.end;
    const betweenMovedAndTarget = html.slice(movedRange.end, insertPoint);
    const afterTarget = html.slice(insertPoint);

    // Maintain formatting: trim leading newline if needed and insert with sibling spacing
    return beforeMoved + betweenMovedAndTarget + "\n    " + movedOuter + afterTarget;
  } else {
    const insertPoint = position === "before" ? targetRange.start : targetRange.end;
    const beforeInsert = html.slice(0, insertPoint);
    const betweenInsertAndMoved = html.slice(insertPoint, movedRange.start);
    const afterMoved = html.slice(movedRange.end);

    return beforeInsert + movedOuter + "\n    " + betweenInsertAndMoved + afterMoved;
  }
}

/**
 * Generates the complete, self-contained in-preview visual editing script and floating toolbar.
 * Injected exclusively during editor Live Preview bundling.
 */
export function generateVisualEditorScript(): string {
  return `
<!-- MINDSPACE Visual Inline Editing Injected Runtime V2 (God Tier) -->
<style id="mindspace-visual-editor-styles">
  .mindspace-visual-hovered {
    outline: 2px dashed rgba(139, 92, 246, 0.85) !important;
    outline-offset: 2px !important;
    cursor: pointer !important;
  }
  .mindspace-visual-selected {
    outline: 2px solid #8b5cf6 !important;
    outline-offset: 3px !important;
    box-shadow: 0 0 0 4px rgba(139, 92, 246, 0.25) !important;
    position: relative !important;
  }
  .mindspace-content-editing {
    outline: 2px solid #10b981 !important;
    outline-offset: 3px !important;
    box-shadow: 0 0 0 4px rgba(16, 185, 129, 0.25) !important;
    cursor: text !important;
  }
  #mindspace-visual-toolbar {
    position: fixed;
    z-index: 2147483647;
    display: none;
    align-items: center;
    flex-wrap: nowrap;
    gap: 5px;
    background: #18181b;
    color: #f4f4f5;
    border: 1px solid rgba(255, 255, 255, 0.18);
    box-shadow: 0 20px 40px -4px rgba(0, 0, 0, 0.75), 0 0 0 1px rgba(255, 255, 255, 0.08);
    border-radius: 10px;
    padding: 6px 9px;
    font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 11px;
    line-height: 1;
    user-select: none;
    box-sizing: border-box;
    transition: opacity 0.12s ease;
    max-width: 95vw;
    overflow-x: auto;
  }
  #mindspace-visual-toolbar * {
    box-sizing: border-box;
    font-family: inherit;
  }
  .ms-tb-tag-badge {
    background: rgba(255, 255, 255, 0.08);
    color: #e4e4e7;
    border: 1px solid rgba(255, 255, 255, 0.12);
    padding: 3px 6px;
    border-radius: 5px;
    font-family: monospace;
    font-size: 10px;
    font-weight: 600;
  }
  .ms-tb-sep {
    width: 1px;
    height: 16px;
    background: rgba(255, 255, 255, 0.15);
    flex-shrink: 0;
  }
  .ms-tb-btn {
    background: transparent;
    color: #d4d4d8;
    border: 1px solid transparent;
    border-radius: 6px;
    padding: 3px 6px;
    font-size: 11px;
    font-weight: 500;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 3px;
    transition: background 0.15s, color 0.15s, border-color 0.15s;
    height: 24px;
    white-space: nowrap;
  }
  .ms-tb-btn:hover {
    background: rgba(255, 255, 255, 0.12);
    color: #ffffff;
  }
  .ms-tb-btn.active {
    background: #8b5cf6;
    color: #ffffff;
    border-color: #a78bfa;
  }
  .ms-tb-color-wrapper {
    position: relative;
    display: inline-flex;
    align-items: center;
    cursor: pointer;
  }
  .ms-tb-color-preview {
    width: 18px;
    height: 18px;
    border-radius: 50%;
    border: 1.5px solid rgba(255, 255, 255, 0.35);
    cursor: pointer;
    box-shadow: 0 1px 3px rgba(0,0,0,0.4);
  }
  .ms-tb-color-input {
    position: absolute;
    inset: 0;
    opacity: 0;
    width: 100%;
    height: 100%;
    cursor: pointer;
  }
  .ms-tb-select {
    background: #27272a;
    color: #e4e4e7;
    border: 1px solid rgba(255, 255, 255, 0.14);
    border-radius: 6px;
    padding: 2px 5px;
    font-size: 11px;
    height: 24px;
    outline: none;
    cursor: pointer;
  }
  .ms-tb-select:hover {
    border-color: rgba(255, 255, 255, 0.3);
  }
  .ms-tb-photo-btn {
    background: rgba(16, 185, 129, 0.18);
    color: #6ee7b7;
    border: 1px solid rgba(16, 185, 129, 0.35);
  }
  .ms-tb-photo-btn:hover {
    background: rgba(16, 185, 129, 0.32);
    color: #ffffff;
    border-color: #34d399;
  }
  .ms-tb-close {
    background: none;
    border: none;
    color: #a1a1aa;
    font-size: 15px;
    cursor: pointer;
    padding: 2px 4px;
    line-height: 1;
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
  .ms-tb-close:hover {
    color: #ffffff;
    background: rgba(255, 255, 255, 0.1);
  }
</style>

<!-- Visual Style & Action Toolbar -->
<div id="mindspace-visual-toolbar" role="toolbar" aria-label="Visual Style Toolbar">
  <span id="ms-tb-tag" class="ms-tb-tag-badge">div</span>

  <div class="ms-tb-sep"></div>

  <!-- Text Color Picker -->
  <div class="ms-tb-color-wrapper" title="Text Color">
    <div id="ms-tb-text-color-preview" class="ms-tb-color-preview" style="background:#ffffff;"></div>
    <input type="color" id="ms-tb-text-color-input" class="ms-tb-color-input" value="#ffffff" />
  </div>

  <!-- Background Color Picker -->
  <div class="ms-tb-color-wrapper" title="Background Color">
    <div id="ms-tb-bg-color-preview" class="ms-tb-color-preview" style="background:#18181b;"></div>
    <input type="color" id="ms-tb-bg-color-input" class="ms-tb-color-input" value="#18181b" />
  </div>

  <div class="ms-tb-sep"></div>

  <!-- Font Size Selector -->
  <select id="ms-tb-font-size-select" class="ms-tb-select" title="Font Size">
    <option value="">Size</option>
    <option value="12px">12px</option>
    <option value="14px">14px</option>
    <option value="16px">16px</option>
    <option value="18px">18px</option>
    <option value="20px">20px</option>
    <option value="24px">24px</option>
    <option value="32px">32px</option>
    <option value="40px">40px</option>
    <option value="48px">48px</option>
  </select>

  <!-- Bold Toggle Button -->
  <button type="button" id="ms-tb-bold-btn" class="ms-tb-btn" title="Toggle Bold" style="font-weight: 700; width: 22px;">B</button>

  <div class="ms-tb-sep"></div>

  <!-- Text Alignment Buttons -->
  <div style="display:flex; gap:2px;">
    <button type="button" id="ms-tb-align-left" class="ms-tb-btn" title="Align Left">L</button>
    <button type="button" id="ms-tb-align-center" class="ms-tb-btn" title="Align Center">C</button>
    <button type="button" id="ms-tb-align-right" class="ms-tb-btn" title="Align Right">R</button>
  </div>

  <div class="ms-tb-sep"></div>

  <!-- Padding Selector -->
  <select id="ms-tb-padding-select" class="ms-tb-select" title="Padding">
    <option value="">Pad</option>
    <option value="0px">0px</option>
    <option value="4px">4px</option>
    <option value="8px">8px</option>
    <option value="12px">12px</option>
    <option value="16px">16px</option>
    <option value="24px">24px</option>
    <option value="32px">32px</option>
  </select>

  <!-- Margin Selector -->
  <select id="ms-tb-margin-select" class="ms-tb-select" title="Margin">
    <option value="">Mar</option>
    <option value="0px">0px</option>
    <option value="4px">4px</option>
    <option value="8px">8px</option>
    <option value="12px">12px</option>
    <option value="16px">16px</option>
    <option value="24px">24px</option>
    <option value="32px">32px</option>
  </select>

  <!-- Photo Upload / Replace Button (Shown for images and bg elements) -->
  <div id="ms-tb-photo-container" style="display:none; align-items:center; gap:4px;">
    <div class="ms-tb-sep"></div>
    <button type="button" id="ms-tb-photo-btn" class="ms-tb-btn ms-tb-photo-btn" title="Upload or Replace Photo" style="cursor:pointer; display:inline-flex; align-items:center; gap:4px;">
      <span>📷</span>
      <span>Replace Photo</span>
    </button>
    <input type="file" id="ms-tb-photo-input" accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml" style="position:fixed; top:-9999px; left:-9999px; opacity:0; width:1px; height:1px; pointer-events:none;" />
  </div>

  <div class="ms-tb-sep"></div>

  <button type="button" id="ms-tb-close-btn" class="ms-tb-close" title="Close Toolbar">&times;</button>
</div>

<script data-mindspace-visual-editor="true">
(function() {
  var isVisualEditMode = false;
  var selectedElement = null;
  var hoveredElement = null;
  var textChangeTimer = null;
  var lastSentContent = "";

  var toolbar = document.getElementById("mindspace-visual-toolbar");
  var tagBadge = document.getElementById("ms-tb-tag");
  var textColorPreview = document.getElementById("ms-tb-text-color-preview");
  var textColorInput = document.getElementById("ms-tb-text-color-input");
  var bgColorPreview = document.getElementById("ms-tb-bg-color-preview");
  var bgColorInput = document.getElementById("ms-tb-bg-color-input");
  var fontSizeSelect = document.getElementById("ms-tb-font-size-select");
  var boldBtn = document.getElementById("ms-tb-bold-btn");
  var alignLeftBtn = document.getElementById("ms-tb-align-left");
  var alignCenterBtn = document.getElementById("ms-tb-align-center");
  var alignRightBtn = document.getElementById("ms-tb-align-right");
  var paddingSelect = document.getElementById("ms-tb-padding-select");
  var marginSelect = document.getElementById("ms-tb-margin-select");
  var photoContainer = document.getElementById("ms-tb-photo-container");
  var photoBtn = document.getElementById("ms-tb-photo-btn");
  var photoInput = document.getElementById("ms-tb-photo-input");
  var closeBtn = document.getElementById("ms-tb-close-btn");

  // Prevent interactions inside toolbar from propagating to document
  if (toolbar) {
    toolbar.addEventListener("mousedown", function(e) { e.stopPropagation(); });
    toolbar.addEventListener("click", function(e) { e.stopPropagation(); });
  }

  function rgbToHex(rgb) {
    if (!rgb || rgb === "transparent") return "#ffffff";
    var match = rgb.match(/rgba?\\((\\d+),\\s*(\\d+),\\s*(\\d+)/);
    if (!match) return "#ffffff";
    var r = parseInt(match[1], 10).toString(16).padStart(2, "0");
    var g = parseInt(match[2], 10).toString(16).padStart(2, "0");
    var b = parseInt(match[3], 10).toString(16).padStart(2, "0");
    return "#" + r + g + b;
  }

  function positionToolbar(el) {
    if (!el || !toolbar) return;
    toolbar.style.display = "flex";
    toolbar.style.visibility = "hidden";

    // Allow browser to calculate natural dimensions
    var tbHeight = toolbar.offsetHeight || 38;
    var tbWidth = toolbar.offsetWidth || 480;

    var rect = el.getBoundingClientRect();
    var top = rect.top - tbHeight - 8;
    if (top < 8) {
      top = rect.bottom + 8;
    }
    // Clamp to window boundaries
    if (top + tbHeight > window.innerHeight - 8) {
      top = Math.max(8, window.innerHeight - tbHeight - 8);
    }

    var left = rect.left;
    if (left + tbWidth > window.innerWidth - 8) {
      left = Math.max(8, window.innerWidth - tbWidth - 8);
    }
    if (left < 8) left = 8;

    toolbar.style.top = Math.round(top) + "px";
    toolbar.style.left = Math.round(left) + "px";
    toolbar.style.visibility = "visible";
  }

  function syncToolbarValues(el) {
    if (!el) return;
    var tagName = el.tagName.toLowerCase();
    var className = (el.className && typeof el.className === "string") ? el.className.split(" ")[0] : "";
    tagBadge.innerText = tagName + (className ? "." + className : "");

    var comp = window.getComputedStyle(el);
    var inlineColor = el.style.color || comp.color;
    var inlineBg = el.style.backgroundColor || comp.backgroundColor;

    var hexColor = rgbToHex(inlineColor);
    var hexBg = rgbToHex(inlineBg);

    textColorPreview.style.background = hexColor;
    textColorInput.value = hexColor;

    bgColorPreview.style.background = hexBg;
    bgColorInput.value = hexBg;

    var currentFontSize = el.style.fontSize || comp.fontSize;
    fontSizeSelect.value = currentFontSize;
    if (!fontSizeSelect.value) {
      fontSizeSelect.value = "";
    }

    var weight = comp.fontWeight;
    var isBold = weight === "bold" || parseInt(weight, 10) >= 600;
    boldBtn.classList.toggle("active", isBold);

    var align = el.style.textAlign || comp.textAlign || "left";
    alignLeftBtn.classList.toggle("active", align === "left" || align === "start");
    alignCenterBtn.classList.toggle("active", align === "center");
    alignRightBtn.classList.toggle("active", align === "right" || align === "end");

    paddingSelect.value = el.style.padding || "";
    marginSelect.value = el.style.margin || "";

    // Show photo upload button if tag is <img>, has child <img>, has background image, or is a designated image slot
    var isImgTag = tagName === "img";
    var hasImgChild = Boolean(el.querySelector && el.querySelector("img"));
    var hasBgImg = Boolean(
      (el.style.backgroundImage && el.style.backgroundImage !== "none") ||
      (comp.backgroundImage && comp.backgroundImage !== "none" && !comp.backgroundImage.startsWith("linear-gradient"))
    );
    var isImageSlot = Boolean(
      el.hasAttribute("data-image-slot") ||
      el.hasAttribute("data-mindspace-slot") ||
      el.classList.contains("image-placeholder") ||
      el.classList.contains("avatar") ||
      el.classList.contains("project-image") ||
      el.classList.contains("project-thumb") ||
      el.classList.contains("hero-image") ||
      el.classList.contains("hero-banner") ||
      tagName === "figure"
    );

    if (photoContainer) {
      photoContainer.style.display = (isImgTag || hasImgChild || hasBgImg || isImageSlot) ? "inline-flex" : "none";
    }
  }

  function emitStyleChange(prop, val) {
    if (!selectedElement) return;
    var msId = selectedElement.getAttribute("data-mindspace-id");
    if (!msId) {
      console.warn("[MINDSPACE In-Preview] Selected element missing data-mindspace-id.");
      return;
    }

    selectedElement.style[prop] = val;
    positionToolbar(selectedElement);

    var styles = {};
    styles[prop] = val;

    try {
      window.parent.postMessage({
        type: "MINDSPACE_VISUAL_STYLE_CHANGE",
        mindspaceId: msId,
        styles: styles
      }, "*");
    } catch (err) {
      console.error("[MINDSPACE In-Preview] Error posting style change:", err);
    }
  }

  function getCleanInnerContent(el) {
    if (!el) return "";
    if (el.children.length === 0) {
      return el.textContent || "";
    }
    // Element has child elements: return innerHTML stripped of editor artifacts
    return el.innerHTML
      .replace(/\\s+data-mindspace-id=(?:["'][^"']*["']|[^\\s>]+)/gi, "")
      .replace(/\\s*mindspace-content-editing/g, "")
      .replace(/\\s*mindspace-visual-selected/g, "")
      .replace(/\\s*mindspace-visual-hovered/g, "");
  }

  function emitTextChange(immediate) {
    if (!selectedElement) return;
    var msId = selectedElement.getAttribute("data-mindspace-id");
    if (!msId) return;

    var content = getCleanInnerContent(selectedElement);
    if (content === lastSentContent) return;

    if (immediate) {
      if (textChangeTimer) clearTimeout(textChangeTimer);
      lastSentContent = content;
      try {
        window.parent.postMessage({
          type: "MINDSPACE_VISUAL_TEXT_CHANGE",
          mindspaceId: msId,
          text: content
        }, "*");
      } catch (err) {
        console.error("[MINDSPACE In-Preview] Error posting text change:", err);
      }
      return;
    }

    if (textChangeTimer) clearTimeout(textChangeTimer);
    textChangeTimer = setTimeout(function() {
      lastSentContent = content;
      try {
        window.parent.postMessage({
          type: "MINDSPACE_VISUAL_TEXT_CHANGE",
          mindspaceId: msId,
          text: content
        }, "*");
      } catch (err) {
        console.error("[MINDSPACE In-Preview] Error posting text change:", err);
      }
    }, 250);
  }

  function deselect() {
    if (selectedElement) {
      selectedElement.classList.remove("mindspace-visual-selected");
      selectedElement.classList.remove("mindspace-content-editing");
      if (selectedElement.isContentEditable) {
        emitTextChange(true);
        selectedElement.removeAttribute("contenteditable");
      }
      selectedElement = null;
    }
    if (toolbar) toolbar.style.display = "none";
  }

  function selectElement(el) {
    if (!el || el === document.body || el === document.documentElement) return;
    if (el === toolbar || toolbar.contains(el)) return;

    deselect();
    selectedElement = el;
    selectedElement.classList.add("mindspace-visual-selected");

    var tag = el.tagName.toLowerCase();
    var nonTextTags = ["img", "input", "textarea", "select", "svg", "hr", "br", "video", "audio", "canvas"];
    var containerTags = ["div", "section", "article", "main", "header", "footer", "nav", "aside", "ul", "ol", "form", "table", "tbody", "thead", "tfoot", "tr"];

    // Containers with child elements are NOT text-editable
    var isContainer = containerTags.indexOf(tag) !== -1 && el.children.length > 0;
    var canEditText = !isContainer && nonTextTags.indexOf(tag) === -1;

    if (canEditText) {
      el.setAttribute("contenteditable", "true");
      el.classList.add("mindspace-content-editing");
      lastSentContent = getCleanInnerContent(el);

      el.addEventListener("input", function onInput() {
        emitTextChange(false);
      });

      el.addEventListener("blur", function onBlur() {
        emitTextChange(true);
      }, { once: true });
    }

    syncToolbarValues(el);
    positionToolbar(el);
  }

  // --- Inline Photo Upload / Swap ---
  function setupPhotoHandlers() {
    if (!photoBtn || !photoInput) return;

    photoBtn.addEventListener("click", function(e) {
      e.stopPropagation();
      console.log("[MINDSPACE In-Preview] Replace Photo clicked. Opening native file picker synchronously...");
      try {
        photoInput.click();
      } catch (err) {
        console.error("[MINDSPACE In-Preview] Error calling photoInput.click():", err);
      }
    });

    photoInput.addEventListener("change", function(e) {
      var file = e.target.files && e.target.files[0];
      console.log("[MINDSPACE In-Preview] Photo input onChange fired. Selected file:", file ? { name: file.name, size: file.size, type: file.type } : null);
      if (!file || !selectedElement) {
        console.warn("[MINDSPACE In-Preview] No file selected or no element currently selected.");
        return;
      }

      var isImgTag = selectedElement.tagName.toLowerCase() === "img";
      var childImg = (!isImgTag && selectedElement.querySelector) ? selectedElement.querySelector("img") : null;
      var targetElementForUpload = childImg || selectedElement;
      var msId = targetElementForUpload.getAttribute("data-mindspace-id") || selectedElement.getAttribute("data-mindspace-id");
      var isBackground = !isImgTag && !childImg;

      console.log("[MINDSPACE In-Preview] Reading file as DataURL for element:", { msId: msId, isImgTag: isImgTag, isBackground: isBackground });
      var reader = new FileReader();
      reader.onload = function(evt) {
        var base64Data = evt.target && evt.target.result;
        console.log("[MINDSPACE In-Preview -> Parent] Sending MINDSPACE_VISUAL_UPLOAD_PHOTO:", {
          mindspaceId: msId,
          filename: file.name,
          fileType: file.type,
          fileSize: file.size,
          isBackground: isBackground
        });
        try {
          window.parent.postMessage({
            type: "MINDSPACE_VISUAL_UPLOAD_PHOTO",
            mindspaceId: msId,
            filename: file.name,
            fileType: file.type,
            fileSize: file.size,
            dataUrl: base64Data,
            isBackground: isBackground
          }, "*");
        } catch (err) {
          console.error("[MINDSPACE In-Preview] Photo upload postMessage error:", err);
        }
      };
      reader.readAsDataURL(file);

      // Reset input
      photoInput.value = "";
    });
  }

  // --- Toolbar Controls Listeners ---
  if (textColorInput) {
    textColorInput.addEventListener("input", function(e) {
      var val = e.target.value;
      textColorPreview.style.background = val;
      emitStyleChange("color", val);
    });
  }

  if (bgColorInput) {
    bgColorInput.addEventListener("input", function(e) {
      var val = e.target.value;
      bgColorPreview.style.background = val;
      emitStyleChange("backgroundColor", val);
    });
  }

  if (fontSizeSelect) {
    fontSizeSelect.addEventListener("change", function(e) {
      var val = e.target.value;
      if (val) emitStyleChange("fontSize", val);
    });
  }

  if (boldBtn) {
    boldBtn.addEventListener("click", function() {
      if (!selectedElement) return;
      var comp = window.getComputedStyle(selectedElement);
      var isBold = comp.fontWeight === "bold" || parseInt(comp.fontWeight, 10) >= 600;
      var newVal = isBold ? "normal" : "bold";
      boldBtn.classList.toggle("active", !isBold);
      emitStyleChange("fontWeight", newVal);
    });
  }

  if (alignLeftBtn) {
    alignLeftBtn.addEventListener("click", function() {
      alignLeftBtn.classList.add("active");
      alignCenterBtn.classList.remove("active");
      alignRightBtn.classList.remove("active");
      emitStyleChange("textAlign", "left");
    });
  }

  if (alignCenterBtn) {
    alignCenterBtn.addEventListener("click", function() {
      alignLeftBtn.classList.remove("active");
      alignCenterBtn.classList.add("active");
      alignRightBtn.classList.remove("active");
      emitStyleChange("textAlign", "center");
    });
  }

  if (alignRightBtn) {
    alignRightBtn.addEventListener("click", function() {
      alignLeftBtn.classList.remove("active");
      alignCenterBtn.classList.remove("active");
      alignRightBtn.classList.add("active");
      emitStyleChange("textAlign", "right");
    });
  }

  if (paddingSelect) {
    paddingSelect.addEventListener("change", function(e) {
      var val = e.target.value;
      if (val !== "") emitStyleChange("padding", val);
    });
  }

  if (marginSelect) {
    marginSelect.addEventListener("change", function(e) {
      var val = e.target.value;
      if (val !== "") emitStyleChange("margin", val);
    });
  }

  if (closeBtn) {
    closeBtn.addEventListener("click", function(e) {
      e.stopPropagation();
      deselect();
    });
  }

  // --- Document Interaction Handlers ---
  document.addEventListener("mouseover", function(e) {
    if (!isVisualEditMode) return;
    var target = e.target.closest("[data-mindspace-id]");
    if (!target || target === toolbar || toolbar.contains(target) || target === document.body) {
      return;
    }

    if (hoveredElement && hoveredElement !== target) {
      hoveredElement.classList.remove("mindspace-visual-hovered");
    }
    hoveredElement = target;
    if (hoveredElement !== selectedElement) {
      hoveredElement.classList.add("mindspace-visual-hovered");
    }
  }, true);

  document.addEventListener("mouseout", function(e) {
    if (!isVisualEditMode) return;
    var target = e.target.closest("[data-mindspace-id]");
    if (target && target === hoveredElement) {
      target.classList.remove("mindspace-visual-hovered");
      hoveredElement = null;
    }
  }, true);

  document.addEventListener("click", function(e) {
    if (!isVisualEditMode) return;

    // Ignore clicks inside toolbar
    if (toolbar && (toolbar === e.target || toolbar.contains(e.target))) {
      return;
    }

    var target = e.target.closest("[data-mindspace-id]");
    if (!target || target === document.body) {
      deselect();
      return;
    }

    e.preventDefault();
    e.stopPropagation();

    selectElement(target);
  }, true);

  window.addEventListener("scroll", function() {
    if (selectedElement) positionToolbar(selectedElement);
  }, true);

  window.addEventListener("resize", function() {
    if (selectedElement) positionToolbar(selectedElement);
  });

  // Listen for control commands from parent editor window
  window.addEventListener("message", function(event) {
    if (!event.data || typeof event.data !== "object") return;

    if (event.data.type === "MINDSPACE_SET_VISUAL_EDIT_MODE") {
      console.log("[MINDSPACE In-Preview <- Parent] Received MINDSPACE_SET_VISUAL_EDIT_MODE:", event.data.enabled);
      isVisualEditMode = Boolean(event.data.enabled);
      if (!isVisualEditMode) {
        if (hoveredElement) {
          hoveredElement.classList.remove("mindspace-visual-hovered");
          hoveredElement = null;
        }
        deselect();
      }
    }

    // Direct image swap confirmed by parent
    if (event.data.type === "MINDSPACE_IMAGE_SWAP_CONFIRMED") {
      var msId = event.data.mindspaceId;
      var newUrl = event.data.url;
      console.log("[MINDSPACE In-Preview <- Parent] Received MINDSPACE_IMAGE_SWAP_CONFIRMED:", { msId: msId, newUrl: newUrl, isBackground: event.data.isBackground });

      var targetEl = (selectedElement && selectedElement.getAttribute("data-mindspace-id") === msId)
        ? selectedElement
        : document.querySelector('[data-mindspace-id="' + msId + '"]');

      if (targetEl) {
        if (event.data.isBackground) {
          targetEl.style.backgroundImage = "url('" + newUrl + "')";
          targetEl.style.backgroundSize = "cover";
          targetEl.style.backgroundPosition = "center";
          targetEl.style.backgroundRepeat = "no-repeat";
          if (targetEl.children.length === 0 || !/<[a-z]/i.test(targetEl.innerHTML)) {
            targetEl.textContent = "";
          }
        } else {
          var img = targetEl.tagName.toLowerCase() === "img" ? targetEl : (targetEl.querySelector ? targetEl.querySelector("img") : null);
          if (img) {
            img.src = newUrl;
          } else {
            targetEl.style.backgroundImage = "url('" + newUrl + "')";
            targetEl.style.backgroundSize = "cover";
            targetEl.style.backgroundPosition = "center";
            targetEl.style.backgroundRepeat = "no-repeat";
            if (targetEl.children.length === 0 || !/<[a-z]/i.test(targetEl.innerHTML)) {
              targetEl.textContent = "";
            }
          }
        }
        console.log("[MINDSPACE In-Preview] Swapped image source in DOM element:", targetEl);
        if (selectedElement === targetEl) {
          syncToolbarValues(targetEl);
          positionToolbar(targetEl);
        }
      } else {
        console.warn("[MINDSPACE In-Preview] Could not find target element to swap image:", msId);
      }
    }
  });

  setupPhotoHandlers();

  // Handshake with parent
  try {
    console.log("[MINDSPACE In-Preview -> Parent] Sending MINDSPACE_PREVIEW_IFRAME_READY");
    window.parent.postMessage({ type: "MINDSPACE_PREVIEW_IFRAME_READY" }, "*");
  } catch (err) {}
})();
</script>
`;
}
