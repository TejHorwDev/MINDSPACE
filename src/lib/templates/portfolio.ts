// src/lib/templates/portfolio.ts
// Premium Starter Template: "Simple Portfolio"
// Classic, professional, restrained design — zero neon, dark & light mode support, 4 designated photo slots.

import {
  PROFILE_AVATAR_PLACEHOLDER,
  PROJECT_1_PLACEHOLDER,
  PROJECT_2_PLACEHOLDER,
  PROJECT_3_PLACEHOLDER,
} from "./placeholders";

export const PORTFOLIO_FILES: { path: string; content: string }[] = [
  {
    path: "index.html",
    content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Alex Chen · Design Engineer & Systems Builder</title>
  <style>
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
      -webkit-font-smoothing: antialiased;
      transition: background-color 0.2s ease, color 0.2s ease;
    }

    .container {
      max-width: 820px;
      margin: 0 auto;
      padding: 0 24px;
    }

    /* NAV */
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
      height: 60px;
    }
    .brand {
      font-weight: 600;
      font-size: 15px;
      letter-spacing: -0.01em;
      color: var(--text);
      text-decoration: none;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .nav-links {
      display: flex;
      align-items: center;
      gap: 20px;
    }
    .nav-links a {
      color: var(--text-muted);
      text-decoration: none;
      font-size: 14px;
      font-weight: 500;
      transition: color 0.15s ease;
    }
    .nav-links a:hover { color: var(--text); }
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

    /* HERO */
    .hero {
      padding: 80px 0 64px;
    }
    .hero-grid {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 36px;
    }
    .hero-content {
      flex: 1;
    }
    .status-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 10px;
      border-radius: 9999px;
      background: var(--accent-subtle);
      border: 1px solid color-mix(in srgb, var(--accent) 30%, transparent);
      color: var(--accent-text);
      font-size: 12px;
      font-weight: 500;
      margin-bottom: 20px;
    }
    .status-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #10b981;
    }
    h1 {
      font-size: clamp(32px, 5.5vw, 48px);
      font-weight: 700;
      line-height: 1.15;
      letter-spacing: -0.03em;
      margin-bottom: 16px;
    }
    .lead {
      color: var(--text-muted);
      font-size: 17px;
      line-height: 1.6;
      max-width: 54ch;
      margin-bottom: 28px;
    }
    .hero-actions {
      display: flex;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
    }
    .btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 11px 20px;
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

    /* PROFILE PHOTO SLOT */
    .avatar-wrapper {
      flex-shrink: 0;
      position: relative;
    }
    .profile-avatar {
      width: 140px;
      height: 140px;
      border-radius: 20px;
      object-fit: cover;
      display: block;
      border: 1px solid var(--border);
      box-shadow: 0 10px 24px -4px rgba(0, 0, 0, 0.25);
      cursor: pointer;
      transition: transform 0.2s ease, border-color 0.2s ease;
    }
    .profile-avatar:hover {
      transform: scale(1.02);
      border-color: var(--border-hover);
    }

    /* SECTIONS */
    .section {
      padding: 64px 0 0;
      border-top: 1px solid var(--border);
    }
    .section-header {
      margin-bottom: 32px;
    }
    .eyebrow {
      font-size: 12px;
      font-weight: 600;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: var(--accent-text);
      margin-bottom: 8px;
    }
    h2 {
      font-size: 24px;
      font-weight: 700;
      letter-spacing: -0.02em;
    }
    .section-desc {
      color: var(--text-muted);
      font-size: 15px;
      margin-top: 6px;
    }

    /* WORK / PROJECTS */
    .projects-stack {
      display: flex;
      flex-direction: column;
      gap: 28px;
    }
    .project-card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      overflow: hidden;
      transition: border-color 0.2s ease, transform 0.2s ease;
    }
    .project-card:hover {
      border-color: var(--border-hover);
      transform: translateY(-2px);
    }
    .project-thumb-link {
      display: block;
      overflow: hidden;
      background: var(--surface-subtle);
      border-bottom: 1px solid var(--border);
    }
    .project-thumb-img {
      width: 100%;
      height: 260px;
      object-fit: cover;
      display: block;
      transition: transform 0.3s ease;
      cursor: pointer;
    }
    .project-thumb-img:hover {
      transform: scale(1.015);
    }
    .project-info {
      padding: 24px;
    }
    .project-meta {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 8px;
    }
    .project-title {
      font-size: 18px;
      font-weight: 600;
      letter-spacing: -0.01em;
      color: var(--text);
    }
    .project-year {
      font-size: 12px;
      color: var(--text-dim);
      font-family: monospace;
    }
    .project-desc {
      color: var(--text-muted);
      font-size: 14px;
      line-height: 1.6;
      margin-bottom: 16px;
    }
    .project-tags {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }
    .tag {
      font-size: 11px;
      font-weight: 500;
      padding: 3px 8px;
      border-radius: 6px;
      background: var(--surface-subtle);
      border: 1px solid var(--border);
      color: var(--text-muted);
    }

    /* ABOUT & SKILLS */
    .about-grid {
      display: grid;
      grid-template-columns: 1.2fr 0.8fr;
      gap: 36px;
    }
    .bio-text p {
      color: var(--text-muted);
      font-size: 15px;
      line-height: 1.7;
      margin-bottom: 14px;
    }
    .experience-list {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .exp-item {
      padding: 14px;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 8px;
    }
    .exp-role {
      font-size: 14px;
      font-weight: 600;
      color: var(--text);
    }
    .exp-company {
      font-size: 13px;
      color: var(--text-muted);
    }
    .exp-time {
      font-size: 11px;
      color: var(--text-dim);
      font-family: monospace;
      margin-top: 4px;
    }

    .skills-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
      gap: 16px;
    }
    .skill-card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 16px;
    }
    .skill-category {
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--accent-text);
      margin-bottom: 8px;
    }
    .skill-list {
      font-size: 13px;
      color: var(--text-muted);
      line-height: 1.8;
    }

    /* CONTACT */
    .contact-box {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 36px;
      text-align: center;
    }
    .contact-box h3 {
      font-size: 22px;
      font-weight: 700;
      margin-bottom: 8px;
    }
    .contact-box p {
      color: var(--text-muted);
      font-size: 15px;
      max-width: 44ch;
      margin: 0 auto 24px;
    }
    .contact-links {
      display: flex;
      justify-content: center;
      gap: 16px;
      flex-wrap: wrap;
    }
    .contact-link {
      color: var(--text);
      text-decoration: none;
      font-size: 14px;
      font-weight: 600;
      padding: 8px 16px;
      background: var(--surface-subtle);
      border: 1px solid var(--border);
      border-radius: 6px;
      transition: all 0.15s ease;
    }
    .contact-link:hover {
      border-color: var(--border-hover);
      color: var(--accent-text);
    }

    /* FOOTER */
    footer {
      padding: 64px 0 40px;
      text-align: center;
      color: var(--text-dim);
      font-size: 13px;
    }

    /* ENTRANCE ANIMATIONS */
    .reveal {
      opacity: 0;
      transform: translateY(16px);
      transition: opacity 0.6s cubic-bezier(0.16, 1, 0.3, 1), transform 0.6s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .reveal.active {
      opacity: 1;
      transform: translateY(0);
    }

    @media (max-width: 640px) {
      .hero-grid { flex-direction: column-reverse; align-items: center; text-align: center; }
      .lead { margin-left: auto; margin-right: auto; }
      .hero-actions { justify-content: center; }
      .about-grid { grid-template-columns: 1fr; }
      .project-thumb-img { height: 180px; }
    }
  </style>
</head>
<body>
  <!-- NAV -->
  <nav>
    <div class="container nav-inner">
      <a href="#" class="brand">
        <span>Alex Chen</span>
      </a>
      <div class="nav-links">
        <a href="#work">Work</a>
        <a href="#about">About</a>
        <a href="#skills">Stack</a>
        <a href="#contact">Contact</a>
        <button type="button" class="theme-toggle-btn" id="themeBtn" aria-label="Toggle Theme">Theme</button>
      </div>
    </div>
  </nav>

  <main class="container">
    <!-- HERO -->
    <header class="hero reveal active">
      <div class="hero-grid">
        <div class="hero-content">
          <div class="status-badge">
            <span class="status-dot"></span>
            <span>Available for Q3/Q4 Projects</span>
          </div>
          <h1>Crafting interfaces that feel fast, tactile, and obvious.</h1>
          <p class="lead">
            Design engineer based in San Francisco. Specializing in high-performance web applications, design systems, and developer interfaces with zero fluff.
          </p>
          <div class="hero-actions">
            <a href="#work" class="btn btn-primary">View Selected Work</a>
            <a href="#contact" class="btn btn-secondary">Get in Touch</a>
          </div>
        </div>

        <!-- PROFILE PHOTO SLOT -->
        <div class="avatar-wrapper">
          <img
            id="profile-photo"
            data-image-slot="profile"
            class="profile-avatar"
            src="${PROFILE_AVATAR_PLACEHOLDER}"
            alt="Alex Chen Profile Photo"
            title="Profile Photo (Click to replace)"
          />
        </div>
      </div>
    </header>

    <!-- WORK SECTION -->
    <section id="work" class="section reveal">
      <div class="section-header">
        <p class="eyebrow">Portfolio</p>
        <h2>Selected Engineering Projects</h2>
        <p class="section-desc">A selection of recent systems exploring real-time telemetry, token compilation, and workflow engines.</p>
      </div>

      <div class="projects-stack">
        <!-- PROJECT 1 -->
        <article class="project-card">
          <div class="project-thumb-link">
            <img
              class="project-thumb-img"
              data-image-slot="project-1"
              src="${PROJECT_1_PLACEHOLDER}"
              alt="Horizon Telemetry Analytics Dashboard"
              title="Project 1 Thumbnail (Click to replace)"
            />
          </div>
          <div class="project-info">
            <div class="project-meta">
              <h3 class="project-title">Horizon Analytics</h3>
              <span class="project-year">2026</span>
            </div>
            <p class="project-desc">
              High-frequency streaming telemetry client rendering real-time metrics with sub-millisecond canvas buffer updates and zero layout jank.
            </p>
            <div class="project-tags">
              <span class="tag">TypeScript</span>
              <span class="tag">WebSockets</span>
              <span class="tag">Canvas 2D</span>
              <span class="tag">Tailwind</span>
            </div>
          </div>
        </article>

        <!-- PROJECT 2 -->
        <article class="project-card">
          <div class="project-thumb-link">
            <img
              class="project-thumb-img"
              data-image-slot="project-2"
              src="${PROJECT_2_PLACEHOLDER}"
              alt="Pulse Design System and Visual Tokens"
              title="Project 2 Thumbnail (Click to replace)"
            />
          </div>
          <div class="project-info">
            <div class="project-meta">
              <h3 class="project-title">Pulse Design System</h3>
              <span class="project-year">2025</span>
            </div>
            <p class="project-desc">
              Cross-platform design token engine generating zero-runtime CSS tokens and strongly-typed component bindings for distributed product teams.
            </p>
            <div class="project-tags">
              <span class="tag">Design Tokens</span>
              <span class="tag">Radix UI</span>
              <span class="tag">CSS Variables</span>
              <span class="tag">Storybook</span>
            </div>
          </div>
        </article>

        <!-- PROJECT 3 -->
        <article class="project-card">
          <div class="project-thumb-link">
            <img
              class="project-thumb-img"
              data-image-slot="project-3"
              src="${PROJECT_3_PLACEHOLDER}"
              alt="Aether Distributed Cloud Workflow"
              title="Project 3 Thumbnail (Click to replace)"
            />
          </div>
          <div class="project-info">
            <div class="project-meta">
              <h3 class="project-title">Aether Cloud Orchestration</h3>
              <span class="project-year">2025</span>
            </div>
            <p class="project-desc">
              Visual workflow execution graph with interactive timeline replay, live step stepping, and instant container debugging interfaces.
            </p>
            <div class="project-tags">
              <span class="tag">Next.js</span>
              <span class="tag">WebAssembly</span>
              <span class="tag">PostgreSQL</span>
              <span class="tag">Docker</span>
            </div>
          </div>
        </article>
      </div>
    </section>

    <!-- ABOUT SECTION -->
    <section id="about" class="section reveal">
      <div class="section-header">
        <p class="eyebrow">Background</p>
        <h2>About & Philosophy</h2>
      </div>

      <div class="about-grid">
        <div class="bio-text">
          <p>
            I focus on the intersection of interaction design and systems engineering. Great software isn't just about pretty pixels — it's about predictable state, fast paint times, and interactions that respond before your finger lifts.
          </p>
          <p>
            Currently consulting with early-stage infrastructure teams and building open-source tooling for modern web builders.
          </p>
        </div>

        <div class="experience-list">
          <div class="exp-item">
            <div class="exp-role">Staff Design Engineer</div>
            <div class="exp-company">Verve Labs · Core Systems</div>
            <div class="exp-time">2024 — PRESENT</div>
          </div>
          <div class="exp-item">
            <div class="exp-role">Frontend Engineer</div>
            <div class="exp-company">Starlight Studio · Interfaces</div>
            <div class="exp-time">2022 — 2024</div>
          </div>
        </div>
      </div>
    </section>

    <!-- TECH STACK SECTION -->
    <section id="skills" class="section reveal">
      <div class="section-header">
        <p class="eyebrow">Capabilities</p>
        <h2>Technical Stack</h2>
      </div>

      <div class="skills-grid">
        <div class="skill-card">
          <div class="skill-category">Frontend</div>
          <div class="skill-list">TypeScript · Next.js · React · WebGL · CSS Architecture</div>
        </div>
        <div class="skill-card">
          <div class="skill-category">Backend & Data</div>
          <div class="skill-list">Node.js · Go · PostgreSQL · Redis · REST & GraphQL</div>
        </div>
        <div class="skill-card">
          <div class="skill-category">Infrastructure</div>
          <div class="skill-list">Docker · CI/CD Pipelines · Edge Runtime · Cloudflare</div>
        </div>
        <div class="skill-card">
          <div class="skill-category">Design Craft</div>
          <div class="skill-list">Figma · Design Systems · Motion Specs · Micro-Interactions</div>
        </div>
      </div>
    </section>

    <!-- CONTACT SECTION -->
    <section id="contact" class="section reveal">
      <div class="contact-box">
        <h3>Let's build something enduring</h3>
        <p>Whether you have an upcoming project, need architecture advisory, or just want to discuss product engineering, feel free to reach out.</p>
        <div class="contact-links">
          <a href="mailto:alex@alexchen.dev" class="contact-link">alex@alexchen.dev</a>
          <a href="https://github.com" target="_blank" rel="noopener" class="contact-link">GitHub</a>
          <a href="https://linkedin.com" target="_blank" rel="noopener" class="contact-link">LinkedIn</a>
          <a href="https://x.com" target="_blank" rel="noopener" class="contact-link">X (Twitter)</a>
        </div>
      </div>
    </section>

    <footer>
      <p>&copy; 2026 Alex Chen · Crafted with precision · All rights reserved.</p>
    </footer>
  </main>

  <script>
    // Smooth reveal animations on scroll
    if (typeof IntersectionObserver !== 'undefined') {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('active');
          }
        });
      }, { threshold: 0.1 });
      document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
    } else {
      document.querySelectorAll('.reveal').forEach(el => el.classList.add('active'));
    }

    // Dark / Light Theme Toggle
    const themeBtn = document.getElementById('themeBtn');
    let isLight = false;

    function applyTheme(light) {
      isLight = light;
      if (light) {
        document.documentElement.setAttribute('data-theme', 'light');
        if (themeBtn) themeBtn.textContent = '🌙 Dark';
      } else {
        document.documentElement.setAttribute('data-theme', 'dark');
        if (themeBtn) themeBtn.textContent = '☀️ Light';
      }
    }

    if (themeBtn) {
      themeBtn.addEventListener('click', () => {
        applyTheme(!isLight);
      });
    }
  </script>
</body>
</html>
`,
  },
];
