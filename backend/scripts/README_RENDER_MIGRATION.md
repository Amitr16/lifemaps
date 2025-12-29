# Quick Migration Guide for Render

## Run Admin Tables Migration on Render

### Option 1: Using Render Shell (Easiest)

1. Go to Render Dashboard → Your Backend Service
2. Click "Shell" tab
3. Run:
   ```bash
   cd backend && node scripts/migrate-admin-tables.js
   ```

### Option 2: Add to Build Command

Add this to your Render build command (Settings → Build & Deploy):
```bash
npm install && npm run migrate:admin
```

**Note**: This runs on every deploy. Only use if you want automatic migrations.

### Option 3: Direct SQL (Alternative)

If the Node.js script doesn't work, you can run SQL directly:

1. Go to Render Dashboard → Your PostgreSQL Database
2. Click "Connect" → "PSQL" or use any PostgreSQL client
3. Run the SQL file: `backend/scripts/2025-01-31_create_admin_tables.sql`
4. **Important**: The INSERT statement in the SQL file has a placeholder hash. 
   You need to generate the bcrypt hash separately or use the Node.js script.

### What Gets Created

- ✅ `super_admin` table
- ✅ `admin` table  
- ✅ `admin_id` column added to `user` table
- ✅ Default super admin: `superadmin` / `superadmin123`

### Verify Migration

After running, check in Render database console:
```sql
SELECT * FROM super_admin WHERE username = 'superadmin';
SELECT table_name FROM information_schema.tables WHERE table_name IN ('super_admin', 'admin');
```

### Troubleshooting

**"update_updated_at_column function does not exist"**
- Run this first:
```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

**Connection errors**
- Check environment variables are set correctly
- Verify database is running and accessible

