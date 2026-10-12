// scratch/update_catalog_file.ts
import * as fs from "fs";
import * as path from "path";

const catalogPath = path.join(__dirname, "../src/lib/templates/catalog.ts");
let content = fs.readFileSync(catalogPath, "utf-8");

// Ensure imports at the top
if (!content.includes('import { PORTFOLIO_FILES }')) {
  content = `import { PORTFOLIO_FILES } from "./portfolio";\nimport { CLUB_EVENT_FILES } from "./club-event";\nimport { MULTI_PAGE_FILES } from "./multi-page";\n` + content;
}

// Replace developer-portfolio definition
const devPortRegex = /\{\s*slug:\s*"developer-portfolio"[\s\S]*?files:\s*\[[\s\S]*?\],\s*\},/m;
const devPortReplacement = `{
    slug: "developer-portfolio",
    name: "Simple Portfolio",
    description: "Classic professional portfolio with animated hero, project case studies, stack pills, and interactive photo slots.",
    category: "portfolio",
    tags: ["developer", "portfolio", "projects", "classic", "minimal"],
    icon: "Code2",
    isFeatured: true,
    fileCount: PORTFOLIO_FILES.length,
    files: PORTFOLIO_FILES,
  },`;

if (devPortRegex.test(content)) {
  content = content.replace(devPortRegex, devPortReplacement);
  console.log("Replaced developer-portfolio in catalog.ts");
} else {
  console.log("Could not find developer-portfolio regex match in catalog.ts");
}

// Replace multi-page-studio definition
const multiPageRegex = /\{\s*slug:\s*"multi-page-studio"[\s\S]*?files:\s*\[[\s\S]*?\],\s*\},/m;
const multiPageReplacement = `{
    slug: "multi-page-studio",
    name: "Classic Studio Multi-Page",
    description: "Complete 3-page studio website (Home, About, Contact) sharing a single CSS theme, navigation, and photo slots.",
    category: "multi-page",
    tags: ["multi-page", "agency", "portfolio", "studio", "clean"],
    icon: "Layers",
    isFeatured: true,
    fileCount: MULTI_PAGE_FILES.length,
    files: MULTI_PAGE_FILES,
  },`;

if (multiPageRegex.test(content)) {
  content = content.replace(multiPageRegex, multiPageReplacement);
  console.log("Replaced multi-page-studio in catalog.ts");
} else {
  console.log("Could not find multi-page-studio regex match in catalog.ts");
}

// Replace club-event definition
const clubEventRegex = /\{\s*slug:\s*"club-event"[\s\S]*?files:\s*\[[\s\S]*?\],\s*\},/m;
const clubEventReplacement = `{
    slug: "club-event",
    name: "Tech Summit & Club Landing",
    description: "Refined tech conference page featuring hero stage banner, keynote speaker spotlights, schedule table, and RSVP form.",
    category: "club",
    tags: ["club", "event", "summit", "rsvp", "schedule"],
    icon: "LayoutTemplate",
    isFeatured: false,
    fileCount: CLUB_EVENT_FILES.length,
    files: CLUB_EVENT_FILES,
  },`;

if (clubEventRegex.test(content)) {
  content = content.replace(clubEventRegex, clubEventReplacement);
  console.log("Replaced club-event in catalog.ts");
} else {
  console.log("Could not find club-event regex match in catalog.ts");
}

fs.writeFileSync(catalogPath, content, "utf-8");
console.log("catalog.ts updated successfully!");
