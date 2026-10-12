import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatInTextCitation, SourceItem } from "@/lib/citations/apa";

export const dynamic = "force-dynamic";

type RouteProps = {
  params: Promise<{ id: string }>;
};

/**
 * POST /api/docs/[id]/research/apply
 * Commits the approved research section to the document:
 * 1. Creates permanent real Source records in the database.
 * 2. Rewires temporary citation node source IDs to permanent database source IDs.
 * 3. Returns the saved sources and remapped Tiptap nodes.
 */
export async function POST(req: Request, { params }: RouteProps) {
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
    return NextResponse.json({ error: "Document not found." }, { status: 404 });
  }

  let body: any = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const proposedSources: any[] = Array.isArray(body.proposedSources) ? body.proposedSources : [];
  const draftJsonNodes: any[] = Array.isArray(body.draftJsonNodes) ? body.draftJsonNodes : [];

  if (proposedSources.length === 0 && draftJsonNodes.length === 0) {
    return NextResponse.json(
      { error: "No research content or sources provided to apply." },
      { status: 400 }
    );
  }

  // Map to hold tempId -> permanent real database Source
  const idMap = new Map<string, SourceItem>();
  const createdSources: SourceItem[] = [];

  for (const p of proposedSources) {
    const title = (p.title || "Untitled Web Source").trim();
    const url = p.url ? String(p.url).trim() : null;
    const publisher = p.publisher ? String(p.publisher).trim() : null;
    const authors = p.authors ? String(p.authors).trim() : null;
    const publishedDate = p.publishedDate ? String(p.publishedDate).trim() : null;
    const accessedDate = p.accessedDate ? String(p.accessedDate).trim() : null;

    // Check if a source with this identical URL already exists for this document
    let existingSource = url
      ? await db.source.findFirst({
          where: { documentId: id, url },
        })
      : null;

    if (!existingSource) {
      existingSource = await db.source.create({
        data: {
          documentId: id,
          title,
          url,
          publisher,
          authors,
          publishedDate,
          accessedDate,
          sourceType: "website",
        },
      });
    }

    const sourceItem: SourceItem = {
      id: existingSource.id,
      documentId: existingSource.documentId,
      title: existingSource.title,
      authors: existingSource.authors,
      url: existingSource.url,
      publisher: existingSource.publisher,
      publishedDate: existingSource.publishedDate,
      accessedDate: existingSource.accessedDate,
      sourceType: existingSource.sourceType,
      createdAt: existingSource.createdAt,
      updatedAt: existingSource.updatedAt,
    };

    createdSources.push(sourceItem);
    if (p.tempId) {
      idMap.set(p.tempId, sourceItem);
    }
  }

  // Deeply rewrite temporary source IDs in draftJsonNodes
  function remapCitationNodes(nodes: any[]): any[] {
    return nodes.map((node) => {
      if (!node || typeof node !== "object") return node;

      if (node.type === "citation" && node.attrs?.sourceId) {
        const permanentSource = idMap.get(node.attrs.sourceId);
        if (permanentSource) {
          return {
            ...node,
            attrs: {
              ...node.attrs,
              sourceId: permanentSource.id,
              displayText: formatInTextCitation(permanentSource),
            },
          };
        }
      }

      if (Array.isArray(node.content)) {
        return {
          ...node,
          content: remapCitationNodes(node.content),
        };
      }

      return node;
    });
  }

  const remappedNodes = remapCitationNodes(draftJsonNodes);

  return NextResponse.json({
    success: true,
    createdSources,
    remappedNodes,
    message: `Successfully created ${createdSources.length} verified sources and mapped citations!`,
  });
}
