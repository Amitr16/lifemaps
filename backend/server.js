import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables FIRST with absolute path
const envPath = path.resolve(__dirname, '.env');
console.log('🔎 Resolving .env at:', envPath, 'exists?', fs.existsSync(envPath));

// Debug: Read and log the .env file content
const envContent = fs.readFileSync(envPath, 'utf8');
console.log('📄 .env file content:');
console.log(envContent);
console.log('📄 End of .env content');

dotenv.config({ path: envPath });

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import pool from './config/database.js';

// Import routes
import authRoutes from './routes/auth.js';
import financialRoutes from './routes/financial.js';
import { authenticateToken } from './middleware/auth.js';

const app = express();
const PORT = process.env.PORT || 10000;

// Security middleware
app.use(helmet());

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.'
  }
});

app.use(limiter);

// CORS configuration
console.log('🔍 CORS_ORIGIN from env:', process.env.CORS_ORIGIN);
const corsOrigins = process.env.CORS_ORIGIN 
  ? process.env.CORS_ORIGIN.split(',').map(origin => origin.trim())
  : ['http://localhost:5174'];
console.log('🔍 Parsed CORS origins:', corsOrigins);
const corsOptions = {
  origin: corsOrigins,
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// API routes
app.use('/api', authRoutes);
app.use('/api/financial', authenticateToken, financialRoutes);

// OAuth demo endpoints (for testing)
app.get('/api/oauth/demo/google', (req, res) => {
  // Demo Google OAuth - in production, this would redirect to Google OAuth
  res.json({
    message: 'Google OAuth demo',
    user: {
      id: 'demo-google-user',
      email: 'demo@google.com',
      name: 'Demo Google User'
    }
  });
});

app.get('/api/oauth/demo/facebook', (req, res) => {
  // Demo Facebook OAuth - in production, this would redirect to Facebook OAuth
  res.json({
    message: 'Facebook OAuth demo',
    user: {
      id: 'demo-facebook-user',
      email: 'demo@facebook.com',
      name: 'Demo Facebook User'
    }
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'API endpoint not found' });
});

// Global error handler
app.use((error, req, res, next) => {
  console.error('Global error handler:', error);
  
  // Don't leak error details in production
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  res.status(error.status || 500).json({
    error: isDevelopment ? error.message : 'Internal server error',
    ...(isDevelopment && { stack: error.stack })
  });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  await pool.end();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully');
  await pool.end();
  process.exit(0);
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Life Sheet Backend Server running on port ${PORT}`);
  console.log(`📊 Database: PostgreSQL (${process.env.DB_NAME || 'life_sheet'})`);
  console.log(`🌐 CORS Origin: ${process.env.CORS_ORIGIN || 'http://localhost:5174'}`);
  console.log(`🔗 API Base URL: http://localhost:${PORT}/api`);
});

export default app;
