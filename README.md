# Study Planner - Cloud Synced

A React + Vite study planner designed to be usable across devices, synced via Supabase.

## Tech Stack
- Frontend: React + Vite + TypeScript + React Router
- Backend: Supabase (PostgreSQL, Auth, RLS)
- UI: Vanilla CSS with custom design system

## Getting Started

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Supabase Setup**
   - Create a new project on [Supabase](https://supabase.com).
   - Go to the SQL Editor in Supabase and run the queries found in `supabase/schema.sql`.
   - Ensure you have Authentication (Email) enabled.

3. **Environment Variables**
   - Copy `.env.example` to `.env.local`
   - Fill in your `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.

4. **Run Locally**
   ```bash
   npm run dev
   ```

## Local Data Migration
If you used the previous version of this planner (which stored data in `localStorage`), you can migrate your data to the cloud:
1. Register/Login to the app.
2. Go to the **Cài đặt** (Settings) tab.
3. Click **Đồng bộ từ LocalStorage**.

## Deployment

### Vercel
1. Import project in Vercel.
2. Framework Preset: `Vite`
3. Build Command: `npm run build`
4. Output Directory: `dist`
5. Add Environment Variables: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`

### Netlify
1. Import project in Netlify.
2. Build command: `npm run build`
3. Publish directory: `dist`
4. Add Environment Variables: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`

## Features
- **Hôm nay**: View today's tasks and overdue tasks. Move tasks easily.
- **Lịch tháng**: Monthly visual calendar to track consistency.
- **Mục tiêu**: Weekly and monthly checklist tracking.
- **Thống kê**: Visual breakdown of your progress across different subjects.
- **Chia sẻ công khai**: Create a read-only dashboard link to share your progress with friends.
