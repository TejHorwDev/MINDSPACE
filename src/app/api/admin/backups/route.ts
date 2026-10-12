import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin";
import { logAdminAction } from "@/lib/activity-log";
import path from "path";
import fs from "fs";

function getBackupDir() {
  const backupDir = path.join(process.cwd(), "prisma", "backups");
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }
  return backupDir;
}

/**
 * GET: List backup history & current database status
 */
export async function GET() {
  const { status, session } = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Admin access required." }, { status });
  }

  try {
    const backupDir = getBackupDir();
    const dbPath = path.join(process.cwd(), "prisma", "db", "custom.db");

    let liveDbSizeMB = 0;
    let liveDbModified: Date | null = null;
    if (fs.existsSync(dbPath)) {
      const stats = fs.statSync(dbPath);
      liveDbSizeMB = Math.round((stats.size / (1024 * 1024)) * 100) / 100;
      liveDbModified = stats.mtime;
    }

    const files = fs.readdirSync(backupDir);
    const backups = files
      .filter((f) => f.endsWith(".db"))
      .map((fileName) => {
        const filePath = path.join(backupDir, fileName);
        const stats = fs.statSync(filePath);
        return {
          id: fileName,
          fileName,
          sizeMB: Math.round((stats.size / (1024 * 1024)) * 100) / 100,
          createdAt: stats.birthtime,
          status: "success",
        };
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return NextResponse.json({
      liveStatus: {
        healthy: true,
        sizeMB: liveDbSizeMB,
        lastModified: liveDbModified,
        location: "prisma/db/custom.db",
      },
      backups,
    });
  } catch (error) {
    console.error("Admin get backups error:", error);
    return NextResponse.json({ error: "Failed to load backups." }, { status: 500 });
  }
}

/**
 * POST: Trigger a manual database snapshot backup
 */
export async function POST() {
  const { status, session } = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Admin access required." }, { status });
  }

  try {
    const backupDir = getBackupDir();
    const dbPath = path.join(process.cwd(), "prisma", "db", "custom.db");

    if (!fs.existsSync(dbPath)) {
      return NextResponse.json({ error: "Database file not found." }, { status: 404 });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const backupFileName = `backup-${timestamp}.db`;
    const destPath = path.join(backupDir, backupFileName);

    // Copy live DB file safely
    fs.copyFileSync(dbPath, destPath);

    const stats = fs.statSync(destPath);
    const sizeMB = Math.round((stats.size / (1024 * 1024)) * 100) / 100;

    await logAdminAction({
      adminUserId: session.user.id,
      action: "database_backup_created",
      targetType: "backup",
      targetId: backupFileName,
      details: {
        fileName: backupFileName,
        sizeMB,
      },
    });

    return NextResponse.json({
      success: true,
      backup: {
        id: backupFileName,
        fileName: backupFileName,
        sizeMB,
        createdAt: stats.birthtime,
        status: "success",
      },
    });
  } catch (error) {
    console.error("Admin trigger backup error:", error);
    return NextResponse.json({ error: "Failed to trigger backup." }, { status: 500 });
  }
}
