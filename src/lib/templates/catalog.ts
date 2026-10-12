import { PORTFOLIO_FILES } from "./portfolio";
import { CLUB_EVENT_FILES } from "./club-event";
import { MULTI_PAGE_FILES } from "./multi-page";

export type StarterFile = {
  path: string;
  content: string;
};

export type BuiltInTemplate = {
  slug: string;
  name: string;
  description: string;
  category: "portfolio" | "landing" | "multi-page" | "club" | "creative" | "business";
  tags: string[];
  icon: string;
  isFeatured: boolean;
  fileCount: number;
  files: StarterFile[];
};

export const BUILT_IN_TEMPLATES: BuiltInTemplate[] = [
  // 1. Developer Portfolio
  {
    slug: "developer-portfolio",
    name: "Simple Portfolio",
    description: "Classic professional portfolio with animated hero, project case studies, stack pills, and interactive photo slots.",
    category: "portfolio",
    tags: ["developer", "portfolio", "projects", "classic", "minimal"],
    icon: "Code2",
    isFeatured: true,
    fileCount: PORTFOLIO_FILES.length,
    files: PORTFOLIO_FILES,
  },

  // 2. SaaS & App Launch Landing
  {
    slug: "saas-landing",
    name: "SaaS / App Launch",
    description: "High-converting product landing page with animated hero, interactive pricing switcher, and feature grid.",
    category: "landing",
    tags: ["saas", "startup", "pricing", "landing", "product"],
    icon: "Rocket",
    isFeatured: true,
    fileCount: 3,
    files: [
      {
        path: "index.html",
        content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>NovaFlow — Intelligent Task Workflows</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <nav class="navbar">
    <div class="logo">⚡ NovaFlow</div>
    <div class="nav-links">
      <a href="#features">Features</a>
      <a href="#pricing">Pricing</a>
      <a href="#cta" class="nav-btn">Get Started</a>
    </div>
  </nav>

  <header class="hero">
    <span class="badge">Version 2.0 Now Live</span>
    <h1>Automate your work without the busywork</h1>
    <p class="subtitle">NovaFlow connects your tools, syncs your team, and turns chaotic tasks into crystal-clear automated workflows.</p>
    <div class="hero-actions">
      <input type="email" placeholder="Enter your email" class="email-input" id="emailInput">
      <button class="cta-btn" id="signupBtn">Start Free Trial</button>
    </div>
    <p class="sub-caption">No credit card required · 14-day free trial</p>
  </header>

  <section id="features" class="features-section">
    <h2>Built for speed and clarity</h2>
    <div class="cards-grid">
      <div class="feature-card">
        <div class="icon">🚀</div>
        <h3>Instant Triggers</h3>
        <p>Listen for webhooks, git commits, or form submits in real-time with zero configuration.</p>
      </div>
      <div class="feature-card">
        <div class="icon">🛡️</div>
        <h3>Enterprise Guardrails</h3>
        <p>Role-based access, audit logs, and SOC-2 compliant encryption by default.</p>
      </div>
      <div class="feature-card">
        <div class="icon">📊</div>
        <h3>Live Analytics</h3>
        <p>Monitor pipeline throughput, execution delays, and error rates with live visual metrics.</p>
      </div>
    </div>
  </section>

  <section id="pricing" class="pricing-section">
    <h2>Simple, transparent pricing</h2>
    <div class="pricing-cards">
      <div class="price-card">
        <h3>Starter</h3>
        <div class="price">$0<span>/mo</span></div>
        <p>For individuals and quick experiments.</p>
        <ul><li>5 active workflows</li><li>1,000 monthly executions</li><li>Community support</li></ul>
        <button class="plan-btn">Get Started</button>
      </div>
      <div class="price-card popular">
        <div class="pop-tag">Most Popular</div>
        <h3>Pro</h3>
        <div class="price">$29<span>/mo</span></div>
        <p>For growing teams and production apps.</p>
        <ul><li>Unlimited workflows</li><li>50,000 monthly executions</li><li>Priority 24/7 support</li></ul>
        <button class="plan-btn highlighted">Try Pro</button>
      </div>
    </div>
  </section>

  <footer class="footer">
    <p>&copy; 2026 NovaFlow, Inc. All rights reserved.</p>
  </footer>

  <script src="script.js"></script>
</body>
</html>`,
      },
      {
        path: "styles.css",
        content: `* { margin: 0; padding: 0; box-sizing: border-box; }
:root {
  --bg: #0b0f19;
  --surface: #141b2d;
  --primary: #6366f1;
  --primary-hover: #4f46e5;
  --text: #f8fafc;
  --muted: #94a3b8;
  --border: rgba(255, 255, 255, 0.08);
}
body {
  background: var(--bg);
  color: var(--text);
  font-family: system-ui, -apple-system, sans-serif;
  line-height: 1.5;
}
.navbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  max-width: 1040px;
  margin: 0 auto;
  padding: 24px 20px;
}
.logo { font-size: 20px; font-weight: 800; color: #fff; }
.nav-links { display: flex; gap: 24px; align-items: center; }
.nav-links a { color: var(--muted); text-decoration: none; font-size: 14px; transition: color 0.2s; }
.nav-links a:hover { color: #fff; }
.nav-btn {
  background: var(--surface);
  border: 1px solid var(--border);
  padding: 8px 16px;
  border-radius: 6px;
  color: #fff !important;
}
.hero {
  text-align: center;
  max-width: 800px;
  margin: 60px auto 80px;
  padding: 0 20px;
}
.badge {
  display: inline-block;
  padding: 6px 16px;
  background: rgba(99, 102, 241, 0.15);
  border: 1px solid rgba(99, 102, 241, 0.3);
  color: #a5b4fc;
  border-radius: 9999px;
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 24px;
}
.hero h1 {
  font-size: clamp(36px, 6vw, 56px);
  font-weight: 800;
  line-height: 1.15;
  letter-spacing: -0.03em;
  margin-bottom: 20px;
}
.subtitle {
  font-size: 18px;
  color: var(--muted);
  max-width: 600px;
  margin: 0 auto 36px;
}
.hero-actions {
  display: flex;
  justify-content: center;
  gap: 8px;
  max-width: 440px;
  margin: 0 auto 12px;
}
.email-input {
  flex: 1;
  padding: 12px 16px;
  border-radius: 8px;
  background: var(--surface);
  border: 1px solid var(--border);
  color: #fff;
  font-size: 14px;
  outline: none;
}
.email-input:focus { border-color: var(--primary); }
.cta-btn {
  padding: 12px 24px;
  border-radius: 8px;
  background: var(--primary);
  border: none;
  color: #fff;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}
.cta-btn:hover { background: var(--primary-hover); }
.sub-caption { font-size: 12px; color: var(--muted); }
.features-section, .pricing-section {
  max-width: 1040px;
  margin: 0 auto 100px;
  padding: 0 20px;
  text-align: center;
}
.features-section h2, .pricing-section h2 {
  font-size: 32px;
  font-weight: 700;
  margin-bottom: 40px;
}
.cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 24px;
}
.feature-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 32px 24px;
  text-align: left;
}
.feature-card .icon { font-size: 32px; margin-bottom: 16px; }
.feature-card h3 { font-size: 18px; margin-bottom: 8px; }
.feature-card p { font-size: 14px; color: var(--muted); }
.pricing-cards {
  display: flex;
  justify-content: center;
  gap: 24px;
  flex-wrap: wrap;
}
.price-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 40px 32px;
  width: 320px;
  text-align: left;
  position: relative;
}
.price-card.popular { border-color: var(--primary); box-shadow: 0 0 40px rgba(99, 102, 241, 0.15); }
.pop-tag {
  position: absolute;
  top: -12px;
  right: 24px;
  background: var(--primary);
  font-size: 11px;
  font-weight: 700;
  padding: 4px 10px;
  border-radius: 9999px;
}
.price { font-size: 36px; font-weight: 800; margin: 16px 0; }
.price span { font-size: 16px; color: var(--muted); font-weight: normal; }
.price-card ul { list-style: none; margin: 24px 0 32px; font-size: 14px; color: var(--muted); }
.price-card li { margin-bottom: 10px; }
.price-card li::before { content: "✓ "; color: var(--primary); font-weight: bold; }
.plan-btn {
  width: 100%;
  padding: 12px;
  border-radius: 8px;
  background: transparent;
  border: 1px solid var(--border);
  color: #fff;
  font-weight: 600;
  cursor: pointer;
}
.plan-btn.highlighted { background: var(--primary); border: none; }
.footer { border-top: 1px solid var(--border); padding: 40px; text-align: center; color: var(--muted); font-size: 13px; }`,
      },
      {
        path: "script.js",
        content: `document.getElementById('signupBtn')?.addEventListener('click', () => {
  const email = document.getElementById('emailInput')?.value;
  if (!email || !email.includes('@')) {
    alert('Please enter a valid email address!');
    return;
  }
  alert('Thank you! We will send your invite link to ' + email);
});`,
      },
    ],
  },

  // 3. Multi-Page Site (Classic Studio)
  {
    slug: "multi-page-studio",
    name: "Classic Studio Multi-Page",
    description: "Complete 3-page studio website (Home, About, Contact) sharing a single CSS theme, navigation, and photo slots.",
    category: "multi-page",
    tags: ["multi-page", "agency", "portfolio", "studio", "clean"],
    icon: "Layers",
    isFeatured: true,
    fileCount: MULTI_PAGE_FILES.length,
    files: MULTI_PAGE_FILES,
  },

  // 4. Club & Event Landing
  {
    slug: "club-event",
    name: "Tech Summit & Club Landing",
    description: "Refined tech conference page featuring hero stage banner, keynote speaker spotlights, schedule table, and RSVP form.",
    category: "club",
    tags: ["club", "event", "summit", "rsvp", "schedule"],
    icon: "LayoutTemplate",
    isFeatured: false,
    fileCount: CLUB_EVENT_FILES.length,
    files: CLUB_EVENT_FILES,
  },

  // 5. Link-in-Bio / Personal Hub
  {
    slug: "link-in-bio",
    name: "Link in Bio / Creator Hub",
    description: "Mobile-first modern link tree for creators, students, and founders with social icons and newsletter signup.",
    category: "creative",
    tags: ["bio", "creator", "links", "social", "minimal"],
    icon: "Sparkles",
    isFeatured: true,
    fileCount: 2,
    files: [
      {
        path: "index.html",
        content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Maya Lin · Links & Projects</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <div class="profile-card">
    <div class="avatar">ML</div>
    <h1>Maya Lin</h1>
    <p class="bio">Digital Creator & Creative Technologist 🎨 Writing about design, web & code.</p>

    <div class="links-list">
      <a href="https://github.com" target="_blank" class="link-item">
        <span class="icon">💻</span>
        <span class="label">GitHub Projects</span>
      </a>
      <a href="https://youtube.com" target="_blank" class="link-item">
        <span class="icon">🎬</span>
        <span class="label">YouTube Channel</span>
      </a>
      <a href="https://substack.com" target="_blank" class="link-item">
        <span class="icon">✍️</span>
        <span class="label">Weekly Tech Newsletter</span>
      </a>
      <a href="mailto:maya@example.com" class="link-item highlight">
        <span class="icon">☕</span>
        <span class="label">Book a Mentorship Chat</span>
      </a>
    </div>

    <div class="social-icons">
      <span>✦</span>
      <span>✦</span>
      <span>✦</span>
    </div>

    <footer>
      <p>Created with MINDSPACE</p>
    </footer>
  </div>
</body>
</html>`,
      },
      {
        path: "styles.css",
        content: `* { margin: 0; padding: 0; box-sizing: border-box; }
body {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #181824 0%, #0d0d12 100%);
  color: #fff;
  font-family: system-ui, -apple-system, sans-serif;
  padding: 20px;
}
.profile-card {
  max-width: 400px;
  width: 100%;
  text-align: center;
  padding: 40px 24px;
}
.avatar {
  width: 80px;
  height: 80px;
  margin: 0 auto 16px;
  border-radius: 50%;
  background: linear-gradient(135deg, #ec4899, #8b5cf6);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  font-weight: 800;
  box-shadow: 0 8px 24px rgba(236, 72, 153, 0.3);
}
h1 { font-size: 24px; font-weight: 700; margin-bottom: 8px; }
.bio { font-size: 14px; color: #a1a1aa; line-height: 1.5; margin-bottom: 28px; }
.links-list { display: flex; flex-direction: column; gap: 12px; margin-bottom: 30px; }
.link-item {
  display: flex;
  align-items: center;
  padding: 14px 20px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  color: #fff;
  text-decoration: none;
  font-size: 14px;
  font-weight: 600;
  transition: all 0.2s ease;
}
.link-item:hover {
  background: rgba(255, 255, 255, 0.1);
  transform: translateY(-2px);
  border-color: rgba(255, 255, 255, 0.2);
}
.link-item.highlight {
  background: rgba(139, 92, 246, 0.15);
  border-color: rgba(139, 92, 246, 0.4);
}
.link-item.highlight:hover { background: rgba(139, 92, 246, 0.25); }
.icon { font-size: 18px; margin-right: 12px; }
.social-icons { color: #71717a; letter-spacing: 8px; font-size: 12px; margin-bottom: 20px; }
footer { font-size: 11px; color: #52525b; }`,
      },
    ],
  },

  // 6. Photo & Art Showcase
  {
    slug: "photo-showcase",
    name: "Photography & Art Showcase",
    description: "Visual-forward photography gallery with sleek dark mood, grid masonry, and exhibition history.",
    category: "creative",
    tags: ["photography", "gallery", "portfolio", "visual", "art"],
    icon: "Palette",
    isFeatured: false,
    fileCount: 2,
    files: [
      {
        path: "index.html",
        content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Elena Rossi · Visual Artist & Photographer</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <div class="wrapper">
    <header class="header">
      <div class="logo">ELENA ROSSI</div>
      <p class="sub">Visual Notes & Architectural Light · 2024–2026</p>
    </header>

    <div class="gallery">
      <div class="gallery-item large">
        <div class="photo-placeholder g1">Night Reflections</div>
        <div class="caption">Tokyo · 35mm</div>
      </div>
      <div class="gallery-item">
        <div class="photo-placeholder g2">Concrete Horizon</div>
        <div class="caption">Berlin · Medium Format</div>
      </div>
      <div class="gallery-item">
        <div class="photo-placeholder g3">Glass Geometry</div>
        <div class="caption">Stockholm · Monochrome</div>
      </div>
    </div>

    <section class="bio-section">
      <h3>About the work</h3>
      <p>Elena Rossi explores the intersection of human geometry and raw light across modern metropolitan centers.</p>
      <a href="mailto:elena@example.com" class="contact-link">Inquire about prints & exhibitions &rarr;</a>
    </section>

    <footer>
      <p>&copy; 2026 Elena Rossi. All photographs protected.</p>
    </footer>
  </div>
</body>
</html>`,
      },
      {
        path: "styles.css",
        content: `* { margin: 0; padding: 0; box-sizing: border-box; }
body {
  background: #000;
  color: #ededed;
  font-family: system-ui, -apple-system, sans-serif;
  line-height: 1.5;
  padding: 40px 24px;
}
.wrapper { max-width: 900px; margin: 0 auto; }
.header { margin-bottom: 50px; text-align: left; }
.logo { font-size: 24px; font-weight: 800; letter-spacing: 0.15em; color: #fff; margin-bottom: 6px; }
.sub { font-size: 13px; color: #666; font-family: monospace; }
.gallery {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 24px;
  margin-bottom: 60px;
}
.gallery-item.large { grid-column: 1 / -1; }
.photo-placeholder {
  height: 320px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  font-weight: 600;
  color: rgba(255,255,255,0.7);
  background: #111;
  border: 1px solid rgba(255,255,255,0.1);
  transition: transform 0.3s;
}
.photo-placeholder:hover { transform: scale(1.01); }
.gallery-item:not(.large) .photo-placeholder { height: 240px; }
.g1 { background: linear-gradient(135deg, #1e1b4b, #0f172a); }
.g2 { background: linear-gradient(135deg, #1c1917, #292524); }
.g3 { background: linear-gradient(135deg, #09090b, #27272a); }
.caption { font-size: 12px; color: #777; margin-top: 8px; font-family: monospace; }
.bio-section { max-width: 500px; margin-bottom: 60px; }
.bio-section h3 { font-size: 18px; margin-bottom: 12px; }
.bio-section p { font-size: 14px; color: #999; line-height: 1.6; margin-bottom: 16px; }
.contact-link { color: #fff; text-decoration: none; font-size: 14px; font-weight: 600; border-bottom: 1px solid #444; padding-bottom: 2px; }
footer { font-size: 11px; color: #444; text-align: center; }`,
      },
    ],
  },
];
