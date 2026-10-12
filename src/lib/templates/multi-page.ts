// src/lib/templates/multi-page.ts
// Premium Starter Template: "Multi-Page Site" (Atelier Studio)
// Classic, professional studio design across index.html, about.html, contact.html sharing styles.css.
// Zero neon, full dark & light mode, 5 designated photo slots.

import {
  STUDIO_HERO_PLACEHOLDER,
  STUDIO_TEAM_PLACEHOLDER,
  STUDIO_LOCATION_PLACEHOLDER,
  PROJECT_1_PLACEHOLDER,
  PROJECT_2_PLACEHOLDER,
} from "./placeholders";

const SHARED_STYLES = `/* Atelier Studio — Shared Design System */
:root {
  --bg: #090a0f;
  --surface: #12141c;
  --surface-subtle: #171a24;
  --border: rgba(255, 255, 255, 0.08);
  --border-hover: rgba(255, 255, 255, 0.16);
  --text: #f4f4f5;
  --text-muted: #94a3b8;
  --text-dim: #64748b;
  --accent: #4f46e5;
  --accent-subtle: rgba(79, 70, 229, 0.12);
  --accent-text: #818cf8;
  --accent-btn-text: #ffffff;
  --radius: 12px;
}

[data-theme="light"], .theme-light {
  --bg: #fafafa;
  --surface: #ffffff;
  --surface-subtle: #f4f4f5;
  --border: rgba(0, 0, 0, 0.08);
  --border-hover: rgba(0, 0, 0, 0.16);
  --text: #09090b;
  --text-muted: #52525b;
  --text-dim: #71717a;
  --accent: #4338ca;
  --accent-subtle: rgba(67, 56, 202, 0.08);
  --accent-text: #3730a3;
  --accent-btn-text: #ffffff;
}

@media (prefers-color-scheme: light) {
  :root:not([data-theme="dark"]) {
    --bg: #fafafa;
    --surface: #ffffff;
    --surface-subtle: #f4f4f5;
    --border: rgba(0, 0, 0, 0.08);
    --border-hover: rgba(0, 0, 0, 0.16);
    --text: #09090b;
    --text-muted: #52525b;
    --text-dim: #71717a;
    --accent: #4338ca;
    --accent-subtle: rgba(67, 56, 202, 0.08);
    --accent-text: #3730a3;
    --accent-btn-text: #ffffff;
  }
}

* { margin: 0; padding: 0; box-sizing: border-box; }
html { scroll-behavior: smooth; }
body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  background: var(--bg);
  color: var(--text);
  line-height: 1.6;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  -webkit-font-smoothing: antialiased;
  transition: background-color 0.2s ease, color 0.2s ease;
}

.container {
  max-width: 900px;
  margin: 0 auto;
  padding: 0 24px;
  width: 100%;
}

/* NAV — Shared across pages */
nav {
  position: sticky;
  top: 0;
  z-index: 50;
  backdrop-filter: blur(12px);
  background: color-mix(in srgb, var(--bg) 85%, transparent);
  border-bottom: 1px solid var(--border);
}
.nav-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 64px;
}
.brand {
  font-weight: 700;
  font-size: 16px;
  letter-spacing: -0.01em;
  color: var(--text);
  text-decoration: none;
}
.brand span {
  color: var(--accent-text);
}
.nav-links {
  display: flex;
  align-items: center;
  gap: 22px;
}
.nav-links a {
  color: var(--text-muted);
  text-decoration: none;
  font-size: 14px;
  font-weight: 500;
  transition: color 0.15s ease;
  position: relative;
}
.nav-links a:hover,
.nav-links a[aria-current="page"] {
  color: var(--text);
}
.nav-links a[aria-current="page"]::after {
  content: "";
  position: absolute;
  bottom: -6px;
  left: 0;
  right: 0;
  height: 2px;
  background: var(--accent);
  border-radius: 1px;
}
.theme-toggle-btn {
  background: var(--surface);
  border: 1px solid var(--border);
  color: var(--text-muted);
  border-radius: 8px;
  padding: 6px 10px;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.15s ease;
}
.theme-toggle-btn:hover {
  color: var(--text);
  border-color: var(--border-hover);
}

/* MAIN CONTENT */
main {
  flex: 1;
  padding: 64px 0 80px;
}
.page-header {
  margin-bottom: 40px;
}
.eyebrow {
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--accent-text);
  margin-bottom: 8px;
}
h1 {
  font-size: clamp(32px, 5.5vw, 48px);
  font-weight: 800;
  line-height: 1.15;
  letter-spacing: -0.03em;
  margin-bottom: 16px;
}
.lead {
  color: var(--text-muted);
  font-size: 17px;
  line-height: 1.6;
  max-width: 54ch;
}

/* BUTTONS */
.btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 11px 22px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  text-decoration: none;
  transition: all 0.18s ease;
  cursor: pointer;
}
.btn-primary {
  background: var(--accent);
  color: var(--accent-btn-text);
  border: 1px solid var(--accent);
}
.btn-primary:hover {
  opacity: 0.92;
  transform: translateY(-1px);
}
.btn-secondary {
  background: var(--surface);
  color: var(--text);
  border: 1px solid var(--border);
}
.btn-secondary:hover {
  border-color: var(--border-hover);
  transform: translateY(-1px);
}

/* PHOTO SLOTS */
.media-frame {
  border-radius: var(--radius);
  overflow: hidden;
  border: 1px solid var(--border);
  background: var(--surface);
  box-shadow: 0 12px 32px -6px rgba(0, 0, 0, 0.3);
  margin-bottom: 48px;
}
.media-frame img {
  width: 100%;
  height: 380px;
  object-fit: cover;
  display: block;
  cursor: pointer;
  transition: transform 0.3s ease;
}
.media-frame img:hover {
  transform: scale(1.01);
}

/* GRIDS */
.pillars-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 20px;
  margin-bottom: 56px;
}
.pillar-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 24px;
  transition: border-color 0.2s ease, transform 0.2s ease;
}
.pillar-card:hover {
  border-color: var(--border-hover);
  transform: translateY(-2px);
}
.pillar-num {
  font-family: monospace;
  font-size: 12px;
  font-weight: 600;
  color: var(--accent-text);
  margin-bottom: 8px;
}
.pillar-title {
  font-size: 17px;
  font-weight: 700;
  margin-bottom: 8px;
}
.pillar-desc {
  font-size: 14px;
  color: var(--text-muted);
  line-height: 1.6;
}

/* WORK CARDS */
.work-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
  margin-bottom: 48px;
}
.work-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  overflow: hidden;
  transition: border-color 0.2s ease, transform 0.2s ease;
}
.work-card:hover {
  border-color: var(--border-hover);
  transform: translateY(-2px);
}
.work-thumb-img {
  width: 100%;
  height: 220px;
  object-fit: cover;
  display: block;
  cursor: pointer;
}
.work-content {
  padding: 20px;
}
.work-title {
  font-size: 16px;
  font-weight: 700;
  margin-bottom: 4px;
}
.work-desc {
  font-size: 13px;
  color: var(--text-muted);
}

/* FORMS */
.form-box {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 32px;
  max-width: 580px;
}
.form-group {
  margin-bottom: 18px;
}
.form-group label {
  display: block;
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 6px;
  color: var(--text);
}
.form-control {
  width: 100%;
  padding: 11px 14px;
  border-radius: 8px;
  border: 1px solid var(--border);
  background: var(--surface-subtle);
  color: var(--text);
  font-size: 14px;
  outline: none;
  transition: border-color 0.15s ease;
}
.form-control:focus {
  border-color: var(--accent);
}
textarea.form-control {
  min-height: 110px;
  resize: vertical;
}

/* FOOTER */
footer {
  border-top: 1px solid var(--border);
  padding: 40px 0;
  text-align: center;
  color: var(--text-dim);
  font-size: 13px;
}

/* ENTRANCE ANIMATIONS */
.reveal {
  opacity: 0;
  transform: translateY(14px);
  transition: opacity 0.55s cubic-bezier(0.16, 1, 0.3, 1), transform 0.55s cubic-bezier(0.16, 1, 0.3, 1);
}
.reveal.active {
  opacity: 1;
  transform: translateY(0);
}

@media (max-width: 680px) {
  .work-grid { grid-template-columns: 1fr; }
  .media-frame img { height: 220px; }
}
`;

export const MULTI_PAGE_FILES: { path: string; content: string }[] = [
  {
    path: "styles.css",
    content: SHARED_STYLES,
  },
  {
    path: "index.html",
    content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <link rel="stylesheet" href="styles.css" />
  <title>Atelier Studio · Architecture & Digital Systems</title>
</head>
<body>
  <nav>
    <div class="container nav-inner">
      <a class="brand" href="index.html">Atelier <span>Studio</span></a>
      <div class="nav-links">
        <a href="index.html" aria-current="page">Home</a>
        <a href="about.html">About</a>
        <a href="contact.html">Contact</a>
        <button type="button" class="theme-toggle-btn" id="themeBtn" aria-label="Toggle Theme">Theme</button>
      </div>
    </div>
  </nav>

  <main class="container">
    <header class="page-header reveal active">
      <p class="eyebrow">Design & Engineering Practice</p>
      <h1>Shaping spaces and software with timeless restraint.</h1>
      <p class="lead">
        We partner with technical founders and institutional teams to build products and environments that endure past aesthetic trend cycles.
      </p>
    </header>

    <!-- HOME HERO PHOTO SLOT -->
    <div class="media-frame reveal active">
      <img
        id="home-hero-image"
        data-image-slot="studio-hero"
        src="${STUDIO_HERO_PLACEHOLDER}"
        alt="Atelier Studio Architectural Space"
        title="Studio Hero Image (Click to replace)"
      />
    </div>

    <!-- CORE DISCIPLINES -->
    <section class="pillars-grid reveal">
      <div class="pillar-card">
        <div class="pillar-num">01 / ARCHITECTURE</div>
        <h2 class="pillar-title">Physical Environments</h2>
        <p class="pillar-desc">Research labs, studio spaces, and physical installations grounded in natural materials and acoustic clarity.</p>
      </div>

      <div class="pillar-card">
        <div class="pillar-num">02 / SYSTEMS</div>
        <h2 class="pillar-title">Digital Products</h2>
        <p class="pillar-desc">Developer tooling, high-frequency interfaces, and ergonomic design systems built for daily professional workflows.</p>
      </div>

      <div class="pillar-card">
        <div class="pillar-num">03 / RESEARCH</div>
        <h2 class="pillar-title">Materials & Ergonomics</h2>
        <p class="pillar-desc">Investigating tactile feedback, typography render fidelity, and the cognitive overhead of user workflows.</p>
      </div>
    </section>

    <!-- SELECTED WORK PREVIEW -->
    <section class="reveal">
      <div class="page-header" style="margin-bottom: 24px;">
        <p class="eyebrow">Selected Work</p>
        <h2 style="font-size: 24px; font-weight: 700;">Recent Studio Engagements</h2>
      </div>

      <div class="work-grid">
        <article class="work-card">
          <img
            class="work-thumb-img"
            data-image-slot="home-project-1"
            src="${PROJECT_1_PLACEHOLDER}"
            alt="Horizon Telemetry Project"
            title="Work 1 Thumbnail (Click to replace)"
          />
          <div class="work-content">
            <h3 class="work-title">Horizon Telemetry</h3>
            <p class="work-desc">High-throughput telemetry workstation with sub-millisecond graph rendering.</p>
          </div>
        </article>

        <article class="work-card">
          <img
            class="work-thumb-img"
            data-image-slot="home-project-2"
            src="${PROJECT_2_PLACEHOLDER}"
            alt="Pulse Design System Project"
            title="Work 2 Thumbnail (Click to replace)"
          />
          <div class="work-content">
            <h3 class="work-title">Pulse Design Tokens</h3>
            <p class="work-desc">Multi-platform design token engine generating strongly-typed bindings.</p>
          </div>
        </article>
      </div>

      <div style="display: flex; gap: 12px;">
        <a href="about.html" class="btn btn-primary">Learn About Our Studio</a>
        <a href="contact.html" class="btn btn-secondary">Get in Touch</a>
      </div>
    </section>
  </main>

  <footer>
    <p>&copy; 2026 Atelier Studio · San Francisco · All rights reserved.</p>
  </footer>

  <script>
    if (typeof IntersectionObserver !== 'undefined') {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) entry.target.classList.add('active');
        });
      }, { threshold: 0.1 });
      document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
    } else {
      document.querySelectorAll('.reveal').forEach(el => el.classList.add('active'));
    }

    const themeBtn = document.getElementById('themeBtn');
    let isLight = false;
    if (themeBtn) {
      themeBtn.addEventListener('click', () => {
        isLight = !isLight;
        document.documentElement.setAttribute('data-theme', isLight ? 'light' : 'dark');
        themeBtn.textContent = isLight ? '🌙 Dark' : '☀️ Light';
      });
    }
  </script>
</body>
</html>
`,
  },
  {
    path: "about.html",
    content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <link rel="stylesheet" href="styles.css" />
  <title>About · Atelier Studio</title>
</head>
<body>
  <nav>
    <div class="container nav-inner">
      <a class="brand" href="index.html">Atelier <span>Studio</span></a>
      <div class="nav-links">
        <a href="index.html">Home</a>
        <a href="about.html" aria-current="page">About</a>
        <a href="contact.html">Contact</a>
        <button type="button" class="theme-toggle-btn" id="themeBtn" aria-label="Toggle Theme">Theme</button>
      </div>
    </div>
  </nav>

  <main class="container">
    <header class="page-header reveal active">
      <p class="eyebrow">Studio Practice</p>
      <h1>We build for permanence, not trend cycles.</h1>
      <p class="lead">
        Atelier is an interdisciplinary studio bringing together software architects, industrial designers, and visual typographers to craft enduring tools.
      </p>
    </header>

    <!-- ABOUT TEAM PHOTO SLOT -->
    <div class="media-frame reveal active">
      <img
        id="about-team-image"
        data-image-slot="studio-team"
        src="${STUDIO_TEAM_PLACEHOLDER}"
        alt="Atelier Studio Collaborative Team"
        title="Studio Team Photo (Click to replace)"
      />
    </div>

    <!-- PRINCIPLES -->
    <section class="pillars-grid reveal">
      <div class="pillar-card">
        <div class="pillar-num">PRINCIPLE 01</div>
        <h2 class="pillar-title">Clarity over Decoration</h2>
        <p class="pillar-desc">Every element on screen must earn its right to exist. If a border or badge doesn't communicate state, we remove it.</p>
      </div>

      <div class="pillar-card">
        <div class="pillar-num">PRINCIPLE 02</div>
        <h2 class="pillar-title">Performance as Craft</h2>
        <p class="pillar-desc">Speed is the foundation of user trust. We treat load time, frame consistency, and keystroke latency as core design parameters.</p>
      </div>

      <div class="pillar-card">
        <div class="pillar-num">PRINCIPLE 03</div>
        <h2 class="pillar-title">Respect for Attention</h2>
        <p class="pillar-desc">We reject engagement traps and flashing animations. Great tools support deep focus and quiet confidence.</p>
      </div>
    </section>

    <!-- TEAM LEADERSHIP -->
    <section class="reveal">
      <div class="page-header" style="margin-bottom: 24px;">
        <p class="eyebrow">Studio Leadership</p>
        <h2 style="font-size: 24px; font-weight: 700;">Principals & Directors</h2>
      </div>

      <div class="pillars-grid">
        <div class="pillar-card">
          <h3 class="pillar-title" style="font-size: 16px;">Julian Thorne</h3>
          <p style="font-size: 13px; color: var(--accent-text); margin-bottom: 8px;">Design Principal</p>
          <p class="pillar-desc">Previously design director at Vercel and Apple. 14 years shaping typography and digital product craft.</p>
        </div>

        <div class="pillar-card">
          <h3 class="pillar-title" style="font-size: 16px;">Maya Patel</h3>
          <p style="font-size: 13px; color: var(--accent-text); margin-bottom: 8px;">Engineering Director</p>
          <p class="pillar-desc">Distributed systems architect with deep expertise in WebAssembly, rendering pipelines, and edge compute.</p>
        </div>

        <div class="pillar-card">
          <h3 class="pillar-title" style="font-size: 16px;">Claire Vance</h3>
          <p style="font-size: 13px; color: var(--accent-text); margin-bottom: 8px;">Spatial & Materials Lead</p>
          <p class="pillar-desc">Architectural researcher specializing in natural acoustic environments and tactile interface hardware.</p>
        </div>
      </div>
    </section>
  </main>

  <footer>
    <p>&copy; 2026 Atelier Studio · San Francisco · All rights reserved.</p>
  </footer>

  <script>
    if (typeof IntersectionObserver !== 'undefined') {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) entry.target.classList.add('active');
        });
      }, { threshold: 0.1 });
      document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
    } else {
      document.querySelectorAll('.reveal').forEach(el => el.classList.add('active'));
    }

    const themeBtn = document.getElementById('themeBtn');
    let isLight = false;
    if (themeBtn) {
      themeBtn.addEventListener('click', () => {
        isLight = !isLight;
        document.documentElement.setAttribute('data-theme', isLight ? 'light' : 'dark');
        themeBtn.textContent = isLight ? '🌙 Dark' : '☀️ Light';
      });
    }
  </script>
</body>
</html>
`,
  },
  {
    path: "contact.html",
    content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <link rel="stylesheet" href="styles.css" />
  <title>Contact · Atelier Studio</title>
</head>
<body>
  <nav>
    <div class="container nav-inner">
      <a class="brand" href="index.html">Atelier <span>Studio</span></a>
      <div class="nav-links">
        <a href="index.html">Home</a>
        <a href="about.html">About</a>
        <a href="contact.html" aria-current="page">Contact</a>
        <button type="button" class="theme-toggle-btn" id="themeBtn" aria-label="Toggle Theme">Theme</button>
      </div>
    </div>
  </nav>

  <main class="container">
    <header class="page-header reveal active">
      <p class="eyebrow">Get In Touch</p>
      <h1>Start a conversation.</h1>
      <p class="lead">
        We partner with select technology teams, cultural foundations, and research groups worldwide.
      </p>
    </header>

    <!-- CONTACT SPACE PHOTO SLOT -->
    <div class="media-frame reveal active">
      <img
        id="contact-space-image"
        data-image-slot="studio-location"
        src="${STUDIO_LOCATION_PLACEHOLDER}"
        alt="Atelier Studio Headquarters"
        title="Studio Space Image (Click to replace)"
      />
    </div>

    <div style="display: grid; grid-template-columns: 1.2fr 0.8fr; gap: 40px;" class="reveal">
      <div class="form-box">
        <h2 style="font-size: 20px; font-weight: 700; margin-bottom: 20px;">Project Inquiry</h2>
        <form id="contactForm" onsubmit="event.preventDefault(); document.getElementById('formMsg').textContent = 'Thank you for contacting Atelier. We will reply within 2 business days.';">
          <div class="form-group">
            <label for="name">Your Name</label>
            <input type="text" id="name" class="form-control" placeholder="Alex Morgan" required />
          </div>

          <div class="form-group">
            <label for="email">Work Email</label>
            <input type="email" id="email" class="form-control" placeholder="alex@company.com" required />
          </div>

          <div class="form-group">
            <label for="scope">Engagement Scope</label>
            <select id="scope" class="form-control">
              <option value="systems">Design Systems & Engineering</option>
              <option value="product">Digital Product Architecture</option>
              <option value="spatial">Spatial Environment Design</option>
              <option value="advisory">Technical Advisory</option>
            </select>
          </div>

          <div class="form-group">
            <label for="msg">Message / Brief Overview</label>
            <textarea id="msg" class="form-control" placeholder="Tell us about the project goals, timeline, and scope..." required></textarea>
          </div>

          <button type="submit" class="btn btn-primary" style="width: 100%; justify-content: center;">Send Inquiry</button>
          <p id="formMsg" style="margin-top: 14px; font-size: 13px; color: #10b981; min-height: 20px; font-weight: 500;"></p>
        </form>
      </div>

      <div>
        <h2 style="font-size: 20px; font-weight: 700; margin-bottom: 20px;">Studio Coordinates</h2>
        <div class="pillar-card" style="margin-bottom: 16px;">
          <div class="pillar-num">STUDIO HEADQUARTERS</div>
          <p style="font-size: 14px; color: var(--text); line-height: 1.6;">
            450 Mission Street, Suite 900<br/>
            San Francisco, CA 94105<br/>
            United States
          </p>
        </div>

        <div class="pillar-card" style="margin-bottom: 16px;">
          <div class="pillar-num">ELECTRONIC INQUIRIES</div>
          <p style="font-size: 14px; color: var(--text);">
            General: <a href="mailto:hello@atelier.studio" style="color: var(--accent-text); text-decoration: none;">hello@atelier.studio</a><br/>
            Press: <a href="mailto:press@atelier.studio" style="color: var(--accent-text); text-decoration: none;">press@atelier.studio</a>
          </p>
        </div>

        <div class="pillar-card">
          <div class="pillar-num">TIMEZONE & RESPONSE</div>
          <p style="font-size: 13px; color: var(--text-muted);">
            Pacific Time (PT) · We review new proposals on Tuesdays and Thursdays.
          </p>
        </div>
      </div>
    </div>
  </main>

  <footer>
    <p>&copy; 2026 Atelier Studio · San Francisco · All rights reserved.</p>
  </footer>

  <script>
    if (typeof IntersectionObserver !== 'undefined') {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) entry.target.classList.add('active');
        });
      }, { threshold: 0.1 });
      document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
    } else {
      document.querySelectorAll('.reveal').forEach(el => el.classList.add('active'));
    }

    const themeBtn = document.getElementById('themeBtn');
    let isLight = false;
    if (themeBtn) {
      themeBtn.addEventListener('click', () => {
        isLight = !isLight;
        document.documentElement.setAttribute('data-theme', isLight ? 'light' : 'dark');
        themeBtn.textContent = isLight ? '🌙 Dark' : '☀️ Light';
      });
    }
  </script>
</body>
</html>
`,
  },
];
