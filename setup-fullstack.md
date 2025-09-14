# 🚀 Life Sheet Full-Stack Setup Guide

This guide will help you set up both the frontend and backend for the Life Sheet application with PostgreSQL database integration.

## 📋 Prerequisites

- **Node.js** (v16 or higher)
- **PostgreSQL** database server
- **pnpm** package manager (or npm)

## 🗄️ Database Setup

### 1. Create PostgreSQL Database
```sql
-- Connect to PostgreSQL as superuser
CREATE DATABASE life_sheet;
```

### 2. Set up Database User (Optional)
```sql
-- Create a dedicated user for the application
CREATE USER lifesheet_user WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE life_sheet TO lifesheet_user;
```

## 🔧 Backend Setup

### 1. Navigate to Backend Directory
```bash
cd backend
```

### 2. Install Dependencies
```bash
pnpm install
# or
npm install
```

### 3. Environment Configuration
Create a `.env` file in the `backend` directory:
```env
# Server Configuration
PORT=10000
NODE_ENV=development

# PostgreSQL Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=life_sheet
DB_USER=your_username
DB_PASSWORD=your_password

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=7d

# CORS Configuration
CORS_ORIGIN=http://localhost:5174

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### 4. Initialize Database Schema
```bash
pnpm run init-db
# or
npm run init-db
```

### 5. Start Backend Server
```bash
# Development mode (with auto-restart)
pnpm run dev
# or
npm run dev

# Production mode
pnpm start
# or
npm start
```

The backend will be available at `http://localhost:10000`

## 🎨 Frontend Setup

### 1. Navigate to Frontend Directory
```bash
cd ..  # Go back to project root
```

### 2. Install Dependencies (if not already done)
```bash
pnpm install
# or
npm install
```

### 3. Start Frontend Development Server
```bash
pnpm dev
# or
npm run dev
```

The frontend will be available at `http://localhost:5174`

## ✅ Verification

### 1. Backend Health Check
Visit `http://localhost:10000/health` - you should see:
```json
{
  "status": "OK",
  "timestamp": "2024-01-27T...",
  "uptime": 123.456
}
```

### 2. Frontend Application
Visit `http://localhost:5174` - you should see the Life Sheet application

### 3. Test Registration/Login
1. Click on "Login" or "Register" in the frontend
2. Create a new account or login with existing credentials
3. The app should now save data to PostgreSQL instead of localStorage

## 🔄 Data Flow

```
Frontend (React) → API Service → Backend (Express) → PostgreSQL Database
     ↓                ↓              ↓                    ↓
  User Interface → HTTP Requests → JWT Auth → Data Storage
```

## 🛠️ Development Workflow

### Backend Development
- Backend runs on port 10000
- Auto-restart on file changes (with `pnpm run dev`)
- Database changes require manual migration

### Frontend Development
- Frontend runs on port 5174
- Hot reload on file changes
- API calls automatically go to backend

### Database Management
- Use `pnpm run init-db` to reset database schema
- Connect to PostgreSQL directly for advanced queries
- All data persists between restarts

## 🚨 Troubleshooting

### Backend Issues
- **Database Connection Error**: Check PostgreSQL is running and credentials are correct
- **Port Already in Use**: Change PORT in `.env` file
- **JWT Secret Error**: Set a strong JWT_SECRET in `.env`

### Frontend Issues
- **API Connection Error**: Ensure backend is running on port 10000
- **CORS Error**: Check CORS_ORIGIN in backend `.env`
- **Token Issues**: Clear localStorage and re-login

### Database Issues
- **Schema Errors**: Run `pnpm run init-db` again
- **Permission Errors**: Check database user permissions
- **Connection Timeout**: Verify PostgreSQL is running

## 📊 Database Schema

The application creates these tables:
- `users` - User accounts and authentication
- `financial_profiles` - Core financial data
- `financial_goals` - Financial goals and targets
- `financial_expenses` - Expense tracking
- `financial_loans` - Loan management
- `financial_scenarios` - What-if analysis

## 🔒 Security Notes

- Change default JWT_SECRET in production
- Use strong database passwords
- Enable SSL in production
- Set up proper CORS origins
- Use environment variables for all secrets

## 🎯 Next Steps

1. **Test the full application** - Create accounts, add financial data
2. **Customize the UI** - Modify components as needed
3. **Add features** - Extend the API and frontend
4. **Deploy** - Set up production environment
5. **Monitor** - Add logging and monitoring

Your Life Sheet application is now fully functional with both frontend and backend! 🎉
