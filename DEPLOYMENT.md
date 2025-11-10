# Deployment Guide

## Vercel NOT_FOUND Error - Solution

This guide explains how to resolve the Vercel NOT_FOUND error and deploy your application correctly.

## Problem Analysis

### Root Cause
1. **Monorepo Structure**: Your project has a `client/` and `server/` folder, but Vercel doesn't know where to find the build output
2. **No Configuration**: Missing `vercel.json` tells Vercel how to build and serve your React app
3. **SPA Routing**: React Router needs rewrites to handle client-side routing
4. **API URL**: Client uses relative URLs that only work with the development proxy

### What Was Happening
- Vercel was looking for build files in the root directory
- React Router routes (like `/dashboard`, `/clients`) returned 404 because Vercel tried to find actual files
- No build configuration meant Vercel couldn't build your React app correctly

## Solution: Client-Only Deployment (Recommended)

Deploy the React client to Vercel and the Express server separately (Render, Railway, Heroku, etc.).

### Step 1: Configure Vercel

The `vercel.json` file is already created with the correct configuration:

```json
{
  "version": 2,
  "buildCommand": "cd client && npm install && npm run build",
  "outputDirectory": "client/build",
  "installCommand": "cd client && npm install",
  "framework": null,
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

### Step 2: Set Environment Variables in Vercel

1. Go to your Vercel project settings
2. Navigate to "Environment Variables"
3. Add:
   - `REACT_APP_API_URL`: Your backend API URL (e.g., `https://your-api.railway.app/api` or `https://your-api.render.com/api`)

### Step 3: Update API Calls

The client currently uses relative URLs (`/api/clients`) which only work in development. You need to:

1. **Use the centralized API utility** (`client/src/utils/api.ts`) which respects `REACT_APP_API_URL`
2. **Update all pages** to use this utility instead of direct axios calls

**Example fix for a page:**
```typescript
// Before (doesn't work in production)
import axios from 'axios';
const response = await axios.get('/api/clients');

// After (works in production)
import api from '../utils/api';
const response = await api.get('/clients');
```

### Step 4: Deploy Backend Separately

Deploy your Express server to:
- **Render** (recommended): https://render.com
- **Railway**: https://railway.app
- **Heroku**: https://heroku.com
- **DigitalOcean App Platform**: https://digitalocean.com

**Important**: Update CORS settings in `server/index.js` to allow your Vercel domain:

```javascript
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true
}));
```

### Step 5: Deploy to Vercel

1. Push your changes to GitHub
2. Connect your repository to Vercel
3. Vercel will automatically detect the `vercel.json` configuration
4. Set the `REACT_APP_API_URL` environment variable in Vercel dashboard
5. Deploy!

## Alternative: Full-Stack on Vercel (Advanced)

If you want to deploy both client and server on Vercel, you need to:

1. Convert Express routes to Vercel serverless functions
2. Create API routes in `api/` directory
3. Update `vercel.json` to handle both static files and API routes

This is more complex and requires significant refactoring.

## Understanding the Concepts

### Why Vercel NOT_FOUND Exists

Vercel is a **serverless platform** that:
- Serves static files (your React build)
- Runs serverless functions for API routes
- Doesn't run long-lived processes like `app.listen()`

### The Correct Mental Model

1. **Static Files**: React builds to static HTML/CSS/JS files
2. **Routing**: All routes must either:
   - Exist as static files, OR
   - Be rewritten to `index.html` (for SPAs)
3. **API Calls**: Must use absolute URLs in production

### React Router + Vercel

React Router uses **client-side routing**:
- `/dashboard` doesn't exist as a file
- React Router handles it in the browser
- Vercel needs `rewrites` to serve `index.html` for all routes
- React Router then takes over and shows the correct component

## Warning Signs

### What to Look For

1. **Relative API URLs**: Using `/api/...` without environment variables
2. **Missing vercel.json**: No configuration file
3. **Monorepo without config**: Multiple folders but no build instructions
4. **app.listen()**: Express server won't work on Vercel without conversion
5. **Proxy in package.json**: Only works in development, not production

### Code Smells

```javascript
// ❌ BAD: Relative URL (only works with proxy)
axios.get('/api/clients')

// ✅ GOOD: Absolute URL with env variable
axios.get(`${process.env.REACT_APP_API_URL}/clients`)

// ❌ BAD: No vercel.json for monorepo
// ✅ GOOD: vercel.json with buildCommand and outputDirectory

// ❌ BAD: Express app.listen() on Vercel
app.listen(5000)

// ✅ GOOD: Serverless function export
module.exports = app; // For serverless
```

## Troubleshooting

### Still Getting 404?

1. Check `vercel.json` is in the root directory
2. Verify `outputDirectory` points to `client/build`
3. Ensure `buildCommand` runs `npm run build` in the client folder
4. Check environment variables are set in Vercel dashboard
5. Verify API URL is correct and backend is deployed

### API Calls Failing?

1. Check `REACT_APP_API_URL` is set in Vercel
2. Verify backend CORS allows your Vercel domain
3. Check browser console for CORS errors
4. Ensure backend is actually deployed and running

## Next Steps

1. ✅ `vercel.json` is created
2. ⚠️ Update all pages to use `client/src/utils/api.ts`
3. ⚠️ Deploy backend to Render/Railway
4. ⚠️ Set `REACT_APP_API_URL` in Vercel
5. ⚠️ Update CORS in backend
6. ✅ Deploy to Vercel

## Resources

- [Vercel Documentation](https://vercel.com/docs)
- [React Router Deployment](https://reactrouter.com/en/main/start/overview#deployments)
- [Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)

