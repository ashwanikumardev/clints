# 🚀 FULL-STACK DEPLOYMENT GUIDE

## ❌ CURRENT ISSUE:
- Frontend deployed to Vercel ✅
- Backend NOT deployed ❌
- Authentication fails because API calls go to `/api` (which doesn't exist)

## ✅ SOLUTION: Deploy Backend Separately

### **Option 1: Deploy Backend to Vercel (Recommended)**

1. **Create new Vercel project for backend:**
   ```bash
   cd server
   npx vercel --prod
   ```

2. **Or via Vercel Dashboard:**
   - New Project → Import from GitHub
   - Set Root Directory to `server`
   - Framework: Other
   - Build Command: (leave empty)
   - Output Directory: (leave empty)

3. **Set Environment Variables in Vercel:**
   - `NODE_ENV=production`
   - `MONGODB_URI=your_mongodb_connection_string`
   - `JWT_SECRET=your_jwt_secret`

### **Option 2: Deploy Backend to Railway**

1. **Connect to Railway:**
   ```bash
   npm install -g @railway/cli
   railway login
   cd server
   railway init
   railway up
   ```

2. **Set Environment Variables in Railway Dashboard**

### **Option 3: Deploy Backend to Heroku**

1. **Deploy to Heroku:**
   ```bash
   cd server
   heroku create your-app-name
   git init
   git add .
   git commit -m "Deploy backend"
   git push heroku main
   ```

## 🔧 FRONTEND CONFIGURATION

### **Update Environment Variables in Vercel:**

1. Go to your frontend Vercel project
2. Settings → Environment Variables
3. Add: `REACT_APP_API_URL=https://your-backend-url.com/api`

### **Example URLs:**
- Vercel: `https://your-backend.vercel.app/api`
- Railway: `https://your-backend.railway.app/api`
- Heroku: `https://your-backend.herokuapp.com/api`

## 🧪 TESTING

1. **Test Backend:**
   - Visit: `https://your-backend-url.com/api/health`
   - Should return: `{"status": "OK"}`

2. **Test Frontend:**
   - Login/Register should work
   - Check browser console for errors
   - Verify API calls go to correct URL

## 🎯 QUICK FIX FOR NOW

If you want to test immediately:

1. **Start local backend:**
   ```bash
   cd server
   npm start
   ```

2. **Update frontend environment:**
   - In Vercel: Set `REACT_APP_API_URL=http://your-local-ip:5000/api`
   - Replace `your-local-ip` with your actual IP address

⚠️ **Note:** This is temporary - deploy backend properly for production!
