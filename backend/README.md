# Life Sheet Backend API

A Node.js/Express backend API for the Life Sheet financial planning application with PostgreSQL database integration.

## 🚀 Quick Start

### Prerequisites
- Node.js (v16 or higher)
- PostgreSQL database named `life_sheet`
- npm or pnpm package manager

### 1. Install Dependencies
```bash
cd backend
npm install
# or
pnpm install
```

### 2. Environment Setup
Create a `.env` file in the backend directory:
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

### 3. Initialize Database
```bash
npm run init-db
# or
pnpm init-db
```

### 4. Start Server
```bash
# Development mode
npm run dev
# or
pnpm dev

# Production mode
npm start
# or
pnpm start
```

## 📊 Database Schema

The API creates the following tables:
- `users` - User authentication and profiles
- `financial_profiles` - Core financial data
- `financial_goals` - Financial goals and targets
- `financial_expenses` - Expense tracking
- `financial_loans` - Loan management
- `financial_scenarios` - What-if analysis scenarios

## 🔗 API Endpoints

### Authentication
- `POST /api/register` - User registration
- `POST /api/login` - User login
- `POST /api/logout` - User logout
- `GET /api/profile` - Get user profile
- `PUT /api/profile` - Update user profile
- `POST /api/change-password` - Change password

### Financial Data
- `POST /api/financial/profile` - Create financial profile
- `GET /api/financial/profile/:userId` - Get financial profile
- `PUT /api/financial/profile/:profileId` - Update financial profile

- `POST /api/financial/goals` - Create financial goal
- `GET /api/financial/goals/:userId` - Get user's goals
- `PUT /api/financial/goals/:goalId` - Update goal
- `DELETE /api/financial/goals/:goalId` - Delete goal

- `POST /api/financial/expenses` - Create expense
- `GET /api/financial/expenses/:userId` - Get user's expenses
- `PUT /api/financial/expenses/:expenseId` - Update expense
- `DELETE /api/financial/expenses/:expenseId` - Delete expense

- `POST /api/financial/loans` - Create loan
- `GET /api/financial/loans/:userId` - Get user's loans
- `PUT /api/financial/loans/:loanId` - Update loan
- `DELETE /api/financial/loans/:loanId` - Delete loan

- `POST /api/financial/scenarios` - Create scenario
- `GET /api/financial/scenarios/:userId` - Get user's scenarios

## 🔒 Security Features

- JWT-based authentication
- Password hashing with bcrypt
- Rate limiting
- CORS protection
- Input validation
- SQL injection prevention
- Helmet security headers

## 🛠️ Development

The server runs on `http://localhost:10000` by default and expects the frontend to be running on `http://localhost:5174`.

### Health Check
- `GET /health` - Server health status

### Demo OAuth Endpoints
- `GET /api/oauth/demo/google` - Demo Google OAuth
- `GET /api/oauth/demo/facebook` - Demo Facebook OAuth

## 📝 Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | 10000 |
| `NODE_ENV` | Environment | development |
| `DB_HOST` | PostgreSQL host | localhost |
| `DB_PORT` | PostgreSQL port | 5432 |
| `DB_NAME` | Database name | life_sheet |
| `DB_USER` | Database user | postgres |
| `DB_PASSWORD` | Database password | password |
| `JWT_SECRET` | JWT secret key | (required) |
| `JWT_EXPIRES_IN` | Token expiration | 7d |
| `CORS_ORIGIN` | Allowed origin | http://localhost:5174 |
