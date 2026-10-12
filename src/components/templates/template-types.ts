import type { UnifiedTemplate } from "@/lib/templates/service";

export type TemplateDifficulty = "Beginner" | "Intermediate" | "Advanced";

export type TemplateMetaDetails = {
  difficulty: TemplateDifficulty;
  estTime: string;
  rating: number;
  clonesCount: string;
  stackTags: string[];
  features: string[];
  author: string;
};

export const TEMPLATE_METADATA_MAP: Record<string, TemplateMetaDetails> = {
  "developer-portfolio": {
    difficulty: "Beginner",
    estTime: "1 min",
    rating: 4.9,
    clonesCount: "1.8k",
    stackTags: ["HTML5", "CSS Grid", "JavaScript", "Responsive"],
    features: [
      "Dynamic skills badges & tech stack pills",
      "Interactive project cards showcase",
      "Experience timeline & work history",
      "Smooth anchor scrolling & contact modal",
      "Zero external build dependencies",
    ],
    author: "MINDSPACE Studio",
  },
  "saas-landing": {
    difficulty: "Intermediate",
    estTime: "2 min",
    rating: 4.9,
    clonesCount: "2.4k",
    stackTags: ["HTML5", "CSS Flexbox", "JavaScript", "Pricing Switcher"],
    features: [
      "High-converting hero with email capture form",
      "Interactive 3-tier pricing card layout",
      "Feature showcase grid with hover micro-interactions",
      "Customer testimonials & social proof banner",
      "Pre-configured lead capture JavaScript handler",
    ],
    author: "MINDSPACE Studio",
  },
  "multi-page": {
    difficulty: "Intermediate",
    estTime: "3 min",
    rating: 4.8,
    clonesCount: "1.1k",
    stackTags: ["Multi-Page", "HTML5", "CSS3", "Navigation"],
    features: [
      "4 complete synchronized pages (Home, About, Work, Contact)",
      "Consistent global navigation with active page state",
      "Interactive case study grid with metadata",
      "Working client inquiry contact form",
      "Studio design system with unified typography scale",
    ],
    author: "Kroma Collective",
  },
  "club-event": {
    difficulty: "Beginner",
    estTime: "2 min",
    rating: 4.7,
    clonesCount: "950",
    stackTags: ["Event", "Countdown", "Schedule", "RSVP"],
    features: [
      "High-energy hackathon & club branding",
      "Weekend event schedule timeline",
      "Speaker & mentor spotlight grid",
      "Interactive RSVP modal with validation",
      "Sponsor logo ribbon & prize breakdown",
    ],
    author: "Campus Builders",
  },
  "link-in-bio": {
    difficulty: "Beginner",
    estTime: "1 min",
    rating: 4.9,
    clonesCount: "3.2k",
    stackTags: ["Mobile-First", "CSS Gradients", "Social Hub"],
    features: [
      "Ultra-fast mobile-first layout (sub-10KB)",
      "Vibrant gradient avatar & identity card",
      "Highlight cards for priority links or sponsorships",
      "Built-in social icon links and newsletter CTA",
      "Optimized for smartphone Instagram/TikTok bio links",
    ],
    author: "MINDSPACE Studio",
  },
  "photo-showcase": {
    difficulty: "Beginner",
    estTime: "2 min",
    rating: 4.8,
    clonesCount: "880",
    stackTags: ["Photography", "Masonry", "Visual", "Dark"],
    features: [
      "Cinematic dark aesthetic with high contrast",
      "Responsive photo gallery masonry grid",
      "Exhibition history & gallery archive",
      "Minimalist typography with generous whitespace",
      "Artist statement & client inquiry links",
    ],
    author: "Lumen Visuals",
  },
};

export function getTemplateMeta(template: UnifiedTemplate): TemplateMetaDetails {
  if (TEMPLATE_METADATA_MAP[template.slug]) {
    return TEMPLATE_METADATA_MAP[template.slug];
  }

  // Derive dynamic fallback for custom or new templates
  const difficulty: TemplateDifficulty =
    template.fileCount > 3 ? "Intermediate" : "Beginner";

  return {
    difficulty,
    estTime: `${Math.max(1, Math.min(5, template.fileCount))} min`,
    rating: 4.8,
    clonesCount: "400+",
    stackTags: template.tags.length > 0 ? template.tags.slice(0, 4) : ["HTML5", "CSS3"],
    features: [
      "Production-ready starter boilerplate",
      "Fully responsive across all screen sizes",
      "Zero build setup required",
    ],
    author: template.isCustom ? "Custom Blueprint" : "MINDSPACE Studio",
  };
}
