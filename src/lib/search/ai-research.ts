import { db } from "@/lib/db";
import {
  getActiveSearchProvider,
  executeLiveSearch,
  SearchResultItem,
  SearchExecutionResult,
} from "./search-provider";
import {
  reserveAiCredits,
  settleAiCreditReservation,
  refundAiCreditReservation,
  calculateAiCostUSD,
  getUserCreditBalance,
  CreditReservation,
} from "@/lib/credits";
import { formatInTextCitation, SourceItem } from "@/lib/citations/apa";

export interface ProposedSourceItem {
  tempId: string;
  resultIndex: number;
  title: string;
  url: string;
  publisher: string;
  authors?: string | null;
  publishedDate?: string | null;
  accessedDate: string;
  sourceType: string;
  snippetPreview: string;
  inTextCitation: string;
}

export interface ResearchDraftResponse {
  topic: string;
  summary: string;
  draftMarkdown: string;
  draftJsonNodes: any[];
  proposedSources: ProposedSourceItem[];
  searchResults: SearchResultItem[];
  searchProviderName: string;
  aiModelName: string;
  creditsCostUSD: number;
  remainingCredits: number;
}

const SEARCH_API_FEE_USD = 0.40; // Calibrated search execution cost

/**
 * Executes full Auto-Research workflow:
 * 1. Checks active search provider (fails fast if none configured)
 * 2. Checks/reserves user credits (AI + search fee)
 * 3. Runs live web search for verifiable real-world sources
 * 4. Grounded AI drafting using ONLY facts from search results
 * 5. Parses and maps inline citation markers to verified source items
 * 6. Settles credits and returns structured draft for review
 */
export async function runAiAutoResearch({
  userId,
  documentId,
  topic,
  maxResults = 5,
  byokKey,
  customSearchExecutor,
}: {
  userId: string;
  documentId: string;
  topic: string;
  maxResults?: number;
  byokKey?: string | null;
  customSearchExecutor?: (params: {
    query: string;
    providerConfig: any;
    apiKey: string;
    maxResults?: number;
  }) => Promise<SearchExecutionResult>;
}): Promise<ResearchDraftResponse> {
  const cleanTopic = topic.trim();
  if (!cleanTopic) {
    throw new Error("Research topic or question is required.");
  }

  // 1. Check for active Search Provider (STRICT: Never hallucinate without real search)
  const activeSearch = await getActiveSearchProvider();
  if (!activeSearch) {
    const error: any = new Error(
      "No active search provider configured. An administrator must configure a search provider (such as Tavily) in /admin → Search Providers to enable AI Auto-Research."
    );
    error.code = "NO_SEARCH_PROVIDER";
    error.statusCode = 400;
    throw error;
  }

  // 2. Credit check and reservation
  const isByok = Boolean(byokKey && byokKey.trim());
  const estimatedReservation = isByok ? SEARCH_API_FEE_USD : 0.85;

  let creditReservation: CreditReservation | null = null;
  const balance = await getUserCreditBalance(userId);

  if (balance.totalCredits < estimatedReservation && !isByok) {
    const error: any = new Error(
      "Insufficient credits for AI Auto-Research. Upgrade your plan or top up credits to research live web sources."
    );
    error.code = "OUT_OF_CREDITS";
    error.statusCode = 402;
    throw error;
  }

  creditReservation = await reserveAiCredits(userId, estimatedReservation);

  let searchResults: SearchExecutionResult;
  try {
    // 3. Execute live web search (via custom executor if supplied or real web search adapter)
    const searchFn = customSearchExecutor || executeLiveSearch;
    searchResults = await searchFn({
      query: cleanTopic,
      providerConfig: activeSearch.provider,
      apiKey: activeSearch.apiKey,
      maxResults,
    });
  } catch (searchErr: any) {
    if (creditReservation) {
      await refundAiCreditReservation(creditReservation);
    }
    throw new Error(`Live web search failed: ${searchErr.message}`);
  }

  if (searchResults.results.length === 0) {
    if (creditReservation) {
      await refundAiCreditReservation(creditReservation);
    }
    const error: any = new Error(
      `No verified search results found on the live web for "${cleanTopic}". Please try a more specific or alternate query.`
    );
    error.code = "NO_SEARCH_RESULTS";
    error.statusCode = 422;
    throw error;
  }

  // 4. Resolve active AI Provider
  const aiProvider = await db.aiProvider.findFirst({
    where: { active: true },
    orderBy: { priority: "asc" },
  });

  const aiApiKey =
    (byokKey && byokKey.trim()) ||
    (aiProvider?.apiKey && aiProvider.apiKey.trim()) ||
    process.env.GEMINI_API_KEY?.trim() ||
    process.env.GOOGLE_AI_API_KEY?.trim() ||
    process.env.GROQ_API_KEY?.trim() ||
    process.env.OPENAI_API_KEY?.trim();

  if (!aiApiKey) {
    if (creditReservation) {
      await refundAiCreditReservation(creditReservation);
    }
    throw new Error("No active AI Provider configured with an API key.");
  }

  // Format search results context for the LLM with clear indexing
  const formattedResultsContext = searchResults.results
    .map((r, idx) => {
      const num = idx + 1;
      return (
        `--- [SOURCE ${num}] ---\n` +
        `Title: ${r.title}\n` +
        `URL: ${r.url}\n` +
        `Publisher / Site: ${r.publisher || "Web Source"}\n` +
        (r.publishedDate ? `Published Date: ${r.publishedDate}\n` : "") +
        `Verified Snippet: ${r.snippet}\n`
      );
    })
    .join("\n");

  const systemInstructions =
    `You are MINDSPACE Docs Studio's Verifiable Auto-Research Engine.\n` +
    `Your duty is to draft an authoritative, academic-grade research section based STRICTLY AND ONLY on the provided real-world search results.\n\n` +
    `NON-NEGOTIABLE HONESTY RULES:\n` +
    `1. NEVER state a fact, statistic, percentage, quote, or claim that is not explicitly present in the provided search results.\n` +
    `2. If search results are thin, inconclusive, or conflicting on a subtopic, state so plainly (e.g., "Available sources differ on..." or "Retrieved sources do not specify...") rather than guessing or asserting confidence.\n` +
    `3. EVERY substantive claim MUST be immediately followed by a citation tag in the format [[CITE:N]], where N is the integer index of the source (e.g. [[CITE:1]], [[CITE:2]]).\n` +
    `4. DO NOT invent citations or cite sources not present in the list.\n` +
    `5. Structure the response using clean Markdown with section headings (e.g., ## Overview, ## Core Findings, ## Challenges), clear paragraphs, and optional bullet points.\n\n` +
    `OUTPUT FORMAT (STRICT JSON ONLY):\n` +
    `{\n` +
    `  "summary": "1-2 sentence executive synthesis of the retrieved findings",\n` +
    `  "draftMarkdown": "Full section markdown text with inline [[CITE:N]] tags placed after factual sentences",\n` +
    `  "usedSourceIndices": [1, 2, ...]\n` +
    `}\n` +
    `Output ONLY valid JSON. No markdown code fence wrappers outside the JSON.`;

  const userPrompt =
    `RESEARCH TOPIC: "${cleanTopic}"\n\n` +
    `VERIFIED REAL SEARCH RESULTS (${searchResults.results.length} found via ${activeSearch.provider.name}):\n\n` +
    `${formattedResultsContext}\n\n` +
    `Now draft a comprehensive, grounded research section citing the above sources with [[CITE:N]] tags.`;

  let draftedJson: {
    summary?: string;
    draftMarkdown?: string;
    usedSourceIndices?: number[];
  } = {};

  let inputTokens = 0;
  let outputTokens = 0;
  const modelName = aiProvider?.name || "Gemini Flash";

  try {
    const aiEngineType = (aiProvider?.provider || "google").toLowerCase();

    if (aiEngineType === "google") {
      const googleModel = aiProvider?.modelKey || "gemini-3.8-flash";
      const cleanModel = googleModel.replace(/^models\//, "");
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${cleanModel}:generateContent?key=${aiApiKey}`;

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemInstructions }] },
          contents: [{ role: "user", parts: [{ text: userPrompt }] }],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 4096,
            responseMimeType: "application/json",
          },
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error?.message || `Google AI returned HTTP ${res.status}`);
      }

      const raw = await res.json();
      const textOutput = raw.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
      inputTokens = raw.usageMetadata?.promptTokenCount || 800;
      outputTokens = raw.usageMetadata?.candidatesTokenCount || 600;

      try {
        draftedJson = JSON.parse(textOutput);
      } catch {
        const jsonMatch = textOutput.match(/\{[\s\S]*\}/);
        draftedJson = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
      }
    } else {
      // OpenAI-compatible endpoint (Groq, NVIDIA NIM, OpenAI, etc.)
      const endpoint = aiProvider?.baseUrl || "https://api.openai.com/v1";
      const model = aiProvider?.modelKey || "llama-3.3-70b-versatile";

      const res = await fetch(`${endpoint.replace(/\/+$/, "")}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${aiApiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: systemInstructions },
            { role: "user", content: userPrompt },
          ],
          temperature: 0.1,
          response_format: { type: "json_object" },
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error?.message || `AI engine returned HTTP ${res.status}`);
      }

      const raw = await res.json();
      const textOutput = raw.choices?.[0]?.message?.content || "{}";
      inputTokens = raw.usage?.prompt_tokens || 800;
      outputTokens = raw.usage?.completion_tokens || 600;

      try {
        draftedJson = JSON.parse(textOutput);
      } catch {
        const jsonMatch = textOutput.match(/\{[\s\S]*\}/);
        draftedJson = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
      }
    }
  } catch (aiErr: any) {
    if (creditReservation) {
      await refundAiCreditReservation(creditReservation);
    }
    throw new Error(`AI drafting failed: ${aiErr.message}`);
  }

  const rawMarkdown = draftedJson.draftMarkdown || "";
  const summary =
    draftedJson.summary ||
    `Verified research section on "${cleanTopic}" citing live web findings.`;

  // 5. Map [[CITE:N]] tags to real ProposedSourceItems
  const accessedDateStr = new Date().toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  // Extract all cited indices from markdown text
  const citeRegex = /\[\[CITE:(\d+)\]\]/g;
  const citedIndicesSet = new Set<number>();
  let match: RegExpExecArray | null;
  while ((match = citeRegex.exec(rawMarkdown)) !== null) {
    const idx = parseInt(match[1], 10);
    if (idx >= 1 && idx <= searchResults.results.length) {
      citedIndicesSet.add(idx);
    }
  }

  // If none explicitly matched, cite at least the top relevant sources
  if (citedIndicesSet.size === 0 && searchResults.results.length > 0) {
    citedIndicesSet.add(1);
  }

  // Create ProposedSourceItems
  const proposedSources: ProposedSourceItem[] = [];
  const indexToSourceMap = new Map<number, ProposedSourceItem>();

  for (const idx of citedIndicesSet) {
    const searchItem = searchResults.results[idx - 1];
    if (!searchItem) continue;

    const tempId = `src_research_${Date.now()}_${idx}`;
    const publisher = searchItem.publisher || "Web Source";

    const authorOrPublisher = searchItem.author || searchItem.publisher || null;

    const mockSourceItem: SourceItem = {
      id: tempId,
      documentId,
      title: searchItem.title,
      authors: authorOrPublisher,
      url: searchItem.url,
      publisher,
      publishedDate: searchItem.publishedDate || null,
      accessedDate: accessedDateStr,
      sourceType: "website",
    };

    const inTextCitation = formatInTextCitation(mockSourceItem);

    const proposed: ProposedSourceItem = {
      tempId,
      resultIndex: idx,
      title: searchItem.title,
      url: searchItem.url,
      publisher,
      authors: authorOrPublisher,
      publishedDate: searchItem.publishedDate || null,
      accessedDate: accessedDateStr,
      sourceType: "website",
      snippetPreview: searchItem.snippet,
      inTextCitation,
    };

    proposedSources.push(proposed);
    indexToSourceMap.set(idx, proposed);
  }

  // Convert markdown draft with [[CITE:N]] into Tiptap JSON block nodes
  const draftJsonNodes = convertMarkdownToTiptapNodes(rawMarkdown, indexToSourceMap);

  // 6. Settle credits
  let totalCostUSD = 0;
  let remainingTotal = balance.totalCredits;

  if (creditReservation) {
    const aiCost = isByok ? 0 : calculateAiCostUSD(inputTokens, outputTokens);
    totalCostUSD = Math.round((SEARCH_API_FEE_USD + aiCost) * 10000) / 10000;

    const settlement = await settleAiCreditReservation(
      creditReservation,
      inputTokens,
      outputTokens,
      `AI Auto-Research: ${cleanTopic.slice(0, 30)}`,
      {
        providerId: activeSearch.provider.id,
        providerName: `${activeSearch.provider.name} + ${modelName}`,
      }
    );
    remainingTotal = settlement.remainingBalance;
  }

  return {
    topic: cleanTopic,
    summary,
    draftMarkdown: rawMarkdown,
    draftJsonNodes,
    proposedSources,
    searchResults: searchResults.results,
    searchProviderName: activeSearch.provider.name,
    aiModelName: modelName,
    creditsCostUSD: totalCostUSD,
    remainingCredits: remainingTotal,
  };
}

/**
 * Converts drafted markdown with [[CITE:N]] markers into valid Tiptap JSON block nodes
 * with native inline "citation" nodes inserted directly into paragraphs and headings.
 */
export function convertMarkdownToTiptapNodes(
  markdown: string,
  indexToSourceMap: Map<number, ProposedSourceItem>
): any[] {
  const lines = markdown.split(/\r?\n/);
  const nodes: any[] = [];

  let currentListItems: any[] | null = null;

  const flushList = () => {
    if (currentListItems && currentListItems.length > 0) {
      nodes.push({
        type: "bulletList",
        content: currentListItems,
      });
      currentListItems = null;
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) {
      flushList();
      continue;
    }

    // Check for Headings: #, ##, ###
    const headingMatch = line.match(/^(#{1,3})\s+(.*)$/);
    if (headingMatch) {
      flushList();
      const level = headingMatch[1].length;
      const text = headingMatch[2];
      nodes.push({
        type: "heading",
        attrs: { level },
        content: parseInlineContentWithCitations(text, indexToSourceMap),
      });
      continue;
    }

    // Check for Bullet points: - or *
    const bulletMatch = line.match(/^[-*]\s+(.*)$/);
    if (bulletMatch) {
      const itemText = bulletMatch[1];
      if (!currentListItems) {
        currentListItems = [];
      }
      currentListItems.push({
        type: "listItem",
        content: [
          {
            type: "paragraph",
            content: parseInlineContentWithCitations(itemText, indexToSourceMap),
          },
        ],
      });
      continue;
    }

    // Standard paragraph
    flushList();
    nodes.push({
      type: "paragraph",
      content: parseInlineContentWithCitations(line, indexToSourceMap),
    });
  }

  flushList();

  return nodes;
}

/**
 * Parses inline string into Tiptap text and citation nodes.
 * Replaces [[CITE:N]] tags with { type: "citation", attrs: { sourceId, displayText } }.
 */
function parseInlineContentWithCitations(
  text: string,
  indexToSourceMap: Map<number, ProposedSourceItem>
): any[] {
  const parts: any[] = [];
  const regex = /\[\[CITE:(\d+)\]\]/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    const textBefore = text.slice(lastIndex, match.index);
    if (textBefore) {
      parts.push({ type: "text", text: textBefore });
    }

    const citeIdx = parseInt(match[1], 10);
    const source = indexToSourceMap.get(citeIdx);

    if (source) {
      parts.push({
        type: "citation",
        attrs: {
          sourceId: source.tempId,
          displayText: source.inTextCitation,
        },
      });
    }

    lastIndex = match.index + match[0].length;
  }

  const remaining = text.slice(lastIndex);
  if (remaining) {
    parts.push({ type: "text", text: remaining });
  }

  // If line was empty, fallback to single empty space
  if (parts.length === 0) {
    parts.push({ type: "text", text: " " });
  }

  return parts;
}
