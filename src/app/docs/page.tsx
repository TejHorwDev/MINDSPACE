import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function DocsPage() {
  redirect("/dashboard?filter=documents");
}
