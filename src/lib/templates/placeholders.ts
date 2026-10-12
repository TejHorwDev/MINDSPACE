// src/lib/templates/placeholders.ts
// Crisp, classic-professional offline SVG data URIs for starter template photo slots.
// Zero external network dependencies, classic slate/indigo palette, no neon.

function svgToDataUri(svg: string): string {
  const cleanSvg = svg.trim().replace(/\s+/g, " ");
  return `data:image/svg+xml;base64,${Buffer.from(cleanSvg).toString("base64")}`;
}

export const PROFILE_AVATAR_PLACEHOLDER = svgToDataUri(`
<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400" fill="none">
  <defs>
    <linearGradient id="avatarBg" x1="0" y1="0" x2="400" y2="400" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#181b26"/>
      <stop offset="100%" stop-color="#0f1118"/>
    </linearGradient>
    <linearGradient id="avatarAccent" x1="0" y1="0" x2="400" y2="400" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#312e81"/>
      <stop offset="100%" stop-color="#1e1b4b"/>
    </linearGradient>
  </defs>
  <rect width="400" height="400" rx="32" fill="url(#avatarBg)"/>
  <rect x="1" y="1" width="398" height="398" rx="31" stroke="#27272a" stroke-width="2"/>
  <circle cx="200" cy="155" r="58" fill="url(#avatarAccent)" stroke="#4338ca" stroke-width="3"/>
  <path d="M110 320 C110 245, 150 220, 200 220 C250 220, 290 245, 290 320 Z" fill="url(#avatarAccent)" stroke="#4338ca" stroke-width="3"/>
  <circle cx="200" cy="155" r="28" fill="#e0e7ff" opacity="0.85"/>
  <rect x="90" y="340" width="220" height="28" rx="6" fill="#18181b" stroke="#3f3f46" stroke-width="1.5"/>
  <text x="200" y="358" font-family="system-ui, -apple-system, sans-serif" font-size="11" font-weight="600" fill="#a1a1aa" text-anchor="middle" letter-spacing="1.5">PHOTO SLOT · CLICK TO EDIT</text>
</svg>
`);

export const PROJECT_1_PLACEHOLDER = svgToDataUri(`
<svg xmlns="http://www.w3.org/2000/svg" width="800" height="500" viewBox="0 0 800 500" fill="none">
  <defs>
    <linearGradient id="cardBg1" x1="0" y1="0" x2="800" y2="500" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#131622"/>
      <stop offset="100%" stop-color="#0c0e15"/>
    </linearGradient>
  </defs>
  <rect width="800" height="500" rx="16" fill="url(#cardBg1)"/>
  <rect x="1" y="1" width="798" height="498" rx="15" stroke="#27272a" stroke-width="1.5"/>
  <!-- Window Chrome -->
  <rect x="24" y="24" width="752" height="452" rx="10" fill="#090a0f" stroke="#27272a" stroke-width="1"/>
  <circle cx="50" cy="50" r="5" fill="#71717a"/>
  <circle cx="68" cy="50" r="5" fill="#52525b"/>
  <circle cx="86" cy="50" r="5" fill="#3f3f46"/>
  <rect x="120" y="42" width="220" height="16" rx="4" fill="#18181b"/>
  <text x="130" y="54" font-family="system-ui, monospace" font-size="10" fill="#71717a">horizon-telemetry.internal</text>
  <!-- Chart & Metrics Mockup -->
  <rect x="50" y="86" width="210" height="84" rx="8" fill="#141724" stroke="#27272a" stroke-width="1"/>
  <text x="68" y="112" font-family="system-ui, sans-serif" font-size="11" fill="#71717a">THROUGHPUT</text>
  <text x="68" y="142" font-family="system-ui, sans-serif" font-size="22" font-weight="700" fill="#f4f4f5">148.2k <tspan font-size="12" fill="#818cf8">req/s</tspan></text>
  <rect x="280" y="86" width="210" height="84" rx="8" fill="#141724" stroke="#27272a" stroke-width="1"/>
  <text x="298" y="112" font-family="system-ui, sans-serif" font-size="11" fill="#71717a">P99 LATENCY</text>
  <text x="298" y="142" font-family="system-ui, sans-serif" font-size="22" font-weight="700" fill="#f4f4f5">1.84 <tspan font-size="12" fill="#818cf8">ms</tspan></text>
  <rect x="510" y="86" width="242" height="84" rx="8" fill="#141724" stroke="#27272a" stroke-width="1"/>
  <text x="528" y="112" font-family="system-ui, sans-serif" font-size="11" fill="#71717a">AVAILABILITY</text>
  <text x="528" y="142" font-family="system-ui, sans-serif" font-size="22" font-weight="700" fill="#f4f4f5">99.995 <tspan font-size="12" fill="#818cf8">%</tspan></text>
  <!-- Graph Visualization -->
  <rect x="50" y="190" width="702" height="250" rx="8" fill="#11131c" stroke="#27272a" stroke-width="1"/>
  <path d="M70 380 Q 180 320, 260 340 T 420 280 T 580 250 T 730 220" fill="none" stroke="#4f46e5" stroke-width="3"/>
  <path d="M70 410 Q 180 380, 260 390 T 420 360 T 580 330 T 730 310" fill="none" stroke="#64748b" stroke-width="1.5" stroke-dasharray="4 4"/>
  <rect x="290" y="440" width="220" height="24" rx="5" fill="#18181b" stroke="#3f3f46" stroke-width="1"/>
  <text x="400" y="456" font-family="system-ui, sans-serif" font-size="10" font-weight="600" fill="#a1a1aa" text-anchor="middle" letter-spacing="1">PROJECT IMAGE SLOT · CLICK TO EDIT</text>
</svg>
`);

export const PROJECT_2_PLACEHOLDER = svgToDataUri(`
<svg xmlns="http://www.w3.org/2000/svg" width="800" height="500" viewBox="0 0 800 500" fill="none">
  <defs>
    <linearGradient id="cardBg2" x1="0" y1="0" x2="800" y2="500" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#141724"/>
      <stop offset="100%" stop-color="#0a0c12"/>
    </linearGradient>
  </defs>
  <rect width="800" height="500" rx="16" fill="url(#cardBg2)"/>
  <rect x="1" y="1" width="798" height="498" rx="15" stroke="#27272a" stroke-width="1.5"/>
  <!-- Design System Components Grid -->
  <rect x="40" y="40" width="220" height="190" rx="10" fill="#0e1017" stroke="#27272a" stroke-width="1"/>
  <text x="60" y="70" font-family="system-ui, sans-serif" font-size="13" font-weight="600" fill="#f4f4f5">Button Primitives</text>
  <rect x="60" y="90" width="180" height="34" rx="6" fill="#4338ca"/>
  <text x="150" y="112" font-family="system-ui, sans-serif" font-size="12" font-weight="600" fill="#ffffff" text-anchor="middle">Primary Action</text>
  <rect x="60" y="136" width="180" height="34" rx="6" fill="#18181b" stroke="#3f3f46" stroke-width="1"/>
  <text x="150" y="158" font-family="system-ui, sans-serif" font-size="12" font-weight="500" fill="#d4d4d8" text-anchor="middle">Secondary Outline</text>
  <rect x="60" y="182" width="180" height="34" rx="6" fill="#090a0f"/>
  <text x="150" y="204" font-family="system-ui, sans-serif" font-size="12" font-weight="500" fill="#a1a1aa" text-anchor="middle">Ghost Variant</text>

  <rect x="290" y="40" width="470" height="190" rx="10" fill="#0e1017" stroke="#27272a" stroke-width="1"/>
  <text x="314" y="70" font-family="system-ui, sans-serif" font-size="13" font-weight="600" fill="#f4f4f5">Token Hierarchy & Typography Scale</text>
  <text x="314" y="105" font-family="system-ui, sans-serif" font-size="24" font-weight="700" fill="#ffffff">Display 24pt · Semibold</text>
  <text x="314" y="135" font-family="system-ui, sans-serif" font-size="16" font-weight="500" fill="#d4d4d8">Heading 16pt · Medium Regular</text>
  <text x="314" y="162" font-family="system-ui, sans-serif" font-size="13" fill="#a1a1aa">Body copy 13pt · High legibility paragraph style with 1.6em line-height</text>
  <text x="314" y="185" font-family="monospace" font-size="11" fill="#818cf8">--font-mono: "Geist Mono", monospace</text>

  <!-- Color Chips -->
  <rect x="40" y="254" width="720" height="170" rx="10" fill="#0e1017" stroke="#27272a" stroke-width="1"/>
  <text x="64" y="284" font-family="system-ui, sans-serif" font-size="13" font-weight="600" fill="#f4f4f5">Neutral & Accent Color Spectrum</text>
  <rect x="64" y="304" width="96" height="54" rx="6" fill="#090a0f" stroke="#27272a" stroke-width="1"/>
  <rect x="172" y="304" width="96" height="54" rx="6" fill="#18181b"/>
  <rect x="280" y="304" width="96" height="54" rx="6" fill="#27272a"/>
  <rect x="388" y="304" width="96" height="54" rx="6" fill="#3f3f46"/>
  <rect x="496" y="304" width="96" height="54" rx="6" fill="#312e81"/>
  <rect x="604" y="304" width="96" height="54" rx="6" fill="#4338ca"/>

  <rect x="290" y="440" width="220" height="24" rx="5" fill="#18181b" stroke="#3f3f46" stroke-width="1"/>
  <text x="400" y="456" font-family="system-ui, sans-serif" font-size="10" font-weight="600" fill="#a1a1aa" text-anchor="middle" letter-spacing="1">PROJECT IMAGE SLOT · CLICK TO EDIT</text>
</svg>
`);

export const PROJECT_3_PLACEHOLDER = svgToDataUri(`
<svg xmlns="http://www.w3.org/2000/svg" width="800" height="500" viewBox="0 0 800 500" fill="none">
  <defs>
    <linearGradient id="cardBg3" x1="0" y1="0" x2="800" y2="500" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#121520"/>
      <stop offset="100%" stop-color="#090b10"/>
    </linearGradient>
  </defs>
  <rect width="800" height="500" rx="16" fill="url(#cardBg3)"/>
  <rect x="1" y="1" width="798" height="498" rx="15" stroke="#27272a" stroke-width="1.5"/>
  <!-- Pipeline Graph Nodes -->
  <rect x="60" y="190" width="160" height="90" rx="10" fill="#141724" stroke="#4338ca" stroke-width="2"/>
  <circle cx="85" cy="215" r="8" fill="#4338ca"/>
  <text x="105" y="220" font-family="system-ui, sans-serif" font-size="12" font-weight="600" fill="#f4f4f5">Source Trigger</text>
  <text x="85" y="250" font-family="monospace" font-size="10" fill="#a1a1aa">git:push main</text>

  <line x1="220" y1="235" x2="310" y2="235" stroke="#4338ca" stroke-width="2" stroke-dasharray="4 4"/>

  <rect x="310" y="190" width="180" height="90" rx="10" fill="#141724" stroke="#27272a" stroke-width="1.5"/>
  <circle cx="335" cy="215" r="8" fill="#6366f1"/>
  <text x="355" y="220" font-family="system-ui, sans-serif" font-size="12" font-weight="600" fill="#f4f4f5">Wasm Sandbox</text>
  <text x="335" y="250" font-family="monospace" font-size="10" fill="#a1a1aa">exec:isolate 24ms</text>

  <line x1="490" y1="235" x2="580" y2="235" stroke="#4338ca" stroke-width="2" stroke-dasharray="4 4"/>

  <rect x="580" y="190" width="160" height="90" rx="10" fill="#141724" stroke="#27272a" stroke-width="1.5"/>
  <circle cx="605" cy="215" r="8" fill="#10b981"/>
  <text x="625" y="220" font-family="system-ui, sans-serif" font-size="12" font-weight="600" fill="#f4f4f5">Edge Deploy</text>
  <text x="605" y="250" font-family="monospace" font-size="10" fill="#a1a1aa">status: 200 OK</text>

  <rect x="290" y="440" width="220" height="24" rx="5" fill="#18181b" stroke="#3f3f46" stroke-width="1"/>
  <text x="400" y="456" font-family="system-ui, sans-serif" font-size="10" font-weight="600" fill="#a1a1aa" text-anchor="middle" letter-spacing="1">PROJECT IMAGE SLOT · CLICK TO EDIT</text>
</svg>
`);

export const EVENT_BANNER_PLACEHOLDER = svgToDataUri(`
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="500" viewBox="0 0 1200 500" fill="none">
  <defs>
    <linearGradient id="eventBg" x1="0" y1="0" x2="1200" y2="500" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#141726"/>
      <stop offset="60%" stop-color="#0e1019"/>
      <stop offset="100%" stop-color="#08090e"/>
    </linearGradient>
    <linearGradient id="eventGlow" x1="600" y1="0" x2="600" y2="500" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#312e81" stop-opacity="0.35"/>
      <stop offset="100%" stop-color="#312e81" stop-opacity="0"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="500" rx="20" fill="url(#eventBg)"/>
  <rect width="1200" height="500" rx="20" fill="url(#eventGlow)"/>
  <rect x="1" y="1" width="1198" height="498" rx="19" stroke="#27272a" stroke-width="2"/>
  <!-- Stage Gridlines -->
  <line x1="200" y1="0" x2="200" y2="500" stroke="#1f2333" stroke-width="1"/>
  <line x1="400" y1="0" x2="400" y2="500" stroke="#1f2333" stroke-width="1"/>
  <line x1="600" y1="0" x2="600" y2="500" stroke="#1f2333" stroke-width="1"/>
  <line x1="800" y1="0" x2="800" y2="500" stroke="#1f2333" stroke-width="1"/>
  <line x1="1000" y1="0" x2="1000" y2="500" stroke="#1f2333" stroke-width="1"/>
  <!-- Center Stage Graphic -->
  <circle cx="600" cy="220" r="110" fill="#181b2a" stroke="#4338ca" stroke-width="2.5"/>
  <circle cx="600" cy="220" r="65" fill="#202538" stroke="#6366f1" stroke-width="2"/>
  <text x="600" y="215" font-family="system-ui, sans-serif" font-size="28" font-weight="800" fill="#ffffff" text-anchor="middle" letter-spacing="4">SYNAPSE</text>
  <text x="600" y="242" font-family="monospace" font-size="14" font-weight="600" fill="#818cf8" text-anchor="middle" letter-spacing="2">2026 SUMMIT</text>
  <text x="600" y="380" font-family="system-ui, sans-serif" font-size="14" fill="#94a3b8" text-anchor="middle" letter-spacing="1">STUDENT TECH COLLECTIVE · OCTOBER 24–25</text>
  <rect x="470" y="440" width="260" height="28" rx="6" fill="#18181b" stroke="#3f3f46" stroke-width="1.5"/>
  <text x="600" y="458" font-family="system-ui, sans-serif" font-size="11" font-weight="600" fill="#a1a1aa" text-anchor="middle" letter-spacing="1.5">HERO BANNER SLOT · CLICK TO EDIT</text>
</svg>
`);

export const SPEAKER_1_PLACEHOLDER = svgToDataUri(`
<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400" fill="none">
  <rect width="400" height="400" rx="20" fill="#131622"/>
  <rect x="1" y="1" width="398" height="398" rx="19" stroke="#27272a" stroke-width="1.5"/>
  <circle cx="200" cy="155" r="54" fill="#24283b" stroke="#4338ca" stroke-width="2"/>
  <path d="M120 310 C120 245, 155 220, 200 220 C245 220, 280 245, 280 310 Z" fill="#24283b" stroke="#4338ca" stroke-width="2"/>
  <circle cx="200" cy="155" r="26" fill="#818cf8" opacity="0.8"/>
  <text x="200" y="340" font-family="system-ui, sans-serif" font-size="13" font-weight="700" fill="#f4f4f5" text-anchor="middle">Dr. Elena Vance</text>
  <text x="200" y="360" font-family="system-ui, sans-serif" font-size="11" fill="#71717a" text-anchor="middle">SPEAKER SLOT · CLICK TO EDIT</text>
</svg>
`);

export const SPEAKER_2_PLACEHOLDER = svgToDataUri(`
<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400" fill="none">
  <rect width="400" height="400" rx="20" fill="#131622"/>
  <rect x="1" y="1" width="398" height="398" rx="19" stroke="#27272a" stroke-width="1.5"/>
  <circle cx="200" cy="155" r="54" fill="#24283b" stroke="#3b82f6" stroke-width="2"/>
  <path d="M120 310 C120 245, 155 220, 200 220 C245 220, 280 245, 280 310 Z" fill="#24283b" stroke="#3b82f6" stroke-width="2"/>
  <circle cx="200" cy="155" r="26" fill="#60a5fa" opacity="0.8"/>
  <text x="200" y="340" font-family="system-ui, sans-serif" font-size="13" font-weight="700" fill="#f4f4f5" text-anchor="middle">Marcus Thorne</text>
  <text x="200" y="360" font-family="system-ui, sans-serif" font-size="11" fill="#71717a" text-anchor="middle">SPEAKER SLOT · CLICK TO EDIT</text>
</svg>
`);

export const SPEAKER_3_PLACEHOLDER = svgToDataUri(`
<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400" fill="none">
  <rect width="400" height="400" rx="20" fill="#131622"/>
  <rect x="1" y="1" width="398" height="398" rx="19" stroke="#27272a" stroke-width="1.5"/>
  <circle cx="200" cy="155" r="54" fill="#24283b" stroke="#10b981" stroke-width="2"/>
  <path d="M120 310 C120 245, 155 220, 200 220 C245 220, 280 245, 280 310 Z" fill="#24283b" stroke="#10b981" stroke-width="2"/>
  <circle cx="200" cy="155" r="26" fill="#34d399" opacity="0.8"/>
  <text x="200" y="340" font-family="system-ui, sans-serif" font-size="13" font-weight="700" fill="#f4f4f5" text-anchor="middle">Sarah Lin</text>
  <text x="200" y="360" font-family="system-ui, sans-serif" font-size="11" fill="#71717a" text-anchor="middle">SPEAKER SLOT · CLICK TO EDIT</text>
</svg>
`);

export const WORKSHOP_PLACEHOLDER = svgToDataUri(`
<svg xmlns="http://www.w3.org/2000/svg" width="800" height="500" viewBox="0 0 800 500" fill="none">
  <rect width="800" height="500" rx="16" fill="#10131d"/>
  <rect x="1" y="1" width="798" height="498" rx="15" stroke="#27272a" stroke-width="1.5"/>
  <rect x="40" y="40" width="720" height="380" rx="12" fill="#161926" stroke="#27272a" stroke-width="1"/>
  <!-- Collaborative workshop tables scene representation -->
  <rect x="80" y="80" width="280" height="140" rx="8" fill="#1f2334" stroke="#3730a3" stroke-width="1.5"/>
  <text x="100" y="115" font-family="system-ui, sans-serif" font-size="14" font-weight="700" fill="#ffffff">Hands-On Systems Lab</text>
  <text x="100" y="145" font-family="system-ui, sans-serif" font-size="12" fill="#94a3b8">Interactive microkernel build sprint with mentoring from engineering leads.</text>
  <rect x="440" y="80" width="280" height="140" rx="8" fill="#1f2334" stroke="#27272a" stroke-width="1"/>
  <text x="460" y="115" font-family="system-ui, sans-serif" font-size="14" font-weight="700" fill="#ffffff">Architecture Clinic</text>
  <text x="460" y="145" font-family="system-ui, sans-serif" font-size="12" fill="#94a3b8">1-on-1 code reviews, API design stress testing, and concurrency debugging.</text>
  <rect x="290" y="440" width="220" height="24" rx="5" fill="#18181b" stroke="#3f3f46" stroke-width="1"/>
  <text x="400" y="456" font-family="system-ui, sans-serif" font-size="10" font-weight="600" fill="#a1a1aa" text-anchor="middle" letter-spacing="1">EVENT PHOTO SLOT · CLICK TO EDIT</text>
</svg>
`);

export const STUDIO_HERO_PLACEHOLDER = svgToDataUri(`
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="600" viewBox="0 0 1200 600" fill="none">
  <defs>
    <linearGradient id="studioHeroBg" x1="0" y1="0" x2="1200" y2="600" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#14161f"/>
      <stop offset="100%" stop-color="#0b0d13"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="600" rx="20" fill="url(#studioHeroBg)"/>
  <rect x="1" y="1" width="1198" height="598" rx="19" stroke="#27272a" stroke-width="2"/>
  <!-- Minimalist Studio Architectural Geometry -->
  <line x1="100" y1="500" x2="600" y2="100" stroke="#27272a" stroke-width="1"/>
  <line x1="600" y1="100" x2="1100" y2="500" stroke="#27272a" stroke-width="1"/>
  <line x1="100" y1="500" x2="1100" y2="500" stroke="#27272a" stroke-width="1"/>
  <circle cx="600" cy="300" r="140" stroke="#312e81" stroke-width="1.5" stroke-dasharray="6 6"/>
  <text x="600" y="295" font-family="system-ui, -apple-system, sans-serif" font-size="28" font-weight="300" fill="#f4f4f5" text-anchor="middle" letter-spacing="6">ATELIER STUDIO</text>
  <text x="600" y="325" font-family="monospace" font-size="12" fill="#818cf8" text-anchor="middle" letter-spacing="3">CRAFT · CODE · SPACE</text>
  <rect x="470" y="540" width="260" height="28" rx="6" fill="#18181b" stroke="#3f3f46" stroke-width="1.5"/>
  <text x="600" y="558" font-family="system-ui, sans-serif" font-size="11" font-weight="600" fill="#a1a1aa" text-anchor="middle" letter-spacing="1.5">HERO IMAGE SLOT · CLICK TO EDIT</text>
</svg>
`);

export const STUDIO_TEAM_PLACEHOLDER = svgToDataUri(`
<svg xmlns="http://www.w3.org/2000/svg" width="800" height="500" viewBox="0 0 800 500" fill="none">
  <rect width="800" height="500" rx="16" fill="#12141c"/>
  <rect x="1" y="1" width="798" height="498" rx="15" stroke="#27272a" stroke-width="1.5"/>
  <!-- Minimalist Team Avatars Row -->
  <circle cx="250" cy="200" r="50" fill="#1c2030" stroke="#4338ca" stroke-width="2"/>
  <circle cx="400" cy="180" r="55" fill="#22273a" stroke="#6366f1" stroke-width="2"/>
  <circle cx="550" cy="200" r="50" fill="#1c2030" stroke="#4338ca" stroke-width="2"/>
  <text x="400" y="320" font-family="system-ui, sans-serif" font-size="18" font-weight="600" fill="#f4f4f5" text-anchor="middle">Interdisciplinary Practice</text>
  <text x="400" y="350" font-family="system-ui, sans-serif" font-size="13" fill="#94a3b8" text-anchor="middle">Engineers, architects, and interface designers collaborating as one studio team.</text>
  <rect x="290" y="440" width="220" height="24" rx="5" fill="#18181b" stroke="#3f3f46" stroke-width="1"/>
  <text x="400" y="456" font-family="system-ui, sans-serif" font-size="10" font-weight="600" fill="#a1a1aa" text-anchor="middle" letter-spacing="1">TEAM PHOTO SLOT · CLICK TO EDIT</text>
</svg>
`);

export const STUDIO_LOCATION_PLACEHOLDER = svgToDataUri(`
<svg xmlns="http://www.w3.org/2000/svg" width="800" height="500" viewBox="0 0 800 500" fill="none">
  <rect width="800" height="500" rx="16" fill="#12141c"/>
  <rect x="1" y="1" width="798" height="498" rx="15" stroke="#27272a" stroke-width="1.5"/>
  <rect x="50" y="50" width="700" height="360" rx="10" fill="#0c0e14" stroke="#27272a" stroke-width="1"/>
  <!-- Studio Blueprint Plan -->
  <line x1="80" y1="180" x2="720" y2="180" stroke="#27272a" stroke-width="1"/>
  <line x1="400" y1="50" x2="400" y2="410" stroke="#27272a" stroke-width="1"/>
  <text x="240" y="120" font-family="monospace" font-size="12" fill="#71717a">STUDIO A · WORKBENCHES</text>
  <text x="560" y="120" font-family="monospace" font-size="12" fill="#71717a">GALLERY & PROTOTYPING</text>
  <text x="240" y="280" font-family="monospace" font-size="12" fill="#71717a">MATERIALS ARCHIVE</text>
  <text x="560" y="280" font-family="monospace" font-size="12" fill="#818cf8">SAN FRANCISCO · TIMEZONE PT</text>
  <rect x="290" y="440" width="220" height="24" rx="5" fill="#18181b" stroke="#3f3f46" stroke-width="1"/>
  <text x="400" y="456" font-family="system-ui, sans-serif" font-size="10" font-weight="600" fill="#a1a1aa" text-anchor="middle" letter-spacing="1">STUDIO SPACE SLOT · CLICK TO EDIT</text>
</svg>
`);
