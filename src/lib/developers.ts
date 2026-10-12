/**
 * MINDSPACE team & stack data definitions.
 */

export type Developer = {
  name: string;
  role: string;
  bio: string;
  photoUrl?: string;
};

export const techStack: { name: string; description: string }[] = [
  { name: "Next.js 16", description: "App Router & server rendering" },
  { name: "TypeScript", description: "Type-safe from UI to database" },
  { name: "Tailwind CSS", description: "Design system & theming" },
  { name: "shadcn/ui", description: "Accessible components" },
  { name: "Prisma", description: "Schema & database queries" },
  { name: "NextAuth", description: "Email & credentials auth" },
  { name: "Framer Motion", description: "Smooth micro-interactions" },
  { name: "Zod", description: "Input validation" },
];
