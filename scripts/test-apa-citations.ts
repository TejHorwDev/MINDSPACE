import {
  formatInTextCitation,
  formatApaReference,
  sortSourcesAlphabetically,
  extractCitedSourceIds,
  countCitationsBySource,
  type SourceItem,
} from "../src/lib/citations/apa";

function assertEqual(actual: any, expected: any, label: string) {
  if (actual !== expected) {
    console.error(`FAIL [${label}]: expected "${expected}", got "${actual}"`);
    process.exit(1);
  }
  console.log(`PASS [${label}]: "${actual}"`);
}

console.log("=== RUNNING APA CITATION UNIT TESTS ===");

// 1. In-text citation with 1 author
const s1: SourceItem = {
  id: "src-1",
  documentId: "doc-1",
  title: "Artificial Intelligence in Education",
  authors: "Smith, John",
  publishedDate: "2023-04-15",
  sourceType: "journal",
};
assertEqual(formatInTextCitation(s1), "(Smith, 2023)", "Single author in-text");

// 2. In-text citation with 2 authors
const s2: SourceItem = {
  id: "src-2",
  documentId: "doc-1",
  title: "Machine Learning Principles",
  authors: "Smith, J. & Doe, Jane",
  publishedDate: "2021",
  sourceType: "book",
};
assertEqual(formatInTextCitation(s2), "(Smith & Doe, 2021)", "Two authors in-text");

// 3. In-text citation with 3+ authors
const s3: SourceItem = {
  id: "src-3",
  documentId: "doc-1",
  title: "Deep Learning Foundations",
  authors: "Goodfellow, Ian, Bengio, Yoshua & Courville, Aaron",
  publishedDate: "2016",
  sourceType: "book",
};
assertEqual(formatInTextCitation(s3), "(Goodfellow et al., 2016)", "3+ authors in-text (et al.)");

// 4. In-text citation with no author
const s4: SourceItem = {
  id: "src-4",
  documentId: "doc-1",
  title: "Global Climate Metrics",
  authors: null,
  publishedDate: "2024",
  sourceType: "website",
};
assertEqual(formatInTextCitation(s4), '("Global Climate Metrics", 2024)', "No author title in-text");

// 5. In-text citation with no date (n.d.)
const s5: SourceItem = {
  id: "src-5",
  documentId: "doc-1",
  title: "Undated Manuscript",
  authors: "Aristotle",
  publishedDate: null,
  sourceType: "book",
};
assertEqual(formatInTextCitation(s5), "(Aristotle, n.d.)", "No date fallback (n.d.)");

// 6. Test full APA Reference Entry formatting
const refBook = formatApaReference({
  id: "b1",
  documentId: "doc-1",
  title: "Design Patterns",
  authors: "Gamma, E., Helm, R., Johnson, R., & Vlissides, J.",
  publishedDate: "1994",
  publisher: "Addison-Wesley",
  sourceType: "book",
});
assertEqual(
  refBook.formattedText.includes("(1994)") &&
    refBook.formattedText.includes("Design Patterns.") &&
    refBook.formattedText.includes("Addison-Wesley"),
  true,
  "APA Book Reference contains author, year, title, publisher"
);

// 7. Test Alphabetical Sorting
const unsorted: SourceItem[] = [
  { id: "z", documentId: "d", title: "Zebra Biology", authors: "Zack, A.", sourceType: "book" },
  { id: "a", documentId: "d", title: "Apple Cultivation", authors: "Adams, B.", sourceType: "book" },
  { id: "m", documentId: "d", title: "Maritime History", authors: "Miller, C.", sourceType: "book" },
];
const sorted = sortSourcesAlphabetically(unsorted);
assertEqual(sorted[0].id, "a", "First alphabetically");
assertEqual(sorted[1].id, "m", "Second alphabetically");
assertEqual(sorted[2].id, "z", "Third alphabetically");

// 8. Test Tiptap JSON Citation Extraction
const sampleDocJson = {
  type: "doc",
  content: [
    {
      type: "paragraph",
      content: [
        { type: "text", text: "As stated in recent studies " },
        { type: "citation", attrs: { sourceId: "src-1", displayText: "(Smith, 2023)" } },
        { type: "text", text: ", learning models have evolved significantly " },
        { type: "citation", attrs: { sourceId: "src-2", displayText: "(Smith & Doe, 2021)" } },
        { type: "text", text: ". Furthermore, earlier work " },
        { type: "citation", attrs: { sourceId: "src-1", displayText: "(Smith, 2023)" } },
        { type: "text", text: " reinforces this." },
      ],
    },
  ],
};
const citedIds = extractCitedSourceIds(sampleDocJson);
assertEqual(citedIds.length, 2, "2 unique cited source IDs extracted");
assertEqual(citedIds.includes("src-1") && citedIds.includes("src-2"), true, "src-1 and src-2 present");

const counts = countCitationsBySource(sampleDocJson);
assertEqual(counts["src-1"], 2, "src-1 cited 2 times");
assertEqual(counts["src-2"], 1, "src-2 cited 1 time");

console.log("=== ALL APA UNIT TESTS PASSED 100% ===");
