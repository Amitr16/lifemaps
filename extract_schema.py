#!/usr/bin/env python3
"""
Extract database schema from local PostgreSQL and generate Render initialization script
"""

import psycopg2
import json
from datetime import datetime

# Database connection settings
DB_CONFIG = {
    'host': 'localhost',
    'port': 5432,
    'database': 'life_sheet',
    'user': 'postgres',
    'password': 'admin'  # Updated with correct password
}

def connect_to_db():
    """Connect to local PostgreSQL database"""
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        print("✅ Connected to local database")
        return conn
    except Exception as e:
        print(f"❌ Failed to connect to database: {e}")
        return None

def get_table_schema(conn, table_name):
    """Get detailed schema for a specific table"""
    cursor = conn.cursor()
    
    # Get column information
    cursor.execute("""
        SELECT 
            column_name,
            data_type,
            character_maximum_length,
            is_nullable,
            column_default,
            ordinal_position
        FROM information_schema.columns 
        WHERE table_name = %s 
        ORDER BY ordinal_position
    """, (table_name,))
    
    columns = cursor.fetchall()
    
    # Get constraints
    cursor.execute("""
        SELECT 
            tc.constraint_name,
            tc.constraint_type,
            kcu.column_name,
            ccu.table_name AS foreign_table_name,
            ccu.column_name AS foreign_column_name
        FROM information_schema.table_constraints tc
        LEFT JOIN information_schema.key_column_usage kcu 
            ON tc.constraint_name = kcu.constraint_name
        LEFT JOIN information_schema.constraint_column_usage ccu 
            ON ccu.constraint_name = tc.constraint_name
        WHERE tc.table_name = %s
    """, (table_name,))
    
    constraints = cursor.fetchall()
    
    return {
        'columns': columns,
        'constraints': constraints
    }

def generate_create_table_sql(table_name, schema):
    """Generate CREATE TABLE SQL from schema"""
    sql_parts = [f"CREATE TABLE IF NOT EXISTS {table_name} ("]
    
    # Add columns
    column_definitions = []
    for col in schema['columns']:
        col_name, data_type, max_length, nullable, default, position = col
        
        # Build column definition
        col_def = f"  {col_name} {data_type.upper()}"
        
        # Add length for varchar
        if data_type == 'character varying' and max_length:
            col_def += f"({max_length})"
        
        # Add NOT NULL
        if nullable == 'NO':
            col_def += " NOT NULL"
        
        # Add default
        if default:
            col_def += f" DEFAULT {default}"
        
        column_definitions.append(col_def)
    
    sql_parts.append(",\n".join(column_definitions))
    
    # Add constraints
    for constraint in schema['constraints']:
        const_name, const_type, col_name, foreign_table, foreign_col = constraint
        
        if const_type == 'PRIMARY KEY':
            sql_parts.append(f",\n  PRIMARY KEY ({col_name})")
        elif const_type == 'FOREIGN KEY' and foreign_table:
            sql_parts.append(f",\n  FOREIGN KEY ({col_name}) REFERENCES {foreign_table}({foreign_col}) ON DELETE CASCADE")
        elif const_type == 'UNIQUE':
            sql_parts.append(f",\n  UNIQUE ({col_name})")
    
    sql_parts.append("\n)")
    
    return "\n".join(sql_parts)

def list_all_tables(conn):
    """List all tables in the database"""
    cursor = conn.cursor()
    cursor.execute("""
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        ORDER BY table_name
    """)
    tables = [row[0] for row in cursor.fetchall()]
    return tables

def main():
    """Main function to extract schema and generate script"""
    print("🔍 Extracting database schema from local PostgreSQL...")
    
    # Connect to database
    conn = connect_to_db()
    if not conn:
        return
    
    try:
        # First, list all available tables
        print("\n📋 Available tables in local database:")
        available_tables = list_all_tables(conn)
        for table in available_tables:
            print(f"  - {table}")
        
        # Tables to extract (in dependency order) - using actual table names from local DB
        tables = [
            'user',
            'financial_profile', 
            'assets',  # was financial_asset
            'financial_loan',
            'financial_goal',
            'financial_expense',
            'work_assets',  # was work_asset
            'user_tags',
            'user_asset_columns',
            'financial_scenario'  # also found this table
        ]
        
        print(f"\n📋 Extracting schema for {len(tables)} tables...")
        
        # Generate the complete initialization script
        script_content = '''import pool from '../config/database.js';

async function initRenderDatabase() {
  try {
    console.log('🚀 Initializing database for Render...');
    
    // Test connection with timeout
    const client = await Promise.race([
      pool.connect(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Connection timeout')), 10000)
      )
    ]);
    console.log('✅ Connected to Render PostgreSQL database');
    
    // Create tables
    await createTables(client);
    
    client.release();
    console.log('✅ Database initialization completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Database initialization failed:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.error('💡 Database connection refused - database might not be ready yet');
    }
    process.exit(1);
  }
}

async function createTables(client) {
  console.log('📋 Creating tables...');
  
'''
        
        for table_name in tables:
            print(f"  📊 Extracting {table_name}...")
            schema = get_table_schema(conn, table_name)
            
            if schema['columns']:
                create_sql = generate_create_table_sql(table_name, schema)
                script_content += f"  // Create {table_name} table\n"
                script_content += f"  await client.query(`\n{create_sql}\n  `);\n"
                script_content += f"  console.log('✅ {table_name} table created');\n\n"
            else:
                print(f"    ⚠️  Table {table_name} not found or empty")
        
        script_content += '''  console.log('🎉 All tables created successfully!');
}

initRenderDatabase();
'''
        
        # Write the generated script
        output_file = 'backend/scripts/init-render-db-generated.js'
        with open(output_file, 'w', encoding='utf-8') as f:
            f.write(script_content)
        
        print(f"\n✅ Generated schema script: {output_file}")
        print("📋 This script contains the EXACT schema from your local database")
        print("🔄 You can now replace the current init-render-db.js with this generated one")
        
        # Also save schema as JSON for reference
        schema_data = {}
        for table_name in tables:
            schema = get_table_schema(conn, table_name)
            if schema['columns']:
                schema_data[table_name] = {
                    'columns': [dict(zip(['name', 'type', 'max_length', 'nullable', 'default', 'position'], col)) 
                               for col in schema['columns']],
                    'constraints': [dict(zip(['name', 'type', 'column', 'foreign_table', 'foreign_column'], const)) 
                                   for const in schema['constraints']]
                }
        
        with open('local_schema.json', 'w') as f:
            json.dump(schema_data, f, indent=2)
        
        print(f"📄 Schema also saved as JSON: local_schema.json")
        
    except Exception as e:
        print(f"❌ Error extracting schema: {e}")
    finally:
        conn.close()
        print("🔌 Database connection closed")

if __name__ == "__main__":
    main()
