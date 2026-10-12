import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { SiteHeader } from "@/components/layout/site-header";
import { UserSettingsView } from "@/components/settings/user-settings-view";

export const metadata = {
  title: "Settings — MINDSPACE Code Editor",
  description: "Customize your editor themes, font size, AI pair-programmer preferences, and personal API keys.",
};

export default async function SettingsPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/settings");
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <SiteHeader
        authed={true}
        isAdmin={session.user.role === "admin"}
        name={session.user.name}
        email={session.user.email}
      />
      <main className="flex-1 py-6">
        <UserSettingsView />
      </main>
    </div>
  );
}
