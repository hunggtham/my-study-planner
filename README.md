# Study Planner - Cloud Synced

A robust React + Vite study planner configured for daily use with a safe, cloud-synced Supabase backend.

## Architecture
- Frontend: React + Vite + TypeScript + React Router
- Backend: Supabase (PostgreSQL, Auth, RLS, RPCs)
- UI: Vanilla CSS, mobile-friendly dark theme.

---

## 1. Local Development Setup

### Install Dependencies
```bash
npm install
```

### Configure Environment Variables
Copy the example environment file:
```bash
cp .env.example .env.local
```
Then, edit `.env.local` and add your Supabase details (see section below).

### Start Development Server
```bash
npm run dev
```

### Check TypeScript / Build
```bash
npm run build
```
This will run `tsc` and ensure there are no typing errors before building the production bundle.

---

## 2. Supabase Setup Instructions

1. Go to [Supabase](https://supabase.com) and create a new project.
2. Once provisioned, go to **Project Settings > API**.
3. Copy the **Project URL** and paste it into `.env.local` as `VITE_SUPABASE_URL`.
4. Copy the **anon public key** and paste it into `.env.local` as `VITE_SUPABASE_ANON_KEY`.
   - *Security Note: Do NOT use the service_role key here.*
5. Go to **Authentication > Providers** and ensure **Email** is enabled.
6. Go to the **SQL Editor** in your Supabase dashboard.
7. Open the file `supabase/schema.sql` from this repository.
8. Copy all the text in `supabase/schema.sql` and paste it into the Supabase SQL Editor, then click **Run**. This sets up all tables, indexes, constraints, RLS policies, and the RPC function for public sharing.

---

## 3. Public Share Feature (Testing)

The app includes a feature to generate a "public read-only" link to show your progress to friends.
- Go to the **Cài đặt** (Settings) tab in the app.
- Click **Tạo link chia sẻ**.
- Copy the link and open it in an Incognito/Private window.
- The dashboard will load and safely display only your completion stats and task names using a secure Supabase RPC function. Private notes and internal IDs are completely hidden.

---

## 4. Deployment Instructions

### Deploy to Vercel
1. Push your repository to GitHub.
2. Go to Vercel and **Add New Project**, selecting your repository.
3. Vercel will automatically detect the **Vite** framework.
4. **Build Command**: `npm run build`
5. **Output Directory**: `dist`
6. Open the **Environment Variables** section and add:
   - `VITE_SUPABASE_URL` = your_project_url
   - `VITE_SUPABASE_ANON_KEY` = your_anon_key
7. Click **Deploy**.

### Deploy to Netlify
1. Push your repository to GitHub.
2. Go to Netlify and **Add new site > Import an existing project**, selecting your repository.
3. **Build command**: `npm run build`
4. **Publish directory**: `dist`
5. Click **Show advanced** and add your Environment Variables:
   - `VITE_SUPABASE_URL` = your_project_url
   - `VITE_SUPABASE_ANON_KEY` = your_anon_key
6. Click **Deploy site**.

---

## Known Limitations & Next Steps
- **Bulk Creation**: Currently, you can create, duplicate, and move tasks individually. Full bulk creation for recurring dates (e.g. "Every Monday") is not fully automated in the UI yet and requires manual duplication.
- **Offline Mode**: While data is cached during the session, full offline PWA support is not yet implemented. If the internet drops, Supabase requests will fail.
