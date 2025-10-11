# Internship Tracker

A web application to track and manage Summer 2026 internship applications from the Summer2026-Internships repository.

## Features

- ✅ View internships from 5 categories (Software Engineering, Data Science/ML, Quantitative Finance, Product Management, Hardware Engineering)
- 🔍 Filter by category, location, company, date range, and FAANG+ status
- ✅ Mark jobs as applied with checkbox
- 📄 Upload resumes with automatic deduplication (content-based hashing)
- 🔗 View both Simplify and direct application URLs
- 🔄 Refresh data from GitHub with one click (git pull + re-parse)
- 📝 Add notes to applications
- 💾 Persistent SQLite database

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
├── Summer2026-Internships/  # Git repository
│   └── parse_internships.py # Parser script (updated)
├── resumes/                 # Resume storage (auto-created)
└── data.db                  # SQLite database (auto-created)
```

## Setup & Installation

### 1. Create Conda Environment

```bash
# Create the environment
conda env create -f environment.yml

# Activate the environment
conda activate internship-tracker
```

Alternatively, if you prefer pip:
```bash
cd backend
pip install -r requirements.txt
```

### 2. Start the Backend Server

**Option A: Use the startup script (recommended)**
```bash
./start.sh
```

**Option B: Manual start**
```bash
# Activate conda environment first
conda activate internship-tracker

# Start the server
cd backend
python main.py
```

The API will be available at `http://localhost:8000`

### 3. Open the Frontend

Open `frontend/index.html` directly in your web browser, or use a simple HTTP server:

```bash
cd frontend
python -m http.server 8080
```

Then visit `http://localhost:8080`

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
  1. Pull latest changes from the Summer2026-Internships repository
  2. Re-run the parser to update CSV files
  3. Reload internships in the UI

## API Endpoints

- `GET /api/internships` - Get all internships with filters
- `POST /api/internships/{job_id}/apply` - Update application status
- `POST /api/resumes/upload` - Upload a resume
- `GET /api/resumes` - List all resumes
- `POST /api/refresh` - Refresh data from GitHub
- `GET /api/categories` - Get available categories
- `GET /api/stats` - Get statistics

## Database Schema

### Applications Table
- `id` - Auto-increment primary key
- `job_id` - Unique job identifier
- `applied` - Boolean status
- `resume_hash` - FK to resumes table
- `applied_date` - Timestamp
- `notes` - Text field

### Resumes Table
- `hash` - SHA-256 hash (primary key)
- `original_filename` - Original file name
- `file_path` - Path to stored file
- `upload_date` - Upload timestamp

## Parser Updates

The `parse_internships.py` script has been updated to:
- Extract all 5 categories (SW, DS/ML, Quant, PM, HW)
- Clean URLs to remove Simplify tracking parameters
- Generate separate CSV files for each category
- Filter to last 7 days only

## Technologies Used

- **Backend**: FastAPI, SQLite, aiosqlite
- **Frontend**: Vanilla JavaScript, HTML5, CSS3
- **Storage**: Content-based file deduplication with SHA-256
