import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🚀 Starting LifeMaps backend on Render...');

// Function to start the server
function startServer() {
  console.log('🚀 Starting server...');
  const server = spawn('node', ['server.js'], {
    cwd: __dirname,
    stdio: 'inherit'
  });

  server.on('close', (code) => {
    console.log(`Server process exited with code ${code}`);
  });

  server.on('error', (err) => {
    console.error('Failed to start server:', err);
  });
}

// Try to initialize database with retry logic
async function initializeDatabaseWithRetry(maxRetries = 3, delay = 5000) {
  for (let i = 0; i < maxRetries; i++) {
    console.log(`📋 Attempting database initialization (attempt ${i + 1}/${maxRetries})...`);
    
    const initDb = spawn('node', ['scripts/init-render-db.js'], {
      cwd: __dirname,
      stdio: 'inherit'
    });

    const dbInitPromise = new Promise((resolve) => {
      initDb.on('close', (code) => {
        resolve(code === 0);
      });
      initDb.on('error', () => {
        resolve(false);
      });
    });

    const success = await dbInitPromise;
    
    if (success) {
      console.log('✅ Database initialized successfully');
      return true;
    } else {
      console.log(`❌ Database initialization failed (attempt ${i + 1}/${maxRetries})`);
      if (i < maxRetries - 1) {
        console.log(`⏳ Waiting ${delay/1000} seconds before retry...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  console.log('⚠️ Database initialization failed after all retries, but starting server anyway...');
  return false;
}

// Initialize database and start server
initializeDatabaseWithRetry().then(() => {
  startServer();
});
