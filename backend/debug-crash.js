#!/usr/bin/env node

// Enhanced crash detection script
import { spawn } from 'child_process';
import fs from 'fs';

console.log('🔍 Starting Enhanced Crash Detection...');
console.log('=====================================');

// Create crash log file
const crashLog = 'crash-log.txt';
const logStream = fs.createWriteStream(crashLog, { flags: 'a' });

const log = (message) => {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}\n`;
  console.log(logMessage.trim());
  logStream.write(logMessage);
};

log('🚀 Starting server with enhanced monitoring...');

// Start server with maximum debugging (compatible flags only)
const serverProcess = spawn('node', [
  '--trace-uncaught',
  '--trace-warnings',
  '--trace-gc',
  '--max-old-space-size=256',
  'server.js'
], {
  cwd: process.cwd(),
  stdio: 'pipe',
  env: { ...process.env, NODE_ENV: 'development' }
});

// Monitor stdout
serverProcess.stdout.on('data', (data) => {
  const output = data.toString();
  log(`[STDOUT] ${output.trim()}`);
});

// Monitor stderr
serverProcess.stderr.on('data', (data) => {
  const output = data.toString();
  log(`[STDERR] ${output.trim()}`);
});

// Monitor process events
serverProcess.on('close', (code, signal) => {
  log(`🚨 Server process closed - Code: ${code}, Signal: ${signal}`);
  log(`🚨 Process exit time: ${new Date().toISOString()}`);
  
  if (code !== 0) {
    log(`❌ Server crashed with exit code ${code}`);
  }
  
  if (signal) {
    log(`❌ Server killed by signal ${signal}`);
  }
  
  log('🔍 Check crash-log.txt for full details');
  process.exit(1);
});

serverProcess.on('error', (error) => {
  log(`❌ Failed to start server: ${error.message}`);
  log(`❌ Error stack: ${error.stack}`);
  process.exit(1);
});

// Monitor for specific crash patterns
let requestCount = 0;
let lastRequestTime = Date.now();

// Check for request storms
setInterval(() => {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  
  if (timeSinceLastRequest > 30000) { // 30 seconds
    log(`⚠️  No requests for ${Math.round(timeSinceLastRequest/1000)}s`);
  }
}, 5000);

// Graceful shutdown
process.on('SIGINT', () => {
  log('🛑 Shutting down debug monitor...');
  serverProcess.kill('SIGINT');
  logStream.end();
  process.exit(0);
});

process.on('SIGTERM', () => {
  log('🛑 Shutting down debug monitor...');
  serverProcess.kill('SIGTERM');
  logStream.end();
  process.exit(0);
});

log('✅ Enhanced crash detection started');
log('💡 Reproduce the crash and check crash-log.txt for details');
