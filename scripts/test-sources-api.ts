import { db } from "../src/lib/db";

async function main() {
  console.log("=== VERIFYING SOURCES API (CRUD + AUTH) ===");

  const tejUser = await db.user.findUnique({
    where: { email: "tejhorw0001@gmail.com" },
  });
  if (!tejUser) throw new Error("User tejhorw0001@gmail.com not found");

  // Helper to authenticate
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

  // 1. Create a test document
  const testDoc = await db.document.create({
    data: {
      ownerId: tejUser.id,
      title: "Citations E2E Research Paper",
      contentJson: { type: "doc", content: [{ type: "paragraph" }] },
    },
  });
  console.log(`[PASS] Created test document: ${testDoc.id}`);

  try {
    // 2. Unauthenticated check -> 401
    const unauthRes = await fetch(`http://localhost:3000/api/docs/${testDoc.id}/sources`);
    if (unauthRes.status !== 401) throw new Error(`Expected 401 unauthenticated, got ${unauthRes.status}`);
    console.log("[PASS] Unauthenticated access blocked with 401");

    // 3. POST new source
    const createRes = await fetch(`http://localhost:3000/api/docs/${testDoc.id}/sources`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: tejCookies,
      },
      body: JSON.stringify({
        title: "Attention Is All You Need",
        authors: "Vaswani, A., Shazeer, N., Parmar, N.",
        url: "https://arxiv.org/abs/1706.03762",
        publisher: "NeurIPS",
        publishedDate: "2017",
        sourceType: "journal",
      }),
    });
    if (!createRes.ok) throw new Error(`Failed to create source: ${createRes.status}`);
    const { source: createdSource } = await createRes.json();
    if (!createdSource?.id || createdSource.title !== "Attention Is All You Need") {
      throw new Error("Created source missing valid fields");
    }
    console.log(`[PASS] Created source: "${createdSource.title}" (${createdSource.id})`);

    // 4. GET sources
    const listRes = await fetch(`http://localhost:3000/api/docs/${testDoc.id}/sources`, {
      headers: { Cookie: tejCookies },
    });
    if (!listRes.ok) throw new Error(`Failed to list sources: ${listRes.status}`);
    const { sources } = await listRes.json();
    if (sources.length !== 1 || sources[0].id !== createdSource.id) {
      throw new Error(`Expected 1 source, got ${sources.length}`);
    }
    console.log("[PASS] Listed sources matches created source");

    // 5. PATCH update source
    const patchRes = await fetch(
      `http://localhost:3000/api/docs/${testDoc.id}/sources/${createdSource.id}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Cookie: tejCookies,
        },
        body: JSON.stringify({
          title: "Attention Is All You Need (Updated Edition)",
          publishedDate: "2018",
        }),
      }
    );
    if (!patchRes.ok) throw new Error(`Failed to update source: ${patchRes.status}`);
    const { source: updatedSource } = await patchRes.json();
    if (updatedSource.title !== "Attention Is All You Need (Updated Edition)" || updatedSource.publishedDate !== "2018") {
      throw new Error("Source patch did not update fields correctly");
    }
    console.log("[PASS] Source updated via PATCH");

    // 6. DELETE source
    const delRes = await fetch(
      `http://localhost:3000/api/docs/${testDoc.id}/sources/${createdSource.id}`,
      {
        method: "DELETE",
        headers: { Cookie: tejCookies },
      }
    );
    if (!delRes.ok) throw new Error(`Failed to delete source: ${delRes.status}`);
    const { success } = await delRes.json();
    if (!success) throw new Error("Delete response missing success flag");
    console.log("[PASS] Source deleted via DELETE");

    // 7. Verify empty list after delete
    const emptyListRes = await fetch(`http://localhost:3000/api/docs/${testDoc.id}/sources`, {
      headers: { Cookie: tejCookies },
    });
    const { sources: remainingSources } = await emptyListRes.json();
    if (remainingSources.length !== 0) throw new Error("Source was not deleted from database");
    console.log("[PASS] Verified source deletion in list");

    console.log("=== ALL SOURCES API TESTS PASSED 100% ===");
  } finally {
    // Cleanup test document
    await db.document.delete({ where: { id: testDoc.id } }).catch(() => {});
  }
}

main().catch((err) => {
  console.error("API test failed:", err);
  process.exit(1);
});
