# 🚀 Life Maps Deployment Guide

## Option 1: Vercel + Railway (Easiest)

### Frontend Deployment (Vercel)

1. **Build your frontend:**
   ```bash
   cd lifemaps
   npm run build
   ```

2. **Deploy to Vercel:**
   - Go to [vercel.com](https://vercel.com)
   - Sign up with GitHub
   - Click "New Project"
   - Import your repository
   - Vercel will auto-detect it's a Vite app
   - Deploy!

3. **Update API URL:**
   - After deployment, update your API calls to point to your Railway backend URL

### Backend + Database Deployment (Railway)

1. **Prepare your backend:**
   - Go to [railway.app](https://railway.app)
   - Sign up with GitHub
   - Click "New Project" → "Deploy from GitHub repo"
   - Select your repository
   - Choose the `backend` folder

2. **Add PostgreSQL:**
   - In Railway dashboard, click "New" → "Database" → "PostgreSQL"
   - Railway will provide connection details

3. **Set Environment Variables:**
   ```
   PORT=10000
   NODE_ENV=production
   DB_HOST=your-railway-db-host
   DB_PORT=5432
   DB_NAME=railway
   DB_USER=postgres
   DB_PASSWORD=your-railway-password
   JWT_SECRET=your-super-secret-jwt-key
   CORS_ORIGIN=https://your-vercel-app.vercel.app
   ```

4. **Deploy:**
   - Railway will automatically deploy your backend
   - Your API will be available at `https://your-app.railway.app`

### Update Frontend API Configuration

Update `src/services/api.js` to use your Railway backend URL:

```javascript
const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://your-app.railway.app/api'
  : 'http://localhost:10000/api';
```

---

## Option 2: Render.com (All-in-One)

### Deploy Everything to Render

1. **Frontend:**
   - Go to [render.com](https://render.com)
   - Create "Static Site"
   - Connect GitHub repo
   - Build command: `npm run build`
   - Publish directory: `dist`

2. **Backend:**
   - Create "Web Service"
   - Connect GitHub repo
   - Root directory: `backend`
   - Build command: `npm install`
   - Start command: `npm start`

3. **Database:**
   - Create "PostgreSQL" service
   - Use connection details in backend environment variables

---

## Option 3: Netlify + Supabase

### Frontend (Netlify)

1. Build your app: `npm run build`
2. Go to [netlify.com](https://netlify.com)
3. Drag & drop your `dist` folder
4. Or connect GitHub for auto-deployments

### Backend + Database (Supabase)

1. Go to [supabase.com](https://supabase.com)
2. Create new project
3. Get your database URL and API key
4. Deploy your Express.js backend to any Node.js hosting (Railway, Render, etc.)
5. Use Supabase as your PostgreSQL database

---

## 🔧 Pre-Deployment Checklist

### 1. Create Production Build
```bash
# Frontend
cd lifemaps
npm run build

# Backend (if needed)
cd backend
npm install --production
```

### 2. Environment Variables
Make sure you have all required environment variables:
- `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`
- `JWT_SECRET`
- `CORS_ORIGIN` (your frontend URL)
- `NODE_ENV=production`

### 3. Database Migration
Run your database initialization scripts on the production database.

### 4. Test Locally
```bash
# Test frontend build
npm run preview

# Test backend
cd backend
npm start
```

---

## 🎯 Recommended: Vercel + Railway

**Why this combination:**
- ✅ **Easiest setup** - minimal configuration
- ✅ **Free tiers** available
- ✅ **Automatic deployments** from GitHub
- ✅ **Great documentation** and community support
- ✅ **Scalable** - can handle growth
- ✅ **Separate concerns** - frontend and backend independently deployable

**Estimated time:** 30-60 minutes for complete setup

**Cost:** Free for small projects, scales with usage

---

## 🚨 Common Issues & Solutions

### CORS Errors
- Make sure `CORS_ORIGIN` includes your frontend URL
- Check that your frontend URL is exactly correct (including https/http)

### Database Connection Issues
- Verify all database environment variables are correct
- Check that your database is accessible from the hosting platform
- Run database migrations after deployment

### Build Errors
- Make sure all dependencies are in `package.json`
- Check that your build command works locally first
- Look at deployment logs for specific error messages

### Environment Variables
- Double-check all required variables are set
- Make sure there are no typos in variable names
- Some platforms are case-sensitive

---

## 📞 Need Help?

1. **Vercel Docs:** https://vercel.com/docs
2. **Railway Docs:** https://docs.railway.app
3. **Render Docs:** https://render.com/docs
4. **Supabase Docs:** https://supabase.com/docs

Your app should be live and accessible worldwide! 🌍
