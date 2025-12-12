# 🚀 Quick Deployment Guide

## ✅ Pre-Deployment Checklist

### 1. Git Setup (API Keys Security)
- ✅ `.env` files are already in `.gitignore` - **DO NOT commit API keys to Git**
- ✅ All sensitive data stays in environment variables

### 2. Files Ready for Deployment
- ✅ `render.yaml` - Updated with classifier service
- ✅ `requirements.txt` - Python dependencies
- ✅ `runtime.txt` - Python version
- ✅ `expense_classifier_service.py` - Updated to work on Render

## 📤 Push to GitHub

```bash
# Make sure .env files are NOT tracked
git status  # Verify .env files don't show up

# Add all files (except .env which is ignored)
git add .
git commit -m "Add expense classifier service and deployment config"
git push origin main
```

## 🌐 Deploy on Render.com

### Step 1: Connect Repository
1. Go to https://dashboard.render.com
2. Click **"New +"** → **"Blueprint"**
3. Connect your GitHub repository
4. Render will detect `render.yaml` and show 4 services:
   - `lifemaps-backend` (Node.js)
   - `lifemaps-frontend` (Static)
   - `lifemaps-classifier` (Python) ⭐ NEW
   - `lifemaps-db` (PostgreSQL)

### Step 2: Deploy Services
1. Click **"Apply"** to deploy all services
2. Wait for deployment to complete (~5-10 minutes)

### Step 3: Set OpenAI API Key ⚠️ REQUIRED
1. Go to **lifemaps-classifier** service
2. Click **"Environment"** tab
3. Click **"Add Environment Variable"**
4. Add:
   ```
   Key: OPENAI_API_KEY
   Value: sk-your-actual-openai-api-key-here
   ```
5. Click **"Save Changes"**
6. Service will auto-redeploy

### Step 4: Verify Deployment
Test the classifier service:
```bash
curl https://lifemaps-classifier.onrender.com/health
# Should return: {"status":"ok"}
```

## 🔗 Service URLs

After deployment, you'll have:
- **Frontend**: `https://lifemaps-frontend.onrender.com`
- **Backend**: `https://lifemaps-backend.onrender.com`
- **Classifier**: `https://lifemaps-classifier.onrender.com` ⭐ NEW

## 📝 Important Notes

1. **Never commit `.env` files** - They're in `.gitignore` ✅
2. **Set `OPENAI_API_KEY` manually** in Render dashboard (not in code)
3. **All other env vars** are auto-configured in `render.yaml`
4. **Database connection** is automatically set up

## 🐛 Troubleshooting

**Classifier service won't start?**
- Check that `OPENAI_API_KEY` is set in Render dashboard
- Check service logs in Render dashboard

**Classification not working?**
- Verify `CLASSIFIER_SERVICE_URL` in backend service
- Test classifier health endpoint

See `DEPLOYMENT_ENV_SETUP.md` for detailed environment variable setup.

