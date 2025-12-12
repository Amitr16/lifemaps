#!/usr/bin/env python3
"""
HTTP service for expense classification using OpenAI
Run this as a separate service or integrate into backend
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import psycopg2
from dotenv import load_dotenv
from openai import OpenAI

app = Flask(__name__)
CORS(app)

# Load environment variables
# Try backend/.env first (local development), then root .env, then system env
env_path = os.path.join('backend', '.env')
if os.path.exists(env_path):
    load_dotenv(env_path)
elif os.path.exists('.env'):
    load_dotenv('.env')
else:
    # On Render, environment variables are already set, no need to load .env
    pass

def get_db_connection():
    """Get database connection"""
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
    
    category_map = {}
    for cat, subcat in categories:
        if cat not in category_map:
            category_map[cat] = []
        category_map[cat].append(subcat)
    
    return category_map

@app.route('/classify', methods=['POST'])
def classify_expense():
    """Classify expense description using OpenAI"""
    try:
        data = request.json
        description = data.get('description', '').strip()
        user_id = data.get('user_id')
        
        if not description:
            return jsonify({'error': 'Description is required'}), 400
        
        # Get available categories
        categories = get_expense_categories(user_id)
        
        if not categories:
            return jsonify({'error': 'No categories found'}), 500
        
        # Build category list for prompt
        category_list = []
        for cat, subcats in categories.items():
            subcat_list = ", ".join(subcats)
            category_list.append(f"- {cat}: {subcat_list}")
        
        categories_text = "\n".join(category_list)
        
        # Initialize OpenAI client
        api_key = os.getenv('OPENAI_API_KEY')
        if not api_key:
            return jsonify({'error': 'OPENAI_API_KEY not configured'}), 500
        
        client = OpenAI(api_key=api_key)
        
        # Create prompt
        prompt = f"""You are an expense classification assistant. Classify the following expense description into the most appropriate category and subcategory.

Available categories and subcategories:
{categories_text}

Expense description: "{description}"

Respond ONLY with a JSON object in this exact format:
{{"category": "CategoryName", "subcategory": "SubcategoryName"}}

If the expense doesn't fit any category well, choose the closest match. Be precise and specific."""
        
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",  # Lighter and faster for simple classification tasks
            messages=[
                {"role": "system", "content": "You are a financial expense classification assistant. Always respond with valid JSON only."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.2,  # Lower temperature for more deterministic results
            max_tokens=50  # Reduced tokens since we only need category/subcategory
        )
        
        result_text = response.choices[0].message.content.strip()
        
        # Parse JSON response
        import json
        if result_text.startswith("```"):
            result_text = result_text.split("```")[1]
            if result_text.startswith("json"):
                result_text = result_text[4:]
            result_text = result_text.strip()
        
        result = json.loads(result_text)
        
        # Validate and return
        category = result.get('category', '').strip()
        subcategory = result.get('subcategory', '').strip()
        
        if category in categories and subcategory in categories.get(category, []):
            return jsonify({'category': category, 'subcategory': subcategory})
        else:
            # Find closest match
            for cat, subcats in categories.items():
                if cat.lower() == category.lower():
                    if subcategory in subcats:
                        return jsonify({'category': cat, 'subcategory': subcategory})
                    return jsonify({'category': cat, 'subcategory': subcats[0] if subcats else ''})
            
            return jsonify({'error': 'Could not classify expense'}), 400
            
    except Exception as e:
        print(f"Error in classification: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok'})

if __name__ == '__main__':
    port = int(os.getenv('CLASSIFIER_PORT', '5001'))
    app.run(host='0.0.0.0', port=port, debug=False)

