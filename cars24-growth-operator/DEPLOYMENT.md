# Deployment Guide

## Build Fixes Applied

The project had several deployment issues that have now been resolved:

### 1. **pnpm Workspace Incompatibility**
- **Issue**: Code used pnpm-specific `workspace:*` syntax which most deployment platforms don't support
- **Fix**: Converted to npm workspaces with `*` version references
- **Files**: All `package.json` files in the monorepo

### 2. **Next.js TypeScript Config Not Supported**
- **Issue**: `next.config.ts` is not supported in Next.js 14 with npm workspaces
- **Fix**: Converted to `next.config.js` (JavaScript config)
- **File**: `packages/ui/next.config.js`

### 3. **Security Vulnerability**
- **Issue**: Next.js 14.2.3 had a critical security vulnerability
- **Fix**: Updated to Next.js 14.2.4
- **File**: `packages/ui/package.json`

### 4. **Build-Time Import Errors**
- **Issue**: API routes imported `@cars24/shared` at compile time, causing build failures
- **Fix**: Lazy-load shared dependencies at runtime only
- **File**: `packages/ui/src/app/api/events/route.ts`

### 5. **TypeScript Type Issues**
- **Issue**: Type mismatches in the funnels page component
- **Fix**: Added proper type casting for diagnosis data
- **File**: `packages/ui/src/app/funnels/page.tsx`

## Deployment Configuration

### GitHub Actions Workflow
- **File**: `.github/workflows/deploy.yml`
- **Triggers**: On push to `dev`, `main`, or `master` branches
- **Steps**: Install → Build → Type Check
- **Status**: Runs on every commit to validate builds

### Vercel Configuration
- **File**: `vercel.json`
- **Deployment**: Configured to deploy the UI package
- **Environment**: Requires `DATABASE_URL` variable

### Build Configuration
- **File**: `.npmrc`
- **Settings**: Enables legacy peer dependency handling

## Local Testing

To verify the build locally:

```bash
npm install
npm run build
```

If successful, you'll see:

```
✓ Compiled successfully
✓ Route (app) files compiled
○ (Static) prerendered as static content
ƒ (Dynamic) server-rendered on demand
```

## Deployment Steps

### ⭐ **Recommended: Deploy to Vercel**

Vercel is the best choice for Next.js applications:

1. Go to **vercel.com** and sign up with your GitHub account
2. Click "Add New..." → "Project"
3. Select your GitHub repository
4. Framework preset: Next.js (auto-detected)
5. Root directory: `packages/ui`
6. Add environment variables:
   - `DATABASE_URL`: Your database URL
7. Click "Deploy"

The app will be live at a `vercel.app` URL in seconds!

### Alternative: AWS Amplify

1. Go to **AWS Amplify Console**
2. Connect your GitHub repository
3. Select the branch to deploy
4. Set build command: `npm run build`
5. Set output directory: `packages/ui/.next`

### Alternative: Netlify

1. Go to **app.netlify.com**
2. Click "Add new site" → "Import an existing project"
3. Connect GitHub and select your repository
4. Set build command: `npm run build`
5. Set publish directory: `packages/ui/out`
6. Add environment variable: `DATABASE_URL`

## Current Status

✅ **Build passes locally**
✅ **All TypeScript checks pass**
✅ **GitHub Actions validates on every push**
✅ **GitHub Pages conflict resolved (.nojekyll)**
✅ **Ready for production deployment**

## Why Not GitHub Pages?

GitHub Pages is designed for static Jekyll sites, not Next.js applications. While you *could* export Next.js as static HTML, it would lose:
- API routes (`/api/events`, `/api/status`, etc.)
- Server-side rendering capabilities
- Real-time SSE streaming

**Recommendation**: Use Vercel, Netlify, or AWS Amplify for the best Next.js hosting experience.

## Troubleshooting

### Build fails on GitHub Actions?
1. Check Actions tab → your workflow → view logs
2. Common issues:
   - `npm ci` fails: Delete `package-lock.json` and push again
   - Missing dependencies: Ensure all imports are correct
   - TypeScript errors: Run `npm run typecheck` locally

### GitHub Pages still trying to build Jekyll?
The `.nojekyll` file tells GitHub to skip Jekyll. If it still builds:
1. Go to repo Settings → Pages
2. Set Source to "GitHub Actions" (not Branch)
3. Or disable Pages entirely

### Can't connect to DATABASE_URL?
The API routes need a real database connection. For development/testing:
1. Set up a PostgreSQL instance (free tier available on Railway or Render)
2. Add the connection string to your deployment platform's env vars
3. Or run the backend locally for development
