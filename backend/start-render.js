import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🚀 Starting LifeMaps backend on Render...');

// First, initialize the database
console.log('📋 Initializing database...');
const initDb = spawn('node', ['scripts/init-render-db.js'], {
  cwd: __dirname,
  stdio: 'inherit'
});

initDb.on('close', (code) => {
  if (code === 0) {
    console.log('✅ Database initialized successfully');
    
    // Then start the server
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
  } else {
    console.error(`Database initialization failed with code ${code}`);
    process.exit(1);
  }
});

initDb.on('error', (err) => {
  console.error('Failed to initialize database:', err);
  process.exit(1);
});
