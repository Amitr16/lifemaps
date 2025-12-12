# Environment Variables Setup for Deployment

## 🔒 Security: Never Commit API Keys to Git

**Important:** Your `.gitignore` already includes `.env` files, so they won't be committed to GitHub. This is correct!

## 📋 Environment Variables Setup

### For Local Development

Create a `backend/.env` file (this file is already in `.gitignore`):

```env
# Database
DATABASE_URL=your_local_database_url
# OR use individual settings:
DB_HOST=localhost
DB_PORT=5432
DB_NAME=life_sheet
DB_USER=postgres
DB_PASSWORD=your_password

# OpenAI API Key
OPENAI_API_KEY=sk-your-openai-api-key-here

# Classifier Service (optional, defaults to localhost:5001)
CLASSIFIER_SERVICE_URL=http://localhost:5001
CLASSIFIER_PORT=5001
```

### For Render.com Deployment

#### Step 1: Set Environment Variables in Render Dashboard

1. Go to your Render dashboard: https://dashboard.render.com
2. Navigate to your **lifemaps-classifier** service
3. Click on **"Environment"** tab
4. Click **"Add Environment Variable"**
5. Add the following variables:

**For Classifier Service (`lifemaps-classifier`):**
- `OPENAI_API_KEY` = `sk-your-openai-api-key-here` (your actual OpenAI API key)
- `DATABASE_URL` = (automatically set from database connection)
- `CLASSIFIER_PORT` = `5001` (optional, defaults to 5001)

**For Backend Service (`lifemaps-backend`):**
- `CLASSIFIER_SERVICE_URL` = `https://lifemaps-classifier.onrender.com` (automatically set in render.yaml)
- All other variables are already configured in `render.yaml`

#### Step 2: Verify Environment Variables

After setting the variables:
1. Go to the service's **"Events"** tab
2. Click **"Manual Deploy"** → **"Deploy latest commit"**
3. Check the logs to ensure the service starts correctly

## 🚀 Deployment Checklist

- [ ] `.env` files are in `.gitignore` ✅ (already done)
- [ ] `OPENAI_API_KEY` is set in Render dashboard for `lifemaps-classifier` service
- [ ] `DATABASE_URL` is automatically connected (from render.yaml)
- [ ] `CLASSIFIER_SERVICE_URL` is set in backend service
- [ ] All services are deployed and running

## 🔍 Testing the Deployment

After deployment, test the classifier service:

```bash
curl -X POST https://lifemaps-classifier.onrender.com/classify \
  -H "Content-Type: application/json" \
  -d '{"description": "Monthly rent payment", "user_id": 1}'
```

Or test the health endpoint:

```bash
curl https://lifemaps-classifier.onrender.com/health
```

## 📝 Notes

- **Never** commit `.env` files to Git
- **Always** set sensitive keys (like `OPENAI_API_KEY`) in Render dashboard, not in code
- The `render.yaml` file uses `sync: false` for `OPENAI_API_KEY`, meaning you must set it manually
- Environment variables set in Render dashboard are automatically available to the service at runtime

## 🛠️ Troubleshooting

### Service won't start
- Check that `OPENAI_API_KEY` is set in Render dashboard
- Verify `DATABASE_URL` is correctly connected
- Check service logs in Render dashboard

### Classification not working
- Verify `CLASSIFIER_SERVICE_URL` in backend service points to correct classifier URL
- Check classifier service logs for errors
- Test classifier service health endpoint

### Database connection issues
- Ensure `DATABASE_URL` is set correctly
- Verify database is accessible from the service
- Check database connection logs

