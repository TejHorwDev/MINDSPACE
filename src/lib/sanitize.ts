import DOMPurify from "isomorphic-dompurify";

/**
 * Escapes common HTML special characters to prevent XSS when interpolating
 * untrusted user strings into raw HTML templates (e.g. server-rendered HTML pages).
 */
export function escapeHtml(unsafe: string | null | undefined): string {
  if (!unsafe) return "";
  return String(unsafe)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Sanitizes an HTML fragment or document using DOMPurify.
 * Strips script tags, javascript: URI handlers, on* attributes, and other dangerous vectors.
 */
export function sanitizeUserHtml(html: string | null | undefined): string {
  if (!html) return "";
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      "h1", "h2", "h3", "h4", "h5", "h6",
      "p", "a", "b", "strong", "i", "em", "u", "s", "strike",
      "ul", "ol", "li", "span", "div", "blockquote", "code", "pre",
      "hr", "br", "table", "thead", "tbody", "tr", "th", "td",
      "img", "svg", "path"
    ],
    ALLOWED_ATTR: [
      "href", "target", "rel", "src", "alt", "title",
      "class", "id", "width", "height", "viewBox", "fill",
      "stroke", "stroke-width", "stroke-linecap", "stroke-linejoin"
    ],
    ALLOW_DATA_ATTR: false,
    ADD_ATTR: ["rel"],
    FORBID_TAGS: ["script", "iframe", "object", "embed", "link", "style"],
    FORBID_ATTR: ["onerror", "onload", "onclick", "onmouseover", "onfocus", "onblur"],
  });
}

/**
 * Strips all HTML tags and control characters to produce clean plain text.
 */
export function sanitizePlainText(input: string | null | undefined): string {
  if (!input) return "";
  return DOMPurify.sanitize(String(input), { ALLOWED_TAGS: [] }).trim();
}

/**
 * Validates and sanitizes URLs to ensure they only use http, https, or mailto protocols.
 * Blocks dangerous javascript:, data:, and vbscript: URIs.
 */
export function safeUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const trimmed = String(url).trim();
  if (/^(https?:\/\/|mailto:)/i.test(trimmed)) {
    return trimmed;
  }
  return null;
}
