// scratch/inspect_chunk_contents.ts
import fs from "fs";
import path from "path";

const chunksDir = path.join(process.cwd(), ".next", "static", "chunks");
const files = fs.readdirSync(chunksDir);

const topChunks = files
  .map((f) => ({
    name: f,
    size: fs.statSync(path.join(chunksDir, f)).size,
  }))
  .sort((a, b) => b.size - a.size)
  .slice(0, 5);

console.log("Analyzing largest chunks for heavy dependencies:");
for (const chunk of topChunks) {
  const content = fs.readFileSync(path.join(chunksDir, chunk.name), "utf-8");
  const hits: string[] = [];
  if (content.includes("recharts") || content.includes("CartesianGrid")) hits.push("recharts");
  if (content.includes("monaco") || content.includes("editor.main")) hits.push("monaco");
  if (content.includes("xterm") || content.includes("Terminal")) hits.push("xterm");
  if (content.includes("framer-motion")) hits.push("framer-motion");
  if (content.includes("lucide")) hits.push("lucide-react");
  if (content.includes("syntax-highlighter") || content.includes("prism") || content.includes("hljs")) hits.push("syntax-highlighter");
  if (content.includes("date-fns")) hits.push("date-fns");

  console.log(`- ${chunk.name} (${Math.round(chunk.size / 1024)} KB): [${hits.join(", ")}]`);
}
