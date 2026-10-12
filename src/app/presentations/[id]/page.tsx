import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getAuthSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { PresentationEditorView } from "@/components/presentations/presentation-editor-view";
import { PresentationItem } from "@/lib/presentations/types";

export const dynamic = "force-dynamic";

type PresentationPageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({
  params,
}: PresentationPageProps): Promise<Metadata> {
  const { id } = await params;
  const presentation = await db.presentation.findUnique({
    where: { id },
    select: { title: true },
  });

  return {
    title: presentation?.title
      ? `${presentation.title} · Presentation Studio`
      : "Presentation · Presentation Studio",
    description: "Build clean, professional slide decks with MINDSPACE Studio.",
  };
}

export default async function PresentationPage({
  params,
}: PresentationPageProps) {
  const session = await getAuthSession();
  const { id } = await params;

  if (!session?.user?.id) {
    redirect(`/login?callbackUrl=/presentations/${id}`);
  }

  const presentation = await db.presentation.findFirst({
    where: {
      id,
      ownerId: session.user.id,
    },
    include: {
      slides: {
        orderBy: { order: "asc" },
      },
    },
  });

  if (!presentation) {
    notFound();
  }

  const initialPresentation: PresentationItem = {
    id: presentation.id,
    ownerId: presentation.ownerId,
    title: presentation.title,
    createdAt: presentation.createdAt.toISOString(),
    updatedAt: presentation.updatedAt.toISOString(),
    slides: presentation.slides.map((s) => ({
      id: s.id,
      presentationId: s.presentationId,
      order: s.order,
      layoutType: s.layoutType as any,
      contentJson: s.contentJson as any,
      speakerNotes: s.speakerNotes ?? "",
      createdAt: s.createdAt.toISOString(),
      updatedAt: s.updatedAt.toISOString(),
    })),
  };

  return (
    <PresentationEditorView initialPresentation={initialPresentation} />
  );
}
