# MKM Quotation Management System — Setup Guide

## Prerequisites

Make sure the following are installed on your machine before getting started:

| Tool                           | Version | Notes                             |
| ------------------------------ | ------- | --------------------------------- |
| [Node.js](https://nodejs.org/) | 18+     | Required for the runtime          |
| [pnpm](https://pnpm.io/)       | 9+      | Package manager (`npm i -g pnpm`) |
| [Git](https://git-scm.com/)    | Any     | For cloning the repo              |

---

## 1. Clone the Repository

```bash
git clone <repository-url>
cd hasififwat-mkm-quotation-management-system
```

---

## 2. Install Dependencies

```bash
pnpm install
```

---

## 3. Environment Variables

Copy the example environment file and fill in the required values:

```bash
cp .env.example .env
```

Then open `.env` and fill in your credentials:

```env
# Supabase — used for authentication
VITE_SUPABASE_URL=https://<your-project-id>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<your-publishable-key>
VITE_SUPABASE_ANON_KEY=<your-anon-key>
```

> **Where to find these values:** Go to your [Supabase project dashboard](https://supabase.com/dashboard) → Project Settings → API.

---

## 4. Convex Setup

This project uses [Convex](https://convex.dev) as the primary database and backend.

### 4.1 Create a Convex Account

1. Go to [https://dashboard.convex.dev](https://dashboard.convex.dev) and sign up.
2. Create a new project (e.g. `mkm-quotation`).

### 4.2 Log In to Convex CLI

```bash
pnpm dlx convex login
```

This will open a browser window to authenticate.

### 4.3 Link Your Project

Run the following command from the project root:

```bash
pnpm dlx convex dev
```

On first run, you will be prompted to either:

- **Link to an existing project** — select the project you created in step 4.1, or
- **Create a new project** — Convex will scaffold one for you.

This command will:

1. Create a `.env.local` file containing `CONVEX_URL` automatically.
2. Deploy your schema and functions to Convex.
3. Start watching the `convex/` folder for changes.

> Keep this terminal running during development — it syncs your backend functions in real time.

### 4.4 Database Schema

The Convex schema is defined in [`convex/schema.ts`](convex/schema.ts). It includes the following tables:

| Table             | Description                      |
| ----------------- | -------------------------------- |
| `clients`         | Customer/client records          |
| `packages`        | Umrah/travel package definitions |
| `package_flights` | Flight details per package       |
| `package_hotels`  | Hotel assignments per package    |
| `package_meals`   | Meals per hotel                  |
| `package_rooms`   | Room types and pricing           |
| `hotel_templates` | Reusable hotel templates         |
| `quotations`      | Generated quotations             |
| `quotation_items` | Line items within a quotation    |
| `quotation_logs`  | Audit log for quotation changes  |
| `profiles`        | Agent/user profiles              |
| `room_templates`  | Reusable room templates          |

### 4.5 Importing Seed Data (Optional)

Pre-populated CSV data is included in the `database/` folder. To import it into your Convex project, run:

```bash
node import_all.js
```

This script reads all CSV files in `database/`, converts them to JSONL, and pushes them to Convex using `npx convex import`.

> **Note:** Run this only once on a fresh project. Re-running it may create duplicate records.

---

## 5. Start the Development Server

Open **two terminals** and run each command in its own terminal:

**Terminal 1 — Convex backend watcher:**

```bash
pnpm dlx convex dev
```

**Terminal 2 — React Router dev server:**

```bash
pnpm dev
```

The app will be available at **http://localhost:5173**.

---

## 6. Project Structure Overview

```
├── app/
│   ├── components/       # Shared UI components
│   ├── features/         # Feature modules (auth, clients, packages, quotations…)
│   ├── hooks/            # Custom React hooks
│   ├── layout/           # App layout (sidebar)
│   ├── lib/              # Supabase client helpers
│   ├── routes/           # React Router file-based routes
│   └── services/         # Data-fetching service layer
├── convex/               # Convex schema, queries, and mutations
├── database/             # CSV seed data
└── public/               # Static assets
```

---

## 7. Building for Production

```bash
pnpm build
```

Output is placed in `build/client` (static assets) and `build/server` (SSR server).

To preview the production build locally:

```bash
pnpm start
```

---

## 8. Docker Deployment (Optional)

```bash
# Build the image
docker build -t mkm-quotation .

# Run the container
docker run -p 3000:3000 mkm-quotation
```

The Dockerfile is already included in the project root. Make sure your environment variables are passed in at runtime (e.g. via `--env-file .env`).

---

## 9. Common Issues

| Issue                       | Fix                                                                    |
| --------------------------- | ---------------------------------------------------------------------- |
| `CONVEX_URL is not defined` | Run `pnpm dlx convex dev` to generate `.env.local`                     |
| Blank page / auth errors    | Verify your Supabase keys in `.env` are correct                        |
| Import script fails         | Ensure Convex is deployed first (`pnpm dlx convex dev`)                |
| Port 5173 already in use    | Change the port in `vite.config.ts` or kill the process using the port |
