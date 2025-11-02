# 🤖 Agent Instructions

## 🛠️ Build/Lint/Test Commands
```bash
# Environment setup
python3 -m venv venv && source venv/bin/activate && pip install -r backend/requirements.txt

# Start backend server
./start.sh  # or: cd backend && python main.py

# Test API endpoints
curl http://localhost:8000/api/internships
curl -X POST http://localhost:8000/api/refresh

# Data refresh
python3 update_db.py

# No formal test suite - test manually via API endpoints and frontend UI
```

## 🎯 Code Style Guidelines
- **Python**: Use async/await for all database operations, type hints, docstrings
- **Imports**: Group stdlib, third-party, local imports; use `from database import *` pattern
- **Naming**: snake_case for variables/functions, PascalCase for classes
- **Error Handling**: Use HTTPException for API errors, try/except for database operations
- **Frontend**: Plain HTML/CSS/JS (no build step), follow existing patterns
- **Database**: SQLite with aiosqlite, schema in `database.py`, migrations handled there

## 🌍 Environment Setup
- **ALWAYS** use virtual environment `venv` 
- Activate: `source venv/bin/activate`
- Python 3.11 required
- Install dependencies: `pip install -r backend/requirements.txt`

## 🚨 Critical Rules
- **NEVER** modify files in `data/internships/` submodule (read-only upstream)
- **NEVER** commit generated CSV files from `data/parsed/`
- **ALWAYS** use async/await for database operations
- **ALWAYS** test both API endpoints and frontend UI after changes
- **ALWAYS** run `python3 update_db.py` after database schema changes

## 📁 Key Architecture
- **Backend**: FastAPI (`backend/main.py`), SQLite with aiosqlite (`backend/database.py`)
- **Frontend**: Plain HTML/CSS/JS (no build step)
- **Data Pipeline**: Git submodule → Parser → CSV → Database
- **Database**: `data.db` (auto-created), schema in `database.py`