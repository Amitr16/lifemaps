#!/bin/bash

echo "🚀 Deploying LifeMaps to Render..."

# Check if git is clean
if [[ -n $(git status -s) ]]; then
    echo "❌ Git working directory is not clean. Please commit or stash changes first."
    exit 1
fi

# Push to GitHub
echo "📤 Pushing to GitHub..."
git push origin main

if [ $? -eq 0 ]; then
    echo "✅ Code pushed to GitHub successfully!"
    echo ""
    echo "🎯 Next steps:"
    echo "1. Go to https://dashboard.render.com"
    echo "2. Click 'New +' → 'Blueprint'"
    echo "3. Connect your GitHub repository"
    echo "4. Select this repository and click 'Connect'"
    echo "5. Review the configuration and click 'Apply'"
    echo ""
    echo "📋 The deployment will include:"
    echo "   - Backend API (Node.js)"
    echo "   - Frontend (React)"
    echo "   - PostgreSQL Database"
    echo ""
    echo "🔗 After deployment, you'll get URLs for:"
    echo "   - Frontend: https://lifemaps-frontend.onrender.com"
    echo "   - Backend: https://lifemaps-backend.onrender.com"
else
    echo "❌ Failed to push to GitHub"
    exit 1
fi
