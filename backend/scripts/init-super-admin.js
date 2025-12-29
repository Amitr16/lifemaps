import bcrypt from 'bcryptjs';
import pool from '../config/database.js';
import dotenv from 'dotenv';

dotenv.config();

async function initSuperAdmin() {
  try {
    console.log('🔧 Initializing super admin...');
    
    // Check if super_admin table exists, if not create it
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'super_admin'
      )
    `);
    
    if (!tableCheck.rows[0].exists) {
      console.log('📋 Creating super_admin table...');
      await pool.query(`
        CREATE TABLE IF NOT EXISTS super_admin (
          id SERIAL PRIMARY KEY,
          username VARCHAR(255) UNIQUE NOT NULL,
          password_hash VARCHAR(255) NOT NULL,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `);
      
      // Create trigger for updated_at
      await pool.query(`
        CREATE TRIGGER update_super_admin_updated_at BEFORE UPDATE ON super_admin
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
      `);
    }
    
    // Check if admin table exists, if not create it
    const adminTableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'admin'
      )
    `);
    
    if (!adminTableCheck.rows[0].exists) {
      console.log('📋 Creating admin table...');
      await pool.query(`
        CREATE TABLE IF NOT EXISTS admin (
          id SERIAL PRIMARY KEY,
          username VARCHAR(255) UNIQUE NOT NULL,
          password_hash VARCHAR(255) NOT NULL,
          name VARCHAR(255),
          email VARCHAR(255),
          is_active BOOLEAN DEFAULT TRUE,
          created_by INTEGER REFERENCES super_admin(id) ON DELETE SET NULL,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `);
      
      // Add admin_id to user table if not exists
      const columnCheck = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_name = 'user' 
          AND column_name = 'admin_id'
        )
      `);
      
      if (!columnCheck.rows[0].exists) {
        console.log('📋 Adding admin_id column to user table...');
        await pool.query(`
          ALTER TABLE "user" 
          ADD COLUMN admin_id INTEGER REFERENCES admin(id) ON DELETE SET NULL
        `);
        await pool.query(`
          CREATE INDEX IF NOT EXISTS idx_user_admin_id ON "user"(admin_id)
        `);
      }
      
      // Create trigger for updated_at
      await pool.query(`
        CREATE TRIGGER update_admin_updated_at BEFORE UPDATE ON admin
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
      `);
    }
    
    // Check if super admin exists
    const existingSuperAdmin = await pool.query(
      'SELECT id FROM super_admin WHERE username = $1',
      ['superadmin']
    );
    
    if (existingSuperAdmin.rows.length === 0) {
      console.log('👤 Creating default super admin...');
      const passwordHash = await bcrypt.hash('superadmin123', 12);
      
      await pool.query(
        'INSERT INTO super_admin (username, password_hash) VALUES ($1, $2)',
        ['superadmin', passwordHash]
      );
      console.log('✅ Super admin created: username=superadmin, password=superadmin123');
    } else {
      console.log('✅ Super admin already exists');
    }
    
    console.log('✅ Super admin initialization complete');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error initializing super admin:', error);
    process.exit(1);
  }
}

initSuperAdmin();

