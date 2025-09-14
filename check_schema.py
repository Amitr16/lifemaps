#!/usr/bin/env python3
import psycopg2

def check_schema():
    try:
        conn = psycopg2.connect(
            host='localhost',
            port=5432,
            database='life_sheet',
            user='postgres',
            password='admin'
        )
        cur = conn.cursor()
        
        # Query 1: See all NOT NULL columns on likely tables
        print('=== NOT NULL columns blocking autosave ===')
        cur.execute("""
        SELECT table_name, column_name, data_type
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name IN (
            'financial_loans','financial_loan','loans','loan',
            'financial_expenses','financial_expense','expenses','expense',
            'financial_goals','financial_goal','goals','goal'
          )
          AND is_nullable = 'NO'
        ORDER BY table_name, ordinal_position;
        """)
        
        results = cur.fetchall()
        if results:
            for row in results:
                print(f'{row[0]}.{row[1]} ({row[2]}) - NOT NULL')
        else:
            print('No matching tables found')
        
        print('\n=== All financial tables in database ===')
        cur.execute("""
        SELECT table_name 
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name LIKE '%financial%'
        ORDER BY table_name;
        """)
        
        tables = cur.fetchall()
        for table in tables:
            print(f'  {table[0]}')
        
        print('\n=== Generate DDL for existing NOT NULL columns ===')
        cur.execute("""
        WITH candidates AS (
          SELECT 'public'::text AS sch, unnest(ARRAY[
            'financial_loans','financial_loan','loans','loan',
            'financial_expenses','financial_expense','expenses','expense',
            'financial_goals','financial_goal','goals','goal'
          ]) AS tbl,
          unnest(ARRAY[
            -- loans
            'lender','type','start_date','end_date','principal_outstanding','rate','emi','name','amount',
            -- expenses
            'category','frequency','amount','personal_inflation','source',
            -- goals
            'name','target_amount','target_age','target_year','priority'
          ]) AS col
        )
        SELECT
          'ALTER TABLE '||c.table_schema||'.'||c.table_name||
          ' ALTER COLUMN '||c.column_name||' DROP NOT NULL;' AS ddl
        FROM information_schema.columns c
        JOIN candidates x
          ON x.sch = c.table_schema AND x.tbl = c.table_name AND x.col = c.column_name
        WHERE c.is_nullable = 'NO'
        ORDER BY c.table_name, c.ordinal_position;
        """)
        
        ddl_results = cur.fetchall()
        if ddl_results:
            print('-- Generated DDL to relax constraints:')
            for ddl in ddl_results:
                print(ddl[0])
        else:
            print('No DDL needed - no matching NOT NULL constraints found')
        
        cur.close()
        conn.close()
        print('\n✅ Database connection successful')
        
    except Exception as e:
        print(f'❌ Database error: {e}')

if __name__ == '__main__':
    check_schema()
