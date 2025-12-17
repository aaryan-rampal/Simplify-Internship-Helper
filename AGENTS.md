# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Quick Start

```bash
# One-command setup (handles everything)
./start.sh

# Manual startup (if running separately)
source .venv/bin/activate
cd backend && python main.py       # Terminal 1: starts at http://localhost:8000
cd frontend && python -m http.server 5173  # Terminal 2: starts at http://localhost:5173

# Test API
curl http://localhost:8000/api/internships
curl http://localhost:8000/api/stats

# After database schema changes
python3 update_db.py

# Re-parse internship data
python3 data/parser/parse_internships.py
```

## Architecture Overview

### Backend: FastAPI + Async SQLite
- **Entry Point**: `backend/main.py` (FastAPI uvicorn server on port 8000)
- **Database**: `backend/database.py` (async operations with aiosqlite)
- **Models**: `backend/models.py` (Pydantic schemas for API responses)
- **Database File**: `data.db` (auto-created SQLite database)

**Critical Pattern**: All database operations must use `async`/`await`. Data flows: Git submodule → CSV parser → Database → API endpoints.

### Frontend: Vanilla JavaScript (No Build Step)
- **Entry Point**: `frontend/index.html` (served on port 5173)
- **Logic**: `frontend/app.js` (all JavaScript functionality, event delegation for dynamic tables)
- **Styling**: `frontend/styles.css` (CSS only, no preprocessor)

### Data Pipeline: Git Submodule → Parser → SQLite
1. **Source**: `data/internships/` (git submodule pointing to SimplifyJobs/Summer2026-Internships) - **READ-ONLY**
2. **Parser**: `data/parser/parse_internships.py` - reads upstream README.md and README-Off-Season.md, extracts 5 job categories
3. **Generated CSVs**: `data/parsed/*.csv` - created by parser (git-ignored, regenerated on demand)
4. **Database**: SQLite stores parsed CSV data + user application status (applied, resume_hash, notes)

## Critical Rules

- **NEVER** modify files in `data/internships/` submodule (upstream-controlled)
- **NEVER** commit generated CSV files from `data/parsed/` (git-ignored)
- **ALWAYS** use async/await for database operations: `async def`, `await db.*`
- **ALWAYS** test both API endpoints and frontend UI after schema changes
- **ALWAYS** run `python3 update_db.py` after modifying database schema
- **Virtual environment**: Use `.venv` directory (NOT `venv`)

## Database Schema

### Internships Table
Essential columns: `id` (text primary key), `company`, `role`, `location`, `full_locations` (JSON), `terms`, `is_faang_plus`, `application_url`, `base_url`, `date_posted`, `source_file`, `category`, `emojis`, `is_active`, `applied`, `resume_hash` (FK), `applied_date`, `notes`, `created_at`

**Key Fields**:
- `id`: Unique identifier derived from job URL (`application_url` is used as the primary key)
- `is_active`: Boolean (true = currently posted, false = removed/archived)
- `date_posted`: ISO timestamp calculated from age strings ("0d", "1d", "1mo", etc.)
- `category`: One of 5 values (software_engineering, data_science, quant_finance, product_management, hardware_engineering)
- `emojis`: Extracted emojis indicating special requirements (🎓 = PhD, 🛂 = clearance)
- `has_phd_emoji`, `has_clearance_emoji`: Boolean flags for individual emoji types
- `applied`: User's application status
- `resume_hash`: SHA-256 hash linking to resume entry
- `notes`: User notes for the application

**Uniqueness**: Jobs are identified by `application_url`. The `update_db.py` script uses a deduplication mechanism (`seen_urls` set) to prevent duplicate entries from different CSV files.

### Resumes Table
Columns: `hash` (SHA-256, primary key), `original_filename`, `file_path`, `upload_date`

Uses content-based deduplication via SHA-256 hashing to prevent duplicate resume uploads.

## API Endpoints

- `GET /api/internships` - list internships with optional filters (category, date_from, date_to, location, company, is_faang_plus)
- `POST /api/internships/{id}/apply` - update application status (applied, resume_hash, notes)
- `GET /api/resumes` - list all uploaded resumes
- `POST /api/resumes/upload` - upload resume with automatic deduplication
- `POST /api/refresh` - refresh data (git pull submodule → re-parse → update database)
- `GET /api/stats` - internship statistics
- `GET /docs` - FastAPI Swagger UI documentation

## Code Style

### Python
- Type hints for all function parameters and return values
- Docstrings for all functions
- Async/await for database operations
- HTTPException for API errors, try/except for database operations
- Use `pathlib.Path` for file paths (preferred over string concatenation)

### JavaScript/Frontend
- Plain HTML/CSS/JavaScript (no frameworks)
- Event delegation for dynamic table rows
- Real-time filtering without page reload
- `formatDate()` converts ISO timestamps to relative time (Today/Yesterday/X days ago)
- `stripEmojis()` removes emojis from role text for display

## Git Submodule Management

The `data/internships/` directory is a git submodule pointing to SimplifyJobs/Summer2026-Internships (upstream). It contains two main files we parse:
- `README.md` - Summer internship listings (S26)
- `README-Off-Season.md` - Winter internship listings (W26)

```bash
# Initialize (shallow clone, 3.1MB instead of ~1GB)
git submodule update --init --recursive --depth 1

# Check status (should show space + commit hash)
git submodule status

# Pull latest upstream data
cd data/internships && git pull origin dev && cd ../..

# Reset to clean state if dirty
cd data/internships && git reset --hard HEAD && git clean -fd && cd ../..
```

**Important**: The submodule pointer should rarely be committed unless intentionally updating to a new upstream version. Focus development on the parser and database logic, not the upstream data.

## Data Refresh Workflow

Triggered by "Refresh Data" button or manual execution:

1. Git pull in `data/internships/` submodule (fetch latest from SimplifyJobs)
2. Run `python3 data/parser/parse_internships.py` (regenerates CSV files)
3. Run `python3 update_db.py` (loads CSVs into database, marks removed jobs as inactive)
4. Frontend automatically reloads internship list via API call

**Database Update Logic** (`update_db.py`):
- Processes all CSV files in `data/parsed/`
- Uses URL-based deduplication to skip duplicates across categories
- Calls `upsert_internship()` to add/update each job
- Calls `mark_missing_internships_inactive()` to mark removed jobs as `is_active=false`
- Preserves user application status (applied, resume_hash, notes) during updates

## Key Data Processing Details

### Date Calculation
Parser converts relative age strings to ISO timestamps:
- "0d" → today's date
- "1d" → yesterday
- "1mo" → 30 days ago
- "2mo" → 60 days ago

### Emoji Extraction
- Uses regex pattern to extract Unicode emojis from role text
- Stores as comma-separated string in `emojis` field
- Sets boolean flags `has_phd_emoji` and `has_clearance_emoji`
- Frontend strips emojis from display using `stripEmojis()` function

### FAANG+ Detection
- Detected by 🔥 emoji in company field
- Stored as boolean `is_faang_plus` flag
- Displayed as "🔥 FAANG+" badge in UI

## Testing Verification Strategy

Since there's no formal test suite, verify changes manually:

1. **API endpoints**: `curl http://localhost:8000/api/internships` and `/api/stats`
2. **Frontend UI**: Open `http://localhost:5173` and test filtering, applying, resume upload
3. **Data refresh**: Click "Refresh Data" button and verify new internships appear
4. **Database**: Inspect `data.db` directly if needed (use sqlite3 CLI)

## Troubleshooting

**Backend won't start**
- Check venv: `source .venv/bin/activate` (note: uses `.venv`, not `venv`)
- Check port 8000: `lsof -i :8000`
- Verify submodule: `git submodule status`

**Frontend "Failed to load internships"**
- Verify backend running: `curl http://localhost:8000/api/internships`
- Check browser console (F12) for errors
- Ensure serving over HTTP (not file://), on port 5173

**Database errors or missing data**
- Recreate: `rm data.db && python3 update_db.py`
- Check permissions: `ls -la data.db`

**Submodule empty or broken**
- Reset: `git submodule deinit -f data/internships && git submodule update --init --recursive --depth 1`

**"Refresh Data" doesn't work**
- Verify submodule is clean and initialized
- Manually run: `cd data/internships && git pull origin dev && cd ../.. && python3 data/parser/parse_internships.py && python3 update_db.py`

**Virtual environment issues**
- This project uses `.venv` directory (with dot prefix)
- If using wrong venv, recreate: `rm -rf .venv && python3 -m venv .venv && source .venv/bin/activate`
- Install dependencies: `pip install -r backend/requirements.txt` (or use `uv pip install`)
