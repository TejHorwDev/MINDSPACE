import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getAuthSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { SiteHeader } from "@/components/layout/site-header";
import { DocumentEditorView } from "@/components/docs/document-editor-view";

type DocumentPageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({
  params,
}: DocumentPageProps): Promise<Metadata> {
  const { id } = await params;
  const doc = await db.document.findUnique({
    where: { id },
    select: { title: true },
  });

  return {
    title: doc?.title ? `${doc.title} · Docs Studio` : "Document · Docs Studio",
  };
}

export default async function DocumentPage({ params }: DocumentPageProps) {
  const session = await getAuthSession();
  const { id } = await params;

  if (!session?.user?.id) {
    redirect(`/login?callbackUrl=/docs/${id}`);
  }

  const [document, me] = await Promise.all([
    db.document.findFirst({
      where: { id, ownerId: session.user.id },
      include: {
        sources: {
          orderBy: { createdAt: "desc" },
        },
      },
    }),
    db.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    }),
  ]);

  if (!document) {
    notFound();
  }

  const initialSources = (document.sources || []).map((s) => ({
    ...s,
    createdAt: s.createdAt.toISOString(),
    updatedAt: s.updatedAt.toISOString(),
  }));

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SiteHeader
        authed
        fluid
        isAdmin={me?.role === "admin"}
        name={session.user.name}
        email={session.user.email}
      />

      <DocumentEditorView
        documentId={document.id}
        initialTitle={document.title}
        initialContentJson={document.contentJson}
        initialSources={initialSources}
        updatedAt={document.updatedAt}
      />
    </div>
  );
}
