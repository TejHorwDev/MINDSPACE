import type { EditorFile } from "@/components/editor/types";
import {
  injectMindspaceIds,
  generateVisualEditorScript,
  stripMindspaceIds,
  repairMalformedInlineStyles,
} from "@/lib/visual-edit-engine";

/**
 * Normalizes a relative path by removing leading "./" or "/" and trimming.
 */
export function normalizePath(path: string): string {
  return path.replace(/^(\.\/|\/)+/, "").trim();
}

/**
 * Strips query parameters (?v=...) and hash anchors (#...) from a URL reference.
 */
function cleanUrlReference(rawRef: string): string {
  return rawRef.split("?")[0].split("#")[0].trim();
}

/**
 * Resolves a relative reference (e.g. "./styles.css", "../styles.css", "styles.css")
 * against the directory of the current entry HTML file.
 */
export function resolveRelativePath(baseHtmlPath: string, relativeRef: string): string {
  const cleanRef = cleanUrlReference(relativeRef.replace(/^(\.\/)+/, "").trim());
  const baseParts = baseHtmlPath.split("/").slice(0, -1);
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
 * Finds matching content from the pathContentMap, trying:
 * 1. Exact normalized path
 * 2. Resolved path relative to base HTML
 * 3. Basename match
 * 4. Known aliases (e.g. style.css <-> styles.css, script.js <-> scripts.js / main.js)
 * 5. Single-file fallback if exactly one matching type exists
 */
function findFileContent(
  entryPath: string,
  targetRef: string,
  pathContentMap: Map<string, string>
): string | undefined {
  const clean = normalizePath(cleanUrlReference(targetRef));

  // 1. Direct normalized match
  if (pathContentMap.has(clean)) {
    return pathContentMap.get(clean);
  }

  // 2. Relative to entry HTML path
  const resolved = resolveRelativePath(entryPath, targetRef);
  if (resolved && pathContentMap.has(resolved)) {
    return pathContentMap.get(resolved);
  }

  // 3. Basename match (e.g. "styles.css" for "css/styles.css" or vice versa)
  const basename = clean.split("/").pop() || clean;
  for (const [key, val] of pathContentMap.entries()) {
    if (key === basename || key.endsWith("/" + basename)) {
      return val;
    }
  }

  // 4. CSS Aliases (style.css <-> styles.css <-> main.css)
  if (clean.endsWith(".css")) {
    const cssCandidates = ["style.css", "styles.css", "main.css", "app.css"];
    for (const cand of cssCandidates) {
      for (const [key, val] of pathContentMap.entries()) {
        if (key === cand || key.endsWith("/" + cand)) {
          return val;
        }
      }
    }

    // If exactly one CSS file exists in the whole project, use it!
    const allCssKeys = Array.from(pathContentMap.keys()).filter((k) => k.endsWith(".css"));
    if (allCssKeys.length === 1) {
      return pathContentMap.get(allCssKeys[0]);
    }
  }

  // 5. JS Aliases (script.js <-> scripts.js <-> main.js <-> app.js <-> index.js)
  if (clean.endsWith(".js") || clean.endsWith(".mjs")) {
    const jsCandidates = ["script.js", "scripts.js", "main.js", "app.js", "index.js"];
    for (const cand of jsCandidates) {
      for (const [key, val] of pathContentMap.entries()) {
        if (key === cand || key.endsWith("/" + cand)) {
          return val;
        }
      }
    }

    // If exactly one JS file exists in the whole project, use it!
    const allJsKeys = Array.from(pathContentMap.keys()).filter((k) => k.endsWith(".js") || k.endsWith(".mjs"));
    if (allJsKeys.length === 1) {
      return pathContentMap.get(allJsKeys[0]);
    }
  }

  return undefined;
}

/**
 * Inlines any relative `@import url(...)` statements inside CSS stylesheets.
 */
function inlineCssImports(
  cssContent: string,
  entryPath: string,
  pathContentMap: Map<string, string>
): string {
  const importRegex = /@import\s+(?:url\(['"]?([^'"\)]+)['"]?\)|['"]([^'"]+)['"])\s*;/gi;
  return cssContent.replace(importRegex, (match, url1, url2) => {
    const rawImportUrl = (url1 ?? url2 ?? "").trim();
    const importUrl = cleanUrlReference(rawImportUrl);
    if (!importUrl || importUrl.startsWith("http://") || importUrl.startsWith("https://") || importUrl.startsWith("//")) {
      return match;
    }
    const resolved = findFileContent(entryPath, importUrl, pathContentMap);
    if (resolved !== undefined) {
      return `/* @import ${importUrl} */\n${inlineCssImports(resolved, entryPath, pathContentMap)}`;
    }
    return match;
  });
}

/**
 * High-fidelity in-memory Storage Guard polyfill.
 * Prevents "SecurityError: Window.localStorage: Access is denied for this document."
 * in sandboxed iframes (opaque origin: null) while maintaining full runtime functionality.
 */
export const RUNTIME_STORAGE_GUARD_SCRIPT = `
<script data-mindspace-runtime-guard="true">
(function() {
  function createSafeStorage() {
    var store = {};
    return {
      getItem: function(key) {
        var strKey = String(key);
        return Object.prototype.hasOwnProperty.call(store, strKey) ? store[strKey] : null;
      },
      setItem: function(key, val) {
        store[String(key)] = String(val);
      },
      removeItem: function(key) {
        delete store[String(key)];
      },
      clear: function() {
        store = {};
      },
      key: function(idx) {
        var keys = Object.keys(store);
        return keys[idx] || null;
      },
      get length() {
        return Object.keys(store).length;
      }
    };
  }

  var safeLocal = createSafeStorage();
  var safeSession = createSafeStorage();

  var works = false;
  try {
    if (typeof window.localStorage !== 'undefined') {
      window.localStorage.setItem('__ms_test__', '1');
      window.localStorage.removeItem('__ms_test__');
      works = true;
    }
  } catch (e) {
    works = false;
  }

  if (!works) {
    try {
      Object.defineProperty(window, 'localStorage', {
        get: function() { return safeLocal; },
        set: function() {},
        configurable: true,
        enumerable: true
      });
      Object.defineProperty(window, 'sessionStorage', {
        get: function() { return safeSession; },
        set: function() {},
        configurable: true,
        enumerable: true
      });
    } catch (e1) {
      try {
        var winProto = Object.getPrototypeOf(window);
        if (winProto) {
          Object.defineProperty(winProto, 'localStorage', {
            get: function() { return safeLocal; },
            set: function() {},
            configurable: true,
            enumerable: true
          });
          Object.defineProperty(winProto, 'sessionStorage', {
            get: function() { return safeSession; },
            set: function() {},
            configurable: true,
            enumerable: true
          });
        }
      } catch (e2) {
        try {
          window.localStorage = safeLocal;
          window.sessionStorage = safeSession;
        } catch (e3) {}
      }
    }
  }

  // Safe document.cookie mock for opaque origins
  try {
    var testCookie = document.cookie;
  } catch (cookieErr) {
    var memCookie = "";
    try {
      Object.defineProperty(document, 'cookie', {
        get: function() { return memCookie; },
        set: function(v) { memCookie = String(v); },
        configurable: true
      });
    } catch (e) {}
  }
})();
</script>
`;

/**
 * Extracts and bundles all project HTML, CSS, and JS files into a single,
 * self-contained document for safe execution in a sandboxed iframe.
 */
export function bundleProjectFiles(
  entryPath: string,
  files: EditorFile[],
  fileContents: Record<string, string>,
  options?: { isEditorPreview?: boolean }
): string {
  // Map normalized paths to their latest in-memory content
  const pathContentMap = new Map<string, string>();
  for (const file of files) {
    const normalized = normalizePath(file.path);
    const content = fileContents[file.id] ?? file.content ?? "";
    pathContentMap.set(normalized, content);
  }

  // Find target HTML file
  const normalizedEntry = normalizePath(entryPath);
  let htmlContent = pathContentMap.get(normalizedEntry);

  if (htmlContent === undefined) {
    // Fall back to index.html if entry path isn't found
    htmlContent = pathContentMap.get("index.html");
  }

  if (htmlContent === undefined) {
    // Fall back to first available .html file
    const firstHtml = files.find(
      (f) => f.path.endsWith(".html") || f.path.endsWith(".htm")
    );
    if (firstHtml) {
      htmlContent = pathContentMap.get(normalizePath(firstHtml.path));
    }
  }

  // If no HTML exists at all in the project, show a welcoming preview placeholder
  if (htmlContent === undefined || !htmlContent.trim()) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>MINDSPACE Preview</title>
  <style>
    body {
      margin: 0;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background: #09090b;
      color: #a1a1aa;
      text-align: center;
      padding: 2rem;
      box-sizing: border-box;
      background-image: radial-gradient(circle at 50% 30%, rgba(139, 92, 246, 0.08), transparent 70%);
    }
    .card {
      background: #111115;
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 16px;
      padding: 2.25rem 2rem;
      max-width: 380px;
      box-shadow: 0 20px 40px -15px rgba(0, 0, 0, 0.5);
    }
    .icon {
      width: 44px;
      height: 44px;
      margin: 0 auto 1.25rem;
      border-radius: 12px;
      background: rgba(139, 92, 246, 0.12);
      border: 1px solid rgba(139, 92, 246, 0.25);
      display: flex;
      align-items: center;
      justify-content: center;
      color: #a78bfa;
      font-size: 20px;
    }
    .badge {
      display: inline-block;
      padding: 0.25rem 0.75rem;
      background: rgba(16, 185, 129, 0.1);
      color: #10b981;
      border: 1px solid rgba(16, 185, 129, 0.2);
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 600;
      margin-bottom: 1rem;
      letter-spacing: 0.03em;
    }
    h2 { margin: 0 0 0.5rem; font-size: 1.15rem; color: #f4f4f5; font-weight: 600; letter-spacing: -0.02em; }
    p { margin: 0; font-size: 0.85rem; line-height: 1.5; color: #71717a; }
    code { background: rgba(255, 255, 255, 0.06); color: #e4e4e7; padding: 0.15rem 0.4rem; border-radius: 4px; font-size: 0.8rem; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">⚡</div>
    <div class="badge">Live Preview Engine</div>
    <h2>No HTML Content Yet</h2>
    <p>Create or select an <code>index.html</code> file in the explorer to preview your web application in real-time.</p>
  </div>
</body>
</html>`;
  }

  let bundled = htmlContent;

  // 1. Process <link rel="stylesheet" href="..."> tags
  const linkRegex = /<link\b([^>]*?)>/gi;
  bundled = bundled.replace(linkRegex, (match, attributes) => {
    // Check if rel attribute includes stylesheet or href ends with .css
    const isStylesheet =
      /\brel\s*=\s*(?:["'][^"']*\bstylesheet\b[^"']*["']|stylesheet\b)/i.test(attributes) ||
      /\bhref\s*=\s*["'][^"']+\.css(?:[?#][^"']*)?["']/i.test(attributes);
    if (!isStylesheet) return match;

    const hrefMatch = /\bhref\s*=\s*(?:["']([^"']+)["']|([^\s>]+))/i.exec(attributes);
    if (!hrefMatch) return match;

    const href = (hrefMatch[1] ?? hrefMatch[2] ?? "").trim();
    if (!href) return match;

    // Ignore external URLs (e.g. Google Fonts, CDN links)
    if (
      href.startsWith("http://") ||
      href.startsWith("https://") ||
      href.startsWith("//")
    ) {
      return match;
    }

    const rawCss = findFileContent(normalizedEntry, href, pathContentMap);
    if (rawCss !== undefined) {
      const inlinedCss = inlineCssImports(rawCss, normalizedEntry, pathContentMap);
      return `\n<style data-mindspace-file="${href}">\n${inlinedCss}\n</style>`;
    }

    return match;
  });

  // 2. Process <script src="..."> tags
  const scriptRegex = /<script\b([^>]*?)src\s*=\s*(?:["']([^"']+)["']|([^\s>]+))([^>]*?)(?:>([\s\S]*?)<\/script>|\/>)/gi;
  bundled = bundled.replace(scriptRegex, (match, beforeSrc, srcQuoted, srcUnquoted, afterSrc) => {
    const src = (srcQuoted ?? srcUnquoted ?? "").trim();
    if (!src) return match;

    // Ignore external CDN scripts
    if (
      src.startsWith("http://") ||
      src.startsWith("https://") ||
      src.startsWith("//")
    ) {
      return match;
    }

    const jsContent = findFileContent(normalizedEntry, src, pathContentMap);
    if (jsContent !== undefined) {
      return `\n<script ${beforeSrc} ${afterSrc} data-mindspace-file="${src}">\n${jsContent}\n</script>`;
    }

    return match;
  });

  // 3. Process local image references in <img> tags
  const imgRegex = /<img\b([^>]*?)\bsrc\s*=\s*(?:["']([^"']+)["']|([^\s>]+))([^>]*?)>/gi;
  bundled = bundled.replace(imgRegex, (match, beforeSrc, srcQuoted, srcUnquoted, afterSrc) => {
    const src = (srcQuoted ?? srcUnquoted ?? "").trim();
    if (!src) return match;

    if (
      src.startsWith("http://") ||
      src.startsWith("https://") ||
      src.startsWith("//") ||
      src.startsWith("data:")
    ) {
      return match;
    }

    const imageContent = findFileContent(normalizedEntry, src, pathContentMap);
    if (imageContent && (imageContent.startsWith("data:") || imageContent.startsWith("/api/"))) {
      return `<img ${beforeSrc} src="${imageContent}" data-mindspace-file="${src}" ${afterSrc}>`;
    }

    return match;
  });

  // 4. Auto-repair malformed inline style attributes that had unescaped double quotes inside url(...)
  bundled = repairMalformedInlineStyles(bundled);

  // 5. Process CSS background-image url('...') references in styles
  const cssUrlRegex = /url\(\s*(["']?)([^"')]+)\1\s*\)/gi;
  bundled = bundled.replace(cssUrlRegex, (match, quote, urlRef) => {
    const trimmed = urlRef.trim();
    if (
      trimmed.startsWith("http://") ||
      trimmed.startsWith("https://") ||
      trimmed.startsWith("//") ||
      trimmed.startsWith("data:") ||
      trimmed.startsWith("#")
    ) {
      return match;
    }

    const imageContent = findFileContent(normalizedEntry, trimmed, pathContentMap);
    if (imageContent && (imageContent.startsWith("data:") || imageContent.startsWith("/api/"))) {
      // CRITICAL: Always use single quotes to avoid breaking HTML style="..." attributes
      return `url('${imageContent}')`;
    }

    return match;
  });

  // 6. If an element with a background-image has short placeholder text (e.g. initials "ML" or symbol "✦"), clear it so the photo displays unobstructed
  bundled = bundled.replace(
    /(<([a-zA-Z0-9\-]+)\b[^>]*?\bstyle\s*=\s*["'][^"']*?background-image\s*:[^"']*?url\([^"']*?["'][^>]*?>)([^<]{1,4})(<\/\2>)/gi,
    (m, openTag, tagName, innerText, closeTag) => {
      const trimmed = innerText.trim();
      if (trimmed && !/^\d+$/.test(trimmed) && !/^\$\d+/.test(trimmed)) {
        return `${openTag}${closeTag}`;
      }
      return m;
    }
  );

  // 5. Inject Runtime Storage Guard at the start of <head>
  if (bundled.includes("<head>")) {
    bundled = bundled.replace("<head>", `<head>\n${RUNTIME_STORAGE_GUARD_SCRIPT}`);
  } else if (bundled.includes("<!DOCTYPE html>") || bundled.includes("<html")) {
    bundled = `<head>\n${RUNTIME_STORAGE_GUARD_SCRIPT}</head>\n${bundled}`;
  } else {
    bundled = `${RUNTIME_STORAGE_GUARD_SCRIPT}\n${bundled}`;
  }

  // 4. Inject internal multi-page navigation interceptor and runtime error reporter before </body>
  const injectedHelperScript = `
<script>
  (function() {
    // Listen for relative internal link clicks and notify parent MINDSPACE editor
    document.addEventListener('click', function(e) {
      var target = e.target.closest('a');
      if (!target) return;
      var href = target.getAttribute('href');
      if (!href) return;
      if (
        href.startsWith('#') ||
        href.startsWith('http://') ||
        href.startsWith('https://') ||
        href.startsWith('//') ||
        href.startsWith('mailto:') ||
        href.startsWith('tel:') ||
        href.startsWith('javascript:')
      ) {
        return;
      }
      e.preventDefault();
      var clean = href.replace(/^(\\.\\/|\\/)/, '').split('?')[0].split('#')[0];
      try {
        window.parent.postMessage({ type: 'MINDSPACE_PREVIEW_NAVIGATE', path: clean }, '*');
      } catch (err) {}
    }, true);

    // Forward uncaught runtime JavaScript errors to parent (filtering out benign sandbox warnings)
    window.addEventListener('error', function(e) {
      var msg = e && e.message ? String(e.message) : '';
      if (
        msg.indexOf('SecurityError') !== -1 &&
        (msg.indexOf('localStorage') !== -1 || msg.indexOf('sessionStorage') !== -1 || msg.indexOf('cookie') !== -1)
      ) {
        // Harmless sandbox origin warning intercepted by polyfill; do not alert user
        return;
      }
      if (msg.indexOf('ResizeObserver loop') !== -1) {
        return;
      }

      try {
        window.parent.postMessage({
          type: 'MINDSPACE_PREVIEW_RUNTIME_ERROR',
          message: msg || 'Script execution error',
          lineno: e.lineno || 0
        }, '*');
      } catch (err) {}
    });
  })();
</script>
`;

  // Inject before </body> if present, else before </html>, else append
  if (bundled.includes("</body>")) {
    bundled = bundled.replace("</body>", `${injectedHelperScript}\n</body>`);
  } else if (bundled.includes("</html>")) {
    bundled = bundled.replace("</html>", `${injectedHelperScript}\n</html>`);
  } else {
    bundled += injectedHelperScript;
  }

  // 5. Visual Edit Mode (Editor Preview only, never for published/downloaded output)
  if (options?.isEditorPreview) {
    bundled = injectMindspaceIds(bundled);
    const visualScript = generateVisualEditorScript();
    if (bundled.includes("</body>")) {
      bundled = bundled.replace("</body>", `${visualScript}\n</body>`);
    } else if (bundled.includes("</html>")) {
      bundled = bundled.replace("</html>", `${visualScript}\n</html>`);
    } else {
      bundled += visualScript;
    }
  } else {
    // Zero trace: ensure no data-mindspace-id or visual editor code leaks out
    bundled = stripMindspaceIds(bundled);
  }

  return bundled;
}
