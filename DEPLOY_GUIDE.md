# BoxOfVibe Deploy Guide

> This document is for the AI assistant's reference. Contains exact steps, commands, and troubleshooting for deploying boxofvibe.

---

## Project Details

| Item | Value |
|------|-------|
| Project Root | `C:\Users\thenu\Desktop\music\boxofvibe` |
| Framework | Next.js 16 (App Router, Turbopack) |
| Node Version | 25.2.1 |
| Package Manager | npm |
| Netlify Site Name | `boxofvibe-music` |
| Netlify Site ID | `e36fd884-a6a5-4067-bb03-301aa96526f8` |
| Production URL | `https://boxofvibe-music.netlify.app` |
| GitHub Repo | `https://github.com/thenuareraa/boxofvibe` |
| Branch | `main` |
| Netlify Account | Expense Tracker |
| Netlify User | Thenu Areraa (thenuareraald25@gmail.com) |

---

## Netlify Config (netlify.toml)

```toml
[build]
  command = "npm run build"
  publish = ".next"

[[plugins]]
  package = "@netlify/plugin-nextjs"
```

---

## Environment Variables (ALL must be set on Netlify)

These are set via `netlify env:set` or Netlify dashboard. All in `all` context.

| Variable | Value |
|----------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://pyhpdpakkrgyrdqcbugj.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5aHBkcGFra3JneXJkcWNidWdqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjczMzM1NTQsImV4cCI6MjA4MjkwOTU1NH0.5eGcMduMykKW74uNvouZpP4y8BpsZb3ArSaiocQJjrk` |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5aHBkcGFra3JneXJkcWNidWdqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzMzMzU1NCwiZXhwIjoyMDgyOTA5NTU0fQ.ncXb_or27EpDepWuw6mWEnr1n_KOUv9No9rJ9v7RP4s` |
| `GOOGLE_DRIVE_FOLDER_ID` | `12EEOy8u9f2nQ9FVYC7NWdn3BJfTp-W0a` |
| `NEXT_PUBLIC_ADMIN_SECRET_CODE` | `admin@2026` |
| `R2_ACCESS_KEY_ID` | `6fbf3e28d7fe1fce15abb94a38a2f03c` |
| `R2_SECRET_ACCESS_KEY` | `b77fd18c9622c235788f325bbb83281cf552e234d2dbd0c304d1b54121d5a6ab` |
| `R2_ENDPOINT` | `https://756d488a9f788d8d66ea6c077a9030df.r2.cloudflarestorage.com` |
| `R2_BUCKET_NAME` | `boxofvibe-music` |
| `R2_PUBLIC_URL` | `https://boxofvibe-music-cdn.lonedreamerprivate.workers.dev` |
| `NODE_VERSION` | (already set on Netlify for builds/post-processing) |

To verify: `netlify env:list`

---

## CRITICAL: Windows Symlink Issue

### The Problem

On Windows, `netlify deploy --build` (or `netlify deploy --prod --build`) will **ALWAYS FAIL** after the build succeeds. The `@netlify/plugin-nextjs` plugin tries to create symlinks in `.netlify/functions-internal/___netlify-server-handler/.next/node_modules/` pointing back to `node_modules/`. Windows blocks this with:

```
Error: EPERM: operation not permitted, symlink
'C:\Users\thenu\Desktop\music\boxofvibe\node_modules\@aws-sdk\client-s3'
-> 'C:\Users\thenu\Desktop\music\boxofvibe\.netlify\functions-internal\___netlify-server-handler\.next\node_modules\@aws-sdk\client-s3-...'
```

### Why `--dir .next` alone doesn't work

Even with `--dir .next`, Netlify still reads `netlify.toml` which has `build.command = "npm run build"`. It runs the build again, then the plugin crashes on symlinks.

### The Solution

**ALWAYS use `--no-build` flag** to skip the build step entirely, then point to the pre-built `.next` folder:

```
netlify deploy --prod --no-build --dir .next
```

---

## Step-by-Step Deploy Process

### Step 1: Build Locally

```bash
cd C:\Users\thenu\Desktop\music\boxofvibe
npm run build
```

Expected output:
```
▲ Next.js 16.1.1 (Turbopack)
✓ Compiled successfully in ~3s
✓ Generating static pages using 15 workers (26/26)
Route (app)
┌ ○ /
├ ○ /_not-found
├ ○ /admin-control-panel
├ ƒ /api/... (dynamic routes)
├ ○ /dashboard
└ ○ /fix-durations
```

If build fails, fix the error first. Common issues:
- Missing closing braces in JSX/TSX files
- Unclosed try/catch blocks
- Import errors

### Step 2: Verify Build Succeeded

Check that `.next` folder exists and has content:
```
C:\Users\thenu\Desktop\music\boxofvibe\.next\
```

### Step 3: Commit and Push to GitHub (ALWAYS DO THIS FIRST)

```bash
git add -A
git commit -m "description of changes"
git push origin main
```

**IMPORTANT: Always push to GitHub BEFORE deploying.** This keeps the remote repo in sync and provides a fallback.

### Step 4: Deploy to Production

```bash
netlify deploy --prod --no-build --dir .next
```

Expected output:
```
✔ Finished bundling edge functions
Deploy path:       C:\Users\thenu\Desktop\music\boxofvibe\.next
✔ Finished uploading blobs to deploy store
✔ Finished hashing
✔ CDN requesting 301 files
✔ Finished uploading 325 assets
✔ Deploy is live!

Production URL: https://boxofvibe-music.netlify.app
```

### Step 4: Verify

Open `https://boxofvibe-music.netlify.app` and check:
- Homepage loads
- Dashboard loads
- API routes work (test login/signup)

---

## What NOT to Do (Will Fail)

| Command | Why It Fails |
|---------|-------------|
| `netlify deploy --prod --build` | Windows symlink EPERM error |
| `netlify deploy --build` | Same symlink error |
| `netlify deploy --prod` | Defaults to `--build`, same error |
| `netlify deploy --prod --dir .next` | Still runs build from netlify.toml, same error |

---

## If Env Vars Need Updating

Set each one individually:
```bash
netlify env:set VARIABLE_NAME "value"
```

Verify all are set:
```bash
netlify env:list
```

After changing env vars, a **redeploy is required**:
```bash
npm run build
netlify deploy --prod --no-build --dir .next
```

---

## If Code Changes Were Made

1. Build: `npm run build`
2. Deploy: `netlify deploy --prod --no-build --dir .next`

---

## If Git Push Is Also Needed

```bash
git add -A
git commit -m "description of changes"
git push origin main
```

Note: GitHub push may trigger Netlify's remote build too, but that's slower. CLI deploy is faster.

---

## Quick Reference (Copy-Paste Commands)

```bash
# Full deploy sequence (from scratch)
cd C:\Users\thenu\Desktop\music\boxofvibe
npm run build
git add -A
git commit -m "description of changes"
git push origin main
netlify deploy --prod --no-build --dir .next
```

---

## Summary (One-Liner)

**Build → commit → push to GitHub → deploy with `netlify deploy --prod --no-build --dir .next`. Always push to GitHub before deploying. Never use `--build` flag on Windows.**
