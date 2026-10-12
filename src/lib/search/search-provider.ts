import { db } from "@/lib/db";

export interface SearchResultItem {
  title: string;
  url: string;
  snippet: string;
  score?: number;
  publishedDate?: string | null;
  publisher?: string | null;
  author?: string | null;
}

export interface SearchExecutionResult {
  providerId: string;
  providerName: string;
  providerType: string;
  query: string;
  results: SearchResultItem[];
  rawCount: number;
  latencyMs: number;
}

export interface SearchProviderConfig {
  id: string;
  name: string;
  provider: "tavily" | "serpapi" | "bing" | "custom" | string;
  apiKey?: string | null;
  baseUrl?: string | null;
  active: boolean;
  priority: number;
  searchDepth?: string;
  maxResults?: number;
  notes?: string | null;
}

/**
 * Cleanly extracts a readable publisher/site name from a URL.
 */
export function extractPublisherFromUrl(urlStr: string): string {
  try {
    const parsed = new URL(urlStr);
    const host = parsed.hostname.replace(/^www\./i, "").toLowerCase();

    // Known curated domains
    const domainMap: Record<string, string> = {
      "en.wikipedia.org": "Wikipedia",
      "wikipedia.org": "Wikipedia",
      "bbc.com": "BBC News",
      "bbc.co.uk": "BBC News",
      "reuters.com": "Reuters",
      "nytimes.com": "The New York Times",
      "theguardian.com": "The Guardian",
      "nature.com": "Nature",
      "sciencedirect.com": "ScienceDirect",
      "kathmandupost.com": "The Kathmandu Post",
      "thehimalayantimes.com": "The Himalayan Times",
      "onlinekhabar.com": "OnlineKhabar",
      "cnn.com": "CNN",
      "washingtonpost.com": "The Washington Post",
      "wsj.com": "The Wall Street Journal",
      "bloomberg.com": "Bloomberg",
      "techcrunch.com": "TechCrunch",
      "theverge.com": "The Verge",
      "forbes.com": "Forbes",
      "unesco.org": "UNESCO",
      "worldbank.org": "The World Bank",
      "who.int": "World Health Organization",
      "un.org": "United Nations",
      "arxiv.org": "arXiv",
      "nih.gov": "National Institutes of Health (NIH)",
      "cdc.gov": "CDC",
    };

    if (domainMap[host]) {
      return domainMap[host];
    }

    // Strip top-level domain e.g. "something.edu.np" -> "something"
    const parts = host.split(".");
    if (parts.length >= 2) {
      const main = parts[0].length <= 3 && parts.length > 2 ? parts[1] : parts[0];
      return main.charAt(0).toUpperCase() + main.slice(1);
    }

    return host;
  } catch {
    return "Web Source";
  }
}

/**
 * Resolves the effective API key for a search provider, checking database record first,
 * then corresponding environment variable fallback.
 */
export function resolveSearchApiKey(provider: { provider: string; apiKey?: string | null }): string {
  if (provider.apiKey && provider.apiKey.trim().length > 0) {
    return provider.apiKey.trim();
  }

  const type = (provider.provider || "").toLowerCase().trim();
  if (type === "tavily") {
    return process.env.TAVILY_API_KEY?.trim() || "";
  }
  if (type === "serpapi") {
    return process.env.SERPAPI_API_KEY?.trim() || "";
  }
  if (type === "bing") {
    return process.env.BING_SEARCH_API_KEY?.trim() || process.env.BING_API_KEY?.trim() || "";
  }

  return "";
}

/**
 * Returns the active configured search provider with a valid key.
 * If no search provider is active or no valid key is configured, returns null.
 */
export async function getActiveSearchProvider(): Promise<{
  provider: SearchProviderConfig;
  apiKey: string;
} | null> {
  // Query active search providers ordered by priority (lower number = higher priority)
  const providers = await db.searchProvider.findMany({
    where: { active: true },
    orderBy: { priority: "asc" },
  });

  for (const p of providers) {
    const key = resolveSearchApiKey(p);
    if (key) {
      return {
        provider: {
          id: p.id,
          name: p.name,
          provider: p.provider,
          apiKey: key,
          baseUrl: p.baseUrl,
          active: p.active,
          priority: p.priority,
          searchDepth: p.searchDepth || "basic",
          maxResults: p.maxResults || 5,
          notes: p.notes,
        },
        apiKey: key,
      };
    }
  }

  // Also check if environment variable is provided even if not yet saved in DB
  if (process.env.TAVILY_API_KEY?.trim()) {
    return {
      provider: {
        id: "env-tavily",
        name: "Tavily Search (Environment)",
        provider: "tavily",
        apiKey: process.env.TAVILY_API_KEY.trim(),
        active: true,
        priority: 0,
        searchDepth: "basic",
        maxResults: 5,
        notes: "Configured via TAVILY_API_KEY in environment",
      },
      apiKey: process.env.TAVILY_API_KEY.trim(),
    };
  }

  return null;
}

/**
 * Tests connection to a search provider by running a lightweight query.
 */
export async function testSearchProviderConnection({
  provider,
  apiKey,
  baseUrl,
}: {
  provider: string;
  apiKey: string;
  baseUrl?: string | null;
}): Promise<{
  success: boolean;
  latencyMs?: number;
  message: string;
  error?: string;
  sampleResultsCount?: number;
}> {
  const cleanKey = (apiKey || "").trim();
  if (!cleanKey) {
    return {
      success: false,
      message: "No API key provided to test.",
      error: "Missing API key",
    };
  }

  const startTime = Date.now();
  const testQuery = "Kathmandu Tribhuvan University education";

  try {
    const type = (provider || "tavily").toLowerCase().trim();

    if (type === "tavily") {
      const endpoint = baseUrl?.trim() || "https://api.tavily.com/search";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          api_key: cleanKey,
          query: testQuery,
          search_depth: "basic",
          max_results: 2,
          include_answer: false,
        }),
      });

      const latencyMs = Date.now() - startTime;

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        const errDetail = errJson.detail || errJson.message || `${res.status} ${res.statusText}`;
        return {
          success: false,
          latencyMs,
          message: `Tavily API rejected request: ${errDetail}`,
          error: String(errDetail),
        };
      }

      const data = await res.json();
      const count = Array.isArray(data.results) ? data.results.length : 0;
      return {
        success: true,
        latencyMs,
        sampleResultsCount: count,
        message: `Successfully connected to Tavily! Retrieved ${count} real search results in ${latencyMs}ms.`,
      };
    }

    if (type === "serpapi") {
      const endpoint = `https://serpapi.com/search?q=${encodeURIComponent(testQuery)}&api_key=${encodeURIComponent(cleanKey)}&engine=google&num=2`;
      const res = await fetch(endpoint);
      const latencyMs = Date.now() - startTime;
      const data = await res.json().catch(() => ({}));

      if (!res.ok || data.error) {
        const errDetail = data.error || `${res.status} ${res.statusText}`;
        return {
          success: false,
          latencyMs,
          message: `SerpAPI rejected request: ${errDetail}`,
          error: String(errDetail),
        };
      }

      const count = Array.isArray(data.organic_results) ? data.organic_results.length : 0;
      return {
        success: true,
        latencyMs,
        sampleResultsCount: count,
        message: `Successfully connected to SerpAPI! Retrieved ${count} organic results in ${latencyMs}ms.`,
      };
    }

    if (type === "bing") {
      const endpoint = `https://api.bing.microsoft.com/v7.0/search?q=${encodeURIComponent(testQuery)}&count=2`;
      const res = await fetch(endpoint, {
        headers: { "Ocp-Apim-Subscription-Key": cleanKey },
      });
      const latencyMs = Date.now() - startTime;

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        const errDetail = errJson.message || `${res.status} ${res.statusText}`;
        return {
          success: false,
          latencyMs,
          message: `Bing Web Search rejected request: ${errDetail}`,
          error: String(errDetail),
        };
      }

      const data = await res.json();
      const count = Array.isArray(data.webPages?.value) ? data.webPages.value.length : 0;
      return {
        success: true,
        latencyMs,
        sampleResultsCount: count,
        message: `Successfully connected to Bing Search! Retrieved ${count} web results in ${latencyMs}ms.`,
      };
    }

    // Custom Search Provider
    if (baseUrl?.trim()) {
      const res = await fetch(baseUrl.trim(), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${cleanKey}`,
        },
        body: JSON.stringify({ query: testQuery }),
      });
      const latencyMs = Date.now() - startTime;
      if (!res.ok) {
        return {
          success: false,
          latencyMs,
          message: `Custom search endpoint returned HTTP ${res.status}`,
          error: `HTTP ${res.status}`,
        };
      }
      return {
        success: true,
        latencyMs,
        message: `Custom search endpoint responded successfully in ${latencyMs}ms.`,
      };
    }

    return {
      success: false,
      message: `Unsupported search provider type: ${provider}`,
      error: "Unsupported provider",
    };
  } catch (err: any) {
    const latencyMs = Date.now() - startTime;
    return {
      success: false,
      latencyMs,
      message: `Network error connecting to ${provider}: ${err.message}`,
      error: err.message,
    };
  }
}

/**
 * Executes a real internet search using the specified or active search provider.
 * Extracts and returns clean, verified, grounded search results.
 */
export async function executeLiveSearch({
  query,
  providerConfig,
  apiKey,
  maxResults = 5,
}: {
  query: string;
  providerConfig: SearchProviderConfig;
  apiKey: string;
  maxResults?: number;
}): Promise<SearchExecutionResult> {
  const startTime = Date.now();
  const cleanQuery = query.trim();
  const type = (providerConfig.provider || "tavily").toLowerCase().trim();
  const targetResultsCount = Math.min(Math.max(maxResults || providerConfig.maxResults || 5, 1), 10);

  let items: SearchResultItem[] = [];

  if (type === "tavily") {
    const endpoint = providerConfig.baseUrl?.trim() || "https://api.tavily.com/search";
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: apiKey,
        query: cleanQuery,
        search_depth: providerConfig.searchDepth || "basic",
        max_results: targetResultsCount,
        include_answer: false,
      }),
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      const errDetail = errJson.detail || errJson.message || `${res.status} ${res.statusText}`;
      throw new Error(`Tavily Search API failed (${res.status}): ${errDetail}`);
    }

    const data = await res.json();
    const rawResults = Array.isArray(data.results) ? data.results : [];

    items = rawResults.map((r: any) => ({
      title: (r.title || "Untitled Web Resource").trim(),
      url: (r.url || "").trim(),
      snippet: (r.content || r.snippet || "").trim(),
      score: typeof r.score === "number" ? r.score : undefined,
      publishedDate: r.published_date || null,
      publisher: extractPublisherFromUrl(r.url || ""),
      author: null,
    }));
  } else if (type === "serpapi") {
    const endpoint = `https://serpapi.com/search?q=${encodeURIComponent(cleanQuery)}&api_key=${encodeURIComponent(apiKey)}&engine=google&num=${targetResultsCount}`;
    const res = await fetch(endpoint);
    const data = await res.json().catch(() => ({}));

    if (!res.ok || data.error) {
      const errDetail = data.error || `${res.status} ${res.statusText}`;
      throw new Error(`SerpAPI failed: ${errDetail}`);
    }

    const rawResults = Array.isArray(data.organic_results) ? data.organic_results : [];

    items = rawResults.map((r: any) => ({
      title: (r.title || "Untitled Search Result").trim(),
      url: (r.link || "").trim(),
      snippet: (r.snippet || "").trim(),
      publishedDate: r.date || null,
      publisher: (r.source || "").trim() || extractPublisherFromUrl(r.link || ""),
      author: null,
    }));
  } else if (type === "bing") {
    const endpoint = `https://api.bing.microsoft.com/v7.0/search?q=${encodeURIComponent(cleanQuery)}&count=${targetResultsCount}`;
    const res = await fetch(endpoint, {
      headers: { "Ocp-Apim-Subscription-Key": apiKey },
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      const errDetail = errJson.message || `${res.status} ${res.statusText}`;
      throw new Error(`Bing Search API failed (${res.status}): ${errDetail}`);
    }

    const data = await res.json();
    const rawResults = Array.isArray(data.webPages?.value) ? data.webPages.value : [];

    items = rawResults.map((r: any) => ({
      title: (r.name || "Untitled Web Page").trim(),
      url: (r.url || "").trim(),
      snippet: (r.snippet || "").trim(),
      publishedDate: r.datePublished || null,
      publisher: extractPublisherFromUrl(r.url || ""),
      author: null,
    }));
  } else {
    throw new Error(`Unsupported search provider type: "${providerConfig.provider}"`);
  }

  // Filter out any invalid items without URLs or titles
  const validItems = items.filter((item) => item.url && item.url.startsWith("http") && item.title);

  return {
    providerId: providerConfig.id,
    providerName: providerConfig.name,
    providerType: type,
    query: cleanQuery,
    results: validItems,
    rawCount: validItems.length,
    latencyMs: Date.now() - startTime,
  };
}
