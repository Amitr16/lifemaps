#!/usr/bin/env node

// Server monitoring script
import { spawn } from 'child_process';
import fs from 'fs';

console.log('🔍 Life Sheet Backend Monitor');
console.log('============================');

// Check if server is running
const checkServer = () => {
  return new Promise((resolve) => {
    const curl = spawn('curl', ['-s', 'http://localhost:10000/health'], { stdio: 'pipe' });
    
    let output = '';
    curl.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    curl.on('close', (code) => {
      if (code === 0) {
        try {
          const health = JSON.parse(output);
          console.log(`✅ Server is running - PID: ${health.pid}, Memory: ${health.memory.rss}, Uptime: ${Math.round(health.uptime)}s`);
          resolve(true);
        } catch (e) {
          console.log('❌ Server responded but health check failed');
          resolve(false);
        }
      } else {
        console.log('❌ Server is not responding');
        resolve(false);
      }
    });
    
    curl.on('error', () => {
      console.log('❌ Server is not responding');
      resolve(false);
    });
  });
};

// Monitor loop
const monitor = async () => {
  const isRunning = await checkServer();
  
  if (!isRunning) {
    console.log('🚨 Server is down! Check logs for errors.');
    console.log('💡 Try running: npm run start:monitored');
  }
  
  // Check again in 5 seconds
  setTimeout(monitor, 5000);
};

// Start monitoring
monitor();
