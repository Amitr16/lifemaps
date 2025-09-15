#!/usr/bin/env node

// Simple crash detection script
import { spawn } from 'child_process';
import fs from 'fs';

console.log('🔍 Simple Crash Detection...');
console.log('============================');

// Create crash log file
const crashLog = 'simple-crash-log.txt';
const logStream = fs.createWriteStream(crashLog, { flags: 'a' });

const log = (message) => {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}\n`;
  console.log(logMessage.trim());
  logStream.write(logMessage);
};

log('🚀 Starting server with basic monitoring...');

// Start server with basic debugging
const serverProcess = spawn('node', [
  '--trace-uncaught',
  '--trace-warnings',
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
  
  log('🔍 Check simple-crash-log.txt for full details');
  process.exit(1);
});

serverProcess.on('error', (error) => {
  log(`❌ Failed to start server: ${error.message}`);
  log(`❌ Error stack: ${error.stack}`);
  process.exit(1);
});

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

log('✅ Simple crash detection started');
log('💡 Reproduce the crash and check simple-crash-log.txt for details');
