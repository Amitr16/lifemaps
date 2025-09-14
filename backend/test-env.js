import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔍 Current working directory:', process.cwd());
console.log('🔍 Script directory:', __dirname);

// Try to load .env file
const envPath = path.resolve(__dirname, '.env');
console.log('🔍 Looking for .env at:', envPath);

const result = dotenv.config({ path: envPath });
console.log('🔍 dotenv.config result:', result);

console.log('🔍 Environment variables:');
console.log('  DB_HOST:', process.env.DB_HOST);
console.log('  DB_PORT:', process.env.DB_PORT);
console.log('  DB_NAME:', process.env.DB_NAME);
console.log('  DB_USER:', process.env.DB_USER);
console.log('  DB_PASSWORD:', process.env.DB_PASSWORD ? '***' : 'undefined');
console.log('  NODE_ENV:', process.env.NODE_ENV);
