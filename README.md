# Internship Tracker

<img width="1622" height="975" alt="image" src="https://github.com/user-attachments/assets/f40b470f-df1f-4dfe-b2e8-e77c1fd34146" />


> 🤖 **AI Agents**: Please read [AGENTS.md](./AGENTS.md) for detailed development instructions before making changes.

A web application to track and manage Summer 2026 internship applications from the SimplifyJobs Summer2026-Internships repository.

## Features

- View internships from 5 categories (Software Engineering, Data Science/ML, Quantitative Finance, Product Management, Hardware Engineering)
- Filter by category, location, company, date range, and FAANG+ status
- Mark jobs as applied with checkbox
- Upload resumes with automatic deduplication (content-based hashing)
- View both Simplify and direct application URLs
- Refresh data from GitHub with one click (git pull + re-parse)
- Add notes to applications
- Persistent SQLite database

## Project Structure

```
job-helper/
├── backend/
│   ├── main.py              # FastAPI application
│   ├── database.py          # Database operations
│   ├── models.py            # Pydantic models
│   └── requirements.txt     # Python dependencies
├── frontend/
│   ├── index.html           # Main HTML page
│   ├── styles.css           # Styling
│   └── app.js               # JavaScript logic
├── data/
│   ├── internships/         # Git submodule (SimplifyJobs/Summer2026-Internships) - pristine
│   ├── parser/              # Our custom parser script
│   │   └── parse_internships.py
│   └── parsed/              # Generated CSV files (git-ignored)
│       ├── software_engineering_internships.csv
│       ├── data_science_ml_internships.csv
│       ├── quantitative_finance_internships.csv
│       ├── product_management_internships.csv
│       └── hardware_engineering_internships.csv
├── resumes/                 # Resume storage (auto-created)
└── data.db                  # SQLite database (auto-created)
```

## 🚀 Quick Start (2 minutes)

### Prerequisites

- Python 3.11+
- Git

### 1️⃣ Clone Repository

```bash
# Clone WITH submodules (recommended)
git clone --recurse-submodules https://github.com/aaryan-rampal/Simplify-Internship-Helper
cd job-helper

# If you already cloned WITHOUT submodules, initialize them:
git submodule update --init --recursive --depth 1
```

**Note on Submodule Size**: The `--depth 1` flag does a shallow clone (3.1MB instead of ~1GB), which is much faster. If you need full history later, run: `git submodule update --init --recursive`

### 2️⃣ Run Setup & Start Server

That's it! The `./start.sh` script handles everything:

```bash
./start.sh
```

This will:
- ✅ Create virtual environment (if needed)
- ✅ Install all dependencies
- ✅ Initialize git submodule (if needed)
- ✅ Parse internship data (on first run)
- ✅ Create SQLite database (on first run)
- ✅ Start the backend server at `http://localhost:8000`

### 3️⃣ Open Web App

In another terminal:

```bash
# Option A: Simple file open
open frontend/index.html

# Option B: HTTP server (recommended)
cd frontend && python -m http.server 8080
```

Then visit `http://localhost:8080` to see all internships!

### ✅ Verify Setup

- Backend: `curl http://localhost:8000/api/stats`
- Frontend: `http://localhost:8080`
- Should see 300+ internship listings

---

## Usage

### Viewing Internships

- The table displays all internships from the last 7 days
- Use filters to narrow down results by category, location, company, or date
- FAANG+ companies are marked with a 🔥 badge

### Marking Applications

- Check the checkbox in the "Applied" column to mark a job as applied
- Select a resume from the dropdown to associate it with the application
- Click "Notes" to add additional information

### Uploading Resumes

- Click "Upload Resume" button
- Select a PDF, DOC, or DOCX file
- The system automatically detects duplicates using SHA-256 hashing
- Resumes are stored in the `resumes/` directory with hash-based names

### Refreshing Data

- Click "Refresh Data" button to:
  1. Pull latest changes from the internships data submodule (data/internships/)
  2. Re-run the parser script (data/parser/parse_internships.py)
  3. Regenerate CSV files in data/parsed/
  4. Reload internships in the UI



## Database Schema

### Internships Table (merged schema)

- `id` - Text primary key (URL-based unique identifier)
- `company` - Company name
- `role` - Job role/title
- `location` - Primary location
- `full_locations` - All available locations (JSON)
- `category` - Job category (SW, DS/ML, Quant, PM, HW)
- `posted_date` - When job was posted
- `simplify_url` - SimplifyJobs application URL
- `direct_url` - Direct application URL
- `active` - Boolean status (true = currently active)
- `applied` - Boolean status (true = user has applied)
- `resume_hash` - FK to resumes table
- `applied_date` - Timestamp when application was submitted
- `notes` - User notes about the application

### Resumes Table

- `hash` - SHA-256 hash (primary key)
- `original_filename` - Original file name
- `file_path` - Path to stored file
- `upload_date` - Upload timestamp

## Data Pipeline

The application uses a clean separation between upstream data and our processing:

1. **data/internships/** - Git submodule containing pristine SimplifyJobs data (never modified)
2. **data/parser/parse_internships.py** - Our parser script that:
   - Reads from the internships submodule (README.md and README-Off-Season.md)
   - Extracts all 5 categories (SW, DS/ML, Quant, PM, HW)
   - Cleans URLs to remove Simplify tracking parameters
   - Generates CSV files in data/parsed/
3. **data/parsed/** - Generated CSV files (git-ignored, regenerated on demand)

### Running the Parser Manually

```bash
python3 data/parser/parse_internships.py
```

This will read from `data/internships/` and write CSVs to `data/parsed/`.

## Working with Submodules

This project uses git submodules to manage the internships data from SimplifyJobs.

### First-Time Setup

**If you cloned without submodules**, initialize them:

```bash
git submodule update --init --recursive --depth 1
```

The `--depth 1` flag creates a shallow clone (3.1MB) instead of full history (~1GB).

**If you need the full git history later:**

```bash
git submodule update --init --recursive  # Remove --depth 1
```

### Checking Submodule Status

```bash
# See status of all submodules
git submodule status

# Output examples:
# " abc123..." = properly initialized
# "-abc123..." = not initialized (needs: git submodule update --init)
# "+abc123..." = not at expected commit (needs: git submodule update)
```

### Updating Internships Data

**Via UI (Recommended):**

- Click the "Refresh Data" button in the web interface
- Automatically pulls latest changes and updates database

**Manually:**

```bash
# Update submodule to latest commit
git submodule update --remote

# Re-run parser to regenerate CSVs
python3 data/parser/parse_internships.py

# Populate database with new data
python3 update_db.py

# Optionally commit the submodule pointer update
git add data/internships
git commit -m "chore: Update internships data submodule"
```

### Troubleshooting Submodules

**Problem**: Empty directory or "fatal: not a git repository"

```bash
# Complete reset of submodule
git submodule deinit -f data/internships
git submodule update --init --recursive --depth 1
```

**Problem**: Submodule shows as "dirty" (+)

```bash
# Reset to clean state
cd data/internships
git reset --hard HEAD
git clean -fd
cd ../..
```

### Important Notes

- **Submodule is pristine**: Never add custom files to `data/internships/` (upstream-controlled)
- **Parser lives outside**: Custom scripts are in `data/parser/`
- **CSVs are generated**: Files in `data/parsed/` are git-ignored and auto-regenerated
- **Data source**: https://github.com/SimplifyJobs/Summer2026-Internships

## 🛠️ Command Reference

### Quick Start

```bash
# One-command setup & startup (handles everything automatically)
./start.sh
```

### Essential Commands

```bash
# Initialize submodules (if cloned without --recurse-submodules)
git submodule update --init --recursive --depth 1

# Check submodule status
git submodule status

# Manual data refresh
cd data/internships && git pull origin dev && cd ../..
python3 data/parser/parse_internships.py
python3 update_db.py

# Check environment
source venv/bin/activate

# Port check
lsof -i :8000
```

### Development Workflow

```bash
# Start everything (environment, database setup, server)
./start.sh

# Test API endpoints
curl http://localhost:8000/api/internships
curl http://localhost:8000/api/stats

# View API docs
open http://localhost:8000/docs
```

---

## 🔧 Troubleshooting

### Submodule Issues

**Problem**: `git submodule status` shows `-` or `+`

```bash
# Fix: Initialize submodules
git submodule update --init --recursive

# Fix: Update to latest
cd data/internships && git pull origin dev
```

### Environment Issues

**Problem**: Command not found or import errors

```bash
# Verify virtual environment
source venv/bin/activate

# Recreate environment if needed
rm -rf venv
python3 -m venv venv
source venv/bin/activate
pip install -r backend/requirements.txt
```

### Port Conflicts

**Problem**: Port 8000 already in use

```bash
# Check what's using port 8000
lsof -i :8000

# Kill process (replace PID)
kill -9 <PID>

# Or change port in backend/main.py
```

### Data Refresh Issues

**Problem**: "Refresh Data" button doesn't work

```bash
# Manual refresh sequence
cd data/internships && git pull origin dev && cd ../..
python3 data/parser/parse_internships.py
python3 update_db.py
```

### Virtual Environment Issues

**Problem**: Python command not found or wrong Python version

```bash
# Ensure venv is activated
source venv/bin/activate

# Check Python version
python --version  # Should be 3.11+

# Recreate if needed
rm -rf venv
python3 -m venv venv
source venv/bin/activate
pip install -r backend/requirements.txt
```

### Submodule Issues

**Problem**: Missing data or submodule errors

```bash
# Check submodule status
git submodule status

# Initialize submodules
git submodule update --init --recursive

# Reset submodule to clean state
cd data/internships
git reset --hard HEAD
git clean -fd
cd ../..
```

### Database Issues

**Problem**: Database errors or missing data

```bash
# Remove and recreate database
rm data.db
python3 update_db.py

# Check database permissions
ls -la data.db
```

### Frontend Issues

**Problem**: CORS errors or connection refused

```bash
# Check if backend is running
curl http://localhost:8000/api/internships

# Check port usage
lsof -i :8000

# Kill process on port 8000 if needed
kill -9 $(lsof -t -i:8000)
```

### Frontend Loading Issues

**Problem**: "Failed to load internships"

- Ensure backend is running: `curl http://localhost:8000/api/internships`
- Check browser console (F12) for errors
- Verify CORS is enabled (default in main.py)

---

## 📊 API Endpoints

- `GET /api/internships` - Get all internships with filters
- `POST /api/internships/{id}/apply` - Update application status
- `POST /api/resumes/upload` - Upload a resume
- `GET /api/resumes` - List all resumes
- `POST /api/refresh` - Refresh data from GitHub
- `GET /api/categories` - Get available categories
- `GET /api/stats` - Get statistics
- `GET /docs` - Interactive API documentation

---

## 🏗️ Technologies Used

- **Backend**: FastAPI, SQLite, aiosqlite
- **Frontend**: Vanilla JavaScript, HTML5, CSS3
- **Storage**: Content-based file deduplication with SHA-256
- **Data Source**: Git submodule (SimplifyJobs/Summer2026-Internships)
- **Environment**: Python 3.11 virtual environment
