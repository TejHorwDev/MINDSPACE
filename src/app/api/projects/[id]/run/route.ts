import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  executeCodeWithPiston,
  resolvePistonLanguage,
  isWebPreviewFile,
  PistonFile,
} from "@/lib/piston";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: projectId } = await params;

  const project = await db.project.findUnique({
    where: { id: projectId },
    include: {
      files: true,
      owner: { select: { id: true, role: true } },
    },
  });

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  // Ensure caller owns the project or is admin
  if (project.ownerId !== session.user.id && session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: any = {};
  try {
    body = await req.json();
  } catch {
    // Body is optional
  }

  const activeFilePath = (body.activeFilePath || "").trim();
  const stdin = typeof body.stdin === "string" ? body.stdin : "";
  const clientFiles: Array<{ path: string; content: string }> = Array.isArray(body.files)
    ? body.files
    : [];

  // Merge client in-memory files with database files (client has fresher edits)
  const fileMap = new Map<string, string>();
  for (const f of project.files) {
    fileMap.set(f.path, f.content);
  }
  for (const f of clientFiles) {
    if (f.path) {
      fileMap.set(f.path, f.content ?? "");
    }
  }

  // Determine which file to execute
  let targetPath = activeFilePath;
  if (!targetPath || !fileMap.has(targetPath)) {
    // Try to find a primary file
    const priorities = [
      "main.py", "app.py", "script.py",
      "main.cpp", "main.c",
      "Program.cs", "main.cs",
      "Main.java", "App.java",
      "index.js", "main.js", "app.js",
      "main.go", "main.rs",
    ];
    for (const p of priorities) {
      if (fileMap.has(p)) {
        targetPath = p;
        break;
      }
    }
  }

  if (!targetPath && fileMap.size > 0) {
    targetPath = Array.from(fileMap.keys())[0];
  }

  if (!targetPath) {
    return NextResponse.json(
      { error: "No executable code file found in this project." },
      { status: 400 }
    );
  }

  // Check if it's a web preview file (HTML/CSS)
  if (isWebPreviewFile(targetPath)) {
    return NextResponse.json({
      isWebPreview: true,
      message: `"${targetPath}" is a web layout file. View it live in the Preview panel!`,
    });
  }

  const language = resolvePistonLanguage(targetPath);
  if (!language) {
    return NextResponse.json({
      error: `Unsupported file format for execution: "${targetPath}". Piston supports Python (.py), C++ (.cpp), C# (.cs), Java (.java), Node/JS (.js), Go (.go), Rust (.rs), and more.`,
    }, { status: 400 });
  }

  // Construct piston files array: put the target file first
  const pistonFiles: PistonFile[] = [
    {
      name: targetPath.split("/").pop() || "main",
      content: fileMap.get(targetPath) || "",
    },
  ];

  // Append any other project files in the same directory/project
  for (const [filePath, content] of fileMap.entries()) {
    if (filePath !== targetPath && !isWebPreviewFile(filePath)) {
      pistonFiles.push({
        name: filePath.split("/").pop() || filePath,
        content,
      });
    }
  }

  try {
    const result = await executeCodeWithPiston({
      language,
      files: pistonFiles,
      stdin,
    });

    return NextResponse.json({
      success: true,
      targetFile: targetPath,
      result,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Execution engine failed" },
      { status: 500 }
    );
  }
}
