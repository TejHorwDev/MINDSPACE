export type EditorFile = {
  id: string;
  projectId: string;
  path: string;
  content: string;
  updatedAt: string | Date;
};

export type SaveStatus = "saved" | "saving" | "unsaved" | "error";

export type ProjectMeta = {
  id: string;
  name: string;
  templateUsed: string;
  isPublished?: boolean;
  publicSlug?: string | null;
  publishedAt?: string | Date | null;
};

export type AccountPlanInfo = {
  id: string;
  name: string;
  dailyFreeCreditUSD: number;
  priceUSD?: number;
};
