/**
 * Seeds the MINDSPACE team into the Developer table.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type SeedDeveloper = {
  name: string;
  role: string;
  bio: string;
  photoUrl?: string;
  socialLinks: {
    github?: string;
    linkedin?: string;
    instagram?: string;
    twitter?: string;
    website?: string;
  };
};

const TEAM: SeedDeveloper[] = [
  {
    name: "Tej Jung Xettri",
    role: "HEAD DEV </>",
    bio: "Lead architect and developer building the MINDSPACE web engine and studio platform.",
    socialLinks: {
      github: "https://github.com/TejHorwDev",
    },
  },
];

function slugify(name: string) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function main() {
  for (const [index, member] of TEAM.entries()) {
    const slug = slugify(member.name);
    await prisma.developer.upsert({
      where: { slug },
      update: {
        name: member.name,
        role: member.role,
        bio: member.bio,
        socialLinks: member.socialLinks,
        order: index,
      },
      create: {
        name: member.name,
        slug,
        role: member.role,
        bio: member.bio,
        socialLinks: member.socialLinks,
        order: index,
      },
    });
  }
  console.log(`Verified ${TEAM.length} team members.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
