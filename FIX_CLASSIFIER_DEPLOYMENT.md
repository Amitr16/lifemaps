# Fix for Classifier Service Deployment Error

## Problem
The classifier service was failing with:
```
ImportError: /opt/render/project/src/.venv/lib/python3.13/site-packages/psycopg2/_psycopg.cpython-313-x86_64-linux-gnu.so: undefined symbol: _PyInterpreterState_Get
```

This is because `psycopg2-binary` doesn't support Python 3.13 yet.

## Solution
Created `runtime.txt` file to force Render to use Python 3.12.0, which is compatible with `psycopg2-binary`.

## Files Changed
- ✅ Created `runtime.txt` with `python-3.12.0`
- ✅ Updated `render.yaml` (removed pythonVersion field, using runtime.txt instead)

## Next Steps

1. **Commit the changes:**
   ```bash
   git add runtime.txt render.yaml
   git commit -m "Fix classifier service: Use Python 3.12 for psycopg2-binary compatibility"
   git push
   ```

2. **Redeploy on Render:**
   - Render will automatically detect `runtime.txt` and use Python 3.12
   - The service should now deploy successfully

3. **Verify deployment:**
   - Check the classifier service logs in Render dashboard
   - Test the service: `curl https://lifemaps-classifier.onrender.com/health`

## Alternative Solution (if runtime.txt doesn't work)

If `runtime.txt` doesn't work, you can manually set Python version in Render dashboard:

1. Go to Render Dashboard → `lifemaps-classifier` service
2. Go to Settings
3. Set "Python Version" to `3.12.0`
4. Save and redeploy

## Why This Happened

- Render defaults to Python 3.13 for new Python services
- `psycopg2-binary` (pre-compiled wheels) doesn't have Python 3.13 wheels yet
- Python 3.12 is fully supported by `psycopg2-binary`

