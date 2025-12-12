#!/usr/bin/env python3
"""
LLM-based expense classification service
Uses OpenAI to classify expense descriptions into categories/subcategories
"""

import os
import sys
import psycopg2
from dotenv import load_dotenv
from openai import OpenAI

# Load environment variables
env_path = os.path.join('backend', '.env')
if os.path.exists(env_path):
    load_dotenv(env_path)
else:
    load_dotenv()

def get_db_connection():
    """Get database connection from environment variables"""
    if os.getenv('DATABASE_URL'):
        return psycopg2.connect(os.getenv('DATABASE_URL'))
    else:
        return psycopg2.connect(
            host=os.getenv('DB_HOST', 'localhost'),
            port=os.getenv('DB_PORT', '5432'),
            database=os.getenv('DB_NAME', 'life_sheet'),
            user=os.getenv('DB_USER', 'postgres'),
            password=os.getenv('DB_PASSWORD', 'password')
        )

def get_expense_categories(user_id=None):
    """Get all expense categories (global + user-specific)"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Get global categories (user_id = 0) and user-specific categories
    if user_id:
        cursor.execute("""
            SELECT category, subcategory 
            FROM expense_categories 
            WHERE user_id = 0 OR user_id = %s
            ORDER BY user_id DESC, display_order, category, subcategory
        """, (user_id,))
    else:
        cursor.execute("""
            SELECT category, subcategory 
            FROM expense_categories 
            WHERE user_id = 0
            ORDER BY display_order, category, subcategory
        """)
    
    categories = cursor.fetchall()
    cursor.close()
    conn.close()
    
    # Group by category
    category_map = {}
    for cat, subcat in categories:
        if cat not in category_map:
            category_map[cat] = []
        category_map[cat].append(subcat)
    
    return category_map

def classify_expense_with_llm(description, user_id=None):
    """Use OpenAI to classify expense description into category/subcategory"""
    
    if not description or not description.strip():
        return None
    
    # Get available categories
    categories = get_expense_categories(user_id)
    
    # Build category list for prompt
    category_list = []
    for cat, subcats in categories.items():
        subcat_list = ", ".join(subcats)
        category_list.append(f"- {cat}: {subcat_list}")
    
    categories_text = "\n".join(category_list)
    
    # Initialize OpenAI client
    api_key = os.getenv('OPENAI_API_KEY')
    if not api_key:
        print("Warning: OPENAI_API_KEY not found in environment variables")
        return None
    
    client = OpenAI(api_key=api_key)
    
    # Create prompt
    prompt = f"""You are an expense classification assistant. Classify the following expense description into the most appropriate category and subcategory.

Available categories and subcategories:
{categories_text}

Expense description: "{description}"

Respond ONLY with a JSON object in this exact format:
{{"category": "CategoryName", "subcategory": "SubcategoryName"}}

If the expense doesn't fit any category well, choose the closest match. Be precise and specific."""
    
    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",  # Using cheaper model for classification
            messages=[
                {"role": "system", "content": "You are a financial expense classification assistant. Always respond with valid JSON only."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.3,
            max_tokens=100
        )
        
        result_text = response.choices[0].message.content.strip()
        
        # Parse JSON response
        import json
        # Remove markdown code blocks if present
        if result_text.startswith("```"):
            result_text = result_text.split("```")[1]
            if result_text.startswith("json"):
                result_text = result_text[4:]
            result_text = result_text.strip()
        
        result = json.loads(result_text)
        
        # Validate that category and subcategory exist
        category = result.get('category', '').strip()
        subcategory = result.get('subcategory', '').strip()
        
        if category in categories and subcategory in categories.get(category, []):
            return {"category": category, "subcategory": subcategory}
        else:
            # Try to find closest match
            for cat, subcats in categories.items():
                if cat.lower() == category.lower():
                    if subcategory in subcats:
                        return {"category": cat, "subcategory": subcategory}
                    # Return first subcategory if exact match not found
                    return {"category": cat, "subcategory": subcats[0] if subcats else ""}
            
            return None
            
    except Exception as e:
        print(f"Error in LLM classification: {e}")
        return None

if __name__ == '__main__':
    # Test the classification
    if len(sys.argv) < 2:
        print("Usage: python classify_expense.py 'expense description' [user_id]")
        sys.exit(1)
    
    description = sys.argv[1]
    user_id = int(sys.argv[2]) if len(sys.argv) > 2 else None
    
    result = classify_expense_with_llm(description, user_id)
    if result:
        print(f"Category: {result['category']}")
        print(f"Subcategory: {result['subcategory']}")
    else:
        print("Classification failed")

