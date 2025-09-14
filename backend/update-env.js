import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envPath = path.resolve(__dirname, '.env');

console.log('🔍 Current .env file content:');
console.log(fs.readFileSync(envPath, 'utf8'));

// Update the password from 'password' to 'admin'
let envContent = fs.readFileSync(envPath, 'utf8');
envContent = envContent.replace('DB_PASSWORD=password', 'DB_PASSWORD=admin');

fs.writeFileSync(envPath, envContent);

console.log('\n✅ Updated .env file:');
console.log(fs.readFileSync(envPath, 'utf8'));
