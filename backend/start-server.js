#!/usr/bin/env node

// Enhanced server startup with crash detection and monitoring
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🚀 Starting Life Sheet Backend Server with monitoring...');

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Start server with enhanced monitoring (compatible flags only)
const serverProcess = spawn('node', [
  '--trace-uncaught',
  '--trace-warnings', 
  '--trace-gc',
  '--max-old-space-size=512',
  'server.js'
], {
  cwd: __dirname,
  stdio: 'inherit',
  env: { ...process.env, NODE_ENV: 'development' }
});

// Monitor server process
serverProcess.on('close', (code, signal) => {
  console.error(`❌ Server process closed with code ${code} and signal ${signal}`);
  console.error('🔄 Restarting server in 2 seconds...');
  
  setTimeout(() => {
    console.log('🔄 Restarting server...');
    // Restart the server
    process.exit(1); // Let the parent process restart us
  }, 2000);
});

serverProcess.on('error', (error) => {
  console.error('❌ Failed to start server process:', error);
  process.exit(1);
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down server...');
  serverProcess.kill('SIGINT');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down server...');
  serverProcess.kill('SIGTERM');
  process.exit(0);
});

console.log('✅ Server monitoring started. Press Ctrl+C to stop.');
