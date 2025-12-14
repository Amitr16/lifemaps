# 🔄 Updating Existing Render Deployment

Since you already have services deployed, follow these steps to add the classifier service and update existing services.

## 📋 Step-by-Step Update Process

### Step 1: Push Updated Code to GitHub

```bash
# Make sure you're in the project root
git add .
git commit -m "Add expense classifier service and category management"
git push origin main
```

### Step 2: Add New Classifier Service to Render

1. **Go to Render Dashboard**: https://dashboard.render.com
2. **Click "New +"** → **"Web Service"** (NOT Blueprint, since you're adding to existing)
3. **Connect your GitHub repository** (if not already connected)
4. **Select your repository**
5. **Configure the service**:
   - **Name**: `lifemaps-classifier`
   - **Environment**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `python expense_classifier_service.py`
   - **Plan**: Free
6. **Click "Create Web Service"**

### Step 3: Set Environment Variables for Classifier Service

In the **lifemaps-classifier** service:

1. Go to **"Environment"** tab
2. Click **"Add Environment Variable"** and add:

   **Required:**
   - `OPENAI_API_KEY` = `sk-your-actual-openai-api-key-here`
   
   **Auto-configured (add these):**
   - `DATABASE_URL` = (Copy from your existing `lifemaps-backend` service's DATABASE_URL)
   - `CLASSIFIER_PORT` = `5001`

3. Click **"Save Changes"**

### Step 4: Update Backend Service Environment Variables

1. Go to your existing **lifemaps-backend** service
2. Go to **"Environment"** tab
3. Add new environment variable:
   - `CLASSIFIER_SERVICE_URL` = `https://lifemaps-classifier.onrender.com`
   - (Replace with your actual classifier service URL after it's deployed)
4. Click **"Save Changes"**

### Step 5: Update Existing Services (Auto-Deploy)

Your existing services will automatically redeploy when you push to GitHub:

1. **lifemaps-backend** - Will auto-update with new code
2. **lifemaps-frontend** - Will auto-update with new code
3. **lifemaps-db** - No changes needed (database stays the same)

### Step 6: Verify Deployment

1. **Check classifier service**:
   ```bash
   curl https://lifemaps-classifier.onrender.com/health
   # Should return: {"status":"ok"}
   ```

2. **Check backend logs** - Should show it can connect to classifier

3. **Test the app** - Try adding an expense and see if classification works

## 🔍 Alternative: Use Blueprint (If You Want to Recreate)

If you prefer to use the `render.yaml` Blueprint approach:

1. **Delete existing services** (or keep them if you want to test first)
2. **Create new Blueprint** from `render.yaml`
3. **Connect to existing database** (use the same database name)
4. **Set environment variables** as described above

**⚠️ Warning**: This will recreate services. Only do this if you're comfortable with that.

## 📝 Environment Variables Checklist

### Classifier Service (`lifemaps-classifier`)
- [ ] `OPENAI_API_KEY` (set manually)
- [ ] `DATABASE_URL` (copy from backend service)
- [ ] `CLASSIFIER_PORT=5001` (optional, defaults to 5001)

### Backend Service (`lifemaps-backend`)
- [ ] `CLASSIFIER_SERVICE_URL` (set to classifier service URL)
- [ ] All existing env vars remain unchanged

### Frontend Service (`lifemaps-frontend`)
- [ ] No changes needed

### Database (`lifemaps-db`)
- [ ] No changes needed

## 🐛 Troubleshooting

### Classifier service won't start
- Check that `OPENAI_API_KEY` is set correctly
- Verify `DATABASE_URL` matches your database connection
- Check service logs in Render dashboard

### Backend can't connect to classifier
- Verify `CLASSIFIER_SERVICE_URL` is set correctly in backend
- Check classifier service is running and accessible
- Verify CORS is enabled in classifier service (already done in code)

### Classification not working
- Test classifier health endpoint directly
- Check backend logs for connection errors
- Verify OpenAI API key is valid and has credits

## ✅ After Update

Once everything is deployed:
- Users can click "Manage Categories" button in Expenses page
- Users can add custom categories/subcategories
- AI classification will use both global and user-specific categories
- All existing data remains intact

