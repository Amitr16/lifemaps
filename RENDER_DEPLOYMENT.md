# LifeMaps Deployment on Render

This guide explains how to deploy the LifeMaps application on Render with a persistent PostgreSQL database.

## Prerequisites

1. A GitHub account
2. A Render account (sign up at https://render.com)
3. Your code pushed to a GitHub repository

## Deployment Steps

### 1. Push Code to GitHub

```bash
git add .
git commit -m "Add Render deployment configuration"
git push origin main
```

### 2. Deploy on Render

1. **Go to Render Dashboard**: https://dashboard.render.com
2. **Click "New +"** → **"Blueprint"**
3. **Connect your GitHub repository**
4. **Select your repository** and click "Connect"
5. **Render will detect the `render.yaml` file** and show the services to deploy
6. **Review the configuration**:
   - Backend service (Node.js)
   - Frontend service (Static site)
   - PostgreSQL database
7. **Click "Apply"** to deploy all services

### 3. Environment Variables

The following environment variables are automatically configured:

**Backend Service:**
- `NODE_ENV=production`
- `PORT=10000`
- `DATABASE_URL` (automatically provided by Render)
- `JWT_SECRET` (automatically generated)
- `CORS_ORIGIN` (set to frontend URL)

**Frontend Service:**
- `VITE_API_URL` (set to backend URL)

### 4. Database Initialization

The database will be automatically initialized when the backend starts up. The `start-render.js` script will:
1. Run database migrations
2. Create all necessary tables
3. Start the Express server

### 5. Access Your Application

After deployment, you'll get URLs for:
- **Frontend**: `https://lifemaps-frontend.onrender.com`
- **Backend API**: `https://lifemaps-backend.onrender.com`
- **Database**: Managed by Render (internal access only)

## File Structure

```
lifemaps/
├── render.yaml                 # Render configuration
├── backend/
│   ├── start-render.js        # Startup script for Render
│   ├── scripts/
│   │   └── init-render-db.js  # Database initialization
│   └── config/
│       └── database.js        # Database config (supports DATABASE_URL)
└── frontend/                  # React app
```

## Troubleshooting

### Backend Issues
- Check the backend service logs in Render dashboard
- Ensure all environment variables are set correctly
- Verify database connection in logs

### Frontend Issues
- Check if `VITE_API_URL` is correctly set to backend URL
- Verify CORS settings allow frontend domain

### Database Issues
- Check if database initialization completed successfully
- Verify table creation in database logs
- Ensure DATABASE_URL is properly configured

## Free Tier Limitations

- **Backend**: 750 hours/month (may sleep after inactivity)
- **Frontend**: 100GB bandwidth/month
- **Database**: 1GB storage, 1GB RAM
- **Sleep**: Services may sleep after 15 minutes of inactivity

## Updating the Application

1. Push changes to GitHub
2. Render will automatically redeploy
3. Database migrations will run automatically

## Monitoring

- Use Render dashboard to monitor service health
- Check logs for any errors
- Monitor database usage and performance

## Support

For issues with:
- **Render platform**: Check Render documentation
- **Application code**: Check application logs
- **Database**: Check database connection and query logs
