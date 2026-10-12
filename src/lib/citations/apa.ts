/**
 * MINDSPACE Docs Studio — Phase 2: Citations & Source Management
 * APA 7th Edition Citation & Reference Formatting Utilities
 */

export interface SourceItem {
  id: string;
  documentId: string;
  title: string;
  authors?: string | null;
  url?: string | null;
  publisher?: string | null;
  publishedDate?: string | null;
  accessedDate?: string | null;
  sourceType: "website" | "book" | "journal" | "other" | string;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

/**
 * Extracts the 4-digit publication year, or falls back to "n.d." (no date).
 */
export function extractYear(publishedDate?: string | null): string {
  if (!publishedDate) return "n.d.";
  const match = publishedDate.match(/\b(19\d{2}|20\d{2})\b/);
  return match ? match[1] : "n.d.";
}

/**
 * Parses author string into individual author surnames / display names.
 * Supports:
 * - "Smith, John" -> ["Smith"]
 * - "Smith, J." -> ["Smith"]
 * - "John Smith" -> ["Smith"]
 * - "Smith, J. & Doe, Jane" -> ["Smith", "Doe"]
 * - "Goodfellow, Ian, Bengio, Yoshua & Courville, Aaron" -> ["Goodfellow", "Bengio", "Courville"]
 * - "Smith, Doe, and Johnson" -> ["Smith", "Doe", "Johnson"]
 * - Corporate: "World Health Organization" -> ["World Health Organization"]
 */
export function parseAuthorSurnames(authorsStr?: string | null): string[] {
  if (!authorsStr || !authorsStr.trim()) return [];

  const raw = authorsStr.trim();

  // Corporate author check
  if (
    raw.includes("Organization") ||
    raw.includes("Institute") ||
    raw.includes("Department") ||
    raw.includes("University") ||
    raw.includes("Association") ||
    raw.includes("Agency") ||
    raw.includes("Committee") ||
    raw.includes("Government")
  ) {
    return [raw];
  }

  // 1. If authors are separated by semicolons: "Smith, J.; Doe, A."
  if (raw.includes(";")) {
    return raw
      .split(";")
      .map((a) => extractSingleSurname(a))
      .filter(Boolean);
  }

  // 2. Separate by & or "and":
  // e.g. "Smith, J., & Doe, A." or "Smith & Doe" or "Goodfellow, I., Bengio, Y. & Courville, A."
  // Split before the & / and
  const andParts = raw.split(/\s+(?:&|and)\s+/i);
  if (andParts.length > 1) {
    const lastAuthor = extractSingleSurname(andParts[andParts.length - 1]);
    const priorPart = andParts.slice(0, -1).join(" ");

    // Prior part might have multiple comma-separated authors: "Smith, J., Bengio, Y."
    const priorAuthors = splitCommaAuthors(priorPart);
    return [...priorAuthors, lastAuthor].filter(Boolean);
  }

  // 3. No & or and: could be single author ("Smith, John" or "John Smith") or list ("Smith, Doe, Johnson")
  // Count commas: if exactly 1 comma and each side has 1-2 words: "Smith, John" -> single author!
  const commaCount = (raw.match(/,/g) || []).length;
  if (commaCount <= 1) {
    return [extractSingleSurname(raw)].filter(Boolean);
  }

  // Multiple commas without &: e.g. "Smith, Doe, Johnson" or "Smith, J., Doe, A."
  return splitCommaAuthors(raw);
}

function extractSingleSurname(author: string): string {
  const trimmed = author.trim().replace(/[.,]+$/, "");
  if (!trimmed) return "";
  if (trimmed.includes(",")) {
    // "Smith, John" -> "Smith"
    return trimmed.split(",")[0].trim();
  }
  // "John Smith" -> "Smith"
  const words = trimmed.split(/\s+/);
  return words[words.length - 1].trim();
}

function splitCommaAuthors(chunk: string): string[] {
  const parts = chunk
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);

  if (parts.length === 0) return [];

  // Check if alternating: [Surname, Initials, Surname, Initials]
  // e.g. ["Goodfellow", "Ian", "Bengio", "Yoshua"]
  const looksLikeSurnameGivenPairs =
    parts.length >= 2 &&
    parts.length % 2 === 0 &&
    parts.every((p, idx) => (idx % 2 === 1 ? p.length <= 15 : true));

  if (looksLikeSurnameGivenPairs) {
    const surnames: string[] = [];
    for (let i = 0; i < parts.length; i += 2) {
      surnames.push(parts[i]);
    }
    return surnames;
  }

  // Otherwise treat each as an author or surname
  return parts.map((p) => extractSingleSurname(p)).filter(Boolean);
}


/**
 * Formats an in-text citation in strict APA 7th edition format.
 * - 1 author: (Smith, 2023)
 * - 2 authors: (Smith & Doe, 2023)
 * - 3+ authors: (Smith et al., 2023)
 * - No author: ("Title", 2023)
 * - No date: (Smith, n.d.)
 */
export function formatInTextCitation(source: {
  title: string;
  authors?: string | null;
  publishedDate?: string | null;
}): string {
  const surnames = parseAuthorSurnames(source.authors);
  const year = extractYear(source.publishedDate);

  let authorPart = "";

  if (surnames.length === 1) {
    authorPart = surnames[0];
  } else if (surnames.length === 2) {
    authorPart = `${surnames[0]} & ${surnames[1]}`;
  } else if (surnames.length >= 3) {
    authorPart = `${surnames[0]} et al.`;
  } else {
    // No author: use short title in quotes
    const trimmedTitle = (source.title || "Untitled").trim();
    const shortTitle =
      trimmedTitle.length > 28 ? `${trimmedTitle.slice(0, 25)}...` : trimmedTitle;
    authorPart = `"${shortTitle}"`;
  }

  return `(${authorPart}, ${year})`;
}

/**
 * Formats a clean APA 7th Edition reference entry.
 * Returns structured representation (text, html, and sortKey).
 */
export interface ApaReferenceEntry {
  id: string;
  sourceId: string;
  authors: string;
  year: string;
  title: string;
  sourceDetails: string;
  url?: string | null;
  formattedText: string;
  formattedHtml: string;
  sortKey: string;
}

export function formatApaReference(source: SourceItem): ApaReferenceEntry {
  const authorsStr = (source.authors || "").trim();
  const year = extractYear(source.publishedDate);
  const yearFormatted = `(${year})`;
  const title = (source.title || "Untitled source").trim();
  const publisher = (source.publisher || "").trim();
  const url = (source.url || "").trim();

  // Authors segment
  const authorSegment = authorsStr ? `${authorsStr}${authorsStr.endsWith(".") ? "" : "."}` : "";

  // Title & Container formatting based on source type
  let titleSegment = "";
  let titleHtml = "";
  let containerSegment = "";

  if (source.sourceType === "journal") {
    // Article title in sentence case, Journal name in italics
    titleSegment = `${title}${title.endsWith(".") ? "" : "."}`;
    titleHtml = titleSegment;
    if (publisher) {
      containerSegment = publisher;
    }
  } else {
    // Book, website, other: Title in italics
    titleSegment = `${title}${title.endsWith(".") ? "" : "."}`;
    titleHtml = `<em>${title}</em>${title.endsWith(".") ? "" : "."}`;
    if (publisher) {
      containerSegment = publisher;
    }
  }

  // Combine parts
  const textParts: string[] = [];
  const htmlParts: string[] = [];

  if (authorSegment) {
    textParts.push(authorSegment);
    htmlParts.push(authorSegment);
  }

  textParts.push(yearFormatted);
  htmlParts.push(yearFormatted);

  if (!authorSegment) {
    // If no author, title comes first in APA
    textParts.unshift(titleSegment);
    htmlParts.unshift(titleHtml);
  } else {
    textParts.push(titleSegment);
    htmlParts.push(titleHtml);
  }

  if (containerSegment) {
    const containerText = `${containerSegment}${containerSegment.endsWith(".") ? "" : "."}`;
    const containerHtml =
      source.sourceType === "journal"
        ? `<em>${containerSegment}</em>${containerSegment.endsWith(".") ? "" : "."}`
        : containerText;
    textParts.push(containerText);
    htmlParts.push(containerHtml);
  }

  if (url) {
    textParts.push(url);
    htmlParts.push(`<a href="${url}" target="_blank" rel="noopener noreferrer" class="hover:underline text-indigo-500">${url}</a>`);
  }

  const formattedText = textParts.join(" ");
  const formattedHtml = htmlParts.join(" ");

  // Determine sort key (alphabetical by first author surname or title)
  const sortKey = (authorSegment || title)
    .toLowerCase()
    .replace(/^(the|a|an)\s+/i, "")
    .trim();

  return {
    id: source.id,
    sourceId: source.id,
    authors: authorSegment,
    year,
    title,
    sourceDetails: containerSegment,
    url,
    formattedText,
    formattedHtml,
    sortKey,
  };
}

/**
 * Sorts sources alphabetically according to APA 7th standards.
 */
export function sortSourcesAlphabetically(sources: SourceItem[]): SourceItem[] {
  return [...sources].sort((a, b) => {
    const keyA = (a.authors || a.title || "")
      .toLowerCase()
      .replace(/^(the|a|an)\s+/i, "")
      .trim();
    const keyB = (b.authors || b.title || "")
      .toLowerCase()
      .replace(/^(the|a|an)\s+/i, "")
      .trim();
    if (keyA < keyB) return -1;
    if (keyA > keyB) return 1;
    // Secondary sort by year
    const yearA = extractYear(a.publishedDate);
    const yearB = extractYear(b.publishedDate);
    return yearA.localeCompare(yearB);
  });
}

/**
 * Scans a Tiptap JSON document tree and returns all unique sourceId values
 * currently referenced in in-text citation nodes.
 */
export function extractCitedSourceIds(contentJson: any): string[] {
  if (!contentJson) return [];
  const ids = new Set<string>();

  function walk(node: any) {
    if (!node) return;
    if (node.type === "citation" && node.attrs?.sourceId) {
      ids.add(String(node.attrs.sourceId));
    }
    if (Array.isArray(node.content)) {
      node.content.forEach(walk);
    }
  }

  walk(contentJson);
  return Array.from(ids);
}

/**
 * Counts occurrences of each sourceId in a Tiptap JSON document.
 */
export function countCitationsBySource(contentJson: any): Record<string, number> {
  const counts: Record<string, number> = {};
  if (!contentJson) return counts;

  function walk(node: any) {
    if (!node) return;
    if (node.type === "citation" && node.attrs?.sourceId) {
      const sid = String(node.attrs.sourceId);
      counts[sid] = (counts[sid] || 0) + 1;
    }
    if (Array.isArray(node.content)) {
      node.content.forEach(walk);
    }
  }

  walk(contentJson);
  return counts;
}
