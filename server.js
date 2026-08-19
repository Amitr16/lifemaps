import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files from the dist directory
const distPath = join(__dirname, 'dist');

console.log('🔍 Checking for dist directory...');
console.log('   Current directory:', __dirname);
console.log('   Dist path:', distPath);
console.log('   Dist exists:', existsSync(distPath));

if (!existsSync(distPath)) {
  console.error('❌ dist directory not found! Please run npm run build first.');
  console.error('   Expected path:', distPath);
  process.exit(1);
}

// Serve static files
app.use(express.static(distPath, {
  index: false // Don't serve index.html automatically for root
}));

// Handle React Router - serve index.html for ALL routes (including root)
// This must be last, after static file serving
app.get('*', (req, res) => {
  const indexPath = join(distPath, 'index.html');
  console.log(`[Router] ${req.method} ${req.path} -> serving index.html`);

  res.sendFile(indexPath, (err) => {
    if (err) {
      console.error(`[Router] Error serving index.html for ${req.path}:`, err);
      res.status(500).send('Error loading page');
    } else {
      console.log(`[Router] ✅ Successfully served index.html for ${req.path}`);
    }
  });
});

app.listen(PORT, () => {
  console.log('='.repeat(60));
  console.log(`✅ Frontend server running on port ${PORT}`);
  console.log(`📦 Serving files from: ${distPath}`);
  console.log(`🌐 Server ready at http://localhost:${PORT}`);
  console.log('='.repeat(60));
});

