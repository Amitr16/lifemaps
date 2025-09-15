@echo off
echo Starting LifeMaps Database Setup...
echo ================================================

REM Install Python dependencies if needed
pip install psycopg2-binary

REM Run the complete database setup script
python setup_database.py

pause
