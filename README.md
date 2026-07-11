# Monsoon Saathi (मानसून साथी)

Monsoon Saathi is a Generative-AI-powered monsoon preparedness and citizen assistance platform. It helps individuals, families, and housing societies prepare for, respond to, and recover from severe monsoon hazards (heavy rainfall, waterlogging, thunderstorms, strong winds, power outages, and transport disruptions).

---

## 🚀 Key Features

*   **Deterministic Monsoon Risk Engine**: Computes weather risk levels (`low`, `moderate`, `high`, `severe`) based on live WMO forecasts and household vulnerabilities (ground-floor residence, river proximity).
*   **Personalized Preparedness Plans**: Generates actionable, categorized checklist milestones (Actions to Complete Now, Next 6 Hours, Supplies, etc.) using OpenRouter AI.
*   **Interactive Safety Checklist**: Seeded automatically with recommended quantities based on family members; supports adding custom items.
*   **Travel Advisory Tool**: Evaluates route weather conditions at departure and destination times, highlighting travel risk indexes and safer windows.
*   **Conversational Safety AI**: An interactive, calming assistant responding to safety queries (cleaning houses, grid failures) in English, Hindi, and Marathi.
*   **Crowd-Sourced Alerts Hub**: Binds computed system warnings with real-time, citizen-logged observations (waterlogging, fallen trees).
*   **PWA Installable & Offline-Ready**: service worker caching preserves emergency contacts, checklists, and active preparedness guidelines during connectivity loss.
*   **Privacy-First Architecture**: Anonymous database sessions (no emails/passwords required). All PII and contact logs are scrubbed before triggering LLM calls.

---

## 🛠️ Technology Stack

*   **Framework**: Next.js 16 (App Router) & React 19
*   **Styling**: Tailwind CSS v4 & custom glassmorphism
*   **Database**: SQLite locally via Prisma ORM
*   **Visualizations**: Recharts (72-hour precipitation timelines)
*   **AI Engine**: OpenRouter API
    *   *Exact Model*: `nvidia/nemotron-3-ultra-550b-a55b:free`
*   **Weather Service**: Open-Meteo API (requires no keys)
*   **Testing**: Vitest (Unit tests) & Playwright (E2E specs)
*   **Languages**: English (`en`), Hindi (`hi`), Marathi (`mr`)

---

## ⚙️ Environment Configuration

Create a `.env` file in the root directory (matching `.env.example`):

```env
# Required for Generative AI features
OPENROUTER_API_KEY=your_openrouter_api_key_here

# Exact model requested for this project
OPENROUTER_MODEL=nvidia/nemotron-3-ultra-550b-a55b:free

# Local Prisma database
DATABASE_URL="file:./dev.db"

# Application URL
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Optional browser push notifications
NEXT_PUBLIC_VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_SUBJECT=

# Optional scheduled alert checking
CRON_SECRET=super_secret_cron_token_here
```

### How to Get an OpenRouter API Key
1. Go to [OpenRouter.ai](https://openrouter.ai/).
2. Create an account, navigate to **Keys** inside your dashboard, and generate a new API key.
3. Paste the key in the `OPENROUTER_API_KEY` field in `.env`.

---

## 💿 Local Installation & Setup

Set up the project locally in under 2 minutes:

```bash
# 1. Install dependencies
npm install

# 2. Configure Database & run migrations
npx prisma generate
npx prisma migrate dev --name init

# 3. Start local development server
npm run dev
```

The app will start at `http://localhost:3000`.

---

## 🧪 Running Tests

```bash
# Run Vitest unit tests (covers risk thresholds, sanitization, parsing)
npm run test

# Run Playwright E2E tests
npm run test:e2e
```

---

## 🏗️ Production Build

To compile a highly optimized build using Turbopack:

```bash
# Compile build
npm run build

# Start production server
npm run start
```

---

## 🛰️ PWA & Service Worker

Monsoon Saathi complies with Progressive Web App standards:
*   Its manifest details are stored inside `public/manifest.webmanifest`.
*   Its background caching is managed via `public/service-worker.js`.
*   An offline landing page is set up at `/[locale]/offline`.
*   Checklists, emergency plans, and contacts are preserved in `localStorage` in the browser, meaning the application is fully functional offline.

---

## 🔒 Privacy & Safety Safeguards

1.  **AI-Safe Profile**: The helper `create-ai-safe-profile.ts` strips database UUIDs, cookies, and emergency phone numbers, sending only generic demographic information to the AI model.
2.  **No Evacuation Hallucinations**: The AI does not calculate risks. It receives computed coordinates and estimated risk vectors as grounding facts from the local risk config.
3.  **Wipe All Data**: Users can erase all SQLite and cookie records instantly from the `/settings` panel.

---

## 🗺️ PostgreSQL Production Migration

To migrate this application to a PostgreSQL database (e.g. Supabase, Neon) for production:

1.  Open `prisma/schema.prisma` and replace the `datasource` block:
    ```prisma
    datasource db {
      provider = "postgresql"
      url      = env("DATABASE_URL")
    }
    ```
2.  Update `DATABASE_URL` in your production environment to point to the PostgreSQL connection string:
    ```env
    DATABASE_URL="postgresql://username:password@hostname:5432/dbname?schema=public"
    ```
3.  Run the production migrate generation:
    ```bash
    npx prisma migrate deploy
    ```
