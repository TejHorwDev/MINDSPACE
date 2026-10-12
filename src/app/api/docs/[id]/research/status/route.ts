import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { getActiveSearchProvider } from "@/lib/search/search-provider";

export const dynamic = "force-dynamic";

type RouteProps = {
  params: Promise<{ id: string }>;
};

/**
 * GET /api/docs/[id]/research/status
 * Returns availability of active search provider for the document editor.
 */
export async function GET(_req: Request, { params }: RouteProps) {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const doc = await db.document.findFirst({
    where: { id, ownerId: session.user.id },
    select: { id: true },
  });

  if (!doc) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  const activeSearch = await getActiveSearchProvider();

  if (!activeSearch) {
    return NextResponse.json({
      available: false,
      providerName: null,
      providerType: null,
      message:
        "No active search provider configured. An administrator must configure a search provider (e.g. Tavily, SerpAPI, or Bing) in /admin → Search Providers to enable live AI research.",
    });
  }

  return NextResponse.json({
    available: true,
    providerName: activeSearch.provider.name,
    providerType: activeSearch.provider.provider,
    searchDepth: activeSearch.provider.searchDepth || "basic",
    maxResults: activeSearch.provider.maxResults || 5,
    message: `Ready for live web research via ${activeSearch.provider.name}.`,
  });
}
