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

### For Vercel:
1. Connect your GitHub repository to Vercel
2. Set environment variable: `DATABASE_URL`
3. Vercel will automatically deploy on every push

### For Other Platforms:
The GitHub Actions workflow validates builds automatically. The project is now ready to deploy with:

```bash
npm ci
npm run build
```

## Current Status

✅ **Build passes locally**
✅ **All TypeScript checks pass**
✅ **GitHub Actions workflow active**
✅ **Ready for production deployment**

## Troubleshooting

If builds still fail:

1. Check GitHub Actions logs: Go to your repo → Actions tab
2. Common issues:
   - Missing `DATABASE_URL` environment variable
   - Node.js version mismatch (requires 20.x)
   - npm cache corruption: Try `npm ci --force`

3. For local debugging:
   ```bash
   npm run clean
   npm install
   npm run build
   ```
