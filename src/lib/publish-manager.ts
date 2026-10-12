import fs from "fs";
import path from "path";
import crypto from "crypto";
import { db } from "@/lib/db";
import { bundleProjectFiles, RUNTIME_STORAGE_GUARD_SCRIPT } from "@/lib/preview-bundler";
import { stripMindspaceIds, repairMalformedInlineStyles } from "@/lib/visual-edit-engine";
import { escapeHtml } from "@/lib/sanitize";

export const PUBLISH_DURATION_MS = 30 * 60 * 1000; // 30 minutes in milliseconds

/**
 * Returns the local disk path where static files for a given public slug are stored.
 * Example: <cwd>/public/p/<slug>
 */
export function getPublishedFolderPath(publicSlug: string): string {
  return path.join(process.cwd(), "public", "p", publicSlug);
}

/**
 * Generates a clean, URL-friendly unique slug from project name.
 * Example: "My Portfolio" -> "my-portfolio-7f3a"
 */
export function generateSlug(projectName: string): string {
  const base = projectName
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 24);

  const cleanBase = base || "project";
  const randomSuffix = crypto.randomBytes(3).toString("hex");
  return `${cleanBase}-${randomSuffix}`;
}

/**
 * Prepares an HTML document for published serving:
 * - Injects <base href="/p/${publicSlug}/"> so relative paths like href="style.css" resolve to /p/${publicSlug}/style.css
 * - Rewrites root-relative links (e.g. href="/style.css" -> href="./style.css") so they don't break on the domain root
 * - Injects Runtime Storage Guard polyfill so localStorage & sessionStorage work without SecurityError
/**
 * Prepares an HTML document for published serving:
 * - Injects <base href="/p/${publicSlug}/"> so relative paths like href="style.css" resolve to /p/${publicSlug}/style.css
 * - Rewrites root-relative links (e.g. href="/style.css" -> href="./style.css") so they don't break on the domain root
 * - Injects Runtime Storage Guard polyfill so localStorage & sessionStorage work without SecurityError
 * - Injects floating Report/Flag button & dialog
 */
export function preparePublishedHtml(rawHtml: string, publicSlug: string): string {
  let html = repairMalformedInlineStyles(stripMindspaceIds(rawHtml));

  // 1. Rewrite root-relative links like href="/style.css" or src="/script.js" to relative "./style.css"
  html = html.replace(/\b(href|src)\s*=\s*(["'])\/([^"'/][^"']*)\2/gi, (match, attr, quote, subpath) => {
    if (
      subpath.startsWith("p/") ||
      subpath.startsWith("api/") ||
      subpath.startsWith("_next/") ||
      subpath.startsWith("http://") ||
      subpath.startsWith("https://")
    ) {
      return match;
    }
    return `${attr}=${quote}./${subpath}${quote}`;
  });

  // 2. Base tag & storage guard
  const baseTag = `<base href="/p/${publicSlug}/">`;
  const storageGuard = RUNTIME_STORAGE_GUARD_SCRIPT;

  const hasBase = html.includes("<base ");
  const injection = `${hasBase ? "" : baseTag}\n${storageGuard}`;

  if (html.includes("<head>")) {
    html = html.replace("<head>", `<head>\n  ${injection}`);
  } else if (html.includes("<!DOCTYPE html>") || html.includes("<html")) {
    html = `<head>\n  ${injection}\n</head>\n${html}`;
  } else {
    html = `<head>\n  ${injection}\n</head>\n${html}`;
  }

  // 3. Inject Report/Flag button widget
  const reportWidget = renderReportWidgetHtml(publicSlug);
  if (html.includes("</body>")) {
    html = html.replace("</body>", `${reportWidget}\n</body>`);
  } else {
    html = `${html}\n${reportWidget}`;
  }

  return html;
}

function renderReportWidgetHtml(publicSlug: string): string {
  const safeSlug = escapeHtml(publicSlug);
  return `
<!-- MINDSPACE Report Site Widget -->
<div id="mindspace-report-root" style="font-family:system-ui,-apple-system,BlinkMacSystemFont,sans-serif;">
  <button id="mindspace-report-btn" type="button" aria-label="Report this site" style="position:fixed;bottom:10px;right:12px;z-index:2147483640;background:transparent;color:rgba(148,163,184,0.65);border:none;font-size:11px;font-weight:400;cursor:pointer;display:inline-flex;align-items:center;gap:4px;text-decoration:none;opacity:0.75;padding:4px 6px;transition:opacity 0.2s, color 0.2s;" onmouseover="this.style.opacity='1';this.style.color='#94a3b8';" onmouseout="this.style.opacity='0.75';this.style.color='rgba(148,163,184,0.65)';">
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="opacity:0.7;"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path><line x1="4" y1="22" x2="4" y2="15"></line></svg>
    <span style="text-decoration:underline;text-underline-offset:2px;">Report site</span>
  </button>

  <div id="mindspace-report-modal" style="display:none;position:fixed;inset:0;z-index:2147483647;background:rgba(0,0,0,0.75);backdrop-filter:blur(6px);align-items:center;justify-content:center;padding:16px;box-sizing:border-box;">
    <div style="background:#18181b;border:1px solid rgba(255,255,255,0.1);border-radius:14px;max-width:400px;width:100%;color:#fafafa;padding:24px;box-shadow:0 25px 50px -12px rgba(0,0,0,0.8);position:relative;">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
        <div style="display:flex;align-items:center;gap:8px;">
          <div style="width:26px;height:26px;border-radius:6px;background:rgba(239,68,68,0.12);display:flex;align-items:center;justify-content:center;color:#ef4444;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path><line x1="4" y1="22" x2="4" y2="15"></line></svg>
          </div>
          <h3 style="margin:0;font-size:15px;font-weight:600;letter-spacing:-0.01em;">Report site</h3>
        </div>
        <button id="mindspace-report-close" type="button" style="background:none;border:none;color:#a1a1aa;font-size:20px;cursor:pointer;padding:4px;line-height:1;">&times;</button>
      </div>

      <p style="margin:0 0 16px 0;font-size:12px;color:#a1a1aa;line-height:1.5;">
        Help keep the MINDSPACE community safe. Flag inappropriate content, copyright infringement, or security concerns.
      </p>

      <form id="mindspace-report-form" style="display:flex;flex-direction:column;gap:12px;">
        <div>
          <label style="display:block;font-size:11px;font-weight:500;text-transform:uppercase;letter-spacing:0.04em;color:#a1a1aa;margin-bottom:6px;">Reason</label>
          <select id="mindspace-report-reason" required style="width:100%;background:#09090b;border:1px solid rgba(255,255,255,0.15);border-radius:8px;padding:9px 12px;color:#fafafa;font-size:13px;outline:none;">
            <option value="Inappropriate Content">Inappropriate / Harmful Content</option>
            <option value="Malware or Phishing">Malware or Phishing Attempt</option>
            <option value="Copyright Infringement">Copyright or Plagiarism</option>
            <option value="Harassment or Abuse">Harassment, Hate Speech, or Abuse</option>
            <option value="Other Policy Violation">Other Policy Violation</option>
          </select>
        </div>

        <div>
          <label style="display:block;font-size:11px;font-weight:500;text-transform:uppercase;letter-spacing:0.04em;color:#a1a1aa;margin-bottom:6px;">Details (Optional)</label>
          <textarea id="mindspace-report-details" rows="3" placeholder="Provide extra context to assist moderators..." style="width:100%;box-sizing:border-box;background:#09090b;border:1px solid rgba(255,255,255,0.15);border-radius:8px;padding:9px 12px;color:#fafafa;font-size:13px;outline:none;resize:vertical;"></textarea>
        </div>

        <div id="mindspace-report-msg" style="display:none;font-size:12px;padding:8px 12px;border-radius:8px;"></div>

        <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:6px;">
          <button id="mindspace-report-cancel" type="button" style="background:transparent;color:#a1a1aa;border:1px solid rgba(255,255,255,0.12);border-radius:8px;padding:7px 14px;font-size:12px;font-weight:500;cursor:pointer;">Cancel</button>
          <button id="mindspace-report-submit" type="submit" style="background:#ef4444;color:#ffffff;border:none;border-radius:8px;padding:7px 16px;font-size:12px;font-weight:600;cursor:pointer;">Submit Report</button>
        </div>
      </form>
    </div>
  </div>

  <script>
    (function() {
      var btn = document.getElementById("mindspace-report-btn");
      var modal = document.getElementById("mindspace-report-modal");
      var closeBtn = document.getElementById("mindspace-report-close");
      var cancelBtn = document.getElementById("mindspace-report-cancel");
      var form = document.getElementById("mindspace-report-form");
      var submitBtn = document.getElementById("mindspace-report-submit");
      var msgBox = document.getElementById("mindspace-report-msg");

      if (!btn || !modal) return;

      btn.addEventListener("click", function() {
        modal.style.display = "flex";
      });

      function closeModal() {
        modal.style.display = "none";
        if (msgBox) msgBox.style.display = "none";
      }

      if (closeBtn) closeBtn.addEventListener("click", closeModal);
      if (cancelBtn) cancelBtn.addEventListener("click", closeModal);
      modal.addEventListener("click", function(e) {
        if (e.target === modal) closeModal();
      });

      if (form) {
        form.addEventListener("submit", function(e) {
          e.preventDefault();
          var reason = document.getElementById("mindspace-report-reason").value;
          var details = document.getElementById("mindspace-report-details").value;

          submitBtn.disabled = true;
          submitBtn.innerText = "Submitting...";

          fetch("/api/reports", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ slug: "${safeSlug}", reason: reason, details: details })
          })
          .then(function(res) { return res.json(); })
          .then(function(data) {
            submitBtn.disabled = false;
            submitBtn.innerText = "Submit Report";
            if (data.error) {
              msgBox.style.display = "block";
              msgBox.style.background = "rgba(239,68,68,0.12)";
              msgBox.style.color = "#f87171";
              msgBox.style.border = "1px solid rgba(239,68,68,0.3)";
              msgBox.innerText = data.error;
            } else {
              msgBox.style.display = "block";
              msgBox.style.background = "rgba(16,185,129,0.12)";
              msgBox.style.color = "#34d399";
              msgBox.style.border = "1px solid rgba(16,185,129,0.3)";
              msgBox.innerText = "Report submitted successfully. Thank you.";
              setTimeout(closeModal, 1800);
            }
          })
          .catch(function(err) {
            submitBtn.disabled = false;
            submitBtn.innerText = "Submit Report";
            msgBox.style.display = "block";
            msgBox.style.background = "rgba(239,68,68,0.12)";
            msgBox.style.color = "#f87171";
            msgBox.innerText = "Failed to submit report. Please try again.";
          });
        });
      }
    })();
  </script>
</div>
`;
}

/**
 * Writes static HTML/CSS/JS and image asset files for a published project to public/p/<slug>.
 */
export async function writeStaticProjectFiles(
  publicSlug: string,
  projectName: string,
  files: { path: string; content: string }[],
  projectId?: string
): Promise<string> {
  const outputDir = getPublishedFolderPath(publicSlug);

  // Clean existing folder if it exists (e.g. on republish)
  if (fs.existsSync(outputDir)) {
    fs.rmSync(outputDir, { recursive: true, force: true });
  }

  // Create target directory
  fs.mkdirSync(outputDir, { recursive: true });

  // Write all original project files (preserving relative folder structure)
  for (const file of files) {
    const filePath = path.join(outputDir, file.path);
    const fileDir = path.dirname(filePath);
    if (!fs.existsSync(fileDir)) {
      fs.mkdirSync(fileDir, { recursive: true });
    }

    if (
      typeof file.content === "string" &&
      file.content.startsWith("data:") &&
      file.content.includes(";base64,")
    ) {
      // Decode base64 image data URL directly into raw binary image file on disk
      const base64Data = file.content.split(";base64,")[1];
      fs.writeFileSync(filePath, Buffer.from(base64Data, "base64"));
    } else {
      const isHtml = file.path.endsWith(".html") || file.path.endsWith(".htm");
      const contentToWrite = isHtml
        ? preparePublishedHtml(file.content, publicSlug)
        : file.content;

      fs.writeFileSync(filePath, contentToWrite, "utf-8");
    }
  }

  // Copy uploaded image assets if projectId is provided
  if (projectId) {
    try {
      const assets = await db.projectAsset.findMany({
        where: { projectId },
      });

      for (const asset of assets) {
        if (fs.existsSync(asset.storedPath)) {
          // 1. Copy to root <filename> (e.g. public/p/<slug>/photo.png)
          const rootDest = path.join(outputDir, asset.filename);
          fs.copyFileSync(asset.storedPath, rootDest);

          // 2. Copy to assets/<filename> (e.g. public/p/<slug>/assets/photo.png)
          const assetDest = path.join(outputDir, "assets", asset.filename);
          const assetDir = path.dirname(assetDest);
          if (!fs.existsSync(assetDir)) {
            fs.mkdirSync(assetDir, { recursive: true });
          }
          fs.copyFileSync(asset.storedPath, assetDest);

          // Copy to api/projects/<projectId>/assets/<assetId> for path parity
          const apiDest = path.join(outputDir, "api", "projects", projectId, "assets", asset.id);
          const apiDir = path.dirname(apiDest);
          if (!fs.existsSync(apiDir)) {
            fs.mkdirSync(apiDir, { recursive: true });
          }
          fs.copyFileSync(asset.storedPath, apiDest);
        }
      }
    } catch (err) {
      console.warn("[Publish Manager] Error copying project assets:", err);
    }
  }

  // Ensure common CSS and JS aliases exist on disk for foolproof resolution
  const basenames = files.map((f) => path.basename(f.path));
  if (basenames.includes("style.css") && !basenames.includes("styles.css")) {
    const orig = files.find((f) => path.basename(f.path) === "style.css");
    if (orig) fs.writeFileSync(path.join(outputDir, "styles.css"), orig.content, "utf-8");
  } else if (basenames.includes("styles.css") && !basenames.includes("style.css")) {
    const orig = files.find((f) => path.basename(f.path) === "styles.css");
    if (orig) fs.writeFileSync(path.join(outputDir, "style.css"), orig.content, "utf-8");
  }

  if (basenames.includes("script.js") && !basenames.includes("main.js")) {
    const orig = files.find((f) => path.basename(f.path) === "script.js");
    if (orig) fs.writeFileSync(path.join(outputDir, "main.js"), orig.content, "utf-8");
  }

  // If no index.html exists, create a default welcoming index.html
  const indexPath = path.join(outputDir, "index.html");
  if (!fs.existsSync(indexPath)) {
    const defaultIndex = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(projectName)}</title>
  <style>
    body {
      margin: 0; min-height: 100vh; display: flex; flex-direction: column;
      align-items: center; justify-content: center; background: #0a0e17; color: #f1f5f9;
      font-family: system-ui, -apple-system, sans-serif; text-align: center; padding: 2rem;
    }
    h1 { font-size: 2rem; margin-bottom: 0.5rem; }
    p { color: #94a3b8; max-width: 420px; line-height: 1.6; }
    .badge { display: inline-block; padding: 0.35rem 0.85rem; background: #0f766e; color: #5eead4; border-radius: 9999px; font-size: 0.8rem; font-weight: 600; margin-bottom: 1rem; }
  </style>
</head>
<body>
  <div class="badge">MINDSPACE Published Preview</div>
  <h1>${escapeHtml(projectName)}</h1>
  <p>This project is live for testing on MINDSPACE.</p>
</body>
</html>`;
    fs.writeFileSync(indexPath, preparePublishedHtml(defaultIndex, publicSlug), "utf-8");
  }

  return outputDir;
}

/**
 * Deletes published static files from disk.
 */
export function deletePublishedFiles(publicSlug: string): void {
  try {
    const folder = getPublishedFolderPath(publicSlug);
    if (fs.existsSync(folder)) {
      fs.rmSync(folder, { recursive: true, force: true });
    }
  } catch (err) {
    console.error(`Failed to delete static files for slug ${publicSlug}:`, err);
  }
}

/**
 * Publishes or republishes a project:
 * - Generates or retains publicSlug
 * - Syncs latest client files if provided
 * - Writes static files to public/p/<slug>
 * - Sets isPublished = true, publishedAt = now
 * - Records activity
 */
export async function publishProject(
  projectId: string,
  userId: string,
  clientFiles?: { path: string; content: string }[]
) {
  // If client passed their latest in-memory files, persist them first
  if (clientFiles && Array.isArray(clientFiles) && clientFiles.length > 0) {
    for (const f of clientFiles) {
      if (!f.path) continue;
      await db.projectFile.upsert({
        where: {
          projectId_path: {
            projectId,
            path: f.path,
          },
        },
        update: {
          content: f.content,
        },
        create: {
          projectId,
          path: f.path,
          content: f.content,
        },
      });
    }
  }

  const project = await db.project.findFirst({
    where: { id: projectId, ownerId: userId },
    include: { files: true },
  });

  if (!project) {
    throw new Error("Project not found or unauthorized.");
  }

  // Generate unique slug if not present
  let publicSlug = project.publicSlug;
  if (!publicSlug) {
    publicSlug = generateSlug(project.name);
    // Ensure uniqueness
    const existing = await db.project.findUnique({ where: { publicSlug } });
    if (existing && existing.id !== project.id) {
      publicSlug = generateSlug(project.name);
    }
  }

  // Write static files to folder (including image assets)
  await writeStaticProjectFiles(publicSlug, project.name, project.files, project.id);

  const now = new Date();
  const expiresAt = new Date(now.getTime() + PUBLISH_DURATION_MS);

  // Update project in DB
  const updated = await db.project.update({
    where: { id: project.id },
    data: {
      isPublished: true,
      publicSlug,
      publishedAt: now,
    },
    select: {
      id: true,
      name: true,
      isPublished: true,
      publicSlug: true,
      publishedAt: true,
    },
  });

  // Record activity
  await db.projectActivity.create({
    data: {
      projectId: project.id,
      action: "published",
      detail: publicSlug,
    },
  });

  return {
    project: updated,
    publicSlug,
    publishedAt: now,
    expiresAt,
    publicUrl: `/p/${publicSlug}`,
  };
}

/**
 * Background cleanup job:
 * Finds projects published more than 30 minutes ago,
 * deletes their static files, and sets isPublished = false.
 */
export async function cleanupExpiredProjects(): Promise<number> {
  const expiryThreshold = new Date(Date.now() - PUBLISH_DURATION_MS);

  const expiredProjects = await db.project.findMany({
    where: {
      isPublished: true,
      publishedAt: {
        lte: expiryThreshold,
      },
    },
    select: {
      id: true,
      name: true,
      publicSlug: true,
      publishedAt: true,
    },
  });

  if (expiredProjects.length === 0) {
    return 0;
  }

  for (const p of expiredProjects) {
    if (p.publicSlug) {
      deletePublishedFiles(p.publicSlug);
    }

    await db.project.update({
      where: { id: p.id },
      data: { isPublished: false },
    });

    console.log(
      `[MINDSPACE Expiry] Cleaned up expired preview for project "${p.name}" (${p.publicSlug})`
    );
  }

  return expiredProjects.length;
}

/**
 * Singleton background cron interval: runs cleanup every 60 seconds.
 */
declare global {
  var __mindspaceCleanupTimer: NodeJS.Timeout | undefined;
}

export function ensureCleanupCronRunning(): void {
  if (global.__mindspaceCleanupTimer) return;

  // Run cleanup once immediately
  cleanupExpiredProjects().catch(console.error);

  // Set recurring 60s timer
  global.__mindspaceCleanupTimer = setInterval(() => {
    cleanupExpiredProjects().catch(console.error);
  }, 60 * 1000);

  // Allow process to exit cleanly without keeping event loop artificially alive
  if (global.__mindspaceCleanupTimer.unref) {
    global.__mindspaceCleanupTimer.unref();
  }
}

// Auto-start cleanup cron on import
ensureCleanupCronRunning();

/**
 * Returns HTML for the clean "This preview has expired" page.
 */
export function renderExpiredHtml(projectName?: string, slug?: string): string {
  const title = projectName ? `"${projectName}" Preview Expired` : "Preview Expired";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title} · MINDSPACE</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background: #09090b;
      color: #fafafa;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      padding: 1.5rem;
      text-align: center;
    }
    .card {
      max-width: 440px;
      width: 100%;
      background: #121215;
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 0.75rem;
      padding: 2.25rem 2rem;
      box-shadow: 0 20px 40px -15px rgba(0, 0, 0, 0.7);
    }
    .brand-mark {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.85rem;
      font-weight: 700;
      letter-spacing: -0.01em;
      color: #e4e4e7;
      margin-bottom: 1.5rem;
    }
    .brand-icon {
      width: 22px;
      height: 22px;
      border-radius: 6px;
      background: #fafafa;
      color: #09090b;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 11px;
      font-weight: 800;
    }
    .status-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      padding: 0.25rem 0.65rem;
      background: rgba(245, 158, 11, 0.1);
      color: #f59e0b;
      border: 1px solid rgba(245, 158, 11, 0.2);
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 500;
      margin-bottom: 1rem;
    }
    .status-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #f59e0b;
    }
    h1 {
      font-size: 1.4rem;
      font-weight: 600;
      letter-spacing: -0.02em;
      margin-bottom: 0.5rem;
      color: #fafafa;
    }
    p {
      color: #a1a1aa;
      font-size: 0.9rem;
      line-height: 1.55;
      margin-bottom: 1.5rem;
    }
    .project-pill {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.4rem 0.85rem;
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 0.5rem;
      font-size: 0.8rem;
      color: #d4d4d8;
      margin-bottom: 1.75rem;
    }
    .btn-group {
      display: flex;
      flex-direction: column;
      gap: 0.6rem;
    }
    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 0.65rem 1.25rem;
      border-radius: 0.5rem;
      font-size: 0.875rem;
      font-weight: 500;
      text-decoration: none;
      transition: all 0.15s ease;
    }
    .btn-primary {
      background: #fafafa;
      color: #09090b;
    }
    .btn-primary:hover {
      background: #f4f4f5;
      transform: translateY(-1px);
    }
    .btn-secondary {
      background: transparent;
      color: #e4e4e7;
      border: 1px solid rgba(255, 255, 255, 0.12);
    }
    .btn-secondary:hover {
      background: rgba(255, 255, 255, 0.05);
      color: #ffffff;
    }
    .footer {
      margin-top: 1.75rem;
      font-size: 0.75rem;
      color: #71717a;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="brand-mark">
      <div class="brand-icon">M</div>
      <span>MINDSPACE</span>
    </div>

    <div>
      <div class="status-badge">
        <span class="status-dot"></span>
        <span>Preview Expired</span>
      </div>
    </div>

    <h1>This preview has expired</h1>
    <p>
      Published test previews stay active for 30 minutes. The project author can republish anytime from their editor to generate a fresh preview link.
    </p>

    ${
      projectName
        ? `<div class="project-pill">
            <span>Project:</span>
            <strong>${escapeHtml(projectName)}</strong>
          </div>`
        : ""
    }

    <div class="btn-group">
      <a href="/" class="btn btn-primary">Return to MINDSPACE</a>
      <a href="/login" class="btn btn-secondary">Log in to Republish</a>
    </div>

    <div class="footer">
      MINDSPACE — The student website builder
    </div>
  </div>
</body>
</html>`;
}

/**
 * Returns HTML for project not found.
 */
export function renderNotFoundHtml(slug?: string): string {
  const safeSlug = escapeHtml(slug || "");
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Preview Not Found · MINDSPACE</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background: #09090b;
      color: #fafafa;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      padding: 1.5rem;
      text-align: center;
    }
    .card {
      max-width: 440px;
      width: 100%;
      background: #121215;
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 0.75rem;
      padding: 2.25rem 2rem;
      box-shadow: 0 20px 40px -15px rgba(0, 0, 0, 0.7);
    }
    .brand-mark {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.85rem;
      font-weight: 700;
      letter-spacing: -0.01em;
      color: #e4e4e7;
      margin-bottom: 1.5rem;
    }
    .brand-icon {
      width: 22px;
      height: 22px;
      border-radius: 6px;
      background: #fafafa;
      color: #09090b;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 11px;
      font-weight: 800;
    }
    h1 {
      font-size: 1.4rem;
      font-weight: 600;
      letter-spacing: -0.02em;
      margin-bottom: 0.5rem;
      color: #fafafa;
    }
    p {
      color: #a1a1aa;
      font-size: 0.9rem;
      line-height: 1.55;
      margin-bottom: 1.75rem;
    }
    code {
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      font-size: 0.85em;
      background: rgba(255, 255, 255, 0.08);
      padding: 2px 6px;
      border-radius: 4px;
      color: #e4e4e7;
    }
    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 0.65rem 1.25rem;
      border-radius: 0.5rem;
      font-size: 0.875rem;
      font-weight: 500;
      text-decoration: none;
      background: #fafafa;
      color: #09090b;
      transition: all 0.15s ease;
    }
    .btn:hover {
      background: #f4f4f5;
      transform: translateY(-1px);
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="brand-mark">
      <div class="brand-icon">M</div>
      <span>MINDSPACE</span>
    </div>
    <h1>Project Not Found</h1>
    <p>The preview link <code>/p/${safeSlug}</code> does not match any existing project on MINDSPACE.</p>
    <a href="/" class="btn">Return to MINDSPACE</a>
  </div>
</body>
</html>`;
}
