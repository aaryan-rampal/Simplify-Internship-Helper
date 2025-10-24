# 🤖 Agent Instructions

> **IMPORTANT**: Read this file before making any changes to this project. This repository uses specific patterns and conventions that must be followed.

## 🌍 Environment Setup

### Conda Environment (Required)
- **ALWAYS** use conda environment for this project
- Environment name: `internship-tracker` (defined in `environment.yml`)
- Activate before running any Python scripts: `conda activate internship-tracker`
- Create/update: `conda env update -f environment.yml`
- Python version: 3.11 (specified in environment.yml)

### Package Management
- Use `environment.yml` for dependency management
- Backend dependencies in `backend/requirements.txt` (for pip fallback)
- Never install packages globally - always use conda environment

## 🗄️ Database Operations

### Database Details
- **Type**: SQLite with aiosqlite for async operations
- **Location**: `data.db` in project root
- **Schema**: Auto-created on first run via `database.py:init_db()`
- **Migrations**: Handle in `backend/database.py` and `backend/migrate_job_ids.py`

### Key Database Functions
- `init_db()` - Initialize database schema
- `upsert_internship()` - Insert/update internship records
- `mark_missing_internships_inactive()` - Clean up old data
- `get_application()`, `update_application()` - Application tracking
- `save_resume()`, `get_resume()`, `list_resumes()` - Resume management

## 📁 Project Structure & Patterns

### Core Architecture
```
job-helper/
├── backend/           # FastAPI application
├── frontend/          # HTML/CSS/JS (no build step)
├── data/             # Data processing pipeline
├── resumes/           # File storage (auto-created)
└── data.db           # SQLite database (auto-created)
```

### Data Pipeline (Critical Pattern)
1. **`data/internships/`** - Git submodule (READ-ONLY, pristine upstream)
2. **`data/parser/parse_internships.py`** - Custom parser script
3. **`data/parsed/`** - Generated CSV files (git-ignored)
4. **Database** - Final storage via `update_db.py`

### File Conventions
- **Never modify** files in `data/internships/` (upstream submodule)
- **Always regenerate** CSV files in `data/parsed/` (don't commit)
- **Use async/await** for all database operations
- **Follow existing code style** in each component

## 🔧 Development Workflow

### Before Making Changes
1. Activate environment: `conda activate internship-tracker`
2. Check submodule status: `git submodule status`
3. Start backend: `./start.sh` or `cd backend && python main.py`
4. Test changes affect both API and frontend

### Common Tasks
- **Add new API endpoint**: Edit `backend/main.py`, update `backend/models.py`
- **Modify database schema**: Update `backend/database.py`, add migration
- **Change frontend**: Edit `frontend/` files (no build step required)
- **Update data parsing**: Modify `data/parser/parse_internships.py`
- **Refresh data**: Use API endpoint `POST /api/refresh` or manual commands

### Testing Changes
- API endpoints: `curl http://localhost:8000/api/internships`
- Frontend: Open `frontend/index.html` in browser
- Database: Check `data.db` with SQLite browser
- Data refresh: Test `POST /api/refresh` endpoint

## 🚨 Critical Rules

### DO NOT
- Modify files in `data/internships/` submodule
- Commit generated CSV files from `data/parsed/`
- Use synchronous database operations
- Install packages outside conda environment
- Change environment name from `internship-tracker`

### ALWAYS
- Use conda environment `internship-tracker`
- Use async/await for database operations
- Test both backend API and frontend UI
- Follow existing code patterns and style
- Run `python3 update_db.py` after data schema changes

## 🔄 Data Refresh Process

### Automated (Recommended)
```bash
# Via API
curl -X POST http://localhost:8000/api/refresh
```

### Manual (Development)
```bash
cd data/internships && git pull origin dev && cd ../..
python3 data/parser/parse_internships.py
python3 update_db.py
```

## 📋 Key Files to Understand

### Backend Core
- `backend/main.py` - FastAPI app, API endpoints, data refresh logic
- `backend/database.py` - All database operations and schema
- `backend/models.py` - Pydantic models for API

### Data Processing
- `data/parser/parse_internships.py` - Parses upstream data to CSV
- `update_db.py` - Updates database from parsed CSV files

### Frontend
- `frontend/app.js` - Main application logic
- `frontend/index.html` - UI structure
- `frontend/styles.css` - Styling

## 🎯 Common Issues & Solutions

### Submodule Problems
```bash
git submodule update --init --recursive
```

### Environment Issues
```bash
conda env update -f environment.yml
conda activate internship-tracker
```

### Database Issues
```bash
rm data.db  # Will recreate on next run
```

### Port Conflicts
```bash
lsof -i :8000  # Check what's using port 8000
```

---

**Remember**: This project prioritizes clean data separation, reproducible builds, and simple deployment. Follow these patterns to maintain consistency.