# MINDSPACE

Next-generation collaborative workspace and developer studio powered by Next.js, TypeScript, TailwindCSS, and Prisma.

## Key Modules
- **Interactive Project Studio**: Real-time web editor, multi-file workspace, visual preview, and AI code generation.
- **Docs & Research Studio**: Rich-text documents powered by Tiptap, automated web research assistant, citation and APA bibliography engine.
- **Presentations Studio**: 16:9 slide presentation engine with customizable layouts, live speaker notes presenter view, and full PowerPoint (`.pptx`) and PDF export support.
- **Admin Control Plane**: Dynamic template catalog studio, multi-model AI provider configuration, credit balances, and activity audit logging.

## Tech Stack
- **Framework**: Next.js 16 (App Router with Turbopack)
- **Language**: TypeScript
- **Database**: Prisma ORM (SQLite / PostgreSQL compatible)
- **Styling**: Tailwind CSS, Radix UI & Lucide Icons
- **Slide Engine**: PPTXGenJS & jsPDF

---

## Health Check & Monitoring (`/api/health`)
MindSpace includes a zero-dependency health monitoring endpoint designed for cloud health probes and external uptime services:
- **`GET /api/health`**: Returns system status, process uptime, memory metrics, and real-time database ping latency.
- **`HEAD /api/health`**: Ultra-lightweight header-only response (200 OK) for low-bandwidth pingers.
- **`GET /api/health?quick=true`**: Bypasses the database ping for instant response.
- **`GET /api/healthz`**: Standard cloud/Kubernetes alias.

All responses include `Cache-Control: no-store, no-cache, must-revalidate` to ensure monitoring pings always reach the backend server instead of edge CDN caches.

---

## Deploying on Render (Free Tier + UptimeRobot)

Render's free Web Service tier sleeps after 15 minutes of inactivity. You can keep your MindSpace instance awake 24/7 without cold starts using **UptimeRobot**:

### 1. Render Web Service Configuration
- **Repository**: Connect `TejHorwDev/MINDSPACE`
- **Environment**: `Node`
- **Build Command**: `npm install && npx prisma generate && npm run build`
- **Start Command**: `npm start`
- **Environment Variables**:
  - `NODE_ENV`: `production`
  - `NEXTAUTH_SECRET`: `your_random_32_character_secret`
  - `NEXTAUTH_URL`: `https://<your-render-subdomain>.onrender.com`
  - `DATABASE_URL`: `file:./db/custom.db` (or a PostgreSQL connection string from Supabase/Neon)

### 2. UptimeRobot Keep-Alive Setup
1. Create a free account at [uptimerobot.com](https://uptimerobot.com).
2. Click **Add New Monitor**.
3. **Monitor Type**: `HTTP(s)`
4. **Friendly Name**: `MindSpace Backend`
5. **URL (or IP)**: `https://<your-render-subdomain>.onrender.com/api/health`
6. **Monitoring Interval**: `Every 5 minutes`
7. Click **Create Monitor**.

> [!NOTE]
> Render provides **750 free instance hours per month** for Web Services. Because a 31-day month has 744 hours, keeping 1 free Web Service alive 24/7 with UptimeRobot uses ~744 hours and stays safely within your free tier quota.
