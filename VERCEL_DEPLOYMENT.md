# Vercel Deployment Guide - Fixing NOT_FOUND Error

## Problem Summary

You were encountering a `NOT_FOUND` error when deploying to Vercel. This happened because:

1. **Missing Vercel Configuration**: Vercel didn't know how to handle your React SPA (Single Page Application) routes
2. **API Routing Issues**: API requests weren't properly routed to your backend
3. **Client-Side API URLs**: The frontend was trying to connect to `localhost:5000` in production

## Root Cause Analysis

### What Was Happening

1. **SPA Routing Problem**: 
   - Your React app uses client-side routing (React Router)
   - When users navigate to `/dashboard`, `/clients`, etc., the browser requests these paths
   - Vercel tried to find actual files at these paths (like `/dashboard/index.html`)
   - Since these files don't exist (they're React routes, not files), Vercel returned `NOT_FOUND`

2. **API URL Configuration**:
   - Your `authService.ts` was using `http://localhost:5000/api` as the base URL
   - In production on Vercel, `localhost` doesn't exist, causing API calls to fail
   - This resulted in `NOT_FOUND` errors for API endpoints

3. **Missing Route Configuration**:
   - No `vercel.json` file to tell Vercel how to route requests
   - Vercel didn't know that `/api/*` should go to your backend
   - Vercel didn't know that all other routes should serve `index.html` (for SPA)

### Why This Error Exists

Vercel's `NOT_FOUND` error protects you from:
- Serving incorrect content (trying to serve a file that doesn't exist)
- Exposing server structure (revealing what files exist vs. don't exist)
- Security issues (preventing directory traversal attacks)

## The Fix

### 1. Created `vercel.json` Configuration

This file tells Vercel:
- Where your built frontend is (`client/build`)
- How to route API requests (`/api/*` → serverless function)
- How to handle SPA routes (all other routes → `index.html`)

```json
{
  "version": 2,
  "buildCommand": "cd client && npm install && npm run build",
  "outputDirectory": "client/build",
  "installCommand": "cd server && npm install && cd ../client && npm install",
  "framework": null,
  "functions": {
    "api/index.js": {
      "runtime": "@vercel/node",
      "includeFiles": "server/**"
    }
  },
  "rewrites": [
    {
      "source": "/api/(.*)",
      "destination": "/api/index.js"
    },
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

### 2. Created Serverless Function Wrapper

Created `api/index.js` to wrap your Express app as a Vercel serverless function:

```javascript
const app = require('../server/index');

module.exports = (req, res) => {
  process.env.VERCEL = '1';
  return app(req, res);
};
```

### 3. Updated API Service

Modified `client/src/services/authService.ts` to use relative URLs in production:

```typescript
const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? '/api' 
  : (process.env.REACT_APP_API_URL || 'http://localhost:5000/api');
```

### 4. Updated Server to Support Serverless

Modified `server/index.js` to conditionally start the server only when not running as a serverless function:

```javascript
if (process.env.VERCEL !== '1') {
  app.listen(PORT, () => {
    // Server startup code
  });
}
```

## Important Limitations

### ⚠️ JSON Database in Serverless Functions

**Critical Issue**: Vercel serverless functions have a **read-only filesystem** (except `/tmp`). Your JSON database (`server/db/*.json`) will:

- ✅ **Work for reads** in development
- ❌ **NOT persist writes** in production (data is lost between function invocations)
- ❌ **NOT work across different serverless function instances**

### Solutions for Production Database

You have several options:

1. **Use Vercel Postgres** (Recommended for Vercel)
   - Native integration with Vercel
   - Serverless-friendly
   - Free tier available

2. **Use External Database Service**
   - MongoDB Atlas (free tier)
   - Supabase (PostgreSQL, free tier)
   - PlanetScale (MySQL, free tier)
   - Railway/Render (managed databases)

3. **Deploy Backend Separately**
   - Deploy Express server to Railway, Render, or similar
   - Update `REACT_APP_API_URL` to point to your backend URL
   - Keep JSON database (works with persistent servers)

## Deployment Steps

1. **Install Vercel CLI** (if not already installed):
   ```bash
   npm i -g vercel
   ```

2. **Deploy to Vercel**:
   ```bash
   vercel
   ```

3. **Set Environment Variables** (if needed):
   - Go to Vercel Dashboard → Your Project → Settings → Environment Variables
   - Add any required variables (JWT_SECRET, etc.)

4. **Verify Deployment**:
   - Visit your Vercel URL
   - Test navigation to `/dashboard`, `/clients`, etc.
   - Test API endpoints at `/api/health`

## Testing Locally

To test the Vercel setup locally:

```bash
# Install Vercel CLI
npm i -g vercel

# Run Vercel dev server
vercel dev
```

This will simulate the Vercel environment locally.

## Warning Signs to Watch For

### Code Smells That Indicate This Issue

1. **Hardcoded localhost URLs** in production code
   ```typescript
   // ❌ BAD
   const API_URL = 'http://localhost:5000/api';
   
   // ✅ GOOD
   const API_URL = process.env.NODE_ENV === 'production' ? '/api' : 'http://localhost:5000/api';
   ```

2. **Missing `vercel.json` or deployment configuration**
   - Always check if your deployment platform needs a config file

3. **SPA routes returning 404 in production**
   - If `/dashboard` works in dev but not in production, it's a routing issue

4. **API calls failing in production but working in dev**
   - Usually a URL configuration issue

### Similar Mistakes to Avoid

1. **Forgetting to configure SPA routing**
   - Next.js, Gatsby have built-in solutions
   - React apps need manual configuration

2. **Using absolute URLs without environment checks**
   - Always check `NODE_ENV` or use environment variables

3. **Not testing production builds locally**
   - Test with `npm run build` and serve the build folder
   - Use `vercel dev` to test Vercel setup

## Alternative Approaches

### Option 1: Monorepo with Separate Deployments (Recommended)

- Deploy frontend to Vercel
- Deploy backend to Railway/Render
- Use environment variables for API URL

**Pros**: 
- Better separation of concerns
- Can use persistent file storage for JSON DB
- Easier to scale independently

**Cons**: 
- Two deployments to manage
- Need to configure CORS properly

### Option 2: Full Vercel Serverless (Current Approach)

- Frontend and backend both on Vercel
- Backend as serverless functions

**Pros**: 
- Single deployment
- Automatic scaling
- Built-in CDN

**Cons**: 
- JSON database won't work (need real database)
- Cold start times for serverless functions
- More complex for file uploads

### Option 3: Next.js API Routes

- Convert to Next.js
- Use API routes instead of separate Express server
- Can use same JSON approach (with limitations)

**Pros**: 
- Built-in API routes
- Better Vercel integration
- Simpler deployment

**Cons**: 
- Requires rewriting frontend
- Still need database for production

## Next Steps

1. ✅ **Fixed NOT_FOUND error** - SPA routing now works
2. ⚠️ **Database Migration** - Plan to migrate from JSON files to a proper database
3. 🔒 **Environment Variables** - Set up production environment variables
4. 🧪 **Testing** - Test all routes and API endpoints in production
5. 📊 **Monitoring** - Set up error tracking and monitoring

## Additional Resources

- [Vercel Deployment Documentation](https://vercel.com/docs)
- [Vercel Serverless Functions](https://vercel.com/docs/functions)
- [Vercel Postgres](https://vercel.com/docs/storage/vercel-postgres)
- [React Router Deployment](https://reactrouter.com/en/main/start/overview#deploying)

## Summary

The `NOT_FOUND` error was caused by missing Vercel configuration for SPA routing and incorrect API URLs. The fix involved:

1. Creating `vercel.json` to configure routing
2. Creating serverless function wrapper
3. Updating API URLs to use relative paths in production
4. Making server compatible with serverless functions

**Remember**: Your JSON database won't work in production with serverless functions. Plan to migrate to a proper database for production use.

