import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-border bg-card/40 backdrop-blur-sm">
      <div className="mx-auto flex w-full max-w-[1800px] flex-col gap-8 px-4 py-12 sm:px-8 lg:px-12">
        <div className="flex flex-col sm:flex-row items-start justify-between gap-8 pb-8 border-b border-border/60">
          <div className="space-y-2 max-w-sm">
            <span className="font-extrabold uppercase tracking-[0.2em] text-sm text-foreground">
              MINDSPACE
            </span>
            <p className="text-xs text-muted-foreground leading-relaxed">
              A calm space to build the web you imagine. Designed for students, builders, and independent creators to craft websites and write documents together.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-8 text-xs">
            <div className="space-y-2.5">
              <span className="font-semibold text-foreground uppercase tracking-wider text-[11px]">Platform</span>
              <ul className="space-y-2 text-muted-foreground">
                <li><Link href="/templates" className="hover:text-foreground transition-colors">Blueprints</Link></li>
                <li><Link href="/dashboard" className="hover:text-foreground transition-colors">Dashboard</Link></li>
                <li><Link href="/project/new" className="hover:text-foreground transition-colors">New Website</Link></li>
              </ul>
            </div>

            <div className="space-y-2.5">
              <span className="font-semibold text-foreground uppercase tracking-wider text-[11px]">Community</span>
              <ul className="space-y-2 text-muted-foreground">
                <li><Link href="/developers" className="hover:text-foreground transition-colors">Creator Directory</Link></li>
                <li><Link href="/templates" className="hover:text-foreground transition-colors">Blueprints Gallery</Link></li>
                <li><Link href="/credits" className="hover:text-foreground transition-colors">Credits & Tiers</Link></li>
              </ul>
            </div>

            <div className="space-y-2.5">
              <span className="font-semibold text-foreground uppercase tracking-wider text-[11px]">Ecosystem</span>
              <ul className="space-y-2 text-muted-foreground">
                <li><Link href="/upgrade" className="hover:text-foreground transition-colors">Student Plans</Link></li>
                <li><Link href="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</Link></li>
                <li><Link href="/terms" className="hover:text-foreground transition-colors">Terms of Service</Link></li>
              </ul>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <p>© {new Date().getFullYear()} MINDSPACE. A calm space to build the web you imagine.</p>
          <div className="flex items-center gap-6">
            <Link href="/terms" className="hover:text-foreground transition-colors">Terms</Link>
            <Link href="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
            <Link href="/developers" className="hover:text-foreground transition-colors">Developers</Link>
            <Link href="/templates" className="hover:text-foreground transition-colors">Blueprints</Link>
            <Link href="/dashboard" className="hover:text-foreground transition-colors">Dashboard</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
