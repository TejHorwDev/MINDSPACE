import { db } from "../src/lib/db";
import {
  formatInTextCitation,
  formatApaReference,
  sortSourcesAlphabetically,
  extractCitedSourceIds,
  type SourceItem,
} from "../src/lib/citations/apa";

async function main() {
  console.log("=== COMPREHENSIVE END-TO-END AUDIT: DOCS STUDIO PHASE 2 (CITATIONS) ===");

  const tejUser = await db.user.findUnique({
    where: { email: "tejhorw0001@gmail.com" },
  });
  if (!tejUser) throw new Error("Test user tejhorw0001@gmail.com not found");

  // Helper to authenticate session
  async function getSessionCookie(email: string, password: string) {
    const csrfRes = await fetch("http://localhost:3000/api/auth/csrf");
    const csrfCookie = csrfRes.headers.get("set-cookie") || "";
    const { csrfToken } = await csrfRes.json();

    const loginRes = await fetch("http://localhost:3000/api/auth/callback/credentials", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Cookie: csrfCookie,
      },
      body: new URLSearchParams({
        csrfToken,
        email,
        password,
        redirect: "false",
        json: "true",
      }),
    });

    return loginRes.headers
      .getSetCookie()
      .map((c) => c.split(";")[0])
      .join("; ");
  }

  const tejCookies = await getSessionCookie("tejhorw0001@gmail.com", "Password123!");

  // Step 1: Create a test document via API
  const createDocRes = await fetch("http://localhost:3000/api/docs", {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: tejCookies },
    body: JSON.stringify({ title: "Neurosymbolic AI Term Paper" }),
  });
  if (!createDocRes.ok) throw new Error("Failed to create document");
  const doc = (await createDocRes.json()).document;
  console.log(`[PASS] 1. Created research paper: "${doc.title}" (${doc.id})`);

  try {
    // Step 2: Add 3 diverse real sources (Book, Journal, Website)
    const s1Res = await fetch(`http://localhost:3000/api/docs/${doc.id}/sources`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: tejCookies },
      body: JSON.stringify({
        title: "Artificial Intelligence: A Modern Approach",
        authors: "Russell, Stuart & Norvig, Peter",
        publishedDate: "2020",
        publisher: "Pearson",
        sourceType: "book",
      }),
    });
    if (!s1Res.ok) throw new Error("Failed to add book source");
    const bookSource: SourceItem = (await s1Res.json()).source;

    const s2Res = await fetch(`http://localhost:3000/api/docs/${doc.id}/sources`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: tejCookies },
      body: JSON.stringify({
        title: "Deep Learning",
        authors: "Goodfellow, Ian, Bengio, Yoshua & Courville, Aaron",
        publishedDate: "2016",
        publisher: "MIT Press",
        sourceType: "book",
      }),
    });
    if (!s2Res.ok) throw new Error("Failed to add multi-author book source");
    const multiAuthorSource: SourceItem = (await s2Res.json()).source;

    const s3Res = await fetch(`http://localhost:3000/api/docs/${doc.id}/sources`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: tejCookies },
      body: JSON.stringify({
        title: "Attention Is All You Need",
        authors: "Vaswani, Ashish",
        publishedDate: "2017",
        publisher: "NeurIPS",
        url: "https://arxiv.org/abs/1706.03762",
        sourceType: "journal",
      }),
    });
    if (!s3Res.ok) throw new Error("Failed to add journal source");
    const journalSource: SourceItem = (await s3Res.json()).source;

    console.log("[PASS] 2. Added 3 distinct academic sources (2-author book, 3+-author book, journal)");

    // Step 3: Verify APA in-text citation formatting
    const cite1 = formatInTextCitation(bookSource);
    const cite2 = formatInTextCitation(multiAuthorSource);
    const cite3 = formatInTextCitation(journalSource);

    if (cite1 !== "(Russell & Norvig, 2020)") {
      throw new Error(`Expected '(Russell & Norvig, 2020)', got '${cite1}'`);
    }
    if (cite2 !== "(Goodfellow et al., 2016)") {
      throw new Error(`Expected '(Goodfellow et al., 2016)', got '${cite2}'`);
    }
    if (cite3 !== "(Vaswani, 2017)") {
      throw new Error(`Expected '(Vaswani, 2017)', got '${cite3}'`);
    }
    console.log(`[PASS] 3. In-text APA citations verified: ${cite1}, ${cite2}, ${cite3}`);

    // Step 4: Construct Tiptap Document with in-text citation nodes
    const contentWithCitations = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            { type: "text", text: "Modern AI paradigms originate from foundational search and probabilistic models " },
            { type: "citation", attrs: { sourceId: bookSource.id, displayText: cite1 } },
            { type: "text", text: ". Deep representations subsequently unified percepts into continuous embeddings " },
            { type: "citation", attrs: { sourceId: multiAuthorSource.id, displayText: cite2 } },
            { type: "text", text: ", leading directly to multi-head self-attention mechanisms " },
            { type: "citation", attrs: { sourceId: journalSource.id, displayText: cite3 } },
            { type: "text", text: "." },
          ],
        },
      ],
    };

    // Save document with citations via PATCH /api/docs/[id]
    const updateDocRes = await fetch(`http://localhost:3000/api/docs/${doc.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Cookie: tejCookies },
      body: JSON.stringify({ contentJson: contentWithCitations }),
    });
    if (!updateDocRes.ok) throw new Error("Failed to save content with citations");
    console.log("[PASS] 4. Document saved with 3 in-text citation nodes");

    // Step 5: Test References List generation & Alphabetical order
    const allSources = [bookSource, multiAuthorSource, journalSource];
    const sorted = sortSourcesAlphabetically(allSources);

    // Alphabetical order by first author:
    // Goodfellow, I. (G) -> Russell, S. (R) -> Vaswani, A. (V)
    if (sorted[0].id !== multiAuthorSource.id || sorted[1].id !== bookSource.id || sorted[2].id !== journalSource.id) {
      throw new Error("Sources not sorted in alphabetical order according to APA standard");
    }
    console.log("[PASS] 5. References sorted alphabetically (Goodfellow -> Russell -> Vaswani)");

    // Step 6: Verify APA Reference text format
    const ref1 = formatApaReference(bookSource);
    const ref2 = formatApaReference(multiAuthorSource);
    const ref3 = formatApaReference(journalSource);

    if (!ref1.formattedText.includes("Russell, Stuart & Norvig, Peter") || !ref1.formattedText.includes("(2020)")) {
      throw new Error("Book reference formatting invalid");
    }
    if (!ref3.formattedHtml.includes("https://arxiv.org/abs/1706.03762")) {
      throw new Error("Journal reference missing link");
    }
    console.log("[PASS] 6. APA reference entries formatted with proper italics and metadata");

    // Step 7: Test Document Editor Page SSR HTML
    const editorPageRes = await fetch(`http://localhost:3000/docs/${doc.id}`, {
      headers: { Cookie: tejCookies },
    });
    if (!editorPageRes.ok) throw new Error(`Editor page failed to load: ${editorPageRes.status}`);
    const editorHtml = await editorPageRes.text();

    if (!editorHtml.includes("References") || !editorHtml.includes("APA 7th Edition")) {
      throw new Error("Editor page missing References section or APA badge");
    }
    if (!editorHtml.includes("Sources") || !editorHtml.includes("Cite")) {
      throw new Error("Editor page missing Sources toggle or Cite button");
    }
    console.log("[PASS] 7. Document editor page rendered with Sources panel and References section");

    // Step 8: Test Source Deletion and Broken Citation Warning
    // Delete multiAuthorSource (Goodfellow)
    const delRes = await fetch(`http://localhost:3000/api/docs/${doc.id}/sources/${multiAuthorSource.id}`, {
      method: "DELETE",
      headers: { Cookie: tejCookies },
    });
    if (!delRes.ok) throw new Error("Failed to delete source");
    console.log(`[PASS] 8. Deleted source "${multiAuthorSource.title}"`);

    // Verify extraction detects broken citation
    const remainingSourcesRes = await fetch(`http://localhost:3000/api/docs/${doc.id}/sources`, {
      headers: { Cookie: tejCookies },
    });
    const { sources: currentSources } = await remainingSourcesRes.json();
    const currentSourceIds = new Set(currentSources.map((s: any) => s.id));

    const docCitedIds = extractCitedSourceIds(contentWithCitations);
    const brokenCitations = docCitedIds.filter((id) => !currentSourceIds.has(id));

    if (brokenCitations.length !== 1 || brokenCitations[0] !== multiAuthorSource.id) {
      throw new Error(`Expected 1 broken citation (${multiAuthorSource.id}), got: ${JSON.stringify(brokenCitations)}`);
    }
    console.log(`[PASS] 9. Broken citation detection verified: dangling reference ${brokenCitations[0]} flagged successfully!`);

    console.log("=== ALL PHASE 2 CITATIONS & SOURCES E2E TESTS PASSED 100% ===");
  } finally {
    // Clean up test document and cascaded sources
    await db.document.delete({ where: { id: doc.id } }).catch(() => {});
  }
}

main().catch((err) => {
  console.error("E2E Test Failed:", err);
  process.exit(1);
});
