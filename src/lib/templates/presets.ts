export type TemplatePreset = {
  id: string;
  name: string;
  slug: string;
  category: "portfolio" | "landing" | "multi-page" | "club" | "creative" | "business";
  description: string;
  tags: string;
  icon: string;
  isFeatured: boolean;
  files: { path: string; content: string }[];
};

export const TEMPLATE_PRESETS: TemplatePreset[] = [
  // 1. Blank Canvas
  {
    id: "preset-blank",
    name: "Blank Canvas",
    slug: "blank-canvas",
    category: "creative",
    description: "Minimalist, clean starter scaffold with HTML5 boilerplate, modern CSS reset, and connected script.",
    tags: "blank, minimal, starter, boilerplate, clean",
    icon: "Sparkles",
    isFeatured: false,
    files: [
      {
        path: "index.html",
        content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Project · MINDSPACE</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <main class="container">
    <h1>Welcome to Your New Project</h1>
    <p>Start creating your ideas. Edit <code>index.html</code> or <code>styles.css</code> to begin.</p>
    <button id="actionBtn" class="btn">Click Me</button>
  </main>
  <script src="script.js"></script>
</body>
</html>`,
      },
      {
        path: "styles.css",
        content: `* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  background-color: #090d16;
  color: #f1f5f9;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.container {
  max-width: 600px;
  background: #111827;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  padding: 40px;
  text-align: center;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
}

h1 {
  font-size: 2rem;
  margin-bottom: 12px;
  background: linear-gradient(135deg, #a78bfa, #38bdf8);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

p {
  color: #94a3b8;
  margin-bottom: 24px;
  line-height: 1.6;
}

code {
  background: #1e293b;
  padding: 2px 6px;
  border-radius: 4px;
  color: #38bdf8;
  font-family: monospace;
}

.btn {
  background: #6366f1;
  color: #ffffff;
  border: none;
  padding: 12px 28px;
  font-size: 0.95rem;
  font-weight: 600;
  border-radius: 9999px;
  cursor: pointer;
  transition: transform 0.15s ease, background 0.15s ease;
}

.btn:hover {
  background: #4f46e5;
  transform: translateY(-2px);
}`,
      },
      {
        path: "script.js",
        content: `document.getElementById("actionBtn")?.addEventListener("click", () => {
  alert("Ready to build something extraordinary!");
});`,
      },
    ],
  },

  // 2. SaaS & AI Product Landing
  {
    id: "preset-saas",
    name: "Modern SaaS & AI Landing",
    slug: "saas-launchpad",
    category: "landing",
    description: "High-converting SaaS template with animated hero, interactive pricing toggle, features grid, and responsive navbar.",
    tags: "saas, startup, ai, pricing, landing, convert, product",
    icon: "Rocket",
    isFeatured: true,
    files: [
      {
        path: "index.html",
        content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>PulseAI — Intelligent Workflow Automation</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <nav class="navbar">
    <div class="logo">⚡ PulseAI</div>
    <div class="nav-links">
      <a href="#features">Features</a>
      <a href="#pricing">Pricing</a>
      <a href="#testimonials">Reviews</a>
      <a href="#cta" class="nav-btn">Start Free</a>
    </div>
  </nav>

  <header class="hero">
    <div class="badge">🚀 Generative Workflows 2.0</div>
    <h1>Turn Complex Operations Into Autonomous Magic</h1>
    <p class="subtitle">PulseAI combines real-time data streaming with neural workflows to automate customer operations and data pipelines in minutes.</p>
    <div class="hero-actions">
      <input type="email" placeholder="Enter work email..." class="email-input" id="heroEmail">
      <button class="cta-btn" id="signupBtn">Get Started Free</button>
    </div>
    <div class="hero-stats">
      <div class="stat"><span>99.99%</span> Uptime SLA</div>
      <div class="stat"><span>4.9 / 5</span> 2,400+ Reviews</div>
      <div class="stat"><span>14 Days</span> Free Trial</div>
    </div>
  </header>

  <section id="features" class="section">
    <h2 class="section-title">Engineered for Unmatched Precision</h2>
    <div class="grid-3">
      <div class="card">
        <div class="card-icon">⚡</div>
        <h3>Zero-Latency Pipelines</h3>
        <p>Trigger actions across hundreds of SaaS tools simultaneously with microsecond latency.</p>
      </div>
      <div class="card">
        <div class="card-icon">🛡️</div>
        <h3>Zero-Trust Security</h3>
        <p>SOC-2 Type II certified with end-to-end encryption and per-user permission policies.</p>
      </div>
      <div class="card">
        <div class="card-icon">📊</div>
        <h3>Real-Time Telemetry</h3>
        <p>Monitor bottlenecks and token economics in live, interactive graphical dashboards.</p>
      </div>
    </div>
  </section>

  <section id="pricing" class="section pricing-section">
    <h2 class="section-title">Predictable, Transparent Pricing</h2>
    <p class="section-sub">Scale as your team grows. No hidden transaction fees.</p>
    
    <div class="pricing-toggle">
      <span>Monthly</span>
      <input type="checkbox" id="billingToggle">
      <label for="billingToggle" class="switch"></label>
      <span>Annually <span class="discount">Save 20%</span></span>
    </div>

    <div class="grid-3">
      <div class="price-card">
        <h3>Starter</h3>
        <div class="price"><span class="currency">$</span><span class="amount" data-m="19" data-y="15">19</span><span class="period">/mo</span></div>
        <p>Ideal for solo creators and indie builders.</p>
        <button class="plan-btn">Select Starter</button>
      </div>
      <div class="price-card featured">
        <div class="popular-tag">Most Popular</div>
        <h3>Pro Creator</h3>
        <div class="price"><span class="currency">$</span><span class="amount" data-m="49" data-y="39">49</span><span class="period">/mo</span></div>
        <p>Unlimited AI automations, team spaces, and analytics.</p>
        <button class="plan-btn primary">Select Pro</button>
      </div>
      <div class="price-card">
        <h3>Enterprise</h3>
        <div class="price"><span class="currency">$</span><span class="amount" data-m="149" data-y="119">149</span><span class="period">/mo</span></div>
        <p>Dedicated instances, custom models, and 24/7 SLA.</p>
        <button class="plan-btn">Select Enterprise</button>
      </div>
    </div>
  </section>

  <footer class="footer">
    <p>© 2026 PulseAI, Inc. All rights reserved. Built with MINDSPACE Studio.</p>
  </footer>
  <script src="script.js"></script>
</body>
</html>`,
      },
      {
        path: "styles.css",
        content: `* { margin: 0; padding: 0; box-sizing: border-box; }
body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  background: #090d16;
  color: #f8fafc;
  line-height: 1.5;
}
.navbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 48px;
  background: rgba(9, 13, 22, 0.85);
  backdrop-filter: blur(12px);
  position: sticky;
  top: 0;
  z-index: 50;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}
.logo { font-size: 1.25rem; font-weight: 700; color: #fff; }
.nav-links { display: flex; align-items: center; gap: 24px; }
.nav-links a { color: #94a3b8; text-decoration: none; font-size: 0.9rem; transition: color 0.15s; }
.nav-links a:hover { color: #fff; }
.nav-btn {
  background: #6366f1 !important;
  color: #fff !important;
  padding: 8px 18px;
  border-radius: 9999px;
  font-weight: 600;
}
.hero {
  text-align: center;
  padding: 80px 24px 60px;
  max-width: 900px;
  margin: 0 auto;
}
.badge {
  display: inline-block;
  padding: 6px 16px;
  border-radius: 9999px;
  background: rgba(99, 102, 241, 0.15);
  color: #a5b4fc;
  border: 1px solid rgba(99, 102, 241, 0.3);
  font-size: 0.8rem;
  font-weight: 600;
  margin-bottom: 24px;
}
h1 {
  font-size: 3rem;
  font-weight: 800;
  line-height: 1.15;
  margin-bottom: 20px;
  background: linear-gradient(135deg, #ffffff 40%, #a5b4fc 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}
.subtitle {
  font-size: 1.15rem;
  color: #94a3b8;
  max-width: 680px;
  margin: 0 auto 36px;
}
.hero-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
  max-width: 480px;
  margin: 0 auto 48px;
}
.email-input {
  flex: 1;
  padding: 14px 20px;
  border-radius: 9999px;
  background: #1e293b;
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #fff;
  font-size: 0.95rem;
  outline: none;
}
.cta-btn {
  background: #6366f1;
  color: #fff;
  border: none;
  padding: 14px 28px;
  border-radius: 9999px;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
}
.hero-stats {
  display: flex;
  justify-content: center;
  gap: 48px;
  padding-top: 24px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}
.stat { color: #64748b; font-size: 0.85rem; }
.stat span { color: #f8fafc; font-weight: 700; display: block; font-size: 1.1rem; }
.section { padding: 80px 24px; max-width: 1100px; margin: 0 auto; }
.section-title { font-size: 2.2rem; text-align: center; margin-bottom: 48px; }
.grid-3 { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 24px; }
.card, .price-card {
  background: #111827;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 20px;
  padding: 32px;
}
.card-icon { font-size: 2rem; margin-bottom: 16px; }
.card h3 { font-size: 1.2rem; margin-bottom: 12px; }
.card p { color: #94a3b8; font-size: 0.95rem; }
.pricing-section { text-align: center; }
.section-sub { color: #94a3b8; margin-top: -32px; margin-bottom: 36px; }
.pricing-toggle { display: flex; align-items: center; justify-content: center; gap: 12px; margin-bottom: 48px; }
.discount { background: rgba(34, 197, 94, 0.2); color: #4ade80; padding: 2px 8px; border-radius: 9999px; font-size: 0.75rem; font-weight: 700; }
.price-card.featured { border-color: #6366f1; position: relative; }
.popular-tag { position: absolute; top: -12px; left: 50%; transform: translateX(-50%); background: #6366f1; color: #fff; padding: 4px 14px; border-radius: 9999px; font-size: 0.75rem; font-weight: 700; }
.price { font-size: 2.5rem; font-weight: 800; margin: 20px 0 12px; }
.currency { font-size: 1.5rem; vertical-align: top; }
.period { font-size: 1rem; color: #64748b; font-weight: 400; }
.plan-btn { width: 100%; padding: 12px; border-radius: 12px; border: 1px solid rgba(255, 255, 255, 0.15); background: transparent; color: #fff; font-weight: 600; cursor: pointer; margin-top: 24px; }
.plan-btn.primary { background: #6366f1; border-color: #6366f1; }
.footer { border-top: 1px solid rgba(255, 255, 255, 0.08); padding: 40px 24px; text-align: center; color: #64748b; font-size: 0.85rem; }
`,
      },
      {
        path: "script.js",
        content: `const toggle = document.getElementById("billingToggle");
const amounts = document.querySelectorAll(".amount");

toggle?.addEventListener("change", (e) => {
  const isYearly = e.target.checked;
  amounts.forEach((el) => {
    el.textContent = isYearly ? el.getAttribute("data-y") : el.getAttribute("data-m");
  });
});

document.getElementById("signupBtn")?.addEventListener("click", () => {
  const email = document.getElementById("heroEmail")?.value;
  if (!email || !email.includes("@")) {
    alert("Please enter a valid work email!");
    return;
  }
  alert(\`Welcome aboard! We sent a confirmation to \${email}\`);
});`,
      },
    ],
  },

  // 3. Developer Portfolio
  {
    id: "preset-portfolio",
    name: "Developer & Designer Portfolio",
    slug: "developer-showcase",
    category: "portfolio",
    description: "Sleek portfolio with hero, interactive tech stack pills, project case studies, and responsive contact drawer.",
    tags: "portfolio, developer, resume, projects, minimal, dark",
    icon: "User",
    isFeatured: true,
    files: [
      {
        path: "index.html",
        content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Alex Rivera — Full-Stack Engineer & Designer</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <div class="container">
    <header class="header">
      <div class="avatar-ring">
        <div class="avatar">AR</div>
      </div>
      <div class="status-pill">🟢 Available for new projects</div>
      <h1>Alex Rivera</h1>
      <p class="role">Staff Engineer & Creative Developer based in San Francisco.</p>
      <div class="social-links">
        <a href="#github">GitHub</a> · 
        <a href="#twitter">Twitter / X</a> · 
        <a href="#linkedin">LinkedIn</a> · 
        <a href="#email">alex@rivera.dev</a>
      </div>
    </header>

    <section class="section">
      <h2>Tech Stack & Capabilities</h2>
      <div class="pills">
        <span class="pill">TypeScript</span>
        <span class="pill">React / Next.js</span>
        <span class="pill">Node.js</span>
        <span class="pill">Tailwind CSS</span>
        <span class="pill">PostgreSQL</span>
        <span class="pill">GraphQL</span>
        <span class="pill">WebGPU</span>
        <span class="pill">System Design</span>
      </div>
    </section>

    <section class="section">
      <h2>Selected Works</h2>
      <div class="projects-grid">
        <article class="project-card">
          <div class="project-header">
            <h3>HyperVector AI</h3>
            <span class="year">2025</span>
          </div>
          <p>High-throughput semantic vector database built with Rust and WebAssembly.</p>
          <div class="project-tags"><span>Rust</span><span>Wasm</span><span>SIMD</span></div>
        </article>

        <article class="project-card">
          <div class="project-header">
            <h3>Chronos Studio</h3>
            <span class="year">2024</span>
          </div>
          <p>Real-time collaborative audio workstation inside the browser using Web Audio API.</p>
          <div class="project-tags"><span>WebAudio</span><span>Canvas</span><span>WebSockets</span></div>
        </article>
      </div>
    </section>

    <footer class="footer">
      <p>Designed and built with MINDSPACE. Let's build something remarkable.</p>
    </footer>
  </div>
  <script src="script.js"></script>
</body>
</html>`,
      },
      {
        path: "styles.css",
        content: `* { margin: 0; padding: 0; box-sizing: border-box; }
body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  background: #090b10;
  color: #e2e8f0;
  line-height: 1.6;
  padding: 60px 24px;
}
.container { max-width: 720px; margin: 0 auto; }
.header { margin-bottom: 56px; }
.avatar-ring {
  width: 72px; height: 72px; border-radius: 50%;
  background: linear-gradient(135deg, #6366f1, #38bdf8);
  display: flex; align-items: center; justify-content: center;
  margin-bottom: 20px;
}
.avatar {
  width: 66px; height: 66px; border-radius: 50%;
  background: #0f172a; display: flex; align-items: center; justify-content: center;
  font-weight: 700; font-size: 1.25rem; color: #38bdf8;
}
.status-pill {
  display: inline-block; font-size: 0.8rem;
  background: rgba(34, 197, 94, 0.1); color: #4ade80;
  border: 1px solid rgba(34, 197, 94, 0.25);
  padding: 4px 12px; border-radius: 9999px; margin-bottom: 16px;
}
h1 { font-size: 2.2rem; font-weight: 700; color: #fff; margin-bottom: 8px; }
.role { font-size: 1.1rem; color: #94a3b8; margin-bottom: 16px; }
.social-links a { color: #6366f1; text-decoration: none; font-size: 0.9rem; }
.social-links a:hover { text-decoration: underline; }
.section { margin-bottom: 48px; }
.section h2 { font-size: 1.15rem; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 20px; }
.pills { display: flex; flex-wrap: wrap; gap: 8px; }
.pill {
  background: #1e293b; color: #cbd5e1;
  padding: 6px 14px; border-radius: 9999px;
  font-size: 0.85rem; font-weight: 500;
  border: 1px solid rgba(255, 255, 255, 0.06);
}
.projects-grid { display: flex; flex-direction: column; gap: 16px; }
.project-card {
  background: #111827; border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px; padding: 24px; transition: transform 0.15s, border-color 0.15s;
}
.project-card:hover { transform: translateY(-2px); border-color: rgba(99, 102, 241, 0.4); }
.project-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
.project-header h3 { font-size: 1.2rem; color: #fff; }
.year { font-size: 0.85rem; color: #64748b; font-family: monospace; }
.project-card p { color: #94a3b8; font-size: 0.95rem; margin-bottom: 16px; }
.project-tags { display: flex; gap: 8px; }
.project-tags span { font-size: 0.75rem; color: #38bdf8; background: rgba(56, 189, 248, 0.1); padding: 3px 8px; border-radius: 6px; }
.footer { border-top: 1px solid rgba(255, 255, 255, 0.08); padding-top: 24px; color: #64748b; font-size: 0.85rem; }
`,
      },
      {
        path: "script.js",
        content: `console.log("Alex Rivera portfolio loaded cleanly.");`,
      },
    ],
  },

  // 4. Multi-Page Agency Studio
  {
    id: "preset-multipage",
    name: "Multi-Page Agency Studio",
    slug: "studio-multipage",
    category: "multi-page",
    description: "Full multi-page experience (Home, About, Services, Contact) sharing consistent navigation and typography.",
    tags: "multi-page, studio, agency, client, business, creative",
    icon: "Layers",
    isFeatured: true,
    files: [
      {
        path: "index.html",
        content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Kroma Studio — Digital Experiences</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <nav class="navbar">
    <a href="index.html" class="brand">KROMA</a>
    <div class="menu">
      <a href="index.html" class="active">Home</a>
      <a href="about.html">About</a>
      <a href="services.html">Services</a>
      <a href="contact.html">Contact</a>
    </div>
  </nav>

  <main class="hero">
    <h1>We shape memorable brands for bold thinkers.</h1>
    <p>A full-service creative direction & engineering lab partnering with visionaries worldwide.</p>
    <a href="services.html" class="btn">Explore Capabilities →</a>
  </main>
</body>
</html>`,
      },
      {
        path: "about.html",
        content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>About · Kroma Studio</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <nav class="navbar">
    <a href="index.html" class="brand">KROMA</a>
    <div class="menu">
      <a href="index.html">Home</a>
      <a href="about.html" class="active">About</a>
      <a href="services.html">Services</a>
      <a href="contact.html">Contact</a>
    </div>
  </nav>

  <main class="page-container">
    <h2>Philosophy & Craft</h2>
    <p>Founded in 2023, Kroma focuses on the intersection of typography, high-performance web software, and emotional storytelling.</p>
  </main>
</body>
</html>`,
      },
      {
        path: "services.html",
        content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Services · Kroma Studio</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <nav class="navbar">
    <a href="index.html" class="brand">KROMA</a>
    <div class="menu">
      <a href="index.html">Home</a>
      <a href="about.html">About</a>
      <a href="services.html" class="active">Services</a>
      <a href="contact.html">Contact</a>
    </div>
  </nav>

  <main class="page-container">
    <h2>Our Core Capabilities</h2>
    <div class="service-list">
      <div class="service-item"><h3>Brand Architecture</h3><p>Identity systems, voice guidelines, and visual language.</p></div>
      <div class="service-item"><h3>Interactive Web Apps</h3><p>Zero-compromise web applications built on modern stacks.</p></div>
    </div>
  </main>
</body>
</html>`,
      },
      {
        path: "contact.html",
        content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Contact · Kroma Studio</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <nav class="navbar">
    <a href="index.html" class="brand">KROMA</a>
    <div class="menu">
      <a href="index.html">Home</a>
      <a href="about.html">About</a>
      <a href="services.html">Services</a>
      <a href="contact.html" class="active">Contact</a>
    </div>
  </nav>

  <main class="page-container">
    <h2>Initiate a Project</h2>
    <form class="contact-form" onsubmit="event.preventDefault(); alert('Message sent!');">
      <input type="text" placeholder="Your Name" required>
      <input type="email" placeholder="Your Email" required>
      <textarea placeholder="Tell us about your timeline and budget..." rows="4" required></textarea>
      <button type="submit" class="btn">Transmit Inquiry</button>
    </form>
  </main>
</body>
</html>`,
      },
      {
        path: "styles.css",
        content: `* { margin: 0; padding: 0; box-sizing: border-box; }
body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  background: #0a0a0c;
  color: #f5f5f7;
  min-height: 100vh;
}
.navbar {
  display: flex; justify-content: space-between; align-items: center;
  padding: 32px 64px; border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}
.brand { font-size: 1.15rem; font-weight: 800; letter-spacing: 0.15em; color: #fff; text-decoration: none; }
.menu { display: flex; gap: 32px; }
.menu a { color: #888; text-decoration: none; font-size: 0.9rem; transition: color 0.2s; }
.menu a:hover, .menu a.active { color: #fff; }
.hero { max-width: 900px; padding: 120px 64px; }
.hero h1 { font-size: 3.5rem; font-weight: 600; line-height: 1.15; margin-bottom: 24px; }
.hero p { font-size: 1.25rem; color: #888; margin-bottom: 40px; max-width: 600px; }
.btn {
  display: inline-block; background: #fff; color: #000;
  padding: 14px 28px; border-radius: 9999px; text-decoration: none; font-weight: 600; font-size: 0.95rem;
  border: none; cursor: pointer;
}
.page-container { max-width: 800px; padding: 80px 64px; }
.page-container h2 { font-size: 2.5rem; margin-bottom: 24px; }
.page-container p { font-size: 1.15rem; color: #888; line-height: 1.6; }
.service-list { display: flex; flex-direction: column; gap: 32px; margin-top: 40px; }
.service-item h3 { font-size: 1.35rem; margin-bottom: 8px; }
.contact-form { display: flex; flex-direction: column; gap: 16px; margin-top: 32px; }
.contact-form input, .contact-form textarea {
  background: #16161a; border: 1px solid rgba(255, 255, 255, 0.1);
  padding: 14px 18px; border-radius: 8px; color: #fff; font-size: 0.95rem;
}
`,
      },
    ],
  },

  // 5. Club & Hackathon Event
  {
    id: "preset-event",
    name: "Club & Hackathon Summit",
    slug: "hackathon-summit",
    category: "club",
    description: "Event template featuring live countdown timer, speaker spotlights, schedule agenda, and RSVP registration modal.",
    tags: "club, event, hackathon, summit, rsvp, schedule, campus",
    icon: "LayoutTemplate",
    isFeatured: false,
    files: [
      {
        path: "index.html",
        content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>HackNova 2026 — 48H Innovation Sprint</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <header class="hero">
    <div class="event-tag">Oct 24–26 · Kathmandu & Hybrid</div>
    <h1>Build The Next Paradigm</h1>
    <p class="subtitle">$25,000 in Prizes · 500 Builders · 48 Hours</p>
    <div class="countdown" id="countdown">
      <div class="time-box"><span id="days">14</span><label>Days</label></div>
      <div class="time-box"><span id="hours">08</span><label>Hours</label></div>
      <div class="time-box"><span id="minutes">42</span><label>Mins</label></div>
    </div>
    <button class="rsvp-btn" id="openRsvp">Register Now (Free)</button>
  </header>
  <script src="script.js"></script>
</body>
</html>`,
      },
      {
        path: "styles.css",
        content: `* { margin: 0; padding: 0; box-sizing: border-box; }
body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  background: #050508; color: #fff; text-align: center; padding: 80px 24px;
}
.event-tag {
  display: inline-block; padding: 6px 16px; border-radius: 9999px;
  background: rgba(234, 179, 8, 0.15); color: #facc15; font-size: 0.85rem; font-weight: 700; margin-bottom: 24px;
}
h1 { font-size: 3.2rem; font-weight: 900; margin-bottom: 16px; background: linear-gradient(135deg, #facc15, #f97316); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
.subtitle { font-size: 1.2rem; color: #94a3b8; margin-bottom: 40px; }
.countdown { display: flex; justify-content: center; gap: 20px; margin-bottom: 40px; }
.time-box { background: #11131a; border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 12px; padding: 18px 24px; min-width: 90px; }
.time-box span { font-size: 2.2rem; font-weight: 800; display: block; color: #fff; }
.time-box label { font-size: 0.75rem; color: #64748b; text-transform: uppercase; }
.rsvp-btn { background: #eab308; color: #000; border: none; padding: 16px 36px; border-radius: 9999px; font-size: 1rem; font-weight: 700; cursor: pointer; }
`,
      },
      {
        path: "script.js",
        content: `document.getElementById("openRsvp")?.addEventListener("click", () => {
  const name = prompt("Enter your builder name to register for HackNova:");
  if (name) alert(\`Confirmed! Welcome to HackNova, \${name}!\`);
});`,
      },
    ],
  },

  // 6. Creator Link-in-Bio
  {
    id: "preset-bio",
    name: "Creator Link-in-Bio Hub",
    slug: "creator-bio-card",
    category: "creative",
    description: "Mobile-first digital identity card with avatar ring, highlighted links, social pills, and tip jar.",
    tags: "bio, links, mobile, creator, instagram, social, card",
    icon: "Palette",
    isFeatured: false,
    files: [
      {
        path: "index.html",
        content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Maya Lin · Links & Creator Hub</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <div class="bio-card">
    <div class="avatar-wrapper">
      <div class="avatar">ML</div>
    </div>
    <h1>Maya Lin</h1>
    <p class="tagline">3D Artist & Creative Technologist</p>

    <div class="links-list">
      <a href="#youtube" class="bio-link featured">
        <span>🎬</span>
        <span>Latest Video: Blender Geometry Nodes</span>
        <span>→</span>
      </a>
      <a href="#gumroad" class="bio-link">
        <span>📦</span>
        <span>Download Free 3D Shader Pack</span>
        <span>→</span>
      </a>
      <a href="#discord" class="bio-link">
        <span>💬</span>
        <span>Join Community Discord (12k+)</span>
        <span>→</span>
      </a>
      <a href="#portfolio" class="bio-link">
        <span>🎨</span>
        <span>Official Portfolio & Press</span>
        <span>→</span>
      </a>
    </div>

    <div class="footer">
      <span>Built with MINDSPACE Studio</span>
    </div>
  </div>
</body>
</html>`,
      },
      {
        path: "styles.css",
        content: `* { margin: 0; padding: 0; box-sizing: border-box; }
body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  background: linear-gradient(135deg, #111827, #090d16);
  min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 24px;
}
.bio-card {
  width: 100%; max-width: 420px; background: rgba(17, 24, 39, 0.7);
  backdrop-filter: blur(20px); border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 28px; padding: 40px 24px; text-align: center;
}
.avatar-wrapper {
  width: 80px; height: 80px; border-radius: 50%;
  background: linear-gradient(135deg, #ec4899, #8b5cf6);
  margin: 0 auto 16px; display: flex; align-items: center; justify-content: center;
}
.avatar {
  width: 74px; height: 74px; border-radius: 50%; background: #0b0f19;
  display: flex; align-items: center; justify-content: center; font-size: 1.5rem; font-weight: 700; color: #fff;
}
h1 { font-size: 1.4rem; color: #fff; margin-bottom: 4px; }
.tagline { font-size: 0.9rem; color: #94a3b8; margin-bottom: 28px; }
.links-list { display: flex; flex-direction: column; gap: 12px; }
.bio-link {
  display: flex; align-items: center; justify-content: space-between;
  padding: 16px 20px; border-radius: 16px; background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.08); color: #fff; text-decoration: none; font-size: 0.92rem; font-weight: 500;
  transition: transform 0.15s, background 0.15s;
}
.bio-link:hover { transform: translateY(-2px); background: rgba(255, 255, 255, 0.1); }
.bio-link.featured { background: linear-gradient(135deg, rgba(139, 92, 246, 0.25), rgba(236, 72, 153, 0.25)); border-color: rgba(236, 72, 153, 0.4); }
.footer { margin-top: 32px; font-size: 0.75rem; color: #64748b; }
`,
      },
    ],
  },
];

export const CODE_SNIPPETS = [
  {
    name: "Tailwind CSS CDN",
    description: "Instant modern styling with Tailwind CDN in <head>",
    snippet: `<script src="https://cdn.tailwindcss.com"></script>`,
  },
  {
    name: "Google Fonts (Outfit & Inter)",
    description: "Premium modern web typography link tags",
    snippet: `<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Outfit:wght@500;600;700;800&display=swap" rel="stylesheet">`,
  },
  {
    name: "Glassmorphism Card CSS",
    description: "Frosted translucent glass styling with subtle border",
    snippet: `.glass-card {
  background: rgba(255, 255, 255, 0.04);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 20px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
}`,
  },
  {
    name: "Interactive Modal Dialog JS",
    description: "Simple open and close modal trigger",
    snippet: `const modal = document.getElementById("myModal");
const openBtn = document.getElementById("openModalBtn");
const closeBtn = document.getElementById("closeModalBtn");

openBtn?.addEventListener("click", () => modal.classList.remove("hidden"));
closeBtn?.addEventListener("click", () => modal.classList.add("hidden"));
window.addEventListener("click", (e) => {
  if (e.target === modal) modal.classList.add("hidden");
});`,
  },
];
