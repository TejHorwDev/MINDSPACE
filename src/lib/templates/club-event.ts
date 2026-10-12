// src/lib/templates/club-event.ts
// Premium Starter Template: "Club / Event Landing Page"
// Classic, professional, restrained summit design — zero neon, dark & light mode, 5 designated photo slots.

import {
  EVENT_BANNER_PLACEHOLDER,
  SPEAKER_1_PLACEHOLDER,
  SPEAKER_2_PLACEHOLDER,
  SPEAKER_3_PLACEHOLDER,
  WORKSHOP_PLACEHOLDER,
} from "./placeholders";

export const CLUB_EVENT_FILES: { path: string; content: string }[] = [
  {
    path: "index.html",
    content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>SYNAPSE 2026 · Annual Student Technology Summit</title>
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
      max-width: 920px;
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
      font-weight: 700;
      font-size: 15px;
      letter-spacing: 0.05em;
      color: var(--text);
      text-decoration: none;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .brand-tag {
      font-size: 11px;
      font-weight: 600;
      padding: 2px 6px;
      border-radius: 4px;
      background: var(--accent-subtle);
      color: var(--accent-text);
      border: 1px solid color-mix(in srgb, var(--accent) 30%, transparent);
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
      padding: 72px 0 48px;
      text-align: center;
    }
    .event-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 5px 12px;
      border-radius: 9999px;
      background: var(--surface);
      border: 1px solid var(--border);
      color: var(--accent-text);
      font-size: 12px;
      font-weight: 600;
      margin-bottom: 20px;
      letter-spacing: 0.03em;
    }
    h1 {
      font-size: clamp(34px, 6vw, 54px);
      font-weight: 800;
      line-height: 1.12;
      letter-spacing: -0.03em;
      max-width: 22ch;
      margin: 0 auto 18px;
    }
    .lead {
      color: var(--text-muted);
      font-size: 18px;
      line-height: 1.6;
      max-width: 58ch;
      margin: 0 auto 28px;
    }
    .event-meta-strip {
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 24px;
      flex-wrap: wrap;
      margin-bottom: 32px;
      font-size: 14px;
      color: var(--text-muted);
    }
    .meta-item {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .meta-item strong {
      color: var(--text);
      font-weight: 600;
    }
    .hero-actions {
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 12px;
      margin-bottom: 48px;
      flex-wrap: wrap;
    }
    .btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 12px 24px;
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

    /* HERO BANNER PHOTO SLOT */
    .banner-frame {
      border-radius: var(--radius);
      overflow: hidden;
      border: 1px solid var(--border);
      background: var(--surface);
      box-shadow: 0 16px 36px -8px rgba(0, 0, 0, 0.35);
      position: relative;
    }
    .event-hero-banner {
      width: 100%;
      height: 380px;
      object-fit: cover;
      display: block;
      cursor: pointer;
      transition: transform 0.3s ease;
    }
    .event-hero-banner:hover {
      transform: scale(1.01);
    }

    /* SECTIONS */
    .section {
      padding: 72px 0 0;
      border-top: 1px solid var(--border);
      margin-top: 48px;
    }
    .section-header {
      margin-bottom: 36px;
      text-align: center;
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
      font-size: 28px;
      font-weight: 700;
      letter-spacing: -0.02em;
    }
    .section-desc {
      color: var(--text-muted);
      font-size: 15px;
      max-width: 52ch;
      margin: 8px auto 0;
    }

    /* SPEAKERS SECTION */
    .speakers-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 24px;
    }
    .speaker-card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 24px;
      text-align: center;
      transition: border-color 0.2s ease, transform 0.2s ease;
    }
    .speaker-card:hover {
      border-color: var(--border-hover);
      transform: translateY(-2px);
    }
    .speaker-avatar-wrapper {
      margin: 0 auto 16px;
      width: 120px;
      height: 120px;
      border-radius: 50%;
      overflow: hidden;
      border: 2px solid var(--border);
    }
    .speaker-avatar {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
      cursor: pointer;
      transition: transform 0.2s ease;
    }
    .speaker-avatar:hover {
      transform: scale(1.04);
    }
    .speaker-name {
      font-size: 17px;
      font-weight: 700;
      color: var(--text);
      margin-bottom: 4px;
    }
    .speaker-title {
      font-size: 13px;
      color: var(--accent-text);
      font-weight: 500;
      margin-bottom: 12px;
    }
    .speaker-bio {
      font-size: 13px;
      color: var(--text-muted);
      line-height: 1.55;
    }

    /* HIGHLIGHTS SECTION */
    .highlight-card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      overflow: hidden;
      display: grid;
      grid-template-columns: 1fr 1fr;
      margin-bottom: 32px;
    }
    .highlight-photo {
      width: 100%;
      height: 100%;
      min-height: 280px;
      object-fit: cover;
      display: block;
      cursor: pointer;
      transition: transform 0.3s ease;
    }
    .highlight-photo:hover {
      transform: scale(1.02);
    }
    .highlight-content {
      padding: 36px;
      display: flex;
      flex-direction: column;
      justify-content: center;
    }
    .highlight-title {
      font-size: 20px;
      font-weight: 700;
      margin-bottom: 12px;
    }
    .highlight-text {
      color: var(--text-muted);
      font-size: 14px;
      line-height: 1.65;
      margin-bottom: 16px;
    }
    .highlight-points {
      list-style: none;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .highlight-points li {
      font-size: 13px;
      color: var(--text);
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .highlight-points li::before {
      content: "•";
      color: var(--accent-text);
      font-size: 18px;
    }

    /* SCHEDULE SECTION */
    .schedule-table {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .slot-row {
      display: grid;
      grid-template-columns: 100px 1fr 140px;
      align-items: center;
      padding: 16px 20px;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 8px;
      transition: border-color 0.15s ease;
    }
    .slot-row:hover {
      border-color: var(--border-hover);
    }
    .slot-time {
      font-family: monospace;
      font-size: 13px;
      font-weight: 600;
      color: var(--accent-text);
    }
    .slot-title {
      font-size: 15px;
      font-weight: 600;
      color: var(--text);
    }
    .slot-speaker {
      font-size: 12px;
      color: var(--text-muted);
      margin-top: 2px;
    }
    .slot-track {
      text-align: right;
      font-size: 11px;
      font-weight: 600;
      color: var(--text-dim);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    /* RSVP SECTION */
    .rsvp-container {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 40px;
      text-align: center;
      max-width: 620px;
      margin: 0 auto;
    }
    .rsvp-form {
      display: flex;
      flex-direction: column;
      gap: 14px;
      margin-top: 24px;
    }
    .form-group {
      display: flex;
      gap: 12px;
    }
    .input-field {
      flex: 1;
      padding: 12px 16px;
      border-radius: 8px;
      border: 1px solid var(--border);
      background: var(--surface-subtle);
      color: var(--text);
      font-size: 14px;
      outline: none;
      transition: border-color 0.15s ease;
    }
    .input-field:focus {
      border-color: var(--accent);
    }
    .rsvp-btn {
      padding: 12px 28px;
      border-radius: 8px;
      background: var(--accent);
      color: #ffffff;
      border: none;
      font-weight: 600;
      font-size: 14px;
      cursor: pointer;
      transition: opacity 0.15s ease;
    }
    .rsvp-btn:hover {
      opacity: 0.92;
    }
    .rsvp-status {
      margin-top: 16px;
      font-size: 14px;
      color: #10b981;
      min-height: 20px;
      font-weight: 500;
    }

    /* FOOTER */
    footer {
      padding: 72px 0 40px;
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

    @media (max-width: 768px) {
      .highlight-card { grid-template-columns: 1fr; }
      .slot-row { grid-template-columns: 80px 1fr; }
      .slot-track { display: none; }
      .form-group { flex-direction: column; }
      .event-hero-banner { height: 240px; }
    }
  </style>
</head>
<body>
  <!-- NAV -->
  <nav>
    <div class="container nav-inner">
      <a href="#" class="brand">
        <span>SYNAPSE</span>
        <span class="brand-tag">2026</span>
      </a>
      <div class="nav-links">
        <a href="#speakers">Speakers</a>
        <a href="#overview">Highlights</a>
        <a href="#schedule">Schedule</a>
        <a href="#rsvp">RSVP</a>
        <button type="button" class="theme-toggle-btn" id="themeBtn" aria-label="Toggle Theme">Theme</button>
      </div>
    </div>
  </nav>

  <main class="container">
    <!-- HERO -->
    <header class="hero reveal active">
      <div class="event-badge">
        <span>ANNUAL TECH SUMMIT · OCTOBER 24–25, 2026</span>
      </div>
      <h1>Where student builders assemble to build what's next.</h1>
      <p class="lead">
        Two days of deep-dive systems engineering, AI interface workshops, and collaborative open-source sprints with builders from across the country.
      </p>

      <div class="event-meta-strip">
        <div class="meta-item">
          <span>Date:</span> <strong>October 24–25, 2026</strong>
        </div>
        <div class="meta-item">
          <span>Venue:</span> <strong>Science Center Hall A</strong>
        </div>
        <div class="meta-item">
          <span>Seats:</span> <strong>350 Builders Max</strong>
        </div>
      </div>

      <div class="hero-actions">
        <a href="#rsvp" class="btn btn-primary">Reserve Your Ticket</a>
        <a href="#schedule" class="btn btn-secondary">Explore Schedule</a>
      </div>

      <!-- HERO BANNER PHOTO SLOT -->
      <div class="banner-frame">
        <img
          id="hero-banner-image"
          data-image-slot="event-banner"
          class="event-hero-banner"
          src="${EVENT_BANNER_PLACEHOLDER}"
          alt="Synapse 2026 Summit Keynote Stage Banner"
          title="Summit Stage Banner (Click to replace)"
        />
      </div>
    </header>

    <!-- SPEAKERS SECTION -->
    <section id="speakers" class="section reveal">
      <div class="section-header">
        <p class="eyebrow">Keynotes & Mentors</p>
        <h2>Featured Speakers</h2>
        <p class="section-desc">Industry practitioners and pioneering researchers sharing insights from the cutting edge of software systems.</p>
      </div>

      <div class="speakers-grid">
        <!-- SPEAKER 1 -->
        <article class="speaker-card">
          <div class="speaker-avatar-wrapper">
            <img
              class="speaker-avatar"
              data-image-slot="speaker-1"
              src="${SPEAKER_1_PLACEHOLDER}"
              alt="Dr. Elena Vance Avatar"
              title="Speaker 1 Photo (Click to replace)"
            />
          </div>
          <h3 class="speaker-name">Dr. Elena Vance</h3>
          <div class="speaker-title">Principal AI Scientist · Frontier Labs</div>
          <p class="speaker-bio">Leading research on local model inference, memory compression, and low-latency agent orchestration.</p>
        </article>

        <!-- SPEAKER 2 -->
        <article class="speaker-card">
          <div class="speaker-avatar-wrapper">
            <img
              class="speaker-avatar"
              data-image-slot="speaker-2"
              src="${SPEAKER_2_PLACEHOLDER}"
              alt="Marcus Thorne Avatar"
              title="Speaker 2 Photo (Click to replace)"
            />
          </div>
          <h3 class="speaker-name">Marcus Thorne</h3>
          <div class="speaker-title">Head of Infrastructure · CoreOS</div>
          <p class="speaker-bio">Architecting distributed microkernel runtimes, WebAssembly sandboxing, and edge mesh networking.</p>
        </article>

        <!-- SPEAKER 3 -->
        <article class="speaker-card">
          <div class="speaker-avatar-wrapper">
            <img
              class="speaker-avatar"
              data-image-slot="speaker-3"
              src="${SPEAKER_3_PLACEHOLDER}"
              alt="Sarah Lin Avatar"
              title="Speaker 3 Photo (Click to replace)"
            />
          </div>
          <h3 class="speaker-name">Sarah Lin</h3>
          <div class="speaker-title">Design Partner · Studio Minimal</div>
          <p class="speaker-bio">Pioneering interface ergonomics, typographic constraint, and tactile design systems for developers.</p>
        </article>
      </div>
    </section>

    <!-- SUMMIT HIGHLIGHTS -->
    <section id="overview" class="section reveal">
      <div class="section-header">
        <p class="eyebrow">Experience</p>
        <h2>Summit Highlights</h2>
        <p class="section-desc">More than presentations — engage in collaborative build sprints, live code reviews, and networking.</p>
      </div>

      <div class="highlight-card">
        <img
          id="workshop-photo"
          data-image-slot="workshop-photo"
          class="highlight-photo"
          src="${WORKSHOP_PLACEHOLDER}"
          alt="Synapse Interactive Collaborative Workshop"
          title="Workshop Photo (Click to replace)"
        />
        <div class="highlight-content">
          <h3 class="highlight-title">Hands-On Sprints & Mentorship</h3>
          <p class="highlight-text">
            Work directly with staff engineers from leading technology companies. Build working prototypes over 48 intensive hours with immediate feedback.
          </p>
          <ul class="highlight-points">
            <li>Dedicated hardware and GPU compute clusters</li>
            <li>Direct 1-on-1 code reviews with staff engineers</li>
            <li>$25,000 in non-dilutive open-source project grants</li>
          </ul>
        </div>
      </div>
    </section>

    <!-- SCHEDULE SECTION -->
    <section id="schedule" class="section reveal">
      <div class="section-header">
        <p class="eyebrow">Program</p>
        <h2>Event Schedule</h2>
        <p class="section-desc">Two tracks of technical depth and engineering execution.</p>
      </div>

      <div class="schedule-table">
        <div class="slot-row">
          <div class="slot-time">09:00 AM</div>
          <div>
            <div class="slot-title">Opening Keynote: The Next Decade in Distributed Computing</div>
            <div class="slot-speaker">Dr. Elena Vance · Main Auditorium</div>
          </div>
          <div class="slot-track">Main Track</div>
        </div>

        <div class="slot-row">
          <div class="slot-time">11:00 AM</div>
          <div>
            <div class="slot-title">Workshop: Building Safe Microkernels with Rust & Wasm</div>
            <div class="slot-speaker">Marcus Thorne · Engineering Lab 3</div>
          </div>
          <div class="slot-track">Hands-on</div>
        </div>

        <div class="slot-row">
          <div class="slot-time">02:00 PM</div>
          <div>
            <div class="slot-title">Tactile Interfaces: Design Engineering for Technical Products</div>
            <div class="slot-speaker">Sarah Lin · Design Studio 1</div>
          </div>
          <div class="slot-track">Design</div>
        </div>

        <div class="slot-row">
          <div class="slot-time">05:00 PM</div>
          <div>
            <div class="slot-title">Open Sprint Demos & Community Reception</div>
            <div class="slot-speaker">All Attendees · Grand Atrium</div>
          </div>
          <div class="slot-track">Social</div>
        </div>
      </div>
    </section>

    <!-- RSVP SECTION -->
    <section id="rsvp" class="section reveal">
      <div class="rsvp-container">
        <p class="eyebrow">Registration</p>
        <h2>Secure Your Seat</h2>
        <p>Admission is free for verified students and academic researchers. Attendance is capped at 350 to ensure high-quality collaboration.</p>

        <form class="rsvp-form" id="rsvpForm" onsubmit="event.preventDefault(); document.getElementById('rsvpStatus').textContent = 'Thank you! Your invitation packet has been sent to your email.';">
          <div class="form-group">
            <input type="text" class="input-field" placeholder="Full Name" required />
            <input type="email" class="input-field" placeholder="University / Academic Email" required />
          </div>
          <button type="submit" class="rsvp-btn">Submit RSVP Application</button>
          <div class="rsvp-status" id="rsvpStatus"></div>
        </form>
      </div>
    </section>

    <footer>
      <p>&copy; 2026 SYNAPSE Tech Collective · Campus Engineering Chapter · All rights reserved.</p>
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
