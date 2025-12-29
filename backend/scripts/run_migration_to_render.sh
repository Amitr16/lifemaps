#!/bin/bash
# Shell script to run admin tables migration to Render
# Usage: ./run_migration_to_render.sh

echo "========================================"
echo "Admin Tables Migration to Render"
echo "========================================"
echo ""
echo "This script will migrate admin tables to your Render database."
echo ""
echo "Make sure you have set the DATABASE_URL environment variable"
echo "with your Render database connection string."
echo ""
echo "To get your DATABASE_URL:"
echo "1. Go to https://dashboard.render.com"
echo "2. Navigate to your PostgreSQL database"
echo "3. Copy the 'Internal Database URL' or 'External Database URL'"
echo "4. Set it as: export DATABASE_URL='your_connection_string'"
echo ""
read -p "Press Enter to continue or Ctrl+C to cancel..."

cd "$(dirname "$0")/../.."
python3 backend/scripts/migrate_admin_tables_to_render.py

