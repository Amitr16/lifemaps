# Quick Guide: Run Admin Migration to Render

## Step 1: Get Your Render DATABASE_URL

1. Go to https://dashboard.render.com
2. Click on your **PostgreSQL database** (usually named `lifemaps-db`)
3. Scroll down to the **"Connections"** section
4. Copy the **"Internal Database URL"** (recommended) or **"External Database URL"**

The URL will look like:
```
postgresql://username:password@hostname:port/database_name
```

## Step 2: Run the Migration

### Windows PowerShell:
```powershell
$env:DATABASE_URL="postgresql://username:password@hostname:port/database_name"
python backend/scripts/migrate_admin_tables_to_render.py
```

### Windows CMD:
```cmd
set DATABASE_URL=postgresql://username:password@hostname:port/database_name
python backend/scripts/migrate_admin_tables_to_render.py
```

### Linux/Mac:
```bash
export DATABASE_URL="postgresql://username:password@hostname:port/database_name"
python3 backend/scripts/migrate_admin_tables_to_render.py
```

## Alternative: Use .env File

Create or edit `backend/.env` and add:
```
DATABASE_URL=postgresql://username:password@hostname:port/database_name
```

Then run:
```bash
python backend/scripts/migrate_admin_tables_to_render.py
```

## What the Script Does

- Creates `super_admin` table
- Creates `admin` table  
- Adds `admin_id` column to `user` table
- Creates default super admin (username: `superadmin`, password: `superadmin123`)

## Verification

After running, you should see:
```
[OK] Migration completed successfully!
```

You can then log in to your Render app at `/super-admin/login` with:
- Username: `superadmin`
- Password: `superadmin123`

**⚠️ IMPORTANT**: Change the default password after first login!

