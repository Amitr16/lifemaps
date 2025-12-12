# Expense Classifier Service Setup

## Overview
The expense classifier uses OpenAI to automatically classify expense descriptions into categories and subcategories from the `expense_categories` table.

## Setup

### 1. Install Python Dependencies
```bash
pip install -r requirements.txt
```

### 2. Set Environment Variables
Add to `backend/.env`:
```env
OPENAI_API_KEY=your_openai_api_key_here
CLASSIFIER_SERVICE_URL=http://localhost:5001  # Optional, defaults to localhost:5001
```

### 3. Start the Classifier Service
```bash
python expense_classifier_service.py
```

The service will run on port 5001 by default (or set `CLASSIFIER_PORT` in env).

### 4. Update Backend Environment (Optional)
If running classifier on a different host/port, update `backend/.env`:
```env
CLASSIFIER_SERVICE_URL=http://localhost:5001
```

## How It Works

1. User enters expense description in "Specific Goods / Service" field
2. On blur (when user leaves the field), frontend calls `/api/financial/expense/classify`
3. Backend forwards request to Python classifier service
4. Python service:
   - Fetches all categories/subcategories (global + user-specific)
   - Sends description to OpenAI with available categories
   - Returns best matching category/subcategory
5. Frontend auto-fills Category and Subcategory fields

## Testing

Test the classifier directly:
```bash
python classify_expense.py "Monthly rent payment" [user_id]
```

Or test the HTTP service:
```bash
curl -X POST http://localhost:5001/classify \
  -H "Content-Type: application/json" \
  -d '{"description": "Monthly rent payment", "user_id": 1}'
```

## Notes

- Uses `gpt-4o-mini` model for cost efficiency
- Only classifies if category/subcategory are empty
- Shows "Classifying..." status while processing
- Falls back gracefully if classification fails

