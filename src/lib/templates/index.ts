import { PORTFOLIO_FILES } from "./portfolio";
import { CLUB_EVENT_FILES } from "./club-event";
import { MULTI_PAGE_FILES } from "./multi-page";

export type TemplateId = "blank" | "portfolio" | "club-event" | "multi-page";

export type TemplateMeta = {
  id: TemplateId;
  name: string;
  description: string;
  /** Number of files the template creates ("—" for blank). */
  fileCount: number;
  pages: string[];
};

/**
 * Single source of truth for starter templates. The picker UI renders
 * TEMPLATES; the creation API copies TEMPLATE_FILES[id] into ProjectFile rows.
 */
export const TEMPLATES: TemplateMeta[] = [
  {
    id: "portfolio",
    name: "Simple Portfolio",
    description: "Hero, about, projects list, and contact — one polished page.",
    fileCount: 1,
    pages: ["index.html"],
  },
  {
    id: "club-event",
    name: "Club / Event Landing",
    description: "Banner, event story, schedule, and an RSVP form.",
    fileCount: 1,
    pages: ["index.html"],
  },
  {
    id: "multi-page",
    name: "Multi-Page Site",
    description: "Home, about, and contact pages sharing one stylesheet and nav.",
    fileCount: 4,
    pages: ["index.html", "about.html", "contact.html", "styles.css"],
  },
  {
    id: "blank",
    name: "Start Blank",
    description: "An empty project — start from nothing and shape it yourself.",
    fileCount: 0,
    pages: [],
  },
];

export const TEMPLATE_FILES: Record<
  Exclude<TemplateId, "blank">,
  { path: string; content: string }[]
> = {
  portfolio: PORTFOLIO_FILES,
  "club-event": CLUB_EVENT_FILES,
  "multi-page": MULTI_PAGE_FILES,
};

export function isTemplateId(value: string): value is TemplateId {
  return TEMPLATES.some((template) => template.id === value);
}
