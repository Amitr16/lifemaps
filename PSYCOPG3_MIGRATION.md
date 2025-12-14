# Migration to psycopg (psycopg3) for Python 3.13 Support

## Problem
`psycopg2-binary` doesn't support Python 3.13, causing deployment failures on Render.

## Solution
Switched to `psycopg` (psycopg3), which is:
- ✅ Fully supports Python 3.13
- ✅ Modern, actively maintained
- ✅ Drop-in replacement for most psycopg2 code
- ✅ Better performance and async support

## Changes Made

### 1. requirements.txt
```diff
- psycopg2-binary==2.9.9
+ psycopg[binary]==3.2.0
```

### 2. expense_classifier_service.py
```diff
- import psycopg2
+ from psycopg import connect

- return psycopg2.connect(...)
+ return connect(...)

- database=...  # psycopg2 parameter
+ dbname=...    # psycopg3 parameter
```

## API Differences

### Connection
- **psycopg2**: `psycopg2.connect(database='...')`
- **psycopg3**: `connect(dbname='...')`

### Everything Else
- Cursor usage is identical
- SQL execution is identical
- fetchall(), fetchone() work the same

## Testing

The code should work identically. Test locally:

```bash
python expense_classifier_service.py
```

Then test the endpoint:
```bash
curl -X POST http://localhost:5001/classify \
  -H "Content-Type: application/json" \
  -d '{"description": "Monthly rent", "user_id": 1}'
```

## Deployment

After committing these changes, Render will:
1. Install `psycopg[binary]` instead of `psycopg2-binary`
2. Work with Python 3.13
3. Deploy successfully

## Notes

- `psycopg` is the modern replacement for `psycopg2`
- The `[binary]` extra installs pre-compiled wheels (faster install)
- All existing code continues to work with minimal changes

