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

if (!existsSync(distPath)) {
  console.error('❌ dist directory not found! Please run npm run build first.');
  process.exit(1);
}

app.use(express.static(distPath));

// Handle React Router - serve index.html for all routes
// This must be last, after static file serving
app.get('*', (req, res) => {
  const indexPath = join(distPath, 'index.html');
  console.log(`[Router] Serving index.html for route: ${req.path}`);
  res.sendFile(indexPath, (err) => {
    if (err) {
      console.error(`[Router] Error serving index.html for ${req.path}:`, err);
      res.status(500).send('Error loading page');
    }
  });
});

app.listen(PORT, () => {
  console.log(`✅ Frontend server running on port ${PORT}`);
  console.log(`📦 Serving files from: ${distPath}`);
});

