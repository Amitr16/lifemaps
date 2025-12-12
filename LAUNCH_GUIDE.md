# 🚀 How to Launch the Life Sheet Application

## Prerequisites
- **Node.js** (v16 or higher)
- **PostgreSQL** database server (running)
- **Python 3** (for LLM classifier - optional but recommended)
- **npm** or **pnpm** package manager

---

## Step 1: Database Setup

### 1.1 Create PostgreSQL Database
```sql
-- Connect to PostgreSQL
CREATE DATABASE life_sheet;
```

### 1.2 Run Database Migrations
```bash
cd lifemaps
python add_expense_columns.py  # Adds new expense columns
```

---

## Step 2: Backend Setup

### 2.1 Navigate to Backend Directory
```bash
cd lifemaps/backend
```

### 2.2 Install Dependencies
```bash
npm install
# or
pnpm install
```

### 2.3 Create Backend Environment File
Create `backend/.env` file:
```env
# Server Configuration
PORT=10000
NODE_ENV=development

# PostgreSQL Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=life_sheet
DB_USER=postgres
DB_PASSWORD=your_password

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=7d

# CORS Configuration
CORS_ORIGIN=http://localhost:5174

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Classifier Service (for LLM classification)
CLASSIFIER_SERVICE_URL=http://localhost:5001
```

### 2.4 Initialize Database Schema (First Time Only)
```bash
npm run init-db
# or
pnpm run init-db
```

### 2.5 Start Backend Server
```bash
npm run dev
```

**Backend will run on:** `http://localhost:10000`

---

## Step 3: Frontend Setup

### 3.1 Navigate to Frontend Directory
```bash
cd lifemaps  # (from backend directory, go back to root)
```

### 3.2 Install Dependencies
```bash
npm install
# or
pnpm install
```

### 3.3 Start Frontend Development Server
```bash
npm run dev
```

**Frontend will run on:** `http://localhost:5174`

---

## Step 4: LLM Classifier Service (Optional but Recommended)

### 4.1 Install Python Dependencies
```bash
cd lifemaps
pip install -r requirements.txt
```

### 4.2 Set OpenAI API Key
Add to `backend/.env`:
```env
OPENAI_API_KEY=your_openai_api_key_here
```

### 4.3 Start Classifier Service
```bash
python expense_classifier_service.py
```

**Classifier will run on:** `http://localhost:5001`

---

## Quick Launch (All Services)

### Separate Terminals

**Terminal 1 - Backend:**
```bash
cd lifemaps/backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd lifemaps
npm run dev
```

**Terminal 3 - Classifier (Optional, for LLM classification):**
```bash
cd lifemaps
python expense_classifier_service.py
```

---

## Verification

### 1. Check Backend
Visit: `http://localhost:10000/health`
Should return: `{"status": "OK", ...}`

### 2. Check Frontend
Visit: `http://localhost:5174`
Should show: Life Sheet application

### 3. Check Classifier (if running)
Visit: `http://localhost:5001/health`
Should return: `{"status": "ok"}`

---

## Troubleshooting

### Backend won't start
- ✅ Check PostgreSQL is running
- ✅ Verify database credentials in `backend/.env`
- ✅ Check port 10000 is not in use

### Frontend can't connect to backend
- ✅ Verify backend is running on port 10000
- ✅ Check CORS_ORIGIN in `backend/.env` matches frontend URL
- ✅ Check browser console for errors

### Classifier not working
- ✅ Verify OpenAI API key is set
- ✅ Check classifier service is running on port 5001
- ✅ Check CLASSIFIER_SERVICE_URL in backend `.env`

### Database connection errors
- ✅ Verify PostgreSQL is running
- ✅ Check database exists: `psql -l | grep life_sheet`
- ✅ Verify credentials in `backend/.env`

---

## Default Ports

- **Frontend**: `http://localhost:5174`
- **Backend API**: `http://localhost:10000`
- **Classifier Service**: `http://localhost:5001`
- **PostgreSQL**: `localhost:5432`

---

## Environment Variables Summary

### Backend (`backend/.env`)
- `PORT` - Backend server port (default: 10000)
- `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` - Database config
- `JWT_SECRET` - JWT signing key (required)
- `CORS_ORIGIN` - Frontend URL (default: http://localhost:5174)
- `OPENAI_API_KEY` - For LLM classification (optional)
- `CLASSIFIER_SERVICE_URL` - Classifier service URL (default: http://localhost:5001)

---

## Next Steps

1. ✅ Start PostgreSQL database
2. ✅ Start Backend (`cd backend && npm run dev`)
3. ✅ Start Frontend (`npm run dev`)
4. ✅ Start Classifier (optional: `python expense_classifier_service.py`)
5. ✅ Open `http://localhost:5174` in browser
6. ✅ Register/Login and start using the app!

